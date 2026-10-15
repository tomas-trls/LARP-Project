"""
The fit maths: how close is a student to a role?

For one role we know a list of skills it asks for, each with an importance from 0 to 1,
and each skill sits in one of five categories: academics, skills, teamwork, experience, leadership.

    category score = (importance of the role's skills you HAVE in that category)
                     / (importance of ALL the role's skills in that category)  x 100

Example: a role asks for 5 leadership skills, all equally important, and you have 4: you score 80.

The "alumni benchmark" is an ESTIMATE for now: we assume alumni hold the role's core skills
(importance 0.6 or more). It becomes real once we have alumni profiles.

No database writes happen in this file, so it is easy to test.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from sqlmodel import Session, select

from app.models import Role, RoleSkill, RoleWorkValue, Skill, UserSkill, UserWorkValue, WorkValue

CATEGORIES = ["academics", "skills", "teamwork", "experience", "leadership"]
MIN_ADVERTS = 20  # a role built from real adverts needs at least this many (docs/DESIGN_DECISIONS.md)
CORE_IMPORTANCE = 0.6  # skills at or above this are assumed to be held by alumni in the role
PROFILE_SHARE = 0.6  # when ranking suggestions: 60% how well your profile fits...
VALUES_SHARE = 0.4  # ...and 40% how well the role matches your work values


@dataclass
class Requirement:
    """One skill a role asks for."""

    skill_id: int
    name: str
    category: str
    importance: float


@dataclass
class CategoryScore:
    category: str
    user_score: Optional[int]  # None when the role asks for nothing in this category
    benchmark_score: Optional[int]
    matched: List[str] = field(default_factory=list)  # skills you have, most important first
    missing: List[dict] = field(default_factory=list)  # skills you lack: {"name", "importance"}, most important first


# ---------------------------------------------------------------------------
# Loading from the database
# ---------------------------------------------------------------------------


def _rows_to_requirements(rows) -> List[Requirement]:
    return [Requirement(skill.id, skill.name, skill.category, rs.importance) for rs, skill in rows]


def requirements_for(session: Session, role_id: int) -> List[Requirement]:
    """The skills one role asks for."""
    rows = session.exec(
        select(RoleSkill, Skill).join(Skill, Skill.id == RoleSkill.skill_id).where(RoleSkill.role_id == role_id)
    ).all()
    return _rows_to_requirements(rows)


def all_requirements(session: Session) -> Dict[int, List[Requirement]]:
    """The skills every role asks for, in one query (used when ranking all the roles)."""
    result: Dict[int, List[Requirement]] = {}
    for rs, skill in session.exec(select(RoleSkill, Skill).join(Skill, Skill.id == RoleSkill.skill_id)).all():
        result.setdefault(rs.role_id, []).append(Requirement(skill.id, skill.name, skill.category, rs.importance))
    return result


def user_skill_ids(session: Session, user_id: int) -> Set[int]:
    return set(session.exec(select(UserSkill.skill_id).where(UserSkill.user_id == user_id)).all())


# ---------------------------------------------------------------------------
# Is there enough data behind a role?
# ---------------------------------------------------------------------------


def data_status(role: Role, requirements: List[Requirement]) -> str:
    """
    'ok'               built from at least 20 real adverts
    'estimate'         a starter guess from our seed file (until adverts replace it)
    'not_enough_data'  a role with no skills yet, or one built from fewer than 20 adverts
    """
    if not requirements:
        return "not_enough_data"
    if role.data_source == "adverts":
        return "ok" if role.advert_count >= MIN_ADVERTS else "not_enough_data"
    return "estimate"


# ---------------------------------------------------------------------------
# The scores
# ---------------------------------------------------------------------------


def score_requirements(requirements: List[Requirement], have: Set[int]) -> List[CategoryScore]:
    """The five category scores for a student who has these skill ids."""
    scores = []
    for category in CATEGORIES:
        in_category = sorted((r for r in requirements if r.category == category), key=lambda r: (-r.importance, r.name))
        total = sum(r.importance for r in in_category)
        if total == 0:
            scores.append(CategoryScore(category, None, None))
            continue
        matched = [r for r in in_category if r.skill_id in have]
        missing = [r for r in in_category if r.skill_id not in have]
        core = sum(r.importance for r in in_category if r.importance >= CORE_IMPORTANCE)
        scores.append(CategoryScore(
            category=category,
            user_score=round(100 * sum(r.importance for r in matched) / total),
            benchmark_score=round(100 * core / total),
            matched=[r.name for r in matched],
            missing=[{"name": r.name, "importance": r.importance} for r in missing],
        ))
    return scores


def overall_fit(scores: List[CategoryScore]) -> Optional[int]:
    """The average of the category scores (categories the role does not ask about are skipped)."""
    values = [s.user_score for s in scores if s.user_score is not None]
    return round(sum(values) / len(values)) if values else None


def biggest_gap(scores: List[CategoryScore]) -> Optional[CategoryScore]:
    """The category where you are furthest below the benchmark (None if you are at or above it everywhere)."""
    gaps = [(s.benchmark_score - s.user_score, s) for s in scores if s.user_score is not None]
    gaps = [(gap, s) for gap, s in gaps if gap > 0]
    return max(gaps, key=lambda pair: pair[0])[1] if gaps else None


def ranked_gaps(requirements: List[Requirement], have: Set[int]) -> List[dict]:
    """Every missing skill, ranked by impact: its share of everything the role asks for."""
    total = sum(r.importance for r in requirements) or 1
    missing = [r for r in requirements if r.skill_id not in have]
    missing.sort(key=lambda r: (-r.importance, r.name))
    return [{"skill": r.name, "category": r.category, "importance": r.importance,
             "impact_pct": round(100 * r.importance / total, 1)} for r in missing]


# ---------------------------------------------------------------------------
# Work values and similar roles (used to rank suggestions)
# ---------------------------------------------------------------------------


def user_values(session: Session, user_id: int) -> List[tuple]:
    """The student's top work values as (WorkValue, rank), best first. Values they made up themselves are
    left out of the maths, because no role is tagged with them."""
    return session.exec(
        select(WorkValue, UserWorkValue.rank)
        .join(UserWorkValue, UserWorkValue.work_value_id == WorkValue.id)
        .where(UserWorkValue.user_id == user_id, WorkValue.added_by_user_id.is_(None))
        .order_by(UserWorkValue.rank)
    ).all()


def role_value_strengths(session: Session) -> Dict[int, Dict[int, float]]:
    """role id -> {work value id -> how strongly the role offers it}."""
    result: Dict[int, Dict[int, float]] = {}
    for rv in session.exec(select(RoleWorkValue)).all():
        result.setdefault(rv.role_id, {})[rv.work_value_id] = rv.strength
    return result


def value_match(values: List[tuple], strengths: Dict[int, float]) -> Optional[int]:
    """0 to 100: how well a role offers the student's top values. Rank 1 counts most."""
    if not values:
        return None
    weights = [(max(1, 6 - rank) / 5, value.id) for value, rank in values]  # rank 1 -> 1.0, 2 -> 0.8, 3 -> 0.6 ...
    return round(100 * sum(w * strengths.get(value_id, 0) for w, value_id in weights) / sum(w for w, _ in weights))


def similarity(a: List[Requirement], b: List[Requirement]) -> float:
    """0 to 1: how alike two roles' skill lists are (cosine similarity of the importance weights)."""
    va = {r.skill_id: r.importance for r in a}
    vb = {r.skill_id: r.importance for r in b}
    dot = sum(v * vb.get(k, 0) for k, v in va.items())
    norm = (sum(v * v for v in va.values()) ** 0.5) * (sum(v * v for v in vb.values()) ** 0.5)
    return dot / norm if norm else 0.0


def combined_rank_score(profile_fit: Optional[int], values_fit: Optional[int]) -> float:
    """One number to sort suggestions by."""
    profile_fit = profile_fit or 0
    if values_fit is None:
        return float(profile_fit)
    return PROFILE_SHARE * profile_fit + VALUES_SHARE * values_fit
