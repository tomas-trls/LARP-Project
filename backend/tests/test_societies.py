"""Checks the Societies tab: a read-only view of the societies in the Students' Union events and their events."""

import pytest
from sqlmodel import select

from app.models import Event, Society, SocietyMember
from app.pipeline.store import backfill_event_data
from app.seed_career import load_career_data
from app.seed_societies import link_society_events, load_societies
from tests.test_opportunities import add_event
from tests.test_people import make


@pytest.fixture
def directory(session):
    load_career_data(session)
    load_societies(session)


def society_id(client, headers, name):
    return next(s["id"] for s in client.get("/api/societies", headers=headers).json()["societies"] if s["name"] == name)


# ---------- the seed ----------

def test_societies_load_once_and_have_nothing_invented(session, directory):
    societies = session.exec(select(Society)).all()
    assert len(societies) >= 15 and load_societies(session) == 0  # a second run adds nothing
    assert all(s.description is None and s.membership_price is None and s.membership_url is None for s in societies)


def test_events_are_linked_by_name_and_career_events_keep_their_category(session, directory):
    gaming = Event(title="Game Development X Gaming Soc", event_type="social", category="social", source_url="https://x/1")
    panel = Event(title="Life Science Society: Internship Panel", event_type="career", category="opportunity", source_url="https://x/2")
    other = Event(title="Pub Quiz", event_type="social", category="social", source_url="https://x/3")
    session.add_all([gaming, panel, other])
    session.commit()
    assert link_society_events(session) == 2
    for event in (gaming, panel, other):
        session.refresh(event)
    assert gaming.category == "society" and gaming.society_id is not None
    assert panel.society_id is not None and panel.category == "opportunity"  # linked, but still a career event
    assert other.society_id is None and other.category == "social"
    backfill_event_data(session)  # the startup step must not undo that
    assert [session.get(Event, e.id).category for e in (gaming, panel, other)] == ["society", "opportunity", "social"]


# ---------- the directory ----------

def test_directory_needs_a_login_and_my_societies_come_first(client, session, directory):
    assert client.get("/api/societies").status_code == 401
    me, _ = make(client, 1)
    answer = client.get("/api/societies", headers=me).json()
    assert answer["total"] >= 15 and all(s["joined"] is False for s in answer["societies"])
    assert set(answer["societies"][0]) == {"id", "name", "category", "member_count", "upcoming_events", "joined"}  # nothing invented

    drama = society_id(client, me, "Drama Society")
    client.put(f"/api/societies/{drama}/membership", headers=me)
    first = client.get("/api/societies", headers=me).json()["societies"][0]
    assert first["name"] == "Drama Society" and first["joined"] is True


def test_joining_and_leaving_is_self_reported_and_counts_members(client, session, directory):
    a, b = make(client, 1)[0], make(client, 2)[0]
    sid = society_id(client, a, "Gaming Society")
    assert client.put(f"/api/societies/{sid}/membership", headers=a).json() == {"society_id": sid, "joined": True}
    client.put(f"/api/societies/{sid}/membership", headers=a)  # twice: still one
    client.put(f"/api/societies/{sid}/membership", headers=b)
    assert next(s for s in client.get("/api/societies", headers=a).json()["societies"] if s["id"] == sid)["member_count"] == 2
    assert client.delete(f"/api/societies/{sid}/membership", headers=a).json() == {"society_id": sid, "joined": False}
    assert len(session.exec(select(SocietyMember)).all()) == 1
    assert client.put("/api/societies/999/membership", headers=a).status_code == 404
    assert client.get("/api/societies/999", headers=a).status_code == 404


def test_society_page_lists_its_upcoming_events_only(client, session, directory):
    me, _ = make(client, 1)
    add_event(session, "Gaming Soc Night", category="social", days=3)
    add_event(session, "Gaming Soc Old Night", category="social", days=-4)  # over: not listed
    add_event(session, "Pub Quiz", category="social", days=2)
    link_society_events(session)
    sid = society_id(client, me, "Gaming Society")
    page = client.get(f"/api/societies/{sid}", headers=me).json()
    assert [e["title"] for e in page["events"]] == ["Gaming Soc Night"] and page["upcoming_events"] == 1


# ---------- the events feed ----------

def test_the_feed_shows_events_from_my_societies_by_default(client, session, directory):
    me, _ = make(client, 1)
    add_event(session, "Drama Society Meisner Workshop", category="social", days=2)
    add_event(session, "Gaming Soc Night", category="social", days=3)
    add_event(session, "Life Science Society: Internship Panel", category="opportunity", days=5)
    add_event(session, "Pub Quiz", category="social", days=1)
    link_society_events(session)

    nothing_yet = client.get("/api/societies/events", headers=me).json()
    assert nothing_yet["my_societies"] == 0 and nothing_yet["events"] == []

    for name in ("Drama Society", "Life Science Society"):
        client.put(f"/api/societies/{society_id(client, me, name)}/membership", headers=me)
    mine = client.get("/api/societies/events", headers=me).json()
    assert mine["my_societies"] == 2
    assert [e["title"] for e in mine["events"]] == ["Drama Society Meisner Workshop", "Life Science Society: Internship Panel"]
    assert all(e["society"] and e["why"] for e in mine["events"])

    everything = client.get("/api/societies/events", headers=me, params={"scope": "all"}).json()["events"]
    assert [e["title"] for e in everything] == ["Drama Society Meisner Workshop", "Gaming Soc Night", "Life Science Society: Internship Panel"]
    assert client.get("/api/societies/events", headers=me, params={"scope": "nope"}).status_code == 422
    # Home's Societies filter still shows every society event (career panels stay under Careers).
    assert client.get("/api/home", headers=me).json()["filters"]["societies"] == 2
