"""Checks the hand-checked real data files (events_curated.json and venues.json)."""

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlmodel import select

from app.models import Event, Venue
from app.pipeline import runner
from app.pipeline.base import DateWindow
from app.pipeline.classify import TAG_SYNONYMS
from app.pipeline.finders.curated_file import CuratedFileSource
from app.seed_events import load_venues

SEED = Path(__file__).resolve().parents[1] / "app" / "seed"
EVENTS = json.loads((SEED / "events_curated.json").read_text(encoding="utf-8"))
VENUES = json.loads((SEED / "venues.json").read_text(encoding="utf-8"))
COLLECTED_ON = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)  # the day the data was gathered


def test_every_event_has_what_the_pipeline_needs():
    for e in EVENTS:
        assert e["title"].strip() and e["url"].startswith("https://"), e["title"]
        assert e["event_type"] in ("career", "social") and e["alcohol_role"] in ("central", "optional", "none")
        assert e["area"] in ("main", "canary", "other")
        assert set(e["tags"]) <= set(TAG_SYNONYMS) and len(e["tags"]) <= 3, e["title"]
        assert e["verified_on"] and e["verification"].strip(), e["title"]
        start, end = datetime.fromisoformat(e["start"]), datetime.fromisoformat(e["end"])
        assert start < end, e["title"]


def test_links_and_titles_are_not_repeated():
    urls = [e["url"] for e in EVENTS]
    assert len(urls) == len(set(urls))
    keys = [(e["title"].lower(), e["start"]) for e in EVENTS]
    assert len(keys) == len(set(keys))


def test_the_event_set_meets_the_demo_targets_that_can_be_met_honestly():
    career = sum(e["event_type"] == "career" for e in EVENTS)
    assert len(EVENTS) >= 40  # spec: 40 or more dated events
    assert career / len(EVENTS) >= 0.40  # spec: at least 40% career
    assert any(e["area"] == "canary" for e in EVENTS)  # some Canary Wharf events exist (the spec's 8 is not yet met)


def test_data_files_contain_no_personal_details_or_long_copied_text():
    text = json.dumps(EVENTS + VENUES)
    assert "@" not in text.replace("@ Phineas", "").replace("@ Institute", "").replace("@ Amazing", "")  # no email addresses
    assert all(len(e["description"]) <= 300 for e in EVENTS)  # our own short words, not pasted pages


def test_events_load_through_the_pipeline_with_their_checked_answers(session):
    report = runner.refresh_events(session, [CuratedFileSource()], DateWindow.from_days(COLLECTED_ON, 30), COLLECTED_ON)
    assert report["added"] == len(EVENTS) and report["sources"][0]["status"] == "ok"

    saved = {e.source_url: e for e in session.exec(select(Event)).all()}
    pub_crawl = next(e for e in EVENTS if e["title"].startswith("Pub Crawl"))
    assert saved[pub_crawl["url"]].alcohol_role == "central"
    run = next(e for e in EVENTS if e["title"] == "Project Active SOM Run")
    assert saved[run["url"]].area == "canary"

    again = runner.refresh_events(session, [CuratedFileSource()], DateWindow.from_days(COLLECTED_ON, 30), COLLECTED_ON)
    assert again["added"] == 0 and again["updated"] == len(EVENTS)  # re-running never duplicates


def test_events_that_have_passed_drop_out_when_the_data_gets_old(session):
    runner.refresh_events(session, [CuratedFileSource()], DateWindow.from_days(COLLECTED_ON, 30), COLLECTED_ON)
    later = datetime(2026, 12, 1, tzinfo=timezone.utc)  # long after every event
    report = runner.refresh_events(session, [CuratedFileSource()], DateWindow.from_days(later, 30), later)
    assert report["removed_ended"] == len(EVENTS)
    assert session.exec(select(Event)).all() == []


def test_every_venue_has_what_the_loader_needs(session):
    for v in VENUES:
        assert v["name"].strip() and v["category"] and v["url"].startswith("https://")
        assert v["area"] in ("main", "canary", "other") and v["alcohol_role"] in ("central", "optional", "none")
        assert set(v["tags"]) <= set(TAG_SYNONYMS) and 1 <= len(v["tags"]) <= 3, v["name"]
        assert v["verified_on"] and v["verification"].strip(), v["name"]
    assert len({v["name"] for v in VENUES}) == len(VENUES)

    assert load_venues(session) == len(VENUES)
    assert load_venues(session) == 0  # safe to run twice
    assert len(session.exec(select(Venue)).all()) == len(VENUES)


def test_real_data_gives_different_students_different_lists(seeded, session):
    """With the real events loaded, the two demo students still see different, sensible lists."""
    from app.events import events_from_db, rank_events
    from app.matching import people_from_db

    runner.refresh_events(session, [CuratedFileSource()], DateWindow.from_days(COLLECTED_ON, 30), COLLECTED_ON)
    people = {p.name: p for p in people_from_db(session)}
    events = events_from_db(session)

    main = [s.item.title for s in rank_events(people["Demo Main"], events, COLLECTED_ON, limit=5)]
    canary = [s.item.title for s in rank_events(people["Demo Canary"], events, COLLECTED_ON, limit=5)]
    assert main != canary
    assert any(word in " ".join(main) for word in ("Finance", "Banking", "Consulting", "Tradermath"))  # the finance student sees finance events
