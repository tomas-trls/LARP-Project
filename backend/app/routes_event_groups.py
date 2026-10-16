"""
Event Groups: book an event yourself, then join a group of 3 to 5 going to the same event.

    POST   /api/events/{id}/group            "I've booked" - join (or start) a group for this event
    GET    /api/events/{id}/group            my group for this event
    DELETE /api/events/{id}/group            leave the group
    GET    /api/event-groups                 my groups for events that have not ended
    POST   /api/groups/{id}/members/{user_id}/no-show    flag a member who did not turn up

All need a login token. The rules are in event_groups.py.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app import event_groups as eg
from app import opportunities as opp
from app.auth import get_current_user
from app.database import get_session
from app.models import Event, Group, GroupMember, NoShowFlag, User

router = APIRouter(prefix="/api")


class BookedIn(BaseModel):
    booked: bool  # must be true: you book the event yourself first, then press "I've booked"


def get_event(session: Session, event_id: int) -> Event:
    event = session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="No such event.")
    return event


@router.post("/events/{event_id}/group")
def join_group(event_id: int, data: BookedIn, user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    """Press "I've booked": you are put in the best group with room, or start a new one. Safe to call twice."""
    if not data.booked:
        raise HTTPException(status_code=422, detail="Book the event first, then press 'I've booked'.")
    event = get_event(session, event_id)
    now = datetime.now(timezone.utc)
    if eg.group_of(session, user.id, event.id) is None:  # people already in a group may ask again; new joiners need these
        start = opp.aware(event.start_time)
        if start is not None and start <= now:
            raise HTTPException(status_code=409, detail="This event has already started.")
        if eg.matching_closed(event, now):
            raise HTTPException(status_code=409, detail="Group matching closed 24 hours before the event.")
    group = eg.join(session, user, event, now)
    return eg.details(session, group, event, user, now)


@router.get("/events/{event_id}/group")
def my_group(event_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    event = get_event(session, event_id)
    group = eg.group_of(session, user.id, event.id)
    if group is None:
        raise HTTPException(status_code=404, detail="You are not in a group for this event.")
    now = datetime.now(timezone.utc)
    eg.refresh_status(session, group, event, now)  # the clock may have closed matching since the last visit
    session.commit()
    return eg.details(session, group, event, user, now)


@router.delete("/events/{event_id}/group")
def leave_group(event_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Leave your group. Allowed at any time, including after matching has closed."""
    event = get_event(session, event_id)
    left = eg.leave(session, user, event, datetime.now(timezone.utc))
    return {"event_id": event_id, "left": left}


@router.get("/event-groups")
def my_event_groups(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Every group I am in for an event that has not ended, soonest event first."""
    now = datetime.now(timezone.utc)
    rows = session.exec(
        select(Group, Event).join(GroupMember, GroupMember.group_id == Group.id)
        .join(Event, Event.id == Group.first_event_id)
        .where(GroupMember.user_id == user.id, Group.kind == "event")
    ).all()
    far = datetime.max.replace(tzinfo=timezone.utc)
    rows = [(g, e) for g, e in rows if (opp.aware(e.end_time or e.start_time) or far) >= now]
    rows.sort(key=lambda pair: opp.aware(pair[1].start_time) or far)
    return {"groups": [eg.details(session, g, e, user, now) for g, e in rows]}


@router.post("/groups/{group_id}/members/{user_id}/no-show", status_code=201)
def flag_no_show(group_id: int, user_id: int, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)):
    """Say a group member did not turn up. Only members of the group, only after the event has started, once each."""
    group = session.get(Group, group_id)
    if group is None or group.kind != "event" or session.get(GroupMember, (group_id, user.id)) is None:
        raise HTTPException(status_code=404, detail="No such group.")
    if user_id == user.id or session.get(GroupMember, (group_id, user_id)) is None:
        raise HTTPException(status_code=404, detail="That person is not in this group.")
    event = session.get(Event, group.first_event_id)
    start = opp.aware(event.start_time)
    if start is None or start > datetime.now(timezone.utc):
        raise HTTPException(status_code=409, detail="You can only flag a no-show once the event has started.")
    if session.get(NoShowFlag, (group_id, user.id, user_id)) is not None:
        raise HTTPException(status_code=409, detail="You have already flagged this person.")
    return {"flagged": True, "flags": eg.flag_no_show(session, group, user, user_id)}
