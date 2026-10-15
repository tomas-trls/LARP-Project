"""
Badges: small rewards for things a student has done. The list is in seed/badges.json.

Nothing is stored about progress: every badge is worked out from what the student has really done, so the
numbers can never drift. A badge is saved in user_badge the first time its rule is met.
"""

from typing import Dict, List, Tuple

from sqlmodel import Session, select

from app.models import (
    Badge, Connection, Event, EventSave, Group, GroupMember, SocietyMember, User, UserBadge, UserRoute,
)
from app.notifications import notify

QUIZ_NIGHTS = 3
CONNECTIONS_NEEDED = 10


def progress(session: Session, user: User) -> Dict[str, Tuple[int, int]]:
    """badge code -> (done so far, needed)."""
    attended = session.exec(select(Event).join(EventSave, EventSave.event_id == Event.id)
                            .where(EventSave.user_id == user.id, EventSave.status == "attended")).all()
    societies = session.exec(select(SocietyMember).where(SocietyMember.user_id == user.id)).all()
    groups = session.exec(select(GroupMember).join(Group, Group.id == GroupMember.group_id)
                          .where(GroupMember.user_id == user.id, Group.kind == "event")).all()
    connections = session.exec(select(Connection).where(
        Connection.status == "accepted", (Connection.user_id == user.id) | (Connection.other_user_id == user.id))).all()
    routes = session.exec(select(UserRoute).where(UserRoute.user_id == user.id)).all()
    return {
        "society-member": (min(len(societies), 1), 1),
        "group-goer": (min(len(groups), 1), 1),
        "quiz-regular": (min(sum(1 for e in attended if "quiz" in e.title.lower()), QUIZ_NIGHTS), QUIZ_NIGHTS),
        "first-event": (min(len(attended), 1), 1),
        "connector": (min(len(connections), CONNECTIONS_NEEDED), CONNECTIONS_NEEDED),
        "route-set": (min(len(routes), 1), 1),
    }


def award(session: Session, user: User) -> List[str]:
    """Save any badge whose rule is now met and tell the student. Returns the codes earned just now. Commits."""
    have = {b.badge_code for b in session.exec(select(UserBadge).where(UserBadge.user_id == user.id)).all()}
    names = {b.code: b.name for b in session.exec(select(Badge)).all()}
    new = []
    for code, (done, needed) in progress(session, user).items():
        if code in names and code not in have and done >= needed:
            session.add(UserBadge(user_id=user.id, badge_code=code))
            notify(session, user.id, "event", f"New badge: {names[code]}", None, "/profile")
            new.append(code)
    session.commit()
    return new
