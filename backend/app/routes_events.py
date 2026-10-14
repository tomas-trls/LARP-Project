"""
Routes for things to do: ranked events and ranked venues for the logged-in student.

Both need a login token. Events and venues are separate lists, because events
have dates and venues are always open.
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.auth import get_current_user
from app.database import get_session
from app.events import events_from_db, rank_events, rank_venues, venues_from_db
from app.matching import people_from_db
from app.models import User
from app.schemas import EventOut, VenueOut

router = APIRouter(prefix="/api")


def person_for(session: Session, user: User):
    """The logged-in student as a Person (the shape the scoring code uses)."""
    return next(p for p in people_from_db(session) if p.id == user.id)


@router.get("/events", response_model=list[EventOut])
def my_events(
    type: Optional[Literal["career", "social"]] = Query(None, description="Only career or only social events"),
    area: Optional[Literal["main", "canary", "other"]] = Query(None, description="Only events in this area"),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Upcoming events ranked for me, best first, each with a one-line reason."""
    now = datetime.now(timezone.utc)
    ranked = rank_events(person_for(session, user), events_from_db(session), now, event_type=type, area=area, limit=limit)
    return [
        {
            "event_id": s.item.id, "title": s.item.title, "start_time": s.item.start_time,
            "end_time": s.item.end_time, "location_name": s.item.location_name, "area": s.item.area,
            "event_type": s.item.event_type, "alcohol_role": s.item.alcohol_role,
            "tags": [t.name for t in s.item.tags], "score": round(s.total, 2), "reason": s.reason,
            "source_url": s.item.source_url,
        }
        for s in ranked
    ]


@router.get("/venues", response_model=list[VenueOut])
def my_venues(
    category: Optional[str] = Query(None, description="For example cafe, pub, arcade"),
    area: Optional[Literal["main", "canary", "other"]] = Query(None, description="Only venues in this area"),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Places to go, ranked for me, best first."""
    ranked = rank_venues(person_for(session, user), venues_from_db(session), category=category, area=area, limit=limit)
    return [
        {
            "venue_id": s.item.id, "name": s.item.name, "category": s.item.category, "area": s.item.area,
            "address": s.item.address, "url": s.item.url, "alcohol_role": s.item.alcohol_role,
            "tags": [t.name for t in s.item.tags], "score": round(s.total, 2), "reason": s.reason,
        }
        for s in ranked
    ]
