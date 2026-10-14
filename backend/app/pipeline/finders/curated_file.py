"""
Search strategy "curated_file": no searching, just read the hand-checked file.

app/seed/events_curated.json holds events that a person opened and checked (title, date,
place, link, and the date they checked it). It is the demo's safety net: it works with no
internet and no API key, and it is always merged in by the pipeline.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.pipeline.base import DateWindow, EventFinder, RawEvent, register_finder
from app.pipeline.normalise import to_london

log = logging.getLogger("pipeline.curated")

CURATED_FILE = Path(__file__).resolve().parents[2] / "seed" / "events_curated.json"


def _when(value: Optional[str]) -> Optional[datetime]:
    return to_london(datetime.fromisoformat(value)) if value else None


@register_finder("curated_file")
class CuratedFileSource(EventFinder):
    def __init__(self, path: Optional[Path] = None, **_ignored):
        self.path = Path(path or CURATED_FILE)  # looked up now (not at import) so tests can point it elsewhere

    def find(self, window: DateWindow, areas: List[dict], categories: List[dict]) -> List[RawEvent]:
        if not self.path.exists():
            log.info("No curated events file at %s", self.path)
            return []
        items = json.loads(self.path.read_text(encoding="utf-8"))
        events = []
        for item in items:
            events.append(RawEvent(
                title=item["title"],
                url=item["url"],
                source="curated",
                start_time=_when(item.get("start")),
                end_time=_when(item.get("end")),
                location_text=item.get("location", ""),
                description=item.get("description", ""),
                image_url=item.get("image_url"),
                verified_on=_when(item.get("verified_on")),
                area_hint=item.get("area"),
                event_type_hint=item.get("event_type"),
                alcohol_hint=item.get("alcohol_role"),
                tags_hint=item.get("tags", []),
            ))
        return events
