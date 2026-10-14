"""
Cleaning: make every source's events look the same.

- times become proper London times (so summer time and winter time are handled)
- the location text is tidied
- the area (main / canary / other) is worked out from place names
"""

import re
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")

# Words that put an event around Canary Wharf (checked first) or around UCL's main campus.
CANARY_WORDS = ["canary wharf", "canary", "e14", "docklands", "south quay", "heron quays", "westferry"]
MAIN_WORDS = [
    "bloomsbury", "wc1", "gower street", "gordon square", "euston", "tottenham court", "russell square",
    "malet place", "torrington place", "bedford way", "ucl", "student centre", "kings cross", "king's cross",
]
NOT_MAIN_WORDS = ["ucl east"]  # UCL's Stratford campus is not the main campus


def to_london(moment: Optional[datetime]) -> Optional[datetime]:
    """
    A datetime in London time. Naive times (no time zone) are taken to already be London time,
    because that is how UK event pages write them.
    """
    if moment is None:
        return None
    if moment.tzinfo is None:
        return moment.replace(tzinfo=LONDON)
    return moment.astimezone(LONDON)


def to_utc(moment: Optional[datetime]) -> Optional[datetime]:
    """The same moment in UTC (how the database stores times)."""
    moment = to_london(moment)
    return moment.astimezone(timezone.utc) if moment else None


def tidy_location(text: Optional[str]) -> str:
    """Collapse spaces, drop a leading 'Location:' and trailing commas."""
    text = re.sub(r"\s+", " ", text or "").strip()
    text = re.sub(r"^(location|venue|where)\s*[:\-]\s*", "", text, flags=re.IGNORECASE)
    return text.strip(" ,;")


def detect_area(location_text: str, title: str = "") -> str:
    """'canary', 'main' or 'other', judged from the place name (and title as a backup)."""
    for text in (location_text.lower(), title.lower()):
        if any(word in text for word in CANARY_WORDS):
            return "canary"
        if any(word in text for word in NOT_MAIN_WORDS):
            return "other"
        if any(re.search(rf"\b{re.escape(word)}\b", text) for word in MAIN_WORDS):
            return "main"
    return "other"
