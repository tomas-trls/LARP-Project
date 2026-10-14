"""
The pipeline runner: collect from every source, clean, tag, save, tidy up.

The important safety rule: each source is run on its own. If one fails (the website is down,
the key has no credit, the page changed...) we log it and carry on with the others, and we NEVER
delete saved events because of a failure. The hand-checked curated file is always merged in last,
so there is always something to show.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Session

from app.pipeline import classify
from app.pipeline.base import DateWindow, EventSource, RawEvent, get_finder_class, get_provider_class
from app.pipeline.claude_tagger import ClaudeTagger
from app.pipeline.finders.curated_file import CuratedFileSource
from app.pipeline.normalise import detect_area, tidy_location
from app.pipeline.store import ReadyEvent, delete_ended, has_ended, save_events
from app.pipeline.su_whats_on import SuWhatsOnSource
from app.pipeline.normalise import to_utc
from app import settings

log = logging.getLogger("pipeline.runner")


class FailingSource(EventSource):
    """Used to test the safety net: pretends a source broke."""

    def __init__(self, name: str):
        self.name = name

    def fetch(self, window: DateWindow) -> List[RawEvent]:
        raise RuntimeError(f"{self.name} was switched off on purpose to test the fallback")


def build_sources(live: bool, break_source: Optional[str] = None, only: Optional[List[str]] = None) -> List[EventSource]:
    """
    The sources to run, in order. Without `live` this is just the curated file (safe, offline).
    With `live` it is the Students' Union page, then the chosen search strategy, then the curated file.
    """
    sources: List[EventSource] = []
    if live:
        sources.append(SuWhatsOnSource())
        if settings.EVENT_FINDER != "curated_file":
            provider = get_provider_class(settings.EVENT_SEARCH_PROVIDER)()
            sources.append(get_finder_class(settings.EVENT_FINDER)(provider=provider))
    sources.append(CuratedFileSource())  # always last: the safety net

    if only:
        sources = [s for s in sources if s.name in only or s.name == "curated_file"]
    if break_source:
        sources = [FailingSource(s.name) if s.name == break_source else s for s in sources]
    return sources


def prepare(raw: RawEvent, tagger: Optional[ClaudeTagger], session: Session) -> ReadyEvent:
    """Clean one raw event and work out its type, alcohol role and tags."""
    title = " ".join(raw.title.split())
    description = raw.description or ""
    location = tidy_location(raw.location_text)
    area = raw.area_hint or detect_area(location, title)

    # Anything the source already knows (the hand-checked file) is used as it is.
    if raw.event_type_hint in ("career", "social"):
        event_type, ambiguous = raw.event_type_hint, False
    else:
        event_type, ambiguous = classify.classify_type(title, description)
    alcohol = raw.alcohol_hint if raw.alcohol_hint in ("central", "optional", "none") else classify.classify_alcohol(title, description)

    if raw.tags_hint:
        tags, needs_claude = [t for t in raw.tags_hint if t in classify.TAG_SYNONYMS][: classify.MAX_TAGS], False
    else:
        tags, needs_claude = classify.keyword_tags(title, description)

    # Second pass: only when the keywords could not settle it.
    if (needs_claude or ambiguous) and tagger is not None:
        answer = tagger.classify(session, title, description, raw.url)
        if answer:
            tags = answer["tags"] or tags
            if answer["event_type"] and not raw.event_type_hint:
                event_type = answer["event_type"]
            if answer["alcohol_role"] and not raw.alcohol_hint:
                alcohol = answer["alcohol_role"]

    return ReadyEvent(
        title=title, url=raw.url, source=raw.source, area=area, event_type=event_type, alcohol_role=alcohol,
        start_time=raw.start_time, end_time=raw.end_time, location_name=location, description=description[:600],
        image_url=raw.image_url, tags=tags,
    )


def refresh_events(
    session: Session,
    sources: List[EventSource],
    window: Optional[DateWindow] = None,
    now: Optional[datetime] = None,
    tagger: Optional[ClaudeTagger] = None,
) -> dict:
    """Run every source, save what they found, and return a report of what happened."""
    now = now or datetime.now(timezone.utc)
    window = window or DateWindow.from_days(now, settings.EVENT_WINDOW_DAYS)
    report = {"sources": [], "added": 0, "updated": 0, "duplicates": 0, "removed_ended": 0}

    ready: List[ReadyEvent] = []
    for source in sources:
        try:
            raw_events = source.fetch(window)
        except Exception as problem:  # this source failed: log it, keep everything else
            log.error("Source '%s' failed: %s", source.name, problem)
            report["sources"].append({"name": source.name, "status": "failed", "found": 0, "error": str(problem)})
            continue

        kept = 0
        for raw in raw_events:
            try:
                item = prepare(raw, tagger, session)
            except Exception as problem:  # one odd event must not lose the rest
                log.warning("Skipped an event from '%s' (%s): %s", source.name, raw.title, problem)
                continue
            if has_ended(to_utc(item.start_time), to_utc(item.end_time), now):
                continue  # already over: never saved
            ready.append(item)
            kept += 1
        report["sources"].append({"name": source.name, "status": "ok", "found": kept, "error": None})

    counts = save_events(session, ready, now)
    report.update(counts)
    report["removed_ended"] = delete_ended(session, now)
    return report
