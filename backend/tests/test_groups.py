"""Checks group building: POST /api/pair/auto and GET /api/group."""

import itertools
import json

from sqlmodel import select

from app.groups import GROUP_MAX, GROUP_MIN, THRESHOLD
from app.matching import people_from_db, score_pair
from app.models import GroupMember, Tag

DEMO_MAIN = "demo.main@ucl.ac.uk"
DEMO_CANARY = "demo.canary@ucl.ac.uk"
CLUSTER = {"Ava Brightwell", "Ben Okafor", "Chloe Marlowe", "Dev Raman"}  # finance + chess, main campus


def register(client, session, name, email, tags, **answers):
    """Register a new student and return their login header."""
    tag_ids = [session.exec(select(Tag.id).where(Tag.name == t)).one() for t in tags]
    body = {
        "name": name, "ucl_email": email, "password": "correct-horse", "campus": "main", "travel_ok": True,
        "alcohol_pref": "drinks", "goal": "career", "course": "Economics", "year": 2, "tag_ids": tag_ids,
    }
    body.update(answers)
    token = client.post("/api/register", json=body).json()["token"]
    return {"Authorization": f"Bearer {token}"}


# ---------- with the seed students ----------

def test_group_needs_a_token(client, seeded):
    assert client.post("/api/pair/auto").status_code == 401
    assert client.get("/api/group").status_code == 401


def test_no_group_before_pairing(client, seeded, login):
    response = client.get("/api/group", headers=login(DEMO_MAIN))
    assert response.status_code == 404
    assert "not in a group" in response.json()["detail"]


def test_demo_main_gets_a_group_with_the_finance_chess_cluster(client, seeded, login):
    response = client.post("/api/pair/auto", headers=login(DEMO_MAIN))
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "grouped"

    group = data["group"]
    names = {m["name"] for m in group["members"]}
    assert GROUP_MIN <= len(names) <= GROUP_MAX
    assert "Demo Main" in names
    assert len(names & CLUSTER) >= 3
    assert "chess" in group["shared_interests"] and "finance" in group["shared_interests"]
    assert group["first_event"] is None  # no events are loaded in this test (see test_events.py for the case with events)


def test_everyone_in_a_group_fits_together(client, seeded, session, login):
    group = client.post("/api/pair/auto", headers=login(DEMO_MAIN)).json()["group"]
    ids = {m["user_id"] for m in group["members"]}
    people = [p for p in people_from_db(session) if p.id in ids]

    pairs = list(itertools.combinations(people, 2))
    average = sum(score_pair(a, b).total for a, b in pairs) / len(pairs)
    assert average >= THRESHOLD


def test_asking_twice_returns_the_same_group(client, seeded, login):
    headers = login(DEMO_MAIN)
    first = client.post("/api/pair/auto", headers=headers).json()["group"]
    second = client.post("/api/pair/auto", headers=headers).json()["group"]
    assert first == second
    assert client.get("/api/group", headers=headers).json() == first


def test_two_demo_accounts_get_different_groups_and_nobody_is_in_two(client, seeded, session, login):
    main = client.post("/api/pair/auto", headers=login(DEMO_MAIN)).json()["group"]
    canary = client.post("/api/pair/auto", headers=login(DEMO_CANARY)).json()["group"]

    assert main["id"] != canary["id"]
    assert {m["user_id"] for m in main["members"]}.isdisjoint({m["user_id"] for m in canary["members"]})

    user_ids = session.exec(select(GroupMember.user_id)).all()
    assert len(user_ids) == len(set(user_ids))  # nobody appears twice


def test_group_answer_has_no_private_details(client, seeded, login):
    headers = login(DEMO_MAIN)
    client.post("/api/pair/auto", headers=headers)
    text = json.dumps(client.get("/api/group", headers=headers).json()).lower()
    assert "@" not in text and "linkedin" not in text and "password" not in text


# ---------- building groups from scratch ----------

def test_students_wait_until_there_are_three_and_outsiders_are_not_pulled_in(client, session):
    # Four similar students, one at a time.
    similar = [
        register(client, session, f"Student {n}", f"student{n}@ucl.ac.uk", ["finance", "chess"])
        for n in range(1, 5)
    ]

    # Alone, or only two of them: not enough people yet.
    first = client.post("/api/pair/auto", headers=similar[0]).json()
    assert first["status"] == "waiting" and first["group"] is None
    assert client.get("/api/group", headers=similar[0]).status_code == 404

    second = client.post("/api/pair/auto", headers=similar[1]).json()
    assert second["status"] == "waiting"

    # The third person makes three: now a group exists, and it includes the two who were waiting.
    third = client.post("/api/pair/auto", headers=similar[2]).json()
    assert third["status"] == "grouped"
    group_id = third["group"]["id"]
    assert len(third["group"]["members"]) == 3
    assert client.get("/api/group", headers=similar[0]).json()["id"] == group_id
    assert client.get("/api/group", headers=similar[1]).json()["id"] == group_id

    # The fourth joins the existing group.
    fourth = client.post("/api/pair/auto", headers=similar[3]).json()
    assert fourth["group"]["id"] == group_id
    assert len(fourth["group"]["members"]) == 4

    # Someone with nothing in common is below the 0.35 threshold: not added, and no group of their own.
    outsider = register(
        client, session, "Outsider", "outsider@ucl.ac.uk", ["clubs", "live music"],
        campus="canary", goal="social", alcohol_pref="avoid", course="Medicine", travel_ok=False,
    )
    result = client.post("/api/pair/auto", headers=outsider).json()
    assert result["status"] == "waiting"
    assert len(client.get("/api/group", headers=similar[0]).json()["members"]) == 4  # still just the four
