"""
Source "su_whats_on": events from the Students' Union UCL website.

What we found when inspecting the site (the spec says to inspect first):
  - robots.txt does not block /whats-on or /tags/, and sets no crawl delay;
  - there is no RSS or iCal feed;
  - the main /whats-on page is drawn by JavaScript, BUT the site also has plain server-rendered
    listing pages by tag, for example https://studentsunionucl.org/tags/careers , 25 events per page,
    in date order, with a "?page=N" link for more. Each event is a "card" with its title, date, time,
    a short description and a link to its own page.
So no headless browser is needed: we read those listing pages like a (very polite) visitor.

Which tags are read is a plain list below (LISTING_TAGS). Add or remove tags to change what is collected.
LIVE USE: this visits another organisation's website, one page every couple of seconds. It only runs when
you ask (python -m app.pipeline --live) and DEMO_MODE=false, and it needs SCRAPER_CONTACT in .env.
"""

import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional

from bs4 import BeautifulSoup

from app.pipeline.base import DateWindow, EventSource, RawEvent
from app.pipeline.normalise import detect_area, to_london
from app.pipeline.web import PoliteFetcher
from app.settings import SCRAPER_CONTACT

log = logging.getLogger("pipeline.su")

BASE = "https://studentsunionucl.org"
LISTING_TAGS = ["careers", "free", "wellbeing", "fitness", "beginner-friendly"]  # which listing pages to read
MAX_PAGES_PER_TAG = 8  # a safety stop: 8 pages x 25 events is far more than a month

# The first part of an event's address says what kind of event it is.
CATEGORY_HINTS = {
    "jobs-skills": {"event_type_hint": "career"},
    "sport": {"event_type_hint": "social"},
    "bars": {"event_type_hint": "social", "alcohol_hint": "optional"},
}

DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
DAY_RANGE = re.compile(r"^\s*(\d{1,2})\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})")  # "09 - 12/11/2026"
CLOCK = re.compile(r"\b(\d{1,2}):(\d{2})\b")


def parse_when(text: str):
    """
    Turn the card's date line into (start, end) London times. The line looks like one of:
      '14/10/2026 | 13:30 - 15:00'                 one day
      '17/11/2026 | 20:00 - 18/11/2026 | 0:00'     runs past midnight
      '09 - 12/11/2026'                            several days, no times
    Returns (None, None) if no date can be found.
    """
    text = re.sub(r"\s+", " ", text or "").strip()

    span = DAY_RANGE.match(text)
    if span:
        first, last, month, year = (int(g) for g in span.groups())
        return (to_london(datetime(year, month, first, 0, 0)), to_london(datetime(year, month, last, 23, 59)))

    dates = [(int(y), int(m), int(d)) for d, m, y in DATE.findall(text)]
    clocks = [(int(h), int(m)) for h, m in CLOCK.findall(text)]
    if not dates:
        return None, None

    first_day = dates[0]
    start = datetime(*first_day, *(clocks[0] if clocks else (0, 0)))
    end = None
    if len(clocks) >= 2:
        last_day = dates[1] if len(dates) > 1 else first_day
        end = datetime(*last_day, *clocks[1])
        if end < start:  # a finish time earlier than the start, with one date, means it runs past midnight
            end += timedelta(days=1)
    return to_london(start), to_london(end)

def parse_listing(html: str) -> List[RawEvent]:
    """Read one listing page and return its events (title, times, description, link, kind of event)."""
    soup = BeautifulSoup(html, "html.parser")
    events = []
    for card in soup.select("div.card"):
        link = card.select_one("a.card-link")
        title = card.select_one(".card_title_field")
        if link is None or title is None or not link.get("href"):
            continue

        url = link["href"].split("?")[0]  # drop the ?v=1234 version part: the same event keeps one address
        title_text = " ".join(title.get_text(" ").split())
        when = card.select_one(".card_subheading_1")
        start, end = parse_when(when.get_text(" ") if when else "")
        body = card.select_one(".card_body_text_preview")
        description = " ".join(body.get_text(" ").split()) if body else ""

        kind = url.replace(BASE, "").strip("/").split("/")  # ['whats-on', 'jobs-skills', 'event-name']
        hints = CATEGORY_HINTS.get(kind[1], {}) if len(kind) >= 3 else {}

        # The listing gives no place. Events are on the Bloomsbury campus unless the text says otherwise.
        area = detect_area(f"{description}", title_text)
        events.append(RawEvent(
            title=title_text, url=url, source="su_whats_on", start_time=start, end_time=end,
            description=description[:600], area_hint=area if area != "other" else "main", **hints,
        ))
    return events


class SuWhatsOnSource(EventSource):
    name = "su_whats_on"

    def __init__(self, fetcher: Optional[PoliteFetcher] = None, tags: Optional[List[str]] = None, **_ignored):
        self.fetcher = fetcher or PoliteFetcher()
        self.tags = tags or LISTING_TAGS
        self.notes: List[str] = []

    def fetch(self, window: DateWindow) -> List[RawEvent]:
        if not SCRAPER_CONTACT:
            raise RuntimeError("Set SCRAPER_CONTACT in .env (an email or web page) so the site can reach you, then try again.")

        found, seen = [], set()
        for tag in self.tags:
            for page in range(MAX_PAGES_PER_TAG):
                address = f"{BASE}/tags/{tag}" + (f"?page={page}" if page else "")
                status, html = self.fetcher.get(address)
                if status != 200:
                    self.notes.append(f"{address}: answered {status}, stopping this tag")
                    break
                events = parse_listing(html)
                if not events:
                    break  # an empty page means the list has ended
                for event in events:
                    if event.url not in seen:
                        seen.add(event.url)
                        found.append(event)
                last_start = events[-1].start_time
                self.notes.append(f"{address}: {len(events)} events")
                if last_start is not None and last_start > window.end:
                    break  # the list is in date order, so everything after this is outside the window

        in_window = [e for e in found if e.start_time is None or e.start_time <= window.end]
        log.info("Students' Union pages gave %d events (%d inside the window)", len(found), len(in_window))
        return in_window
