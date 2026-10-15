"""
Ranking for the Opportunities tab: career events and jobs, against the student's active route.

The rule (docs/DESIGN_DECISIONS.md, section 3):
  - Each skill the student is MISSING for their active route is weighted by how often the role asks for it
    (the role's importance for that skill, e.g. SQL in 70% of adverts = 0.7).
  - An EVENT scores the sum of the weights of the missing skills it builds. The reason names the top one.
  - A JOB scores how close it is to the active route (60%) and how many of its skills the student already has (40%),
    plus a small bonus when it is for exactly the active route's role.

No active route? Events fall back to the older interest-based ranking and jobs are ranked by skills the student has.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set

from sqlmodel import Session, select

from app import fit
from app.models import Event, EventSkill, Job, JobSave, JobSkill, Role, Skill, User, UserRoute

CLOSING_SOON_DAYS = 7
ON_ROUTE_BONUS = 10  # jobs for exactly the active route's role rank above merely similar roles


def aware(moment: Optional[datetime]) -> Optional[datetime]:
    return moment.replace(tzinfo=timezone.utc) if moment is not None and moment.tzinfo is None else moment


@dataclass
class Focus:
    """What the student's active route says they still need."""

    route: UserRoute
    role: Role
    requirements: List[fit.Requirement]
    have: Set[int]
    missing: Dict[int, float]  # skill id -> importance, for skills the role asks for and the student lacks
    names: Dict[int, str]  # skill id -> name


def active_focus(session: Session, user: User) -> Optional[Focus]:
    """The active route's role and the skills still missing, or None if there is no usable active route."""
    route = session.exec(select(UserRoute).where(UserRoute.user_id == user.id, UserRoute.is_active.is_(True))).first()
    if route is None or route.role_id is None:
        return None
    role = session.get(Role, route.role_id)
    requirements = fit.requirements_for(session, role.id)
    if fit.data_status(role, requirements) == "not_enough_data":
        return None
    have = fit.user_skill_ids(session, user.id)
    return Focus(
        route=route, role=role, requirements=requirements, have=have,
        missing={r.skill_id: r.importance for r in requirements if r.skill_id not in have},
        names={r.skill_id: r.name for r in requirements},
    )


def skill_names(session: Session, skill_ids: Set[int]) -> Dict[int, str]:
    if not skill_ids:
        return {}
    return {s.id: s.name for s in session.exec(select(Skill).where(Skill.id.in_(skill_ids))).all()}


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


def event_skill_map(session: Session) -> Dict[int, Set[int]]:
    """event id -> the skill ids it builds."""
    result: Dict[int, Set[int]] = {}
    for link in session.exec(select(EventSkill)).all():
        result.setdefault(link.event_id, set()).add(link.skill_id)
    return result


def score_event_build(skill_ids: Set[int], missing: Dict[int, float]) -> tuple:
    """(score, top skill id) - the sum of the weights of the missing skills this event builds."""
    built = [(missing[s], s) for s in skill_ids if s in missing]
    if not built:
        return 0.0, None
    return round(sum(w for w, _ in built), 3), max(built)[1]


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------


def job_skill_map(session: Session) -> Dict[int, Set[int]]:
    result: Dict[int, Set[int]] = {}
    for link in session.exec(select(JobSkill)).all():
        result.setdefault(link.job_id, set()).add(link.skill_id)
    return result


def is_open(job: Job, now: datetime) -> bool:
    closes = aware(job.closes_on)
    return closes is None or closes >= now


def visa_flag(user: User, job: Job) -> Optional[str]:
    """Only shown to students who said they need sponsorship. Unknown is flagged, not hidden."""
    if not user.needs_visa_sponsorship or job.sponsorship == "yes":
        return None
    return "no sponsorship offered" if job.sponsorship == "no" else "check with employer"


def job_match(job: Job, skills: Set[int], focus: Optional[Focus], role_reqs: Dict[int, List[fit.Requirement]],
              have: Set[int]) -> tuple:
    """(match %, on_route) for one job."""
    coverage = 100 * len(skills & have) / len(skills) if skills else 0
    if focus is None:
        return round(coverage), False
    on_route = job.role_id == focus.role.id
    if on_route:
        relevance = 100.0
    elif job.role_id and role_reqs.get(job.role_id):
        relevance = 100 * fit.similarity(role_reqs[job.role_id], focus.requirements)
    else:
        relevance = 100 * fit.similarity([fit.Requirement(s, "", "", 1.0) for s in skills], focus.requirements)
    return min(100, round(0.6 * relevance + 0.4 * coverage + (ON_ROUTE_BONUS if on_route else 0))), on_route


def job_why(job: Job, skills: Set[int], names: Dict[int, str], have: Set[int], on_route: bool,
            focus: Optional[Focus], now: datetime) -> str:
    parts = []
    if on_route and focus:
        parts.append(f"matches your {focus.role.name} route")
    mine = sorted(names[s] for s in skills & have)
    lacking = sorted((names[s] for s in skills - have), key=lambda n: n)
    if mine:
        parts.append(f"you already have {', '.join(mine[:2])}")
    if lacking:
        parts.append(f"to build: {', '.join(lacking[:2])}")
    closes = aware(job.closes_on)
    if closes is not None and closes - now <= timedelta(days=CLOSING_SOON_DAYS):
        parts.append(f"closes {closes:%d %b}")
    return ("Why: " + "; ".join(parts)) if parts else "Why: a graduate role that fits your level."


def saved_status(session: Session, user: User) -> Dict[int, str]:
    return {s.job_id: s.status for s in session.exec(select(JobSave).where(JobSave.user_id == user.id)).all()}
