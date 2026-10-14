"""
Loads the small set of INVENTED test events and venues (seed/events_test.json and
seed/venues_test.json). They exist only so the scoring can be tested and demoed;
real events arrive in Step 6.

Dates in the file are written as "days from now", and turned into real dates here,
so the events never go out of date. Run reset_db again to move them forward.

Safe to run twice: items that already exist (same source_url / same name) are skipped.
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

from app.models import Event, EventTag, Tag, Venue, VenueTag

SEED_DIR = Path(__file__).resolve().parent / "seed"


def _tag_ids(session: Session) -> dict:
    return {name: id for name, id in session.exec(select(Tag.name, Tag.id)).all()}


def load_test_events(session: Session, now: Optional[datetime] = None) -> int:
    """Add any missing test events. Returns how many were added."""
    now = now or datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    items = json.loads((SEED_DIR / "events_test.json").read_text(encoding="utf-8"))
    tag_ids = _tag_ids(session)
    existing = set(session.exec(select(Event.source_url)).all())

    added = 0
    for item in items:
        if item["source_url"] in existing:
            continue

        start = end = None
        if item["days_from_now"] is not None:
            start = today + timedelta(days=item["days_from_now"], hours=item["start_hour"])
            end = start + timedelta(hours=item["duration_hours"])

        event = Event(
            title=item["title"], description=item["description"], start_time=start, end_time=end,
            location_name=item["location_name"], area=item["area"], event_type=item["event_type"],
            alcohol_role=item["alcohol_role"], source="test", source_url=item["source_url"],
        )
        session.add(event)
        session.flush()  # gives the event an id
        for tag_name in item["tags"]:
            # A typo in the file raises a KeyError here, so it can't go unnoticed.
            session.add(EventTag(event_id=event.id, tag_id=tag_ids[tag_name]))
        added += 1

    session.commit()
    return added


def load_test_venues(session: Session, now: Optional[datetime] = None, filename: str = "venues_test.json") -> int:
    """Add any missing venues from a seed file (the invented test file by default). Returns how many were added."""
    now = now or datetime.now(timezone.utc)
    items = json.loads((SEED_DIR / filename).read_text(encoding="utf-8"))
    tag_ids = _tag_ids(session)
    existing = set(session.exec(select(Venue.name)).all())

    added = 0
    for item in items:
        if item["name"] in existing:
            continue

        venue = Venue(
            name=item["name"], category=item["category"], area=item["area"], address=item["address"],
            url=item["url"], alcohol_role=item["alcohol_role"],
            verified_on=datetime.fromisoformat(item["verified_on"]).replace(tzinfo=timezone.utc) if item.get("verified_on") else now,
        )
        session.add(venue)
        session.flush()
        for tag_name in item["tags"]:
            session.add(VenueTag(venue_id=venue.id, tag_id=tag_ids[tag_name]))
        added += 1

    session.commit()
    return added


def load_venues(session: Session, now: Optional[datetime] = None) -> int:
    """Load the real, hand-checked venues (seed/venues.json)."""
    return load_test_venues(session, now, filename="venues.json")
