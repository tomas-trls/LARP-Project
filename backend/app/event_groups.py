"""
Event Groups: go to an event with 3 to 5 other students (docs/DESIGN_DECISIONS.md, section 5).

The rules, in plain words:
  - BOOK FIRST. The student books the event on its own booking site, then presses "I've booked" here to join.
  - Students accept a group, never an individual. There is no one-to-one matching for events.
  - Group size is 3 to 5. A group below 3 is 'forming'. At 3 the group chat opens ('open').
  - Matching closes 24 hours before the event ('closed'): after that people can still leave, nobody new joins.
  - If a group falls below 3 it merges into another group for the same event, or stays 'forming' so new people
    can join it (the members return to the pool).
  - Blocked people are never put in the same group.

A group for an event is a normal Group row with kind='event' and first_event_id = that event.
No web code here, so the rules are easy to read and test.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from sqlmodel import Session, select

from app import opportunities as opp
from app.models import Event, EventSave, Group, GroupMember, NoShowFlag, User
from app.notifications import notify
from app.people import blocked_with, is_hidden, social_scorer
from app.matching import people_from_db

GROUP_MIN = 3  # the chat opens at this size
GROUP_MAX = 5
CLOSE_HOURS = 24  # matching closes this long before the event starts


def closes_at(event: Event) -> Optional[datetime]:
    start = opp.aware(event.start_time)
    return start - timedelta(hours=CLOSE_HOURS) if start else None


def matching_closed(event: Event, now: datetime) -> bool:
    """True once it is less than 24 hours to the event (or the event has started)."""
    closing = closes_at(event)
    return closing is not None and now >= closing


def member_ids(session: Session, group_id: int) -> List[int]:
    return list(session.exec(select(GroupMember.user_id).where(GroupMember.group_id == group_id).order_by(GroupMember.user_id)).all())


def groups_for_event(session: Session, event_id: int) -> List[Group]:
    return list(session.exec(select(Group).where(Group.kind == "event", Group.first_event_id == event_id)
                             .order_by(Group.id)).all())


def group_of(session: Session, user_id: int, event_id: int) -> Optional[Group]:
    """The event group this student is in for this event, or None."""
    return session.exec(
        select(Group).join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user_id, Group.kind == "event", Group.first_event_id == event_id)
    ).first()


def refresh_status(session: Session, group: Group, event: Event, now: datetime) -> None:
    """Set the status from the size and the clock. Tells the members when the chat opens. Does not commit."""
    size = len(member_ids(session, group.id))
    before = group.status
    group.status = "closed" if matching_closed(event, now) else ("open" if size >= GROUP_MIN else "forming")
    session.add(group)
    if group.status == "open" and before != "open":
        for uid in member_ids(session, group.id):
            notify(session, uid, "event", f"Your group for {event.title} is ready",
                   "Your group has 3 or more people. The group chat is open.", f"/events/{event.id}/group")


def join(session: Session, user: User, event: Event, now: datetime) -> Group:
    """Put the student in the best event group with room, or start a new one. Safe to call twice."""
    existing = group_of(session, user.id, event.id)
    if existing is not None:
        return existing

    score = social_scorer(session)
    users = {u.id: u for u in session.exec(select(User)).all()}
    avoid = blocked_with(session, user.id)

    best, best_key = None, None
    for group in groups_for_event(session, event.id):
        ids = member_ids(session, group.id)
        if group.status == "closed" or len(ids) >= GROUP_MAX or avoid & set(ids):
            continue
        average = sum(score(user, users[i]) for i in ids) / len(ids)
        key = (round(average, 3), len(ids), -group.id)  # best fit, then the fuller group, then the older one
        if best_key is None or key > best_key:
            best, best_key = group, key

    if best is None:
        best = Group(kind="event", first_event_id=event.id, status="forming")
        session.add(best)
        session.flush()
    session.add(GroupMember(group_id=best.id, user_id=user.id, booked=True))
    session.flush()

    # Joining a group also marks the event as 'going' (unless they already said they went).
    save = session.get(EventSave, (user.id, event.id)) or EventSave(user_id=user.id, event_id=event.id)
    if save.status != "attended":
        save.status = "going"
    session.add(save)

    refresh_status(session, best, event, now)
    session.commit()
    session.refresh(best)
    return best


def leave(session: Session, user: User, event: Event, now: datetime) -> bool:
    """Take the student out of their group. Returns False if they were not in one.

    If the group drops below 3 and matching is still open, it merges into another group for the same event when
    that group has room for everyone. Otherwise it stays 'forming' and new people can join it.
    """
    group = group_of(session, user.id, event.id)
    if group is None:
        return False
    session.delete(session.get(GroupMember, (group.id, user.id)))
    session.flush()

    remaining = member_ids(session, group.id)
    if not remaining:
        session.delete(group)
    else:
        if len(remaining) < GROUP_MIN and not matching_closed(event, now):
            merge_small_group(session, group, remaining, event, now)
        else:
            refresh_status(session, group, event, now)
    session.commit()
    return True


def merge_small_group(session: Session, group: Group, remaining: List[int], event: Event, now: datetime) -> None:
    """Move a too-small group into another group for the same event, if everyone fits and nobody is blocked."""
    for other in groups_for_event(session, event.id):
        if other.id == group.id or other.status == "closed":
            continue
        ids = member_ids(session, other.id)
        if len(ids) + len(remaining) > GROUP_MAX:
            continue
        if any(blocked_with(session, uid) & set(ids) for uid in remaining):
            continue
        for uid in remaining:
            member = session.get(GroupMember, (group.id, uid))
            session.add(GroupMember(group_id=other.id, user_id=uid, booked=member.booked))
            session.delete(member)
        session.flush()
        session.delete(group)
        refresh_status(session, other, event, now)
        return
    refresh_status(session, group, event, now)


def details(session: Session, group: Group, event: Event, me: User, now: datetime) -> dict:
    """The group as the Event Groups screen shows it. Only social information: name, picture and shared hobbies."""
    ids = member_ids(session, group.id)
    persons = {p.id: p for p in people_from_db(session)}
    users = {u.id: u for u in session.exec(select(User).where(User.id.in_(ids))).all()}
    my_hobbies = {t.name for t in persons[me.id].tags}
    members = []
    for uid in ids:
        other = users[uid]
        shared = [] if uid == me.id or is_hidden(other, "hobbies") else sorted(my_hobbies & {t.name for t in persons[uid].tags})
        booked = session.get(GroupMember, (group.id, uid)).booked
        members.append({"user_id": uid, "name": other.name, "avatar_url": other.avatar_url, "is_me": uid == me.id,
                        "booked": booked, "shared_hobbies": shared})
    closing = closes_at(event)
    return {
        "group_id": group.id, "event_id": event.id, "event_title": event.title, "start_time": event.start_time,
        "status": group.status, "size": len(ids), "min_size": GROUP_MIN, "max_size": GROUP_MAX,
        "chat_open": len(ids) >= GROUP_MIN,
        "matching_open": not matching_closed(event, now), "matching_closes_at": closing,
        "members": members,
    }


def flag_no_show(session: Session, group: Group, flagger: User, flagged_id: int) -> int:
    """Record that a group member did not turn up. One flag per pair. Returns how many flags that member has."""
    session.add(NoShowFlag(group_id=group.id, flagger_id=flagger.id, flagged_id=flagged_id))
    member = session.get(GroupMember, (group.id, flagged_id))
    member.no_show_flags += 1
    session.add(member)
    session.commit()
    return member.no_show_flags
