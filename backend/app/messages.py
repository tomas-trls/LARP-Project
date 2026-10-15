"""
The logic behind Messages (docs/DESIGN_DECISIONS.md, section 6): group chats and one-to-one chats between
mutual connections only.

  - DIRECT chat: two people. Allowed only while they are connected (both accepted) and neither has blocked the other.
  - GROUP chat: one per Event Group. It exists once the group has 3 members. Who may read it is decided by who is
    in the group RIGHT NOW, so someone who leaves loses access straight away.

Messages are stored in tables; the front end polls (asks again every few seconds with ?after=<last message id>).
No web code here, so the rules are easy to read and test.
"""

from datetime import datetime
from typing import List, Optional

from sqlmodel import Session, select

from app import opportunities as opp
from app import people
from app.event_groups import GROUP_MIN, member_ids
from app.models import (
    Conversation, ConversationMember, Event, Group, GroupMember, Message, Notification, User,
)
from app.notifications import notify

PREVIEW = 80  # characters of the last message shown in the list


def find_direct(session: Session, a: int, b: int) -> Optional[Conversation]:
    """The one-to-one chat between two people, if it exists."""
    mine = select(ConversationMember.conversation_id).where(ConversationMember.user_id == a)
    theirs = select(ConversationMember.conversation_id).where(ConversationMember.user_id == b)
    return session.exec(select(Conversation).where(
        Conversation.kind == "direct", Conversation.id.in_(mine), Conversation.id.in_(theirs))).first()


def can_message(session: Session, me_id: int, other_id: int) -> bool:
    """True if the two people are connected and neither blocked the other."""
    if other_id in people.blocked_with(session, me_id):
        return False
    return people.connection_state(me_id, people.connection_between(session, me_id, other_id)) == "connected"


def ensure_direct(session: Session, a: int, b: int) -> Conversation:
    """The chat between two connected people (made on first use). Does not commit."""
    chat = find_direct(session, a, b)
    if chat is None:
        chat = Conversation(kind="direct")
        session.add(chat)
        session.flush()
        for uid in (a, b):
            session.add(ConversationMember(conversation_id=chat.id, user_id=uid))
        session.flush()
    return chat


def sync_group_chat(session: Session, group: Group) -> Optional[Conversation]:
    """The group's chat, made once it has 3 members, with its members kept equal to the group's. Does not commit."""
    ids = member_ids(session, group.id)
    chat = session.exec(select(Conversation).where(Conversation.kind == "group", Conversation.group_id == group.id)).first()
    if chat is None:
        if len(ids) < GROUP_MIN:
            return None
        event = session.get(Event, group.first_event_id)
        chat = Conversation(kind="group", group_id=group.id, event_id=group.first_event_id, title=event.title if event else "Event group")
        session.add(chat)
        session.flush()
    have = {m.user_id: m for m in session.exec(select(ConversationMember).where(ConversationMember.conversation_id == chat.id)).all()}
    for uid in ids:
        if uid not in have:
            session.add(ConversationMember(conversation_id=chat.id, user_id=uid))
    for uid, row in have.items():
        if uid not in ids:
            session.delete(row)
    session.flush()
    return chat


def sync_my_group_chats(session: Session, user: User) -> None:
    """Make sure every group I am in that has 3 or more members has its chat. Does not commit."""
    for group in session.exec(select(Group).join(GroupMember, GroupMember.group_id == Group.id)
                              .where(GroupMember.user_id == user.id, Group.kind == "event")).all():
        sync_group_chat(session, group)


def can_read(session: Session, chat: Conversation, user: User) -> bool:
    """Is this person allowed to see this chat right now?"""
    if chat.kind == "group":
        return session.get(GroupMember, (chat.group_id, user.id)) is not None
    member = session.get(ConversationMember, (chat.id, user.id))
    if member is None:
        return False
    other = session.exec(select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == chat.id, ConversationMember.user_id != user.id)).first()
    return other is not None and other not in people.blocked_with(session, user.id)


def can_send(session: Session, chat: Conversation, user: User) -> Optional[str]:
    """None if the person may post, otherwise the reason they may not."""
    if chat.kind == "group":
        if len(member_ids(session, chat.group_id)) < GROUP_MIN:
            return "The group chat is closed while the group has fewer than 3 people."
        return None
    other = session.exec(select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == chat.id, ConversationMember.user_id != user.id)).first()
    if other is None or not can_message(session, user.id, other):
        return "You can only message people you are connected to."
    return None


