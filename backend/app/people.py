"""
The logic behind the People tab: who to show, and the rules for connecting.

Two lists, kept apart on purpose (docs/DESIGN_DECISIONS.md, sections 4 and 8):
  - CAREER: alumni who hold or held the student's active role, and students further along the same route.
            Uses career fields only (experience, skills, route). Never hobbies or personality.
  - SOCIAL: people who share hobbies, similar personality (optional Big Five) and societies.
            Never career data.

Plain rules, no AI, so every "reason" line can be explained. No web code in this file.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from sqlmodel import Session, select

from app import fit
from app import opportunities as opp
from app.matching import Person, interest_score, people_from_db
from app.models import (
    Block, Connection, Experience, Follow, RoleAlias, Society, SocietyMember, User, UserRoute,
)

LIST_SIZE = 20
SKIPPED_ACCOUNTS = ("suspended", "banned")  # people the moderator has removed do not show up


# ---------------------------------------------------------------------------
# Who can see whom
# ---------------------------------------------------------------------------


def blocked_with(session: Session, user_id: int) -> Set[int]:
    """Ids of everyone I blocked or who blocked me. Blocking works both ways: neither side sees the other."""
    rows = session.exec(select(Block).where((Block.user_id == user_id) | (Block.blocked_user_id == user_id))).all()
    return {b.blocked_user_id if b.user_id == user_id else b.user_id for b in rows}


def is_hidden(user: User, field: str) -> bool:
    """True if the student chose to hide this profile field from other people."""
    return field in (user.hidden_fields or [])


def visible_users(session: Session, me: User) -> List[User]:
    """Everyone I could be shown: not me, not blocked either way, not suspended or banned."""
    blocked = blocked_with(session, me.id)
    return [u for u in session.exec(select(User).order_by(User.id)).all()
            if u.id != me.id and u.id not in blocked and u.account_status not in SKIPPED_ACCOUNTS]


# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------


def month_start(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def requests_this_month(session: Session, user_id: int, now: datetime) -> int:
    """How many connection requests this person has received since the 1st of the month (any answer)."""
    start = month_start(now)
    rows = session.exec(select(Connection).where(Connection.other_user_id == user_id)).all()
    return sum(1 for c in rows if (opp.aware(c.created_at) or start) >= start)


def accepting_requests(session: Session, user: User, now: datetime) -> bool:
    """Alumni can set a monthly limit. Once it is reached they stop accepting new requests until next month."""
    limit = user.max_alumni_requests_per_month
    if not user.is_alumni or limit is None:
        return True
    return requests_this_month(session, user.id, now) < limit


def connection_between(session: Session, a: int, b: int) -> Optional[Connection]:
    """The connection row between two people, whoever sent it."""
    return session.exec(select(Connection).where(
        ((Connection.user_id == a) & (Connection.other_user_id == b))
        | ((Connection.user_id == b) & (Connection.other_user_id == a)))).first()


def connection_state(me_id: int, conn: Optional[Connection]) -> str:
    """What the button should say: none, connected, requested (I asked) or incoming (they asked me).

    A request the other person declined still shows as 'requested' to the sender: nobody is told 'no'.
    """
    if conn is None:
        return "none"
    if conn.status == "accepted":
        return "connected"
    if conn.user_id == me_id:
        return "requested"
    return "incoming" if conn.status == "pending" else "none"


def connection_states(session: Session, me_id: int) -> Dict[int, str]:
    """other person's id -> connection state, for everyone I have any connection row with."""
    rows = session.exec(select(Connection).where((Connection.user_id == me_id) | (Connection.other_user_id == me_id))).all()
    return {(c.other_user_id if c.user_id == me_id else c.user_id): connection_state(me_id, c) for c in rows}


def follows_of(session: Session, me_id: int) -> Set[int]:
    return set(session.exec(select(Follow.followed_user_id).where(Follow.user_id == me_id)).all())


