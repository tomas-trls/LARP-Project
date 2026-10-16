"""
Messages and notifications.

    GET    /api/conversations                       my chats, latest first, with unread counts
    POST   /api/conversations                       open (or find) a one-to-one chat with a connection
    GET    /api/conversations/{id}/messages         the messages; poll with ?after=<last message id>
    POST   /api/conversations/{id}/messages         send a message
    PUT    /api/conversations/{id}                  mute / unmute a chat
    GET    /api/notifications                       my alerts (unread_only, limit)
    POST   /api/notifications/read-all              mark every alert as read
    PUT    /api/notifications/{id}/read             mark one alert as read
    GET    /api/notifications/preferences           which kinds of alert are on
    PUT    /api/notifications/preferences           switch kinds on or off

Only group chats (Event Groups) and chats between mutual connections exist: see messages.py.
All need a login token. The front end polls: call GET .../messages?after=<id> every few seconds.
"""

from datetime import datetime, timezone
from typing import Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app import messages
from app.auth import get_current_user
from app.database import get_session
from app.models import ConversationMember, Message, Notification, NotificationPref, User
from app.routes_people import find_person

router = APIRouter(prefix="/api")

NOTIFICATION_KINDS = ("match", "message", "event", "role")  # connections, messages, events and groups, jobs and society roles


def chat_or_404(session: Session, chat_id: int, user: User):
    chat = messages.get_chat(session, chat_id, user)
    if chat is None:
        raise HTTPException(status_code=404, detail="No such conversation.")
    return chat


# ---------- conversations ----------

@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """All my chats, latest message first. unread_total is for the badge on the Messages tab."""
    items = messages.my_chats(session, user)
    session.commit()
    return {"unread_total": sum(i["unread"] for i in items), "conversations": items}


class OpenChatIn(BaseModel):
    user_id: int


@router.post("/conversations")
def open_direct(data: OpenChatIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Open the one-to-one chat with a connection (made if it does not exist yet). Strangers get a 403."""
    other = find_person(session, user, data.user_id)
    if not messages.can_message(session, user.id, other.id):
        raise HTTPException(status_code=403, detail="You can only message people you are connected to.")
    chat = messages.ensure_direct(session, user.id, other.id)
    session.commit()
    return messages.summary(session, chat, user)


@router.get("/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    after: Optional[int] = Query(None, ge=0, description="Only messages newer than this message id (for polling)"),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Messages oldest first. Without `after` you get the latest `limit`; with it, everything newer. Marks the chat as read."""
    chat = chat_or_404(session, conversation_id, user)
    query = select(Message).where(Message.conversation_id == chat.id)
    if after is not None:
        rows = session.exec(query.where(Message.id > after).order_by(Message.id).limit(limit)).all()
    else:
        rows = list(reversed(session.exec(query.order_by(Message.id.desc()).limit(limit)).all()))
    names = {u.id: u.name for u in session.exec(select(User).where(User.id.in_({m.sender_id for m in rows}))).all()} if rows else {}
    messages.mark_read(session, chat, user, datetime.now(timezone.utc))
    return {
        "conversation_id": chat.id,
        "messages": [{"id": m.id, "sender_id": m.sender_id, "sender_name": names.get(m.sender_id), "body": m.body,
                      "created_at": m.created_at, "mine": m.sender_id == user.id} for m in rows],
        "can_send": messages.can_send(session, chat, user) is None,
    }


class SendIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


@router.post("/conversations/{conversation_id}/messages", status_code=201)
def send_message(conversation_id: int, data: SendIn, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)):
    chat = chat_or_404(session, conversation_id, user)
    body = data.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="The message is empty.")
    reason = messages.can_send(session, chat, user)
    if reason:
        raise HTTPException(status_code=403, detail=reason)
    message = messages.send(session, chat, user, body, datetime.now(timezone.utc))
    messages.mark_read(session, chat, user, message.created_at)  # my own message is not 'unread' for me
    return {"id": message.id, "created_at": message.created_at}


class MuteIn(BaseModel):
    muted: bool


@router.put("/conversations/{conversation_id}")
def mute_conversation(conversation_id: int, data: MuteIn, user: User = Depends(get_current_user),
                      session: Session = Depends(get_session)):
    """Mute a chat: no alerts for new messages (they still arrive)."""
    chat = chat_or_404(session, conversation_id, user)
    member = session.get(ConversationMember, (chat.id, user.id))
    member.muted = data.muted
    session.add(member)
    session.commit()
    return {"conversation_id": chat.id, "muted": member.muted}


# ---------- notifications ----------

def note_out(n: Notification) -> dict:
    return {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "link": n.link,
            "read": n.read_at is not None, "created_at": n.created_at}


@router.get("/notifications")
def list_notifications(unread_only: bool = False, limit: int = Query(30, ge=1, le=100),
                       user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    query = select(Notification).where(Notification.user_id == user.id)
    unread = len(session.exec(query.where(Notification.read_at.is_(None))).all())
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    rows = session.exec(query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)).all()
    return {"unread_count": unread, "notifications": [note_out(n) for n in rows]}


@router.post("/notifications/read-all")
def read_all(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    now = datetime.now(timezone.utc)
    rows = session.exec(select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))).all()
    for n in rows:
        n.read_at = now
        session.add(n)
    session.commit()
    return {"marked": len(rows)}


@router.get("/notifications/preferences")
def get_preferences(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return {"preferences": preferences(session, user)}


def preferences(session: Session, user: User) -> Dict[str, bool]:
    """kind -> on/off. A kind with no saved choice is on."""
    saved = {p.kind: p.enabled for p in session.exec(select(NotificationPref).where(NotificationPref.user_id == user.id)).all()}
    return {kind: saved.get(kind, True) for kind in NOTIFICATION_KINDS}


class PrefsIn(BaseModel):
    preferences: Dict[Literal["match", "message", "event", "role"], bool] = Field(min_length=1)


@router.put("/notifications/preferences")
def set_preferences(data: PrefsIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Send only the kinds you want to change, e.g. {"preferences": {"message": false}}."""
    for kind, enabled in data.preferences.items():
        row = session.get(NotificationPref, (user.id, kind)) or NotificationPref(user_id=user.id, kind=kind)
        row.enabled = enabled
        session.add(row)
    session.commit()
    return {"preferences": preferences(session, user)}


@router.put("/notifications/{notification_id}/read")
def read_one(notification_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    note = session.get(Notification, notification_id)
    if note is None or note.user_id != user.id:
        raise HTTPException(status_code=404, detail="No such notification.")
    if note.read_at is None:
        note.read_at = datetime.now(timezone.utc)
        session.add(note)
        session.commit()
    return note_out(note)
