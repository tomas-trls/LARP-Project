"""Checks LinkedIn Max: who appears, in what order, and that links are validated."""

from sqlmodel import select

from app.models import User

DEMO_MAIN = "demo.main@ucl.ac.uk"


def queue(client, headers, **params):
    response = client.get("/api/linkedin-max", params=params, headers=headers)
    assert response.status_code == 200
    return response.json()


def test_needs_a_login(client, seeded):
    assert client.get("/api/linkedin-max").status_code == 401


def test_lists_only_opted_in_people_with_links_and_never_me(client, session, seeded, login):
    people = queue(client, login(DEMO_MAIN), limit=100)
    opted_in = {u.id for u in session.exec(select(User).where(User.linkedin_max_optin == True)).all()}  # noqa: E712
    assert {p["user_id"] for p in people} == opted_in  # demo.main is not opted in, so nobody is left out
    assert all(p["linkedin_url"].startswith("https://www.linkedin.com/in/") for p in people)

    # An opted-in student never sees themselves in their own queue.
    ava = login("ava.test01@ucl.ac.uk")
    ava_id = session.exec(select(User).where(User.ucl_email == "ava.test01@ucl.ac.uk")).one().id
    assert ava_id not in {p["user_id"] for p in queue(client, ava, limit=100)}


def test_best_match_first_with_a_reason(client, seeded, login):
    people = queue(client, login(DEMO_MAIN), limit=100)
    scores = [p["score"] for p in people]
    assert scores == sorted(scores, reverse=True)
    assert all(p["reason"] for p in people)


def test_paging_gives_the_same_order_in_pieces(client, seeded, login):
    headers = login(DEMO_MAIN)
    everyone = queue(client, headers, limit=100)
    assert len(everyone) >= 10
    pieces = queue(client, headers, limit=5, offset=0) + queue(client, headers, limit=5, offset=5)
    assert pieces == everyone[:10]
    assert queue(client, headers, limit=5, offset=len(everyone)) == []


def test_opting_out_removes_you_from_other_peoples_queues(client, seeded, login):
    ava = login("ava.test01@ucl.ac.uk")
    ava_name = "Ava Brightwell"
    assert ava_name in [p["name"] for p in queue(client, login(DEMO_MAIN), limit=100)]

    response = client.put("/api/me/preferences", json={"linkedin_max_optin": False}, headers=ava)
    assert response.status_code == 200
    assert ava_name not in [p["name"] for p in queue(client, login(DEMO_MAIN), limit=100)]


# ---------- the link itself must be a LinkedIn profile address ----------

def test_only_linkedin_profile_links_are_accepted(client, seeded, login):
    headers = login(DEMO_MAIN)
    for bad in ["javascript:alert(1)", "https://evil.example.com/in/me", "http://www.linkedin.com/in/me",
                "https://www.linkedin.com.evil.com/in/me", "linkedin.com/in/me"]:
        response = client.put("/api/me/preferences", json={"linkedin_url": bad}, headers=headers)
        assert response.status_code == 422, bad

    good = client.put("/api/me/preferences", json={"linkedin_url": "https://www.linkedin.com/in/demo-main"}, headers=headers)
    assert good.status_code == 200
    assert good.json()["linkedin_url"] == "https://www.linkedin.com/in/demo-main"


def test_register_also_checks_the_link(client):
    from tests.test_auth import register

    assert register(client, linkedin_url="javascript:alert(1)").status_code == 422
    assert register(client, linkedin_url="https://www.linkedin.com/in/test-student").status_code == 200
