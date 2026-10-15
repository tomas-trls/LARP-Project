"""Checks the Home screen: actions, featured event, the upcoming feed, and the buttons on event cards."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app.jobs import refresh_jobs
from app.models import Connection, Event, EventSave, EventSkill, Skill, Society, User, UserSkill
from app.pipeline.job_scraper import SeedJobsSource
from app.seed_career import load_career_data
from tests.test_career import login, save_cv_profile
from tests.test_opportunities import add_event


@pytest.fixture
def career(session):
    load_career_data(session)


@pytest.fixture
def demo_jobs(session, career):
    return refresh_jobs(session, [SeedJobsSource()])


def home(client, headers, **params):
    return client.get("/api/home", params=params, headers=headers).json()


def user_id(session, email):
    return session.exec(select(User).where(User.ucl_email == email)).one().id


def setup_student(client, with_route=True, skills=("Excel",)):
    """A logged-in student who has a profile and an active Data Analyst route (lacking SQL and Python)."""
    headers = login(client)
    client.put("/api/profile", headers=headers, json={"education": [], "experience": [], "skills": list(skills), "languages": []})
    if with_route:
        client.post("/api/routes", headers=headers, json={"title": "Data Analyst"})
    return headers


def test_home_needs_a_login(client):
    assert client.get("/api/home").status_code == 401


# ---------- greeting and the empty start ----------

def test_a_brand_new_student_is_told_to_add_a_profile_then_pick_a_route(client, career):
    headers = login(client)
    answer = home(client, headers)
    assert [a["kind"] for a in answer["actions"]] == ["add_profile", "pick_route"]
    assert answer["greeting"]["name"] == "Test" and answer["greeting"]["part_of_day"] in ("morning", "afternoon", "evening")
    assert answer["active_route"] is None and answer["featured"] is None and answer["feed"] == []


def test_a_student_with_a_profile_but_no_route_is_only_asked_to_pick_one(client, career):
    headers = setup_student(client, with_route=False)
    assert [a["kind"] for a in home(client, headers)["actions"]] == ["pick_route"]


# ---------- the feed ----------

def test_feed_is_soonest_first_with_a_why_on_every_item_and_hides_ended_events(client, session, career):
    headers = setup_student(client)
    add_event(session, "Later talk", days=9)
    add_event(session, "Soon talk", days=2)
    add_event(session, "Pub quiz", category="social", days=4)
    add_event(session, "Already over", days=-3)
    feed = home(client, headers)["feed"]
    assert [e["title"] for e in feed] == ["Soon talk", "Pub quiz", "Later talk"]
    assert all(e["why"] for e in feed) and feed[0]["cta"] == "Book" and feed[1]["cta"] == "Join"


def test_filter_chips_and_counts(client, session, career):
    headers = setup_student(client)
    add_event(session, "Careers talk", days=3)
    add_event(session, "Quiz night", category="social", days=4)
    society = Society(name="Data Science Society", category="Technology & science")
    session.add(society)
    session.flush()
    event = add_event(session, "Kaggle 101", category="society", days=5)
    event.society_id = society.id
    session.add(event)
    session.commit()

    everything = home(client, headers)
    assert everything["filters"] == {"all": 3, "careers": 1, "social": 1, "societies": 1}
    assert [e["title"] for e in home(client, headers, filter="careers")["feed"]] == ["Careers talk"]
    assert [e["title"] for e in home(client, headers, filter="social")["feed"]] == ["Quiz night"]
    society_feed = home(client, headers, filter="societies")["feed"]
    assert [(e["title"], e["society"]) for e in society_feed] == [("Kaggle 101", "Data Science Society")]
    assert home(client, headers, filter="societies")["filters"]["all"] == 3  # counts ignore the filter
    assert client.get("/api/home", params={"filter": "nope"}, headers=headers).status_code == 422


def test_career_events_that_build_the_gap_say_so(client, session, career):
    headers = setup_student(client)
    add_event(session, "SQL Workshop", skills=["SQL"], days=3)
    feed = home(client, headers)["feed"]
    assert feed[0]["why"] == "Builds SQL - a gap on your Data Analyst route"


def test_connections_going_are_counted_and_mentioned(client, session, career):
    headers = setup_student(client)
    friend_headers = login(client, "friend@ucl.ac.uk")
    me, friend = user_id(session, "test.student@ucl.ac.uk"), user_id(session, "friend@ucl.ac.uk")
    session.add(Connection(user_id=friend, other_user_id=me, kind="social", status="accepted"))
    session.commit()
    event = add_event(session, "Quiz night", category="social", days=3)
    client.put(f"/api/events/{event.id}/rsvp", headers=friend_headers, json={"status": "going"})
    card = home(client, headers)["feed"][0]
    assert card["connections_going"] == 1 and card["why"].endswith("- 1 of your connection is going")
    # A pending request is not a connection.
    session.exec(select(Connection)).one().status = "pending"
    session.commit()
    assert home(client, headers)["feed"][0]["connections_going"] == 0


# ---------- featured event ----------

def test_featured_is_the_career_event_that_builds_most_and_starts_soon(client, session, career):
    headers = setup_student(client)
    add_event(session, "Mixer", days=1)
    add_event(session, "SQL and Python Lab", skills=["SQL", "Python"], days=6)
    add_event(session, "Far away masterclass", skills=["SQL", "Python"], days=40)  # too far off to feature
    assert home(client, headers)["featured"]["title"] == "SQL and Python Lab"


def test_featured_falls_back_to_the_soonest_event(client, session, career):
    headers = setup_student(client, with_route=False)
    add_event(session, "Quiz night", category="social", days=2)
    add_event(session, "Hike", category="social", days=6)
    assert home(client, headers)["featured"]["title"] == "Quiz night"


# ---------- recommended actions ----------

def test_actions_are_in_priority_order_and_capped_at_three(client, session, demo_jobs):
    headers = setup_student(client)
    add_event(session, "SQL Workshop", skills=["SQL"], days=3)
    banking = next(j for j in client.get("/api/opportunities/jobs", params={"q": "Investment Banking"}, headers=headers).json()["jobs"])
    client.post(f"/api/opportunities/jobs/{banking['id']}/save", headers=headers)  # closes in 6 days
    actions = home(client, headers)["actions"]
    assert [a["kind"] for a in actions] == ["finish_application", "attend_event", "review_job"]
    assert "Halcyon Capital" in actions[0]["title"] and "closes in" in actions[0]["detail"]
    assert actions[1]["title"] == "Go to SQL Workshop" and actions[1]["ref"]["type"] == "event"
    assert actions[2]["kind"] == "review_job" and "% match" in actions[2]["detail"]


def test_without_anything_to_recommend_it_suggests_exploring(client, career):
    headers = setup_student(client)
    assert [a["kind"] for a in home(client, headers)["actions"]] == ["explore"]


def test_applied_jobs_do_not_get_a_deadline_reminder(client, session, demo_jobs):
    headers = setup_student(client)
    banking = client.get("/api/opportunities/jobs", params={"q": "Investment Banking"}, headers=headers).json()["jobs"][0]
    client.post(f"/api/opportunities/jobs/{banking['id']}/save", headers=headers, json={"status": "applied"})
    assert "finish_application" not in [a["kind"] for a in home(client, headers)["actions"]]


# ---------- the weekly digest ----------

def test_this_week_lists_new_jobs_and_events_that_build_the_gap(client, session, demo_jobs):
    headers = setup_student(client)
    add_event(session, "SQL Workshop", skills=["SQL"], days=3)
    week = home(client, headers)["this_week"]
    assert 1 <= len(week["new_jobs"]) <= 3 and all(j["is_demo"] for j in week["new_jobs"])
    assert [e["title"] for e in week["events_that_build"]] == ["SQL Workshop"]
    no_route = login(client, "norote@ucl.ac.uk")
    assert home(client, no_route)["this_week"] == {"new_jobs": [], "events_that_build": []}


# ---------- the buttons: saved / going / I went ----------

def test_rsvp_saved_going_and_remove(client, session, career):
    headers = login(client)
    event = add_event(session, "Talk", days=3)
    for status in ("saved", "going"):
        assert client.put(f"/api/events/{event.id}/rsvp", headers=headers, json={"status": status}).json()["status"] == status
    assert home(client, headers)["feed"][0]["saved_status"] == "going"
    assert len(session.exec(select(EventSave)).all()) == 1  # one row, updated
    client.delete(f"/api/events/{event.id}/rsvp", headers=headers)
    assert home(client, headers)["feed"][0]["saved_status"] is None
    assert client.put("/api/events/99999/rsvp", headers=headers, json={"status": "going"}).status_code == 404
    assert client.put(f"/api/events/{event.id}/rsvp", headers=headers, json={"status": "maybe"}).status_code == 422
    assert client.put(f"/api/events/{event.id}/rsvp", json={"status": "going"}).status_code == 401


def test_i_went_only_works_after_the_event_starts_and_suggests_skills(client, session, career):
    headers = login(client)
    future = add_event(session, "Tomorrow", skills=["SQL"], days=1)
    assert client.put(f"/api/events/{future.id}/rsvp", headers=headers, json={"status": "attended"}).status_code == 409
    started = add_event(session, "SQL Lab", skills=["SQL", "Python"], days=0)
    started.start_time = datetime.now(timezone.utc) - timedelta(hours=2)
    started.end_time = datetime.now(timezone.utc) + timedelta(hours=2)
    session.add(started)
    session.commit()
    answer = client.put(f"/api/events/{started.id}/rsvp", headers=headers, json={"status": "attended"}).json()
    assert answer["prompt"]["suggested_skills"] == ["Python", "SQL"]
    assert "prompt" not in client.put(f"/api/events/{started.id}/rsvp", headers=headers, json={"status": "going"}).json()


def test_adding_skills_after_an_event_keeps_the_rest_of_the_profile(client, session, career):
    headers = setup_student(client, with_route=False, skills=("Excel", "Python"))
    before = {s["name"] for s in client.get("/api/profile", headers=headers).json()["skills"]}
    added = client.post("/api/profile/skills", headers=headers, json={"skills": ["SQL", "python", "Underwater welding"]}).json()
    after = {s["name"] for s in added["skills"]}
    assert before <= after and {"SQL", "Underwater welding"} <= after
    assert [s["name"] for s in added["skills"]].count("Python") == 1  # already had it: not added twice
    assert client.post("/api/profile/skills", headers=headers, json={"skills": []}).status_code == 422
    assert client.post("/api/profile/skills", json={"skills": ["SQL"]}).status_code == 401
