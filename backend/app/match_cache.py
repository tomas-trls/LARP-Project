"""
The saved "top 20 matches" lists (the match_cache table).

Scoring is quick, but it is wasteful to redo it on every page load. So we work
each student's best 20 matches out once, save them, and just read them back.

- rebuild_match_cache   : work out every list from scratch (used by reset_db and when preferences change)
- add_user_to_cache     : a new student joins. Score them against everyone once (N comparisons, not N x N).
                          Scores are symmetrical, so the same numbers also tell us whether the newcomer
                          belongs in anyone else's top 20.
- get_matches           : read one student's saved list, ready to send to the front end
"""

from sqlmodel import Session, delete, select

from app.matching import make_reason, people_from_db, rank_matches, score_pair
from app.models import MatchCache

CACHE_SIZE = 20  # how many matches we keep per student


def rebuild_match_cache(session: Session) -> int:
    """Throw away every saved list and work them all out again. Returns how many rows were saved."""
    session.exec(delete(MatchCache))

    people = people_from_db(session)
    saved = 0
    for person in people:
        for match in rank_matches(person, people, limit=CACHE_SIZE):
            session.add(MatchCache(
                user_id=person.id,
                other_user_id=match.person.id,
                score=match.score.total,
                reason=match.reason,
            ))
            saved += 1
    session.commit()
    return saved


def add_user_to_cache(session: Session, user_id: int) -> None:
    """Score one student against everyone, save their list, and update other people's lists."""
    people = people_from_db(session)
    me = next((p for p in people if p.id == user_id), None)
    if me is None:
        return

    # Forget anything saved about this student before (makes this safe to call twice).
    session.exec(delete(MatchCache).where((MatchCache.user_id == user_id) | (MatchCache.other_user_id == user_id)))

    # Everyone's current saved list, so we can see who the newcomer would push out.
    saved = {}
    for row in session.exec(select(MatchCache)).all():
        saved.setdefault(row.user_id, []).append(row)

    scored = []
    for other in people:
        if other.id == user_id:
            continue
        score = score_pair(me, other)
        scored.append((other, score))

        # 1. Does the newcomer belong in this other student's top 20?
        rows = saved.get(other.id, [])
        new_row = MatchCache(user_id=other.id, other_user_id=me.id, score=score.total,
                             reason=make_reason(other, me, score))
        if len(rows) < CACHE_SIZE:
            session.add(new_row)
        else:
            worst = max(rows, key=lambda r: (-r.score, r.other_user_id))  # lowest score; later id loses a tie
            if (-new_row.score, me.id) < (-worst.score, worst.other_user_id):
                session.delete(worst)
                session.add(new_row)

    # 2. The newcomer's own top 20 (best first; the id breaks ties so the order is always the same).
    scored.sort(key=lambda pair: (-pair[1].total, pair[0].id))
    for other, score in scored[:CACHE_SIZE]:
        session.add(MatchCache(user_id=me.id, other_user_id=other.id, score=score.total,
                               reason=make_reason(me, other, score)))
    session.commit()


def get_matches(session: Session, user_id: int, limit: int = CACHE_SIZE) -> list:
    """One student's saved matches, best first, as plain dictionaries (no emails, hashes or LinkedIn links)."""
    query = (
        select(MatchCache).where(MatchCache.user_id == user_id)
        .order_by(MatchCache.score.desc(), MatchCache.other_user_id).limit(limit)
    )
    rows = session.exec(query).all()
    if not rows:
        # Nothing saved yet (for example the database was filled some other way): work it out now.
        add_user_to_cache(session, user_id)
        rows = session.exec(query).all()

    people = {p.id: p for p in people_from_db(session)}
    my_tags = {t.name for t in people[user_id].tags}

    return [
        {
            "user_id": row.other_user_id,
            "name": people[row.other_user_id].name,
            "course": people[row.other_user_id].course,
            "year": people[row.other_user_id].year,
            "campus": people[row.other_user_id].campus,
            "score": round(row.score, 2),
            "shared_tags": sorted(my_tags & {t.name for t in people[row.other_user_id].tags}),
            "reason": row.reason,
        }
        for row in rows
    ]