# ---------------------------------------------------------------------------
# People -> Career
# ---------------------------------------------------------------------------


def role_terms(session: Session, role) -> Set[str]:
    """The role's name plus other titles that mean the same role (all lower case)."""
    terms = {role.name.lower()}
    terms |= {a.term for a in session.exec(select(RoleAlias).where(RoleAlias.role_id == role.id)).all()}
    return terms


def career_list(session: Session, me: User, now: datetime) -> dict:
    """Alumni in (or from) the active role, then students further along the same route."""
    focus = opp.active_focus(session, me)
    if focus is None:
        return {"active_route": None, "people": []}

    terms = role_terms(session, focus.role)
    states = connection_states(session, me.id)
    my_fit = fit.overall_fit(fit.score_requirements(focus.requirements, focus.have))
    skill_names = {r.skill_id: r.name for r in focus.requirements}
    found = []

    for other in visible_users(session, me):
        card = {
            "user_id": other.id, "name": other.name, "avatar_url": other.avatar_url, "headline": other.headline,
            "course": other.course, "year": other.year, "is_alumni": other.is_alumni,
            "connection": states.get(other.id, "none"),
            "accepting_requests": accepting_requests(session, other, now),
        }
        # An alumnus (or alumna) with a matching job title.
        if other.is_alumni and not is_hidden(other, "experience"):
            jobs = session.exec(select(Experience).where(
                Experience.user_id == other.id, Experience.kind.in_(["job", "internship"]))).all()
            hits = [j for j in jobs if any(t in j.title.lower() for t in terms)]
            if hits:
                job = sorted(hits, key=lambda j: j.end is not None)[0]  # a current job comes first
                current = job.end is None
                card.update(kind="alumnus", organisation=job.organisation, role_title=job.title, skills_to_learn=[],
                            reason=f"{'Works' if current else 'Worked'} as {job.title} at {job.organisation}")
                found.append((200 if current else 150, card))
                continue
        # A student on the same route who has more of the role's skills than I do.
        if not other.is_alumni and not is_hidden(other, "skills"):
            route = session.exec(select(UserRoute).where(
                UserRoute.user_id == other.id, UserRoute.is_active.is_(True), UserRoute.role_id == focus.role.id)).first()
            if route is None:
                continue
            theirs = fit.user_skill_ids(session, other.id)
            their_fit = fit.overall_fit(fit.score_requirements(focus.requirements, theirs))
            if their_fit is None or my_fit is None or their_fit <= my_fit:
                continue
            learn = sorted((skill_names[s] for s in (theirs & set(focus.missing))), key=str.lower)
            card.update(kind="student", organisation=None, role_title=None, skills_to_learn=learn[:3],
                        reason=f"Further along the same route ({focus.role.name})"
                               + (f" and has {', '.join(learn[:3])}" if learn else ""))
            found.append((50 + len(learn), card))

    found.sort(key=lambda pair: (-pair[0], pair[1]["user_id"]))
    return {"active_route": focus.role.name, "people": [card for _, card in found[:LIST_SIZE]]}


# ---------------------------------------------------------------------------
# People -> Social
# ---------------------------------------------------------------------------

W_HOBBIES, W_PERSONALITY, W_SOCIETIES = 0.6, 0.2, 0.2  # when both people took the Big Five check
W_HOBBIES_ONLY, W_SOCIETIES_ONLY = 0.75, 0.25  # when either did not


def personality_similarity(a: dict, b: dict) -> Optional[float]:
    """0 to 1: how close two Big Five results are, trait by trait. None if either is missing."""
    traits = set(a or {}) & set(b or {})
    if not traits:
        return None
    gap = sum(abs(a[t] - b[t]) for t in traits) / len(traits)  # 0 to 4 on the 1-5 scale
    return round(1 - gap / 4, 3)


