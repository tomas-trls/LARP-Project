"""Checks the saved top-20 match lists and GET /api/matches."""

import json

from sqlmodel import select

from app.match_cache import add_user_to_cache, rebuild_match_cache
from app.matching import people_from_db, rank_matches
from app.models import MatchCache, Tag

DEMO_MAIN = "demo.main@ucl.ac.uk"
EXPECTED_KEYS = {"user_id", "name", "course", "year", "campus", "score", "shared_tags", "reason"}


def register_clone_of_ava(client, session, email="clone.of.ava@ucl.ac.uk"):
    """Register a new student with exactly Ava Brightwell's answers (a very close match for her)."""
    tag_ids = [session.exec(select(Tag.id).where(Tag.name == n)).one()
               for n in ["finance", "chess", "economics", "running"]]
    response = client.post("/api/register", json={
        "name": "Ava Clone", "ucl_email": email, "password": "correct-horse", "campus": "main",
        "travel_ok": True, "alcohol_pref": "drinks", "goal": "career", "course": "Economics", "year": 3,
        "experience_industry": ["finance"], "tag_ids": tag_ids,
    })
    assert response.status_code == 200
    return response.json()


# ---------- GET /api/matches ----------

def test_matches_need_a_token(client, seeded):
    assert client.get("/api/matches").status_code == 401


def test_matches_list_is_sorted_complete_and_private(client, seeded, login):
    response = client.get("/api/matches", headers=login(DEMO_MAIN))
    assert response.status_code == 200
    matches = response.json()

    assert len(matches) == 20
    assert [m["score"] for m in matches] == sorted((m["score"] for m in matches), reverse=True)
    assert all(set(m) == EXPECTED_KEYS for m in matches)  # no email, hash or LinkedIn key
    assert all(m["reason"] for m in matches)
    assert "Demo Main" not in [m["name"] for m in matches]  # never matched with yourself

    text = json.dumps(matches).lower()
    assert "@" not in text and "linkedin" not in text and "password" not in text


def test_limit_is_respected_and_checked(client, seeded, login):
    headers = login(DEMO_MAIN)
    assert len(client.get("/api/matches?limit=3", headers=headers).json()) == 3
    assert client.get("/api/matches?limit=0", headers=headers).status_code == 422
    assert client.get("/api/matches?limit=21", headers=headers).status_code == 422


def test_cross_campus_people_appear(client, seeded, login):
    matches = client.get("/api/matches", headers=login(DEMO_MAIN)).json()
    assert "canary" in {m["campus"] for m in matches}  # Demo Main is on the main campus


def test_saved_list_matches_a_fresh_ranking(client, seeded, session, login):
    people = people_from_db(session)
    me = next(p for p in people if p.name == "Demo Main")
    expected = [m.person.id for m in rank_matches(me, people, limit=20)]

    saved = [m["user_id"] for m in client.get("/api/matches", headers=login(DEMO_MAIN)).json()]
    assert saved == expected


# ---------- a new student ----------

def test_new_student_gets_a_ranked_list_straight_away(client, seeded, session):
    registered = register_clone_of_ava(client, session)
    headers = {"Authorization": f"Bearer {registered['token']}"}

    matches = client.get("/api/matches", headers=headers).json()
    assert len(matches) == 20
    assert matches[0]["name"] == "Ava Brightwell"  # identical answers: her best match
    assert matches[0]["score"] > 0.9


def test_new_student_appears_in_a_close_matchs_list(client, seeded, session, login):
    registered = register_clone_of_ava(client, session)
    ava_list = client.get("/api/matches", headers=login("ava.test01@ucl.ac.uk")).json()
    assert registered["user"]["id"] in [m["user_id"] for m in ava_list]
    assert len(ava_list) == 20  # a full list stays at 20: someone else was pushed out


def test_adding_one_student_gives_the_same_lists_as_a_full_rebuild(client, seeded, session):
    register_clone_of_ava(client, session)  # uses the quick "add one student" path

    def snapshot():
        rows = session.exec(select(MatchCache)).all()
        return {(r.user_id, r.other_user_id): round(r.score, 6) for r in rows}

    quick = snapshot()
    rebuild_match_cache(session)  # the slow, from-scratch path
    assert snapshot() == quick


def test_adding_the_same_student_twice_is_safe(client, seeded, session):
    registered = register_clone_of_ava(client, session)
    before = session.exec(select(MatchCache)).all()
    add_user_to_cache(session, registered["user"]["id"])
    assert len(session.exec(select(MatchCache)).all()) == len(before)


# ---------- changing preferences ----------

def test_changing_preferences_refreshes_the_list(client, seeded, login):
    headers = login(DEMO_MAIN)

    def ava_score():
        matches = client.get("/api/matches", headers=headers).json()
        return next(m["score"] for m in matches if m["name"] == "Ava Brightwell")

    before = ava_score()
    # Ava wants career events. Switching to "social" should make Ava a worse fit.
    assert client.put("/api/me/preferences", json={"goal": "social"}, headers=headers).status_code == 200
    assert ava_score() < before
