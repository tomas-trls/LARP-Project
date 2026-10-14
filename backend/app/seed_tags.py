"""
Loads the interest tags from seed/tags.json into the database.

Safe to run every time the server starts: tags that already exist are skipped,
so nothing gets duplicated.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from app.models import Tag

TAGS_FILE = Path(__file__).resolve().parent / "seed" / "tags.json"


def load_tags(session: Session) -> int:
    """Add any missing tags. Returns how many new tags were added."""
    data = json.loads(TAGS_FILE.read_text(encoding="utf-8"))
    existing = set(session.exec(select(Tag.name)).all())

    added = 0
    for category in data:
        for subgroup in category["subgroups"]:
            for name in subgroup["tags"]:
                if name not in existing:
                    session.add(Tag(name=name, category=category["category"], subgroup=subgroup["name"]))
                    added += 1
    session.commit()
    return added