def society_ids_of(session: Session) -> Dict[int, Set[int]]:
    """user id -> ids of the societies they joined."""
    result: Dict[int, Set[int]] = {}
    for row in session.exec(select(SocietyMember)).all():
        result.setdefault(row.user_id, set()).add(row.society_id)
    return result


def social_fit(me: User, other: User, me_person: Person, other_person: Person,
               my_societies: Set[int], their_societies: Set[int]) -> dict:
    """Score two people on hobbies, personality and societies only. Respects fields they hide."""
    hobbies = 0.0 if is_hidden(other, "hobbies") else interest_score(me_person, other_person)
    shared_hobbies = [] if is_hidden(other, "hobbies") else sorted(
        {t.name for t in me_person.tags} & {t.name for t in other_person.tags})
    shared_societies = set() if is_hidden(other, "societies") else my_societies & their_societies
    society_part = min(len(shared_societies), 3) / 3
    personality = None if is_hidden(other, "personality") else personality_similarity(me.big_five, other.big_five)
    if personality is None:
        total = W_HOBBIES_ONLY * hobbies + W_SOCIETIES_ONLY * society_part
    else:
        total = W_HOBBIES * hobbies + W_PERSONALITY * personality + W_SOCIETIES * society_part
    return {"total": total, "hobbies": hobbies, "shared_hobbies": shared_hobbies,
            "shared_societies": shared_societies, "personality": personality}


def social_reason(fitted: dict, society_names: Dict[int, str]) -> str:
    parts = []
    if fitted["shared_hobbies"]:
        parts.append("You both like " + " and ".join(fitted["shared_hobbies"][:3]))
    elif fitted["hobbies"] > 0:
        parts.append("Similar interests")
    if fitted["shared_societies"]:
        names = sorted(society_names[s] for s in fitted["shared_societies"])
        parts.append("both in " + " and ".join(names[:2]))
    if fitted["personality"] is not None and fitted["personality"] >= 0.8:
        parts.append("similar personality")
    return ". ".join(p[0].upper() + p[1:] if i == 0 else p for i, p in enumerate(parts)) or "Could be a good match"


def social_list(session: Session, me: User, now: datetime) -> dict:
    """People ranked by hobbies, personality and shared societies. Nothing about careers is used or shown."""
    persons = {p.id: p for p in people_from_db(session)}
    memberships = society_ids_of(session)
    society_names = {s.id: s.name for s in session.exec(select(Society)).all()}
    my_societies = set() if is_hidden(me, "societies") else memberships.get(me.id, set())
    states = connection_states(session, me.id)
    followed = follows_of(session, me.id)

    ranked = []
    for other in visible_users(session, me):
        fitted = social_fit(me, other, persons[me.id], persons[other.id], my_societies, memberships.get(other.id, set()))
        if fitted["total"] <= 0:
            continue
        ranked.append((fitted["total"], other, fitted))
    ranked.sort(key=lambda row: (-row[0], row[1].id))

    return {"people": [{
        "user_id": other.id, "name": other.name, "avatar_url": other.avatar_url,
        "match_pct": round(fitted["total"] * 100), "reason": social_reason(fitted, society_names),
        "shared_hobbies": fitted["shared_hobbies"],
        "shared_societies": sorted(society_names[s] for s in fitted["shared_societies"]),
        "connection": states.get(other.id, "none"), "following": other.id in followed,
    } for _, other, fitted in ranked[:LIST_SIZE]]}


def social_scorer(session: Session):
    """Returns a function score(a, b) -> 0 to 1: how well two people fit socially. Used to place people in
    event groups. The data is loaded once here, so scoring many pairs stays fast."""
    persons = {p.id: p for p in people_from_db(session)}
    memberships = society_ids_of(session)

    def score(a: User, b: User) -> float:
        return social_fit(a, b, persons[a.id], persons[b.id], memberships.get(a.id, set()), memberships.get(b.id, set()))["total"]

    return score
