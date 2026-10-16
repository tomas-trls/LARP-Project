"""Checks Messages and notifications: who may chat, polling, unread counts, alerts, muting, reports and starters."""

from datetime import datetime, timezone

from sqlmodel import select

from app import settings, starters
from app.models import Experience, Notification, User
from tests.test_event_groups import book
from tests.test_opportunities import add_event
from tests.test_people import aim_for, career, make, set_user  # noqa: F401  (career is a test fixture)


def connect(client, a, b):
    """Make (headers a, id a) and (headers b, id b) mutual connections."""
    client.post("/api/connections", headers=a[0], json={"user_id": b[1]})
    client.post("/api/connections", headers=b[0], json={"user_id": a[1]})


def open_chat(client, me, other_id):
    return client.post("/api/conversations", headers=me, json={"user_id": other_id}).json()["conversation_id"]


def say(client, headers, chat, text):
    return client.post(f"/api/conversations/{chat}/messages", headers=headers, json={"body": text})


# ---------- one-to-one chats ----------

def test_strangers_cannot_start_a_chat_but_connections_can(client):
    a, b = make(client, 1), make(client, 2)
    assert client.post("/api/conversations", headers=a[0], json={"user_id": b[1]}).status_code == 403
    assert client.post("/api/conversations", json={"user_id": b[1]}).status_code == 401
    client.post("/api/connections", headers=a[0], json={"user_id": b[1]})  # only requested so far
    assert client.post("/api/conversations", headers=a[0], json={"user_id": b[1]}).status_code == 403
    client.post("/api/connections", headers=b[0], json={"user_id": a[1]})
    chat = open_chat(client, a[0], b[1])
    assert open_chat(client, b[0], a[1]) == chat  # one chat for the pair, whoever opens it


def test_sending_polling_and_unread_counts(client):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    first = say(client, a[0], chat, "Hi Student 2!").json()["id"]
    say(client, a[0], chat, "Fancy a coffee?")

    inbox = client.get("/api/conversations", headers=b[0]).json()
    assert inbox["unread_total"] == 2
    item = inbox["conversations"][0]
    assert item["kind"] == "direct" and item["title"] == "Student 1" and item["unread"] == 2
    assert item["last_message"]["body"] == "Fancy a coffee?" and item["can_send"] is True
    assert client.get("/api/conversations", headers=a[0]).json()["unread_total"] == 0  # my own messages are not unread

    seen = client.get(f"/api/conversations/{chat}/messages", headers=b[0]).json()
    assert [m["body"] for m in seen["messages"]] == ["Hi Student 2!", "Fancy a coffee?"]
    assert seen["messages"][0]["sender_name"] == "Student 1" and seen["messages"][0]["mine"] is False
    assert client.get("/api/conversations", headers=b[0]).json()["unread_total"] == 0  # reading clears it

    last = seen["messages"][-1]["id"]
    assert client.get(f"/api/conversations/{chat}/messages", headers=b[0], params={"after": last}).json()["messages"] == []
    say(client, b[0], chat, "Yes please!")
    newer = client.get(f"/api/conversations/{chat}/messages", headers=a[0], params={"after": first}).json()["messages"]
    assert [m["body"] for m in newer] == ["Fancy a coffee?", "Yes please!"]  # polling returns only what is new
    assert newer[1]["mine"] is False


def test_message_rules(client):
    a, b, c = make(client, 1), make(client, 2), make(client, 3)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    assert say(client, a[0], chat, "   ").status_code == 422
    assert say(client, a[0], chat, "x" * 1001).status_code == 422
    assert say(client, c[0], chat, "I'm not in this chat").status_code == 404  # outsiders learn nothing
    assert client.get(f"/api/conversations/{chat}/messages", headers=c[0]).status_code == 404
    assert client.get("/api/conversations/999/messages", headers=a[0]).status_code == 404
    assert client.get("/api/conversations", headers=c[0]).json()["conversations"] == []


def test_removing_a_connection_stops_new_messages_but_keeps_the_history(client):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    say(client, a[0], chat, "Hello")
    connection_id = client.get("/api/connections", headers=a[0]).json()["connections"][0]["connection_id"]
    client.delete(f"/api/connections/{connection_id}", headers=a[0])
    assert say(client, b[0], chat, "Still there?").status_code == 403
    seen = client.get(f"/api/conversations/{chat}/messages", headers=b[0]).json()
    assert [m["body"] for m in seen["messages"]] == ["Hello"] and seen["can_send"] is False


def test_blocking_hides_the_chat_for_both(client):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    client.put(f"/api/blocks/{b[1]}", headers=a[0])
    for headers in (a[0], b[0]):
        assert client.get("/api/conversations", headers=headers).json()["conversations"] == []
        assert client.get(f"/api/conversations/{chat}/messages", headers=headers).status_code == 404


# ---------- alerts ----------

