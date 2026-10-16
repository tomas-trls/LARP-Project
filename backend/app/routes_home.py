"""
The Home screen, and the buttons on its event cards.

    GET    /api/home                       greeting, recommended actions, featured event, upcoming feed
    PUT    /api/events/{id}/rsvp           mark an event saved / going / attended ("I went")
    DELETE /api/events/{id}/rsvp           take the mark off

All need a login token. Every feed item carries a "why" line.
"""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app import home
from app import opportunities as opp
from app.auth import get_current_user
from app.database import get_session
from app.models import Event, EventSave, EventSkill, Skill, User

router = APIRouter(prefix="/api")


class RsvpIn(BaseModel):
    status: Literal["saved", "going", "attended"]


@router.get("/home")
def get_home(
    filter: Literal["all", "careers", "social", "societies"] = Query("all", description="Which events the feed shows"),
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Everything the Home screen shows.

    - actions:  up to 3 recommended things to do; the first is the action of the day
    - featured: the best career event coming up in the next two weeks
    - feed:     all upcoming events, soonest first, with filter counts, each with a why line
    - this_week: new jobs and events that build the active route's gap (the weekly digest)
    """
    now = datetime.now(timezone.utc)
    focus, all_cards, career = home.feed(session, user, now)  # the featured event and digest ignore the filter
    counts = home.filter_counts(all_cards)
    shown = all_cards if filter == "all" else [c for c in all_cards if c["category"] == home.CATEGORY_FOR_FILTER[filter]]
    return {
        "greeting": home.greeting(user, now, counts["all"]),
        "active_route": focus.role.name if focus else None,
        "actions": home.build_actions(session, user, now, focus, career),
        "featured": home.pick_featured(all_cards, career, now),
        "filters": counts,
        "feed": shown[:limit],
        "this_week": home.this_week(session, user, now, focus, career),
    }


@router.put("/events/{event_id}/rsvp")
def rsvp(event_id: int, data: RsvpIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Save an event, say you are going, or say you went.

    'attended' only works once the event has started. The answer then suggests the skills the event builds, so the
    student can add the result to their profile (progress follows the profile, not attendance counts):
    send those names to POST /api/profile/skills.
    """
    event = session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="No such event.")
    now = datetime.now(timezone.utc)
    start = opp.aware(event.start_time)
    if data.status == "attended" and (start is None or start > now):
        raise HTTPException(status_code=409, detail="You can only say you went once the event has started.")

    row = session.get(EventSave, (user.id, event_id)) or EventSave(user_id=user.id, event_id=event_id)
    row.status = data.status
    session.add(row)
    session.commit()

    answer = {"event_id": event_id, "status": data.status}
    if data.status == "attended":
        skill_ids = session.exec(select(EventSkill.skill_id).where(EventSkill.event_id == event_id)).all()
        names = sorted(s.name for s in session.exec(select(Skill).where(Skill.id.in_(skill_ids))).all()) if skill_ids else []
        answer["prompt"] = {"message": "Nice. Add what you gained to your profile?", "suggested_skills": names}
    return answer


@router.delete("/events/{event_id}/rsvp")
def remove_rsvp(event_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(EventSave, (user.id, event_id))
    if row is not None:
        session.delete(row)
        session.commit()
    return {"event_id": event_id, "status": None}
