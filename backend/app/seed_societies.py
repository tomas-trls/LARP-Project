"""
The societies LARP knows about, and the link from each society event to its society.

LARP does not create societies. The names in seed/societies.json are the societies that appear in the real events
taken from the Students' Union website, together with the words that show up in an event's title (for example
"gaming soc"). An event whose title contains one of those words is linked to that society. Nothing else about a
society is invented: no descriptions, prices or links.

Membership in LARP is self-reported (a student says which societies they are in): LARP cannot see the
Students' Union member lists.

Safe to run again: anything already there is kept, only missing items are added.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from app.models import Event, Society

SEED_FILE = Path(__file__).resolve().parent / "seed" / "societies.json"


def load_societies(session: Session) -> int:
    """Add any society that is missing. Returns how many were added."""
    have = {s.name for s in session.exec(select(Society)).all()}
    added = 0
    for item in json.loads(SEED_FILE.read_text(encoding="utf-8")):
        if item["name"] not in have:
            session.add(Society(name=item["name"], category=item["category"]))
            added += 1
    session.commit()
    return added


def link_society_events(session: Session) -> int:
    """Link events to their society, by the society's name in the event title. Returns how many were linked.

    Social events run by a society get the 'society' category (done in pipeline/store.py). Career events (panels,
    fairs) stay career events but are still linked, so they also show on the society's page.
    An event run by several societies is linked to the first one named in the list.
    """
    words = []
    for item in json.loads(SEED_FILE.read_text(encoding="utf-8")):
        words += [(w.lower(), item["name"]) for w in item["match_words"]]
    by_name = {s.name: s.id for s in session.exec(select(Society)).all()}
    linked = 0
    for event in session.exec(select(Event).where(Event.society_id.is_(None))).all():
        title = event.title.lower()
        name = next((society for word, society in words if word in title), None)
        if name in by_name:
            event.society_id = by_name[name]
            if event.event_type != "career":
                event.category = "society"
            session.add(event)
            linked += 1
    session.commit()
    return linked
