"""
The Opportunities tab: career events and jobs, ranked for the student's ACTIVE route.

    GET    /api/opportunities                     counts for the tab headers
    GET    /api/opportunities/events              career events (UCL Careers, employer talks, fairs...)
    GET    /api/opportunities/jobs                jobs, with filters
    GET    /api/opportunities/jobs/{id}           one job, with the skills you have and still need
    POST   /api/opportunities/jobs/{id}/save      save a job (or mark it applied)
    DELETE /api/opportunities/jobs/{id}/save      un-save it

All need a login token. Every item says WHY it was recommended.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app import fit, opportunities as opp
from app.auth import get_current_user
from app.database import get_session
from app.events import events_from_db, rank_events
from app.models import Event, Job, JobSave, User
from app.routes_events import person_for

router = APIRouter(prefix="/api/opportunities")


class SaveIn(BaseModel):
    status: Literal["saved", "applied"] = "saved"


def job_card(job: Job, user: User, match: int, why: str, on_route: bool, saved: Optional[str]) -> dict:
    return {
        "id": job.id, "title": job.title, "company": job.company, "location": job.location,
        "work_mode": job.work_mode, "level": job.level, "salary_text": job.salary_text, "summary": job.summary,
        "closes_on": job.closes_on, "source": job.source, "source_url": job.source_url,
        "is_demo": job.source == "demo",  # invented demo adverts: the front end should label them
        "match_pct": match, "why": why, "on_active_route": on_route, "saved_status": saved,
        "visa_flag": opp.visa_flag(user, job),
    }


def ranked_jobs(session: Session, user: User, now: datetime) -> list:
    """Every open job with its match, best first (before filters)."""
    focus = opp.active_focus(session, user)
    have = fit.user_skill_ids(session, user.id)
    role_reqs = fit.all_requirements(session) if focus else {}
    skills_by_job = opp.job_skill_map(session)
    all_ids = {s for ids in skills_by_job.values() for s in ids}
    names = opp.skill_names(session, all_ids)
    saved = opp.saved_status(session, user)

    rows = []
    for job in session.exec(select(Job)).all():
        if not opp.is_open(job, now):
            continue
        skills = skills_by_job.get(job.id, set())
        match, on_route = opp.job_match(job, skills, focus, role_reqs, have)
        rows.append((match, on_route, job, skills, why_for(job, skills, names, have, on_route, focus, now)))
    return rows, saved


def why_for(job, skills, names, have, on_route, focus, now):
    return opp.job_why(job, skills, names, have, on_route, focus, now)


@router.get("")
def summary(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Counts for the tab: career events, open jobs, jobs closing within a week, and saved jobs."""
    now = datetime.now(timezone.utc)
    events = [e for e in session.exec(select(Event).where(Event.category == "opportunity")).all()
              if not _ended(e, now)]
    jobs = [j for j in session.exec(select(Job)).all() if opp.is_open(j, now)]
    soon = [j for j in jobs if j.closes_on and opp.aware(j.closes_on) - now <= timedelta(days=opp.CLOSING_SOON_DAYS)]
    focus = opp.active_focus(session, user)
    return {
        "events": len(events), "jobs": len(jobs), "closing_soon": len(soon),
        "saved": len(opp.saved_status(session, user)),
        "active_route": focus.role.name if focus else None,
    }


def _ended(event: Event, now: datetime) -> bool:
    finish = opp.aware(event.end_time or event.start_time)
    return finish is not None and finish < now


