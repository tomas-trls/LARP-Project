"""Checks the People tab: career and social lists, connections, follows, block, report and moderation."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app import settings
from app.models import Connection, Experience, Notification, NotificationPref, User
from app.people import personality_similarity
from app.seed_career import load_career_data
from tests.test_auth import auth_header, register


@pytest.fixture
def career(session):
    load_career_data(session)


def make(client, n, tag_ids=(1, 23)):
    """Register student number n and return (login header, user id)."""
    body = register(client, name=f"Student {n}", ucl_email=f"s{n}@ucl.ac.uk", tag_ids=list(tag_ids)).json()
    return auth_header(body["token"]), body["user"]["id"]


def set_user(session, user_id, **fields):
    user = session.get(User, user_id)
    for name, value in fields.items():
        setattr(user, name, value)
    session.add(user)
    session.commit()


def far_apart_tags(client):
    """Two interest tags from different categories, so they share nothing at all."""
    categories = client.get("/api/tags").json()
    first = categories[0]["subgroups"][0]["tags"][0]["id"]
    last = categories[-1]["subgroups"][-1]["tags"][-1]["id"]
    return first, last


def aim_for(client, headers, skills, role="Data Analyst"):
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": skills, "languages": []})
    client.post("/api/routes", headers=headers, json={"title": role})


# ---------- the maths ----------

def test_personality_similarity():
    same = {"extraversion": 4.0, "openness": 3.0}
    assert personality_similarity(same, dict(same)) == 1.0
    assert personality_similarity({"extraversion": 1.0}, {"extraversion": 5.0}) == 0.0
    assert personality_similarity({}, same) is None  # one of them never took the check


# ---------- People -> Career ----------

def test_career_list_is_empty_without_an_active_route(client, career):
    me, _ = make(client, 1)
    assert client.get("/api/people/career", headers=me).json() == {"active_route": None, "people": []}
    assert client.get("/api/people/career").status_code == 401


def test_career_list_shows_alumni_in_the_role_and_students_further_along(client, session, career):
    me, my_id = make(client, 1)
    aim_for(client, me, ["Excel"])

    alum, alum_id = make(client, 2)
    set_user(session, alum_id, is_alumni=True, headline="Senior Data Analyst at Deloitte")
    session.add(Experience(user_id=alum_id, title="Senior Data Analyst", organisation="Deloitte", kind="job"))
    other_alum, other_id = make(client, 3)  # an alumnus in a different job: not listed
    set_user(session, other_id, is_alumni=True)
    session.add(Experience(user_id=other_id, title="Chef", organisation="Ritz", kind="job"))
    session.commit()

    ahead, ahead_id = make(client, 4)
    aim_for(client, ahead, ["Excel", "SQL", "Python"])
    level, _ = make(client, 5)  # same skills as me: not "further along"
    aim_for(client, level, ["Excel"])
    elsewhere, _ = make(client, 6)  # far ahead but aiming at a different role
    aim_for(client, elsewhere, ["Excel", "SQL", "Python"], role="Product Manager")

    answer = client.get("/api/people/career", headers=me).json()
    assert answer["active_route"] == "Data Analyst"
    people = answer["people"]
    assert [p["user_id"] for p in people] == [alum_id, ahead_id]  # alumni first
    assert people[0]["reason"] == "Works as Senior Data Analyst at Deloitte" and people[0]["kind"] == "alumnus"
    assert people[1]["kind"] == "student" and "Further along the same route" in people[1]["reason"]
    assert {"SQL", "Python"} & set(people[1]["skills_to_learn"])
    assert all(p["connection"] == "none" and p["accepting_requests"] for p in people)


def test_career_list_never_shows_hobbies_or_personality_and_respects_hidden_fields(client, session, career):
    me, _ = make(client, 1)
    aim_for(client, me, ["Excel"])
    alum, alum_id = make(client, 2)
    set_user(session, alum_id, is_alumni=True)
    session.add(Experience(user_id=alum_id, title="Data Analyst", organisation="Acme", kind="job"))
    session.commit()
    card = client.get("/api/people/career", headers=me).json()["people"][0]
    assert not {"shared_hobbies", "big_five", "hobbies", "tags"} & set(card)
    set_user(session, alum_id, hidden_fields=["experience"])  # hides the job, so no career match is possible
    assert client.get("/api/people/career", headers=me).json()["people"] == []


# ---------- People -> Social ----------

def test_social_list_ranks_by_shared_hobbies_and_shows_no_career_data(client):
    mine, theirs = far_apart_tags(client)
    me, _ = make(client, 1, tag_ids=(mine,))
    _, twin_id = make(client, 2, tag_ids=(mine,))
    _, stranger_id = make(client, 3, tag_ids=(theirs,))
    people = client.get("/api/people/social", headers=me).json()["people"]
    assert people and people[0]["user_id"] == twin_id and people[0]["reason"].startswith("You both like")
    assert stranger_id not in [p["user_id"] for p in people]  # nothing in common: not listed
    assert not {"course", "year", "headline", "is_alumni", "role_title"} & set(people[0])
    assert people[0]["shared_hobbies"] and people[0]["match_pct"] > 0


def test_hiding_hobbies_removes_you_from_other_peoples_social_list(client, session):
    mine, _ = far_apart_tags(client)
    me, _ = make(client, 1, tag_ids=(mine,))
    _, twin_id = make(client, 2, tag_ids=(mine,))
    set_user(session, twin_id, hidden_fields=["hobbies"])
    assert client.get("/api/people/social", headers=me).json()["people"] == []


# ---------- connections ----------

def test_request_then_accept_makes_a_connection_and_notifies(client, session):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    sent = client.post("/api/connections", headers=a, json={"user_id": b_id, "kind": "social", "note": "Hi!"})
    assert sent.status_code == 201 and sent.json()["status"] == "pending"
    assert [n.title for n in session.exec(select(Notification).where(Notification.user_id == b_id)).all()] == ["Student 1 wants to connect"]

    mine = client.get("/api/connections", headers=b).json()
    assert [c["user_id"] for c in mine["incoming"]] == [a_id] and mine["incoming"][0]["note"] == "Hi!"
    assert [c["user_id"] for c in client.get("/api/connections", headers=a).json()["outgoing"]] == [b_id]

    connection_id = sent.json()["connection_id"]
    assert client.put(f"/api/connections/{connection_id}", headers=a, json={"action": "accept"}).status_code == 404  # only the receiver
    assert client.put(f"/api/connections/{connection_id}", headers=b, json={"action": "accept"}).json()["status"] == "accepted"
    assert client.put(f"/api/connections/{connection_id}", headers=b, json={"action": "decline"}).status_code == 409
    for headers, other in ((a, b_id), (b, a_id)):
        assert [c["user_id"] for c in client.get("/api/connections", headers=headers).json()["connections"]] == [other]
    assert client.post("/api/connections", headers=a, json={"user_id": b_id}).status_code == 409  # already connected


def test_a_decline_is_never_shown_to_the_sender_and_cannot_be_resent(client):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    connection_id = client.post("/api/connections", headers=a, json={"user_id": b_id}).json()["connection_id"]
    client.put(f"/api/connections/{connection_id}", headers=b, json={"action": "decline"})
    assert [c["user_id"] for c in client.get("/api/connections", headers=a).json()["outgoing"]] == [b_id]  # still 'requested'
    assert client.get("/api/connections", headers=b).json()["incoming"] == []
    assert client.post("/api/connections", headers=a, json={"user_id": b_id}).status_code == 409
    # The person who declined can still ask later: that reopens the same row the other way round.
    assert client.post("/api/connections", headers=b, json={"user_id": a_id}).json()["status"] == "pending"
    assert [c["user_id"] for c in client.get("/api/connections", headers=a).json()["incoming"]] == [b_id]


def test_asking_someone_who_already_asked_you_connects_straight_away(client):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    client.post("/api/connections", headers=a, json={"user_id": b_id})
    assert client.post("/api/connections", headers=b, json={"user_id": a_id}).json()["status"] == "accepted"
    assert len(client.get("/api/connections", headers=a).json()["connections"]) == 1


def test_connection_rules(client, session):
    a, a_id = make(client, 1)
    assert client.post("/api/connections", headers=a, json={"user_id": a_id}).status_code == 404  # not yourself
    assert client.post("/api/connections", headers=a, json={"user_id": 999}).status_code == 404
    assert client.post("/api/connections", headers=a, json={"user_id": 1, "kind": "romantic"}).status_code == 422
    assert client.post("/api/connections", json={"user_id": 1}).status_code == 401
    b, b_id = make(client, 2)
    connection_id = client.post("/api/connections", headers=a, json={"user_id": b_id}).json()["connection_id"]
    assert client.post("/api/connections", headers=a, json={"user_id": b_id}).status_code == 409  # already asked
    assert client.delete(f"/api/connections/{connection_id}", headers=make(client, 3)[0]).status_code == 404  # not yours
    assert client.delete(f"/api/connections/{connection_id}", headers=a).json()["status"] is None  # withdrawn
    assert session.exec(select(Connection)).all() == []


def test_alumni_monthly_request_limit(client, session):
    alum, alum_id = make(client, 1)
    set_user(session, alum_id, is_alumni=True, max_alumni_requests_per_month=2)
    people = [make(client, n)[0] for n in (2, 3, 4)]
    assert client.post("/api/connections", headers=people[0], json={"user_id": alum_id}).status_code == 201
    assert client.post("/api/connections", headers=people[1], json={"user_id": alum_id}).status_code == 201
    third = client.post("/api/connections", headers=people[2], json={"user_id": alum_id})
    assert third.status_code == 409 and "this month" in third.json()["detail"]
    # Requests from last month do not count.
    for row in session.exec(select(Connection)).all():
        row.created_at = datetime.now(timezone.utc).replace(day=1) - timedelta(days=2)
        session.add(row)
    session.commit()
    assert client.post("/api/connections", headers=people[2], json={"user_id": alum_id}).status_code == 201


def test_accepting_someone_who_asked_first_is_not_stopped_by_the_limit(client, session):
    alum, alum_id = make(client, 1)
    other, other_id = make(client, 2)
    set_user(session, alum_id, is_alumni=True, max_alumni_requests_per_month=1)
    client.post("/api/connections", headers=alum, json={"user_id": other_id})  # the alumnus asks first
    client.post("/api/connections", headers=make(client, 3)[0], json={"user_id": alum_id})  # uses up the limit
    assert client.post("/api/connections", headers=other, json={"user_id": alum_id}).json()["status"] == "accepted"


def test_notification_switched_off_is_not_sent(client, session):
    a, _ = make(client, 1)
    _, b_id = make(client, 2)
    session.add(NotificationPref(user_id=b_id, kind="match", enabled=False))
    session.commit()
    client.post("/api/connections", headers=a, json={"user_id": b_id})
    assert session.exec(select(Notification)).all() == []


# ---------- follows ----------

def test_follow_and_unfollow(client):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    for _ in range(2):  # twice: the second does nothing
        assert client.put(f"/api/follows/{b_id}", headers=a).json() == {"user_id": b_id, "following": True}
    assert client.put(f"/api/follows/{a_id}", headers=a).status_code == 404  # not yourself
    mine = client.get("/api/follows", headers=a).json()
    assert [p["user_id"] for p in mine["following"]] == [b_id] and mine["followers"] == 0
    assert client.get("/api/follows", headers=b).json()["followers"] == 1
    client.delete(f"/api/follows/{b_id}", headers=a)
    assert client.get("/api/follows", headers=a).json()["following"] == []


# ---------- block and report ----------

def test_blocking_hides_both_people_and_removes_links(client):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    client.post("/api/connections", headers=a, json={"user_id": b_id})
    client.put(f"/api/follows/{b_id}", headers=a)
    assert client.put(f"/api/blocks/{b_id}", headers=a).json() == {"user_id": b_id, "blocked": True}

    assert client.get("/api/connections", headers=b).json()["incoming"] == []  # the request is gone
    assert client.get("/api/follows", headers=a).json()["following"] == []
    for headers, other in ((a, b_id), (b, a_id)):  # works both ways
        assert other not in [p["user_id"] for p in client.get("/api/people/social", headers=headers).json()["people"]]
        assert client.post("/api/connections", headers=headers, json={"user_id": other}).status_code == 404
        assert client.put(f"/api/follows/{other}", headers=headers).status_code == 404
    assert [p["user_id"] for p in client.get("/api/blocks", headers=a).json()["blocked"]] == [b_id]
    assert client.get("/api/blocks", headers=b).json()["blocked"] == []  # the blocked person is not told

    client.delete(f"/api/blocks/{b_id}", headers=a)
    assert client.post("/api/connections", headers=a, json={"user_id": b_id}).status_code == 201


def test_report_a_person_and_the_moderator_ladder(client, session):
    a, a_id = make(client, 1)
    b, b_id = make(client, 2)
    assert client.post("/api/reports", headers=a, json={"reason": "rude message"}).status_code == 422  # who?
    assert client.post("/api/reports", headers=a, json={"user_id": b_id, "reason": "bad"}).status_code == 422  # too short
    assert client.post("/api/reports", headers=a, json={"user_id": a_id, "reason": "myself"}).status_code == 404
    assert client.post("/api/reports", headers=a, json={"group_id": 99, "reason": "not my group"}).status_code == 404
    report_id = client.post("/api/reports", headers=a, json={"user_id": b_id, "reason": "Sent rude messages"}).json()["report_id"]

    admin = {"X-Admin-Key": settings.ADMIN_KEY}
    assert client.get("/api/admin/reports").status_code == 403  # the moderator needs the key
    inbox = client.get("/api/admin/reports", headers=admin).json()["reports"]
    assert [(r["report_id"], r["reported_user_id"]) for r in inbox] == [(report_id, b_id)]

    assert client.put(f"/api/admin/reports/{report_id}", headers=admin, json={"action": "warn"}).json()["status"] == "warned"
    assert session.get(User, b_id).account_status == "warned"
    assert client.get("/api/connections", headers=b).status_code == 200  # a warning changes nothing else
    assert client.get("/api/admin/reports", headers=admin).json()["reports"] == []  # nothing left open

    second = client.post("/api/reports", headers=a, json={"user_id": b_id, "reason": "Did it again"}).json()["report_id"]
    client.put(f"/api/admin/reports/{second}", headers=admin, json={"action": "suspend"})
    assert client.get("/api/connections", headers=b).status_code == 403  # suspended: locked out
    assert "suspended" in client.get("/api/connections", headers=b).json()["detail"]
    assert b_id not in [p["user_id"] for p in client.get("/api/people/social", headers=a).json()["people"]]
    assert client.put("/api/admin/reports/999", headers=admin, json={"action": "ban"}).status_code == 404


def test_dismissing_a_report_changes_nothing(client, session):
    a, _ = make(client, 1)
    _, b_id = make(client, 2)
    report_id = client.post("/api/reports", headers=a, json={"user_id": b_id, "reason": "Misunderstanding"}).json()["report_id"]
    client.put(f"/api/admin/reports/{report_id}", headers={"X-Admin-Key": settings.ADMIN_KEY}, json={"action": "dismiss"})
    assert session.get(User, b_id).account_status == "active"
