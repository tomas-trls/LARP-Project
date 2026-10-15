"""
The People tab: who to meet, connecting, following, blocking and reporting.

    GET    /api/people/career            alumni in my active role + students further along (with a reason each)
    GET    /api/people/social            people who share hobbies / personality / societies (never career data)
    POST   /api/connections              ask to connect (or accept, if they already asked me)
    GET    /api/connections              my connections, requests to me, requests I sent
    PUT    /api/connections/{id}         accept or decline a request sent to me
    DELETE /api/connections/{id}         withdraw a request or remove a connection
    GET    /api/follows                  people I follow          PUT/DELETE /api/follows/{user_id}
    GET    /api/blocks                   people I blocked         PUT/DELETE /api/blocks/{user_id}
    POST   /api/reports                  report a person or a group to the moderator

All need a login token. Messaging is only possible between accepted connections.
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session, delete, select

from app import people, starters
from app.auth import get_current_user
from app.database import get_session
from app.models import Block, Connection, Follow, Group, GroupMember, Report, User
from app.notifications import notify

router = APIRouter(prefix="/api")


def find_person(session: Session, me: User, user_id: int) -> User:
    """Another person I am allowed to deal with. Missing, blocked and removed accounts all look the same: 404."""
    other = session.get(User, user_id)
    if (other is None or other.id == me.id or other.account_status in people.SKIPPED_ACCOUNTS
            or user_id in people.blocked_with(session, me.id)):
        raise HTTPException(status_code=404, detail="No such person.")
    return other


# ---------- the two lists ----------

@router.get("/people/career")
def people_career(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Alumni who hold or held my active role, then students further along the same route. Career fields only."""
    return people.career_list(session, user, datetime.now(timezone.utc))