@router.get("/events")
def career_events(
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Upcoming career events. With an active route they are ranked by how much of the route's skill gap they build;
    otherwise by the student's interests. Each has a reason."""
    now = datetime.now(timezone.utc)
    focus = opp.active_focus(session, user)
    skills_by_event = opp.event_skill_map(session)
    names = opp.skill_names(session, {s for ids in skills_by_event.values() for s in ids})

    base = rank_events(person_for(session, user), events_from_db(session), now, event_type="career", limit=200)
    category = {e.id: e for e in session.exec(select(Event)).all()}
    rows = []
    for position, scored in enumerate(base):
        event = category[scored.item.id]
        if event.category != "opportunity":
            continue
        ids = skills_by_event.get(event.id, set())
        build, top = opp.score_event_build(ids, focus.missing) if focus else (0.0, None)
        reason = (f"Builds {names.get(top) or focus.names.get(top)} - a gap on your {focus.role.name} route"
                  if top else scored.reason)
        rows.append((-build, position, {
            "event_id": event.id, "title": event.title, "start_time": event.start_time, "end_time": event.end_time,
            "location_name": event.location_name, "area": event.area, "employer": event.employer,
            "source_url": event.source_url, "builds": sorted(names[s] for s in ids if focus and s in focus.missing),
            "build_score": build, "reason": reason,
        }))
    rows.sort(key=lambda r: (r[0], r[1]))
    return {"active_route": focus.role.name if focus else None, "events": [r[2] for r in rows[:limit]]}


@router.get("/jobs")
def jobs(
    level: Optional[Literal["internship", "graduate", "entry"]] = Query(None),
    location: Optional[str] = Query(None, description="Part of a place name, like London"),
    work_mode: Optional[Literal["on-site", "hybrid", "remote"]] = None,
    q: Optional[str] = Query(None, description="Part of a title or company"),
    saved_only: bool = False,
    closing_soon: bool = False,
    hide_no_sponsorship: bool = Query(False, description="Hide jobs that say they do not sponsor visas"),
    sort: Literal["best", "closing", "newest"] = "best",
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Open jobs ranked for the student's active route. Filter by level, place, work mode, text, or saved only."""
    now = datetime.now(timezone.utc)
    rows, saved = ranked_jobs(session, user, now)
    focus = opp.active_focus(session, user)

    def keep(match, on_route, job, skills, why):
        if level and job.level != level:
            return False
        if work_mode and job.work_mode != work_mode:
            return False
        if location and location.lower() not in (job.location or "").lower():
            return False
        if q and q.lower() not in f"{job.title} {job.company}".lower():
            return False
        if saved_only and job.id not in saved:
            return False
        if hide_no_sponsorship and job.sponsorship == "no":
            return False
        if closing_soon and not (job.closes_on and opp.aware(job.closes_on) - now <= timedelta(days=opp.CLOSING_SOON_DAYS)):
            return False
        return True

    rows = [r for r in rows if keep(*r)]
    far = datetime.max.replace(tzinfo=timezone.utc)
    if sort == "closing":
        rows.sort(key=lambda r: (opp.aware(r[2].closes_on) or far, -r[0]))
    elif sort == "newest":
        rows.sort(key=lambda r: -r[2].id)
    else:
        rows.sort(key=lambda r: (-r[0], opp.aware(r[2].closes_on) or far))
    return {
        "active_route": focus.role.name if focus else None,
        "total": len(rows),
        "jobs": [job_card(job, user, match, why, on_route, saved.get(job.id)) for match, on_route, job, skills, why in rows[:limit]],
    }


@router.get("/jobs/{job_id}")
def job_detail(job_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """One job, plus which of its skills the student has and which they would need to build."""
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="No such job.")
    now = datetime.now(timezone.utc)
    focus = opp.active_focus(session, user)
    have = fit.user_skill_ids(session, user.id)
    skills = opp.job_skill_map(session).get(job.id, set())
    names = opp.skill_names(session, skills)
    role_reqs = fit.all_requirements(session) if focus else {}
    match, on_route = opp.job_match(job, skills, focus, role_reqs, have)
    card = job_card(job, user, match, opp.job_why(job, skills, names, have, on_route, focus, now), on_route,
                    opp.saved_status(session, user).get(job.id))
    card["skills_you_have"] = sorted(names[s] for s in skills & have)
    card["skills_to_build"] = sorted(names[s] for s in skills - have)
    card["sponsorship"] = job.sponsorship
    return card


@router.post("/jobs/{job_id}/save")
def save_job(job_id: int, data: SaveIn = SaveIn(), user: User = Depends(get_current_user),
             session: Session = Depends(get_session)):
    """Save a job, or mark it as applied. Saving again just changes the status."""
    if session.get(Job, job_id) is None:
        raise HTTPException(status_code=404, detail="No such job.")
    row = session.get(JobSave, (user.id, job_id))
    if row is None:
        row = JobSave(user_id=user.id, job_id=job_id)
    row.status = data.status
    session.add(row)
    session.commit()
    return {"job_id": job_id, "status": row.status}


@router.delete("/jobs/{job_id}/save")
def unsave_job(job_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(JobSave, (user.id, job_id))
    if row is not None:
        session.delete(row)
        session.commit()
    return {"job_id": job_id, "status": None}
