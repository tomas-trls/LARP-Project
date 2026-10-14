"""
Search strategy "category_sweep": one search for every category in every area.

The full explanation in plain English is in docs/EVENT_SEARCH_LOGIC.md. In short:

  1. build one search query for each (area, category) pair, UCL first and Canary Wharf after;
  2. run each query with the search engine and keep the top few results as CANDIDATES;
  3. throw out obvious junk (list pages, duplicates);
  4. open every remaining candidate and check it really is a dated, in-person event
     inside the window and near one of our areas (verify.py);
  5. hand the survivors on.

A failure in one query never stops the others.
"""

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, List, Optional
from urllib.parse import urlparse

from app.pipeline.base import DateWindow, EventFinder, RawEvent, SearchHit, SearchProvider, register_finder
from app.pipeline.search_plan import CAREER_WORDS, SOCIAL_WORDS
from app.pipeline.verify import PageVerifier

log = logging.getLogger("pipeline.category_sweep")

# URLs that are lists, searches or articles rather than one event.
LISTING_PAGE = re.compile(
    r"/(search|category|categories|tag|tags|topics?|blog|news|articles?|directory|find|browse|events?/?$|e/?$)(/|$|\?)"
    r"|/d/[^/]+/[^/]+/?$",  # Eventbrite search pages: /d/<place>/<topic>/
    re.IGNORECASE,
)


@dataclass
class Query:
    """One search to run."""

    area: dict
    category: dict
    text: str


def clean_url(url: str) -> str:
    """The link without tracking bits, so the same page found twice is recognised."""
    parts = urlparse(url)
    return f"{parts.scheme}://{parts.netloc}{parts.path}".rstrip("/").lower()


def looks_like_listing_page(url: str) -> bool:
    path = urlparse(url).path or "/"
    return path in ("", "/") or bool(LISTING_PAGE.search(path))


@register_finder("category_sweep")
class CategorySweepFinder(EventFinder):
    def __init__(
        self,
        provider: SearchProvider,
        verifier: Optional[PageVerifier] = None,
        results_per_query: int = 5,
        now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ):
        self.provider = provider
        self.verifier = verifier or PageVerifier()
        self.results_per_query = results_per_query
        self.now_fn = now_fn
        self.notes: List[str] = []  # a plain-English trail of what happened, for the run report

    # ---- step 1: the queries ----------------------------------------------

    def build_queries(self, window: DateWindow, areas: List[dict], categories: List[dict]) -> List[Query]:
        """Areas in the order given (UCL first), and inside each area the categories in order."""
        queries = []
        for area in areas:
            for category in categories:
                words = CAREER_WORDS if category["kind"] == "career" else SOCIAL_WORDS
                text = f"{category['keywords']} {words} for students {area['terms']} {window.months_text()}"
                queries.append(Query(area=area, category=category, text=text))
        return queries

    # ---- steps 2 to 5 -------------------------------------------------------

    def find(self, window: DateWindow, areas: List[dict], categories: List[dict]) -> List[RawEvent]:
        now = self.now_fn()
        seen_urls = set()
        found: List[RawEvent] = []

        for query in self.build_queries(window, areas, categories):
            self.notes.append(f"SEARCH [{query.area['label']} / {query.category['name']}]: {query.text}")
            try:
                hits = self.provider.search(query.text)[: self.results_per_query]
            except Exception as problem:  # one bad query must not stop the rest
                log.warning("Search failed (%s): %s", query.text, problem)
                self.notes.append(f"  search failed: {problem}")
                continue

            for hit in hits:
                key = clean_url(hit.url)
                if key in seen_urls:
                    self.notes.append(f"  skip (already seen): {hit.url}")
                    continue
                seen_urls.add(key)
                if looks_like_listing_page(hit.url):
                    self.notes.append(f"  skip (looks like a list, not one event): {hit.url}")
                    continue

                verdict = self.verifier.verify(hit, window, now, source=self.name)
                if not verdict.ok:
                    self.notes.append(f"  dropped: {hit.url}  ({verdict.reason})")
                    continue
                self.notes.append(f"  KEPT: {verdict.event.title}  ({hit.url})")
                found.append(verdict.event)

        return found