@router.get("/people/social")
def people_social(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """People ranked by shared hobbies, similar personality (if both took the check) and shared societies."""
    return people.social_list(session, user, datetime.now(timezone.utc))


@router.get("/people/{user_id}")
def person_profile(user_id: int, view: Literal["career", "social"] = "social", user: User = Depends(get_current_user),
                   session: Session = Depends(get_session)):
    """Another student's profile. view=career shows experience and skills; view=social shows hobbies, personality and
    societies. Fields they hide are left out, and the two views never mix. Includes a conversation starter."""
    other = find_person(session, user, user_id)
    now = datetime.now(timezone.utc)
    answer = people.profile_view(session, user, other, view, now)
    answer["starter"] = starters.conversation_starter(session, user, other, view)
    return answer


# ---------- connections ----------

class ConnectIn(BaseModel):
    user_id: int
    kind: Literal["career", "social"] = "career"
    note: Optional[str] = Field(default=None, max_length=300)


class ConnectAnswerIn(BaseModel):
    action: Literal["accept", "decline"]


@router.post("/connections", status_code=201)
def connect(data: ConnectIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Ask to connect. If that person already asked me, this accepts it (both sides opted in)."""
    other = find_person(session, user, data.user_id)
    now = datetime.now(timezone.utc)
    existing = people.connection_between(session, user.id, other.id)

    if existing is not None and existing.status == "accepted":
        raise HTTPException(status_code=409, detail="You are already connected.")
    if existing is not None and existing.user_id == user.id:  # my own earlier request (even if they declined it)
        raise HTTPException(status_code=409, detail="You have already sent a request to this person.")
    if existing is not None and existing.status == "pending":  # they asked me first: connecting is mutual now
        existing.status = "accepted"
        session.add(existing)
        notify(session, other.id, "match", f"{user.name} accepted your request", None, "/connections")
        session.commit()
        return {"connection_id": existing.id, "status": "accepted"}

    if not people.accepting_requests(session, other, now):
        raise HTTPException(status_code=409, detail=f"{other.name} is not taking new requests this month. Try again next month.")

    if existing is not None:  # I had declined them earlier; now I am the one asking
        existing.user_id, existing.other_user_id = user.id, other.id
        existing.status, existing.kind, existing.note, existing.created_at = "pending", data.kind, data.note, now
        row = existing
    else:
        row = Connection(user_id=user.id, other_user_id=other.id, kind=data.kind, note=data.note)
    session.add(row)
    notify(session, other.id, "match", f"{user.name} wants to connect", data.note, "/connections")
    session.commit()
    return {"connection_id": row.id, "status": "pending"}


@router.get("/connections")
def my_connections(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """connections = accepted; incoming = waiting for my answer; outgoing = I asked (a decline is never shown)."""
    return people.connection_lists(session, user)


@router.put("/connections/{connection_id}")
def answer_connection(connection_id: int, data: ConnectAnswerIn, user: User = Depends(get_current_user),
                      session: Session = Depends(get_session)):
    """Accept or decline a request someone sent me. The sender is never told about a decline."""
    row = session.get(Connection, connection_id)
    if row is None or row.other_user_id != user.id:
        raise HTTPException(status_code=404, detail="No such request.")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail=f"This request was already {row.status}.")
    row.status = "accepted" if data.action == "accept" else "declined"
    session.add(row)
    if row.status == "accepted":
        notify(session, row.user_id, "match", f"{user.name} accepted your request", None, "/connections")
    session.commit()
    return {"connection_id": row.id, "status": row.status}


@router.delete("/connections/{connection_id}")
def remove_connection(connection_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Withdraw a request I sent, or remove a connection. Either person can do this."""
    row = session.get(Connection, connection_id)
    if row is None or user.id not in (row.user_id, row.other_user_id):
        raise HTTPException(status_code=404, detail="No such connection.")
    session.delete(row)
    session.commit()
    return {"connection_id": connection_id, "status": None}


# ---------- follows ----------

@router.get("/follows")
def my_follows(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    blocked = people.blocked_with(session, user.id)
    ids = [i for i in people.follows_of(session, user.id) if i not in blocked]
    users = session.exec(select(User).where(User.id.in_(ids)).order_by(User.id)).all() if ids else []
    followers = session.exec(select(Follow).where(Follow.followed_user_id == user.id)).all()
    return {"following": [people.person_card(u) for u in users], "followers": len([f for f in followers if f.user_id not in blocked])}


@router.put("/follows/{user_id}")
def follow(user_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Follow someone (one way, no permission needed). Saying it twice does nothing."""
    other = find_person(session, user, user_id)
    if session.get(Follow, (user.id, other.id)) is None:
        session.add(Follow(user_id=user.id, followed_user_id=other.id))
        session.commit()
    return {"user_id": other.id, "following": True}


@router.delete("/follows/{user_id}")
def unfollow(user_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(Follow, (user.id, user_id))
    if row is not None:
        session.delete(row)
        session.commit()
    return {"user_id": user_id, "following": False}


# ---------- block and report ----------

@router.get("/blocks")
def my_blocks(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    ids = list(session.exec(select(Block.blocked_user_id).where(Block.user_id == user.id)).all())
    users = session.exec(select(User).where(User.id.in_(ids)).order_by(User.id)).all() if ids else []
    return {"blocked": [{"user_id": u.id, "name": u.name} for u in users]}


@router.put("/blocks/{user_id}")
def block(user_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Block someone: neither of you sees the other, and any connection or follow between you is removed.

    It does not remove either of you from an Event Group you share. Leave the group yourself if you want to.
    """
    other = session.get(User, user_id)
    if other is None or other.id == user.id:
        raise HTTPException(status_code=404, detail="No such person.")
    if session.get(Block, (user.id, other.id)) is None:
        session.add(Block(user_id=user.id, blocked_user_id=other.id))
    link = people.connection_between(session, user.id, other.id)
    if link is not None:
        session.delete(link)
    session.exec(delete(Follow).where(((Follow.user_id == user.id) & (Follow.followed_user_id == other.id))
                                      | ((Follow.user_id == other.id) & (Follow.followed_user_id == user.id))))
    session.commit()
    return {"user_id": other.id, "blocked": True}


@router.delete("/blocks/{user_id}")
def unblock(user_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.get(Block, (user.id, user_id))
    if row is not None:
        session.delete(row)
        session.commit()
    return {"user_id": user_id, "blocked": False}


class ReportIn(BaseModel):
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    message_id: Optional[int] = None  # a message in a chat you can read
    reason: str = Field(min_length=5, max_length=600)

    @model_validator(mode="after")
    def needs_someone_to_report(self):
        if self.user_id is None and self.group_id is None and self.message_id is None:
            raise ValueError("Say what you are reporting: a person (user_id), a group (group_id) or a message (message_id).")
        return self


@router.post("/reports", status_code=201)
def report(data: ReportIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Report a person or a group. The pilot moderator reads it (aim: within 24 hours). The person is not told."""
    if data.user_id is not None and (data.user_id == user.id or session.get(User, data.user_id) is None):
        raise HTTPException(status_code=404, detail="No such person.")
    if data.group_id is not None:
        # You can only report a group you are in.
        if session.get(Group, data.group_id) is None or session.get(GroupMember, (data.group_id, user.id)) is None:
            raise HTTPException(status_code=404, detail="No such group.")
    reported_id = data.user_id
    if data.message_id is not None:
        from app import messages
        from app.models import Message

        message = session.get(Message, data.message_id)
        chat = messages.get_chat(session, message.conversation_id, user) if message else None
        if chat is None or message.sender_id == user.id:
            raise HTTPException(status_code=404, detail="No such message.")
        reported_id = message.sender_id  # the report is about the person who wrote it
    row = Report(reporter_id=user.id, reported_user_id=reported_id, group_id=data.group_id,
                 message_id=data.message_id, reason=data.reason)
    session.add(row)
    session.commit()
    return {"report_id": row.id, "status": row.status}
