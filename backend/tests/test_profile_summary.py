"""Checks the Profile tab summary and the badges."""

import pytest
from sqlmodel import select

from app.models import Connection, EventSave, Notification
from app.seed_career import load_career_data
from app.seed_societies import load_societies
from tests.test_opportunities import add_event
from tests.test_people import aim_for, make


@pytest.fixture
def directory(session):
    load_career_data(session)
    load_societies(session)


def summary(client, headers):
    return client.get("/api/profile/summary", headers=headers).json()


def test_summary_needs_a_login_and_starts_empty(client, directory):
    assert client.get("/api/profile/summary").status_code == 401
    me, _ = make(client, 1)
    answer = summary(client, me)
    assert answer["user"]["name"] == "Student 1"
    assert answer["stats"] == {"events_attended": 0, "connections": 0, "societies": 0, "event_groups": 0}
    assert answer["badges"]["earned"] == [] and answer["badges"]["newly_earned"] == []
    assert len(answer["badges"]["locked"]) == 6
    assert answer["connections"] == [] and answer["requests_waiting"] == 0
    assert answer["active_route"] is None and answer["saved_routes"] == []
    assert answer["settings"]["notifications"] == {"match": True, "message": True, "event": True, "role": True}
    assert answer["settings"]["theme"] == "light" and answer["settings"]["hidden_fields"] == []


def test_stats_active_route_and_saved_routes(client, session, directory):
    me, my_id = make(client, 1)
    aim_for(client, me, ["Excel"])
    other, other_id = make(client, 2)
    client.post("/api/connections", headers=me, json={"user_id": other_id})
    client.post("/api/connections", headers=other, json={"user_id": my_id})
    event = add_event(session, "Talk", days=3)
    session.add(EventSave(user_id=my_id, event_id=event.id, status="attended"))
    session.commit()
    client.put(f"/api/societies/{client.get('/api/societies', headers=me).json()['societies'][0]['id']}/membership", headers=me)

    answer = summary(client, me)
    assert [(c["user_id"], c["name"]) for c in answer["connections"]] == [(other_id, "Student 2")]  # who I am connected with
    assert answer["connections"][0]["kind"] == "career" and "ucl_email" not in answer["connections"][0]
    assert answer["stats"] == {"events_attended": 1, "connections": 1, "societies": 1, "event_groups": 0}
    assert answer["active_route"]["title"] == "Data Analyst" and len(answer["active_route"]["scores"]) == 5
    assert [r["title"] for r in answer["saved_routes"]] == ["Data Analyst"] and answer["saved_routes"][0]["is_active"] is True
    assert answer["profile_progress"]["has_route"] is True


def test_badges_are_earned_once_announced_and_locked_ones_show_progress(client, session, directory):
    me, my_id = make(client, 1)
    aim_for(client, me, ["Excel"])
    event = add_event(session, "Talk", days=3)
    session.add(EventSave(user_id=my_id, event_id=event.id, status="attended"))
    session.commit()
    drama = next(s for s in client.get("/api/societies", headers=me).json()["societies"] if s["name"] == "Drama Society")
    client.put(f"/api/societies/{drama['id']}/membership", headers=me)

    first = summary(client, me)["badges"]
    assert sorted(first["newly_earned"]) == ["first-event", "route-set", "society-member"]
    assert sorted(b["code"] for b in first["earned"]) == ["first-event", "route-set", "society-member"]
    assert {b["code"]: b["progress"] for b in first["locked"]}["connector"] == {"current": 0, "target": 10}
    again = summary(client, me)["badges"]
    assert again["newly_earned"] == [] and len(again["earned"]) == 3  # earned once, not again
    titles = [n.title for n in session.exec(select(Notification).where(Notification.user_id == my_id)).all()]
    assert sorted(titles) == ["New badge: First event", "New badge: Route set", "New badge: Society member"]


def test_quiz_regular_needs_three_quiz_nights_and_connector_needs_ten_connections(client, session, directory):
    me, my_id = make(client, 1)
    for n in range(1, 4):
        quiz = add_event(session, f"Pub Quiz {n}", category="social", days=-n)
        session.add(EventSave(user_id=my_id, event_id=quiz.id, status="attended"))
    session.commit()
    assert "quiz-regular" in summary(client, me)["badges"]["newly_earned"]

    for n in range(2, 12):
        _, other_id = make(client, n)
        session.add(Connection(user_id=my_id, other_user_id=other_id, status="accepted"))
    session.commit()
    assert "connector" in summary(client, me)["badges"]["newly_earned"]
    assert summary(client, me)["stats"]["connections"] == 10
