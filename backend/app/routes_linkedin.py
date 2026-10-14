"""
LinkedIn Max: a queue of students who chose to share their LinkedIn link.

How it works for a student: the app shows one person at a time with a link. The student
opens it, connects on LinkedIn themselves, then presses Next. There is NO LinkedIn API and
nothing is ever sent to LinkedIn by us: LinkedIn prohibits automation, so people click through.

Needs a login token. Only students who ticked "list me in LinkedIn Max" AND have a link appear.
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.matching import make_reason, people_from_db, score_pair
from app.models import User
from app.schemas import LinkedInOut

router = APIRouter(prefix="/api")


@router.get("/linkedin-max", response_model=list[LinkedInOut])
def linkedin_queue(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Opted-in students with a LinkedIn link, the best match for me first. Never includes me."""
    # Who has opted in and has a link to show?
    sharing = {
        u.id: u.linkedin_url
        for u in session.exec(
            select(User).where(User.linkedin_max_optin == True, User.linkedin_url != None, User.id != user.id)  # noqa: E711, E712
        ).all()
        if u.linkedin_url
    }

    # Score each of them against me (a few dozen comparisons is instant), best first; the id breaks ties.
    people = {p.id: p for p in people_from_db(session)}
    me = people[user.id]
    my_tags = {t.name for t in me.tags}
    scored = sorted(
        ((people[uid], score_pair(me, people[uid])) for uid in sharing),
        key=lambda pair: (-pair[1].total, pair[0].id),
    )

    return [
        {
            "user_id": other.id,
            "name": other.name,
            "course": other.course,
            "year": other.year,
            "campus": other.campus,
            "linkedin_url": sharing[other.id],
            "score": round(score.total, 2),
            "shared_tags": sorted(my_tags & {t.name for t in other.tags}),
            "reason": make_reason(me, other, score),
        }
        for other, score in scored[offset : offset + limit]
    ]