def get_chat(session: Session, chat_id: int, user: User) -> Optional[Conversation]:
    """The chat if it exists and this person may read it, otherwise None (so strangers learn nothing)."""
    chat = session.get(Conversation, chat_id)
    if chat is None or not can_read(session, chat, user):
        return None
    if chat.kind == "group":
        sync_group_chat(session, session.get(Group, chat.group_id))  # also gives a newcomer their read marker
    return chat


def unread_count(session: Session, chat: Conversation, user: User) -> int:
    member = session.get(ConversationMember, (chat.id, user.id))
    last = opp.aware(member.last_read_at) if member and member.last_read_at else None
    rows = session.exec(select(Message).where(Message.conversation_id == chat.id, Message.sender_id != user.id)).all()
    return sum(1 for m in rows if last is None or opp.aware(m.created_at) > last)


def summary(session: Session, chat: Conversation, user: User) -> dict:
    last = session.exec(select(Message).where(Message.conversation_id == chat.id)
                        .order_by(Message.id.desc())).first()
    member = session.get(ConversationMember, (chat.id, user.id))
    item = {
        "conversation_id": chat.id, "kind": chat.kind, "title": chat.title, "event_id": chat.event_id,
        "unread": unread_count(session, chat, user), "muted": bool(member and member.muted),
        "last_message": {"body": last.body[:PREVIEW], "sender_id": last.sender_id, "created_at": last.created_at} if last else None,
        "updated_at": last.created_at if last else chat.created_at,
    }
    if chat.kind == "direct":
        other_id = session.exec(select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == chat.id, ConversationMember.user_id != user.id)).first()
        other = session.get(User, other_id)
        item["title"] = other.name
        item["other_user"] = {"user_id": other.id, "name": other.name, "avatar_url": other.avatar_url}
        item["can_send"] = can_send(session, chat, user) is None
    else:
        item["can_send"] = can_send(session, chat, user) is None
    return item


def my_chats(session: Session, user: User) -> List[dict]:
    """All chats I can read, latest message first."""
    sync_my_group_chats(session, user)
    ids = session.exec(select(ConversationMember.conversation_id).where(ConversationMember.user_id == user.id)).all()
    chats = [c for c in session.exec(select(Conversation).where(Conversation.id.in_(ids))).all() if can_read(session, c, user)] if ids else []
    items = [summary(session, c, user) for c in chats]
    items.sort(key=lambda i: (opp.aware(i["updated_at"]), i["conversation_id"]), reverse=True)
    return items


def send(session: Session, chat: Conversation, sender: User, body: str, now: datetime) -> Message:
    """Add a message and tell the other members (one alert per chat until they read it). Commits."""
    message = Message(conversation_id=chat.id, sender_id=sender.id, body=body, created_at=now)
    session.add(message)
    session.flush()
    link = f"/messages/{chat.id}"
    title = f"New message from {sender.name}" if chat.kind == "direct" else f"New message in {chat.title}"
    for row in session.exec(select(ConversationMember).where(ConversationMember.conversation_id == chat.id)).all():
        if row.user_id == sender.id or row.muted:
            continue
        waiting = session.exec(select(Notification).where(
            Notification.user_id == row.user_id, Notification.kind == "message", Notification.link == link,
            Notification.read_at.is_(None))).first()
        if waiting is not None:  # keep one alert per chat instead of one per message
            waiting.title, waiting.body, waiting.created_at = title, body[:140], now
            session.add(waiting)
        else:
            notify(session, row.user_id, "message", title, body[:140], link)
    session.commit()
    return message


def mark_read(session: Session, chat: Conversation, user: User, now: datetime) -> None:
    member = session.get(ConversationMember, (chat.id, user.id))
    if member is not None:
        member.last_read_at = now
        session.add(member)
    # Reading a chat also clears its alert.
    for note in session.exec(select(Notification).where(
            Notification.user_id == user.id, Notification.kind == "message", Notification.link == f"/messages/{chat.id}",
            Notification.read_at.is_(None))).all():
        note.read_at = now
        session.add(note)
    session.commit()
