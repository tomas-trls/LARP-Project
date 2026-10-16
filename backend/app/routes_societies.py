"""
The Societies tab: a read-only view of the societies in the Students' Union events, and their events.

    GET    /api/societies                    every known society (mine first), with how many events are coming up
    GET    /api/societies/events             upcoming events from the societies I am in (scope=all for every society)
    GET    /api/societies/{id}               one society and its upcoming events
    PUT    /api/societies/{id}/membership    say "I'm in this society" (self-reported)      DELETE: take it off

LARP does not create or run societies. All need a login token.
"""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app import home, societies
from app.auth import get_current_user
from app.database import get_session
from app.models import Event, Society, SocietyMember, User

router = APIRouter(prefix="/api")


def get_society(session: Session, society_id: int) -> Society:
    society = session.get(Society, society_id)
    if society is None:
        raise HTTPException(status_code=404, detail="No such society.")
    return society


@router.get("/societies")
def directory(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """The societies LARP knows about (those in the Students' Union events). The ones I am in come first."""
    cards = societies.directory(session, user, datetime.now(timezone.utc))
    return {"total": len(cards), "societies": cards}


@router.get("/societies/events")
def society_events(
    scope: Literal["mine", "all"] = Query("mine", description="mine = only societies I am in"),
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Upcoming society events, soonest first, each with a why line. Career events run by a society are included
    (they keep their own category). If you are in no societies yet, `my_societies` is 0 and you can use scope=all."""
    mine = {m.society_id for m in session.exec(select(SocietyMember).where(SocietyMember.user_id == user.id)).all()}
    names = {s.id: s.name for s in session.exec(select(Society)).all()}
    _, cards, _ = home.feed(session, user, datetime.now(timezone.utc))
    linked = {e.id: e.society_id for e in session.exec(select(Event).where(Event.society_id.is_not(None))).all()}
    events = [dict(c, society=names[linked[c["event_id"]]]) for c in cards if c["event_id"] in linked]
    if scope == "mine":
        events = [c for c in events if linked[c["event_id"]] in mine]
    return {"my_societies": len(mine), "events": events[:limit]}


@router.get("/societies/{society_id}")
def society_page(society_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return societies.detail(session, user, get_society(session, society_id), datetime.now(timezone.utc))


@router.put("/societies/{society_id}/membership")
def join_society(society_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Say you are in this society (self-reported: LARP cannot see the Students' Union member lists)."""
    society = get_society(session, society_id)
    if session.get(SocietyMember, (society_id, user.id)) is None:
        session.add(SocietyMember(society_id=society_id, user_id=user.id))
        session.flush()
        society.member_count = len(session.exec(select(SocietyMember).where(SocietyMember.society_id == society_id)).all())
        session.add(society)
        session.commit()
    return {"society_id": society_id, "joined": True}


@router.delete("/societies/{society_id}/membership")
def leave_society(society_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    society = get_society(session, society_id)
    row = session.get(SocietyMember, (society_id, user.id))
    if row is not None:
        session.delete(row)
        session.flush()
        society.member_count = len(session.exec(select(SocietyMember).where(SocietyMember.society_id == society_id)).all())
        session.add(society)
        session.commit()
    return {"society_id": society_id, "joined": False}