def test_a_new_message_makes_one_alert_per_chat_until_read(client, session):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    session.exec(select(Notification)).all()
    chat = open_chat(client, a[0], b[1])
    say(client, a[0], chat, "One")
    say(client, a[0], chat, "Two")
    alerts = [n for n in client.get("/api/notifications", headers=b[0]).json()["notifications"] if n["kind"] == "message"]
    assert len(alerts) == 1 and alerts[0]["body"] == "Two" and alerts[0]["title"] == "New message from Student 1"
    client.get(f"/api/conversations/{chat}/messages", headers=b[0])  # reading the chat clears its alert
    unread = client.get("/api/notifications", headers=b[0], params={"unread_only": True}).json()["notifications"]
    assert [n["kind"] for n in unread] == ["match"]  # only the earlier connection alert is left
    say(client, a[0], chat, "Three")
    unread = client.get("/api/notifications", headers=b[0], params={"unread_only": True}).json()["notifications"]
    assert sorted(n["kind"] for n in unread) == ["match", "message"]


def test_muting_a_chat_and_switching_alerts_off(client, session):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    for note in session.exec(select(Notification)).all():
        session.delete(note)
    session.commit()
    assert client.put(f"/api/conversations/{chat}", headers=b[0], json={"muted": True}).json()["muted"] is True
    say(client, a[0], chat, "Psst")
    assert session.exec(select(Notification).where(Notification.kind == "message")).all() == []  # muted: no alert
    assert client.get("/api/conversations", headers=b[0]).json()["unread_total"] == 1  # but the message still arrived

    client.put(f"/api/conversations/{chat}", headers=b[0], json={"muted": False})
    prefs = client.put("/api/notifications/preferences", headers=b[0], json={"preferences": {"message": False}}).json()
    assert prefs["preferences"] == {"match": True, "message": False, "event": True, "role": True}
    say(client, a[0], chat, "Another")
    assert session.exec(select(Notification).where(Notification.kind == "message")).all() == []
    assert client.put("/api/notifications/preferences", headers=b[0], json={"preferences": {"nonsense": True}}).status_code == 422
    assert client.get("/api/notifications/preferences", headers=b[0]).json()["preferences"]["message"] is False


def test_notification_list_mark_read(client):
    a, b = make(client, 1), make(client, 2)
    client.post("/api/connections", headers=a[0], json={"user_id": b[1]})
    client.post("/api/connections", headers=a[0], json={"user_id": b[1]})  # second one is refused: no new alert
    listing = client.get("/api/notifications", headers=b[0]).json()
    assert listing["unread_count"] == 1
    note_id = listing["notifications"][0]["id"]
    assert client.put(f"/api/notifications/{note_id}/read", headers=a[0]).status_code == 404  # not yours
    assert client.put(f"/api/notifications/{note_id}/read", headers=b[0]).json()["read"] is True
    assert client.get("/api/notifications", headers=b[0]).json()["unread_count"] == 0
    assert client.post("/api/notifications/read-all", headers=b[0]).json() == {"marked": 0}


# ---------- group chats ----------

def test_group_chat_opens_at_three_and_follows_the_group(client, session):
    people = [make(client, n) for n in (1, 2, 3, 4)]
    event = add_event(session, "Gig", category="social", days=5)
    for p in people[:2]:
        book(client, p[0], event.id)
    assert client.get("/api/conversations", headers=people[0][0]).json()["conversations"] == []  # only 2: no chat yet
    book(client, people[2][0], event.id)

    inbox = client.get("/api/conversations", headers=people[0][0]).json()["conversations"]
    assert len(inbox) == 1 and inbox[0]["kind"] == "group" and inbox[0]["title"] == "Gig"
    chat = inbox[0]["conversation_id"]
    assert say(client, people[0][0], chat, "Meet at the entrance at 7?").status_code == 201
    assert say(client, people[1][0], chat, "See you there").status_code == 201

    book(client, people[3][0], event.id)  # a newcomer can read and write straight away
    assert len(client.get(f"/api/conversations/{chat}/messages", headers=people[3][0]).json()["messages"]) == 2

    client.delete(f"/api/events/{event.id}/group", headers=people[3][0])  # leaving removes access at once
    assert client.get(f"/api/conversations/{chat}/messages", headers=people[3][0]).status_code == 404
    assert say(client, people[3][0], chat, "Still here?").status_code == 404


def test_group_chat_closes_when_the_group_drops_below_three(client, session):
    people = [make(client, n) for n in (1, 2, 3)]
    event = add_event(session, "Gig", category="social", days=5)
    for p in people:
        book(client, p[0], event.id)
    chat = client.get("/api/conversations", headers=people[0][0]).json()["conversations"][0]["conversation_id"]
    client.delete(f"/api/events/{event.id}/group", headers=people[2][0])
    reply = say(client, people[0][0], chat, "Hello?")
    assert reply.status_code == 403 and "fewer than 3" in reply.json()["detail"]
    assert client.get(f"/api/conversations/{chat}/messages", headers=people[0][0]).json()["can_send"] is False


# ---------- reporting a message ----------

