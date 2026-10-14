"""
The whole demo, front to back, with the internet blocked (conftest.py makes any outside connection fail).

It runs twice, each time on a brand-new database, because the demo must work again after a reset.
The steps follow the Build Brief's demo path.
"""

import pytest

from app import settings
from app.seed_profiles import SEED_PASSWORD

STUDENT = {
    "name": "Demo Student",
    "ucl_email": "demo.student@gmail.com",  # any email is fine in demo mode
    "password": "demo-pass-1",
    "campus": "canary",
    "travel_ok": True,
    "alcohol_pref": "bars_no_drink",
    "goal": "both",
    "course": "Finance",
    "year": 2,
    "tag_ids": [1, 2, 3],
    "linkedin_url": "https://www.linkedin.com/in/demo-student",
    "linkedin_max_optin": True,
}


@pytest.mark.parametrize("run", [1, 2])
def test_the_demo_works_offline(run, client, seeded, with_events, monkeypatch):
    monkeypatch.setattr(settings, "REQUIRE_UCL_EMAIL", False)
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    assert client.get("/api/health").json()["demo_mode"] is True
    assert len(client.get("/api/tags").json()) == 4  # the questionnaire can load its interests

    # Register, then log in again with the same details.
    registered = client.post("/api/register", json=STUDENT)
    assert registered.status_code == 200, registered.text
    login = client.post("/api/login", json={"ucl_email": STUDENT["ucl_email"], "password": STUDENT["password"]})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    # Pairing: a group with members and a first event.
    paired = client.post("/api/pair/auto", headers=headers).json()
    assert paired["status"] == "grouped"
    group = client.get("/api/group", headers=headers).json()
    assert 3 <= len(group["members"]) <= 6

    # Browse, events (career, social), venues.
    matches = client.get("/api/matches", headers=headers).json()
    assert len(matches) > 0 and all(m["reason"] for m in matches)
    for kind in ("career", "social"):
        response = client.get(f"/api/events?type={kind}", headers=headers)
        assert response.status_code == 200 and len(response.json()) > 0, kind
    assert len(client.get("/api/venues", headers=headers).json()) > 0

    # LinkedIn Max: a queue of people with links, and I am not in my own queue.
    queue = client.get("/api/linkedin-max", headers=headers).json()
    assert len(queue) >= 10
    assert STUDENT["linkedin_url"] not in {p["linkedin_url"] for p in queue}

    # Someone else can now see me in their queue.
    other = client.post("/api/login", json={"ucl_email": "demo.main@ucl.ac.uk", "password": SEED_PASSWORD})
    assert other.status_code == 200
    other_headers = {"Authorization": f"Bearer {other.json()['token']}"}
    seen = client.get("/api/linkedin-max?limit=100", headers=other_headers).json()
    assert STUDENT["linkedin_url"] in {p["linkedin_url"] for p in seen}
