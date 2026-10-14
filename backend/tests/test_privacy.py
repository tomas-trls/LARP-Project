"""
Privacy audit: what other students can and cannot see about me.

Rules (Backend Spec, "Risks, privacy and safety"):
- Never show another user's email, or any password hash.
- Never show another user's alcohol preference.
- Show a LinkedIn link only for people who opted in, and only on the LinkedIn Max list.
"""

import json

from sqlmodel import select

from app.models import User

DEMO_MAIN = "demo.main@ucl.ac.uk"


def everything_demo_main_can_see(client, headers):
    """The raw text of every response that lists OTHER students (or about them)."""
    texts = {}
    texts["matches"] = client.get("/api/matches", headers=headers).text
    texts["pair"] = client.post("/api/pair/auto", headers=headers).text
    texts["group"] = client.get("/api/group", headers=headers).text
    texts["events"] = client.get("/api/events?limit=50", headers=headers).text
    texts["venues"] = client.get("/api/venues?limit=50", headers=headers).text
    texts["linkedin"] = client.get("/api/linkedin-max?limit=100", headers=headers).text
    texts["tags"] = client.get("/api/tags").text
    return texts


def test_no_emails_hashes_or_alcohol_answers_leak(client, session, seeded, with_events, login):
    headers = login(DEMO_MAIN)
    texts = everything_demo_main_can_see(client, headers)
    users = session.exec(select(User)).all()

    for where, text in texts.items():
        for u in users:
            assert u.ucl_email not in text, f"{where} leaks {u.ucl_email}"
            assert u.password_hash not in text, f"{where} leaks a password hash"
        lowered = text.lower()
        assert "password" not in lowered and "hash" not in lowered, where
        assert "alcohol_pref" not in lowered, f"{where} shows an alcohol preference"
        assert "ucl.ac.uk" not in lowered, where


def test_linkedin_links_appear_only_for_opted_in_people_on_the_linkedin_list(client, session, seeded, with_events, login):
    texts = everything_demo_main_can_see(client, login(DEMO_MAIN))

    # Not on the matches, group, event or venue responses at all.
    for where in ["matches", "pair", "group", "events", "venues", "tags"]:
        assert "linkedin" not in texts[where].lower(), where

    # On the LinkedIn list: every link belongs to someone who opted in, and nobody else's link is there.
    shown = {p["linkedin_url"] for p in json.loads(texts["linkedin"])}
    allowed = {u.linkedin_url for u in session.exec(select(User).where(User.linkedin_max_optin == True)).all()}  # noqa: E712
    not_allowed = {u.linkedin_url for u in session.exec(select(User).where(User.linkedin_max_optin == False)).all() if u.linkedin_url}  # noqa: E712
    assert shown <= allowed
    assert not (shown & not_allowed)


def test_a_link_without_opt_in_stays_private(client, seeded, login):
    # Save a link but do not opt in: nobody else can see it.
    headers = login(DEMO_MAIN)
    client.put("/api/me/preferences", json={"linkedin_url": "https://www.linkedin.com/in/demo-main"}, headers=headers)
    seen_by_others = client.get("/api/linkedin-max?limit=100", headers=login("ava.test01@ucl.ac.uk")).text
    assert "demo-main" not in seen_by_others

    # Opt in and they can.
    client.put("/api/me/preferences", json={"linkedin_max_optin": True}, headers=headers)
    seen_by_others = client.get("/api/linkedin-max?limit=100", headers=login("ava.test01@ucl.ac.uk")).text
    assert "demo-main" in seen_by_others


def test_my_own_profile_never_returns_a_password_hash(client, seeded, login):
    text = client.get("/api/me", headers=login(DEMO_MAIN)).text.lower()
    assert "hash" not in text and "password" not in text


def test_admin_routes_need_the_key(client):
    assert client.post("/api/admin/refresh-events").status_code in (401, 403)
