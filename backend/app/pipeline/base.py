"""
The building blocks every part of the pipeline shares.

The pipeline is made of small, swappable pieces:

  EventSource    anything that can hand back a list of events
                 (the Students' Union scraper, the curated file, a search strategy...)
  EventFinder    a kind of EventSource that goes LOOKING for events (a search strategy)
  SearchProvider the engine a finder uses to run one search query (Claude web search, a fake one for tests...)

Strategies and engines are picked BY NAME (see .env: EVENT_FINDER, EVENT_SEARCH_PROVIDER)
from the two registries at the bottom of this file. To add your own, write a small
class and put @register_finder("my_name") above it. Nothing else needs to change.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional


@dataclass
class DateWindow:
    """The period we are interested in, for example today until 30 days from now."""

    start: datetime
    end: datetime

    @classmethod
    def from_days(cls, now: datetime, days: int) -> "DateWindow":
        return cls(start=now, end=now + timedelta(days=days))

    def contains(self, moment: datetime) -> bool:
        return self.start <= moment <= self.end

    def months_text(self) -> str:
        """For search wording, e.g. 'October 2026' or 'October November 2026'."""
        first, last = self.start, self.end
        if (first.year, first.month) == (last.year, last.month):
            return f"{first:%B %Y}"
        if first.year == last.year:
            return f"{first:%B} {last:%B %Y}"
        return f"{first:%B %Y} {last:%B %Y}"


@dataclass
class RawEvent:
    """An event as a source found it, before cleaning. Only facts: no ratings or reviews."""

    title: str
    url: str  # the event's own page; also how we avoid duplicates
    source: str  # which source found it, e.g. "su_whats_on"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location_text: str = ""
    description: str = ""
    image_url: Optional[str] = None
    verified_on: Optional[datetime] = None  # when somebody last opened the page and checked it
    # Optional answers a source already knows (for example the hand-checked file). They skip guessing.
    area_hint: Optional[str] = None
    event_type_hint: Optional[str] = None
    alcohol_hint: Optional[str] = None
    tags_hint: List[str] = field(default_factory=list)


@dataclass
class SearchHit:
    """One result from a search engine: a page that might be an event."""

    title: str
    url: str
    snippet: str = ""


class EventSource(ABC):
    """Anything that can return events for a date window."""

    name: str = "source"

    @abstractmethod
    def fetch(self, window: DateWindow) -> List[RawEvent]:
        """Return the events found. Raise an exception if the whole source failed."""


class EventFinder(EventSource):
    """A search STRATEGY: decides what to search for and how to judge the results."""

    @abstractmethod
    def find(self, window: DateWindow, areas: List[dict], categories: List[dict]) -> List[RawEvent]:
        """Search for events in these areas and categories during the window."""

    def fetch(self, window: DateWindow) -> List[RawEvent]:
        from app.pipeline.search_plan import AREAS, CATEGORIES

        return self.find(window, AREAS, CATEGORIES)


class SearchProvider(ABC):
    """A search ENGINE: runs one query and returns the pages it found."""

    name: str = "provider"

    @abstractmethod
    def search(self, query: str) -> List[SearchHit]:
        """Run one search. Return an empty list if nothing was found."""


# ---------------------------------------------------------------------------
# Registries: how a name in .env becomes a working object
# ---------------------------------------------------------------------------

FINDERS: Dict[str, Callable[..., EventFinder]] = {}
PROVIDERS: Dict[str, Callable[..., SearchProvider]] = {}


def register_finder(name: str):
    """Class decorator: make a search strategy available under this name."""

    def decorator(cls):
        cls.name = name
        FINDERS[name] = cls
        return cls

    return decorator


def register_provider(name: str):
    """Class decorator: make a search engine available under this name."""

    def decorator(cls):
        cls.name = name
        PROVIDERS[name] = cls
        return cls

    return decorator


def _lookup(registry: Dict[str, Callable], kind: str, name: str):
    if name not in registry:
        options = ", ".join(sorted(registry)) or "none registered"
        raise ValueError(f"Unknown {kind} '{name}'. Choose one of: {options}.")
    return registry[name]


def get_finder_class(name: str):
    import app.pipeline.finders  # noqa: F401  (importing registers the built-in strategies)

    return _lookup(FINDERS, "search strategy (EVENT_FINDER)", name)


def get_provider_class(name: str):
    import app.pipeline.providers  # noqa: F401  (importing registers the built-in engines)

    return _lookup(PROVIDERS, "search engine (EVENT_SEARCH_PROVIDER)", name)