def test_report_a_message(client):
    a, b = make(client, 1), make(client, 2)
    connect(client, a, b)
    chat = open_chat(client, a[0], b[1])
    message_id = say(client, a[0], chat, "Something rude").json()["id"]
    outsider = make(client, 3)[0]
    assert client.post("/api/reports", headers=outsider, json={"message_id": message_id, "reason": "Seen it"}).status_code == 404
    assert client.post("/api/reports", headers=a[0], json={"message_id": message_id, "reason": "My own"}).status_code == 404
    report = client.post("/api/reports", headers=b[0], json={"message_id": message_id, "reason": "Rude message"})
    assert report.status_code == 201
    inbox = client.get("/api/admin/reports", headers={"X-Admin-Key": settings.ADMIN_KEY}).json()["reports"]
    assert inbox[0]["reported_user_id"] == a[1]  # the report is about the sender


# ---------- people profile view and conversation starters ----------

def test_profile_views_keep_career_and_social_apart_and_respect_hidden_fields(client, session):
    me = make(client, 1)
    other, other_id = make(client, 2)
    session.add(Experience(user_id=other_id, title="Data Analyst", organisation="Acme", kind="job"))
    session.commit()
    set_user(session, other_id, headline="Analyst", bio="Hello", hometown="Leeds")

    social = client.get(f"/api/people/{other_id}", headers=me[0]).json()  # social is the default view
    assert social["view"] == "social" and social["bio"] == "Hello" and social["hobbies"]
    assert not {"experience", "skills", "headline", "course", "education"} & set(social)

    career = client.get(f"/api/people/{other_id}", headers=me[0], params={"view": "career"}).json()
    assert career["experience"][0]["organisation"] == "Acme" and career["headline"] == "Analyst"
    assert not {"hobbies", "bio", "personality", "societies", "hometown"} & set(career)
    assert "ucl_email" not in career and "linkedin_url" not in career

    set_user(session, other_id, hidden_fields=["hobbies", "experience", "bio"])
    assert client.get(f"/api/people/{other_id}", headers=me[0]).json()["hobbies"] is None
    assert client.get(f"/api/people/{other_id}", headers=me[0]).json()["bio"] is None
    assert client.get(f"/api/people/{other_id}", headers=me[0], params={"view": "career"}).json()["experience"] is None

    client.put(f"/api/blocks/{other_id}", headers=me[0])
    assert client.get(f"/api/people/{other_id}", headers=me[0]).status_code == 404
    assert client.get("/api/people/999", headers=me[0]).status_code == 404
    assert client.get(f"/api/people/{other_id}").status_code == 401


def test_social_starter_uses_only_shared_hobbies_and_societies(client, session):
    me, me_id = make(client, 1)
    _, other_id = make(client, 2)
    answer = client.get(f"/api/people/{other_id}", headers=me).json()["starter"]
    assert answer["source"] == "template"
    assert "Hi Student" in answer["text"] and "both like" in answer["text"]
    set_user(session, other_id, hidden_fields=["hobbies"])
    assert "both like" not in client.get(f"/api/people/{other_id}", headers=me).json()["starter"]["text"]  # hidden: not used


def test_career_starter_mentions_their_role_and_never_hobbies(client, session, career):
    me, _ = make(client, 1)
    aim_for(client, me, ["Excel"])
    _, other_id = make(client, 2)
    session.add(Experience(user_id=other_id, title="Senior Data Analyst", organisation="Deloitte", kind="job"))
    session.commit()
    text = client.get(f"/api/people/{other_id}", headers=me, params={"view": "career"}).json()["starter"]["text"]
    assert "Senior Data Analyst at Deloitte" in text and "both like" not in text


def test_claude_writes_the_starter_when_live_and_it_is_saved(client, session, monkeypatch):
    me, me_id = make(client, 1)
    _, other_id = make(client, 2)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    calls = []

    class Block:
        type, text = "text", "Hey! Fellow chess fan? Fancy a game sometime?"

    class FakeClient:
        class messages:
            @staticmethod
            def create(**kwargs):
                calls.append(kwargs)
                return type("Reply", (), {"content": [Block()]})()

    monkeypatch.setattr(starters, "make_client", lambda: FakeClient())
    first = client.get(f"/api/people/{other_id}", headers=me).json()["starter"]
    second = client.get(f"/api/people/{other_id}", headers=me).json()["starter"]
    assert first == second == {"text": Block.text, "source": "claude"}
    assert len(calls) == 1  # asked once, then read from the saved answer
    assert "Student 2" not in str(calls[0]["messages"])  # only the first name is sent to Claude


def test_a_failing_claude_falls_back_to_the_template(client, session, monkeypatch):
    me, _ = make(client, 1)
    _, other_id = make(client, 2)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(settings, "DEMO_MODE", False)

    class Broken:
        class messages:
            @staticmethod
            def create(**kwargs):
                raise RuntimeError("down")

    monkeypatch.setattr(starters, "make_client", lambda: Broken())
    assert client.get(f"/api/people/{other_id}", headers=me).json()["starter"]["source"] == "template"
