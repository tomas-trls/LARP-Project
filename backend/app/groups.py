"""
Auto-pairing: building groups of students who suit each other.

The idea is "greedy": start with one student and keep adding whoever fits the
group best, until the group is full or nobody fits well enough any more.
"How well someone fits a group" = their average score against the members so far.

This file has no web code, so the rules are easy to read and test.
"""

from collections import Counter
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.events import best_event_for_group, events_from_db
from app.matching import Person, people_from_db, score_pair
from app.models import Group, GroupMember, User

GROUP_TARGET = 5  # stop adding people at this size
GROUP_MAX = 6  # a group can grow to this when someone joins later
GROUP_MIN = 3  # smaller than this is not a group (the demo minimum)
THRESHOLD = 0.35  # a candidate must average at least this against the members


def average_score(person: Person, members: list) -> float:
    """How well `person` fits the people in `members` (the average of their scores)."""
    return sum(score_pair(person, m).total for m in members) / len(members)


def group_for_user(session: Session, user_id: int) -> Optional[Group]:
    """The group this student is in, or None."""
    membership = session.exec(select(GroupMember).where(GroupMember.user_id == user_id)).first()
    return session.get(Group, membership.group_id) if membership else None


def pair_user(session: Session, user: User) -> Optional[Group]:
    """
    Put a student in a group:
      1. already in one: nothing changes;
      2. join the best existing group that has room, if they fit it (average 0.35 or more);
      3. otherwise start a new group around them from the students waiting for one.
    Returns the group, or None if there are not yet enough suitable people (they wait).
    """
    existing = group_for_user(session, user.id)
    if existing:
        return existing

    # Asking to be paired puts them in the pool, even if no group forms right now.
    user.auto_pair_opt_in = True
    session.add(user)
    session.commit()

    people = {p.id: p for p in people_from_db(session)}
    me = people[user.id]

    # Who is in which group right now.
    members_of = {}
    for row in session.exec(select(GroupMember)).all():
        members_of.setdefault(row.group_id, []).append(row.user_id)
    grouped_ids = {uid for ids in members_of.values() for uid in ids}

    # Step 2: the best existing group with a free place.
    best_group, best_average = None, 0.0
    for group_id in sorted(members_of):
        ids = members_of[group_id]
        if len(ids) >= GROUP_MAX:
            continue
        average = average_score(me, [people[i] for i in ids])
        if average > best_average:
            best_group, best_average = group_id, average
    if best_group is not None and best_average >= THRESHOLD:
        session.add(GroupMember(group_id=best_group, user_id=user.id))
        session.commit()
        return session.get(Group, best_group)

    # Step 3: a new group. Candidates = students who asked to be paired and have no group yet.
    waiting_ids = session.exec(select(User.id).where(User.auto_pair_opt_in == True)).all()  # noqa: E712
    candidates = [people[i] for i in sorted(waiting_ids) if i != user.id and i not in grouped_ids]

    members = [me]
    while candidates and len(members) < GROUP_TARGET:
        # The candidate who fits the current members best (the lower id wins a tie).
        best = max(candidates, key=lambda c: (average_score(c, members), -c.id))
        if average_score(best, members) < THRESHOLD:
            break
        members.append(best)
        candidates.remove(best)

    if len(members) < GROUP_MIN:
        return None  # not enough suitable people yet: the student waits

    group = Group()
    session.add(group)
    session.flush()  # gives the group an id
    for member in members:
        session.add(GroupMember(group_id=group.id, user_id=member.id))
    session.commit()
    session.refresh(group)
    return group


def group_details(session: Session, group: Group) -> dict:
    """A group as the front end needs it: who is in it and what they share. No emails or LinkedIn links."""
    member_ids = set(session.exec(select(GroupMember.user_id).where(GroupMember.group_id == group.id)).all())
    members = [p for p in people_from_db(session) if p.id in member_ids]

    # Interests that at least two members picked, most popular first.
    counts = Counter(tag.name for p in members for tag in p.tags)
    shared = sorted((name for name, n in counts.items() if n >= 2), key=lambda name: (-counts[name], name))

    return {
        "id": group.id,
        "members": [
            {"user_id": p.id, "name": p.name, "course": p.course, "year": p.year, "campus": p.campus}
            for p in members
        ],
        "shared_interests": shared[:5],
        "first_event": choose_first_event(session, group, members),
    }


def choose_first_event(session: Session, group: Group, members: list) -> Optional[dict]:
    """
    The best event for the whole group (see events.best_event_for_group), saved on the group.
    Worked out each time so it never points at an event that has since passed. None if nothing suits everyone.
    """
    best = best_event_for_group(members, events_from_db(session), datetime.now(timezone.utc))

    new_id = best.item.id if best else None
    if group.first_event_id != new_id:
        group.first_event_id = new_id
        session.add(group)
        session.commit()
    if best is None:
        return None

    event = best.item
    return {
        "event_id": event.id, "title": event.title, "start_time": event.start_time,
        "location_name": event.location_name, "area": event.area, "event_type": event.event_type,
        "alcohol_role": event.alcohol_role, "reason": best.reason,
    }
