"""
The "open the page and check it" step.

A search engine only gives us links. A link is NOT proof that an event is real, current
or near UCL, so every candidate page is opened and must pass these checks:

  1. the page loads (and robots.txt allows us to read it);
  2. it carries machine-readable event data (schema.org "Event"), so the date is a fact and not a guess;
  3. it has a title and a start date;
  4. the start date is inside our date window;
  5. it is not online-only;
  6. the place is in or near one of our two areas (UCL Bloomsbury, Canary Wharf).

Fail any check and the candidate is dropped, with a short reason we can log.
"""

import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup

from app.pipeline.base import DateWindow, RawEvent, SearchHit
from app.pipeline.normalise import detect_area, tidy_location, to_london
from app.pipeline.web import PoliteFetcher


@dataclass
class Verdict:
    """The outcome of checking one candidate."""

    event: Optional[RawEvent]
    reason: str  # "ok", or why it was dropped

    @property
    def ok(self) -> bool:
        return self.event is not None


def _types(node: dict) -> list:
    kind = node.get("@type", [])
    return [kind] if isinstance(kind, str) else list(kind)


def find_event_data(soup: BeautifulSoup) -> Optional[dict]:
    """The first schema.org Event found in the page's JSON-LD blocks."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except ValueError:
            continue
        stack = [data]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
            elif isinstance(node, dict):
                if any(t.endswith("Event") or t in ("Festival", "CourseInstance") for t in _types(node)):
                    return node
                stack.extend(node.get("@graph", []) if isinstance(node.get("@graph"), list) else [])
    return None


def parse_when(value) -> Optional[datetime]:
    """An ISO date or date-time (as written in JSON-LD) as a London datetime, or None."""
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        return to_london(datetime.fromisoformat(text))
    except ValueError:
        return None


def _location_text(location) -> str:
    """Flatten a JSON-LD location (a name, an address, or nested objects) into one line."""
    if isinstance(location, list):
        location = location[0] if location else None
    if isinstance(location, str):
        return tidy_location(location)
    if not isinstance(location, dict):
        return ""
    pieces = [location.get("name", "")]
    address = location.get("address", "")
    if isinstance(address, dict):
        pieces += [address.get(k, "") for k in ("streetAddress", "addressLocality", "postalCode")]
    else:
        pieces.append(address)
    return tidy_location(", ".join(str(p) for p in pieces if p))


def _is_online_only(data: dict) -> bool:
    mode = str(data.get("eventAttendanceMode", ""))
    location = data.get("location")
    virtual = isinstance(location, dict) and "VirtualLocation" in _types(location)
    return ("OnlineEventAttendanceMode" in mode and "Mixed" not in mode) or virtual


def _clean_text(text: str, limit: int = 600) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(text or "", "html.parser").get_text(" ")).strip()[:limit]


class PageVerifier:
    """Opens candidate pages and applies the checks above."""

    def __init__(self, fetcher: Optional[PoliteFetcher] = None):
        self.fetcher = fetcher or PoliteFetcher()

    def verify(self, hit: SearchHit, window: DateWindow, now: datetime, source: str) -> Verdict:
        # 1. the page loads
        try:
            status, html = self.fetcher.get(hit.url)
        except PermissionError:
            return Verdict(None, "robots.txt does not allow reading this page")
        except Exception as problem:
            return Verdict(None, f"page could not be opened ({type(problem).__name__})")
        if status != 200:
            return Verdict(None, f"page answered with status {status}")

        # 2. machine-readable event data
        data = find_event_data(BeautifulSoup(html, "html.parser"))
        if data is None:
            return Verdict(None, "no machine-readable event data on the page (cannot confirm a date)")

        # 3. title and start date
        title = _clean_text(str(data.get("name", "")), 200)
        start = parse_when(data.get("startDate"))
        if not title or start is None:
            return Verdict(None, "page has no clear title and start date")

        # 4. inside the window (compare whole days so an event later today still counts)
        if start.date() < window.start.date() or start > window.end:
            return Verdict(None, f"date {start:%Y-%m-%d} is outside the window")

        # 5. not online-only
        if _is_online_only(data):
            return Verdict(None, "online-only event")

        # 6. near one of our two areas
        location = _location_text(data.get("location"))
        area = detect_area(location, title)
        if area == "other":
            return Verdict(None, f"place '{location or 'unknown'}' is not near UCL or Canary Wharf")

        image = data.get("image")
        image = image[0] if isinstance(image, list) and image else image
        event = RawEvent(
            title=title,
            url=hit.url,
            source=source,
            start_time=start,
            end_time=parse_when(data.get("endDate")),
            location_text=location,
            description=_clean_text(str(data.get("description", ""))),
            image_url=image if isinstance(image, str) else None,
            verified_on=now,
            area_hint=area,
        )
        return Verdict(event, "ok")
