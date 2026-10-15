"""
Finds job listings.

Two sources:
  - GradcrackerSource   a polite scraper of Gradcracker's public graduate-job listing pages (STEM jobs).
                        It uses PoliteFetcher (pipeline/web.py): it reads robots.txt, waits between requests and names
                        a contact in its User-Agent. It only runs when DEMO_MODE=false.
  - SeedJobsSource      the demo jobs in seed/jobs_seed.json. They are INVENTED (fictional employers) and marked
                        source="demo", so nobody mistakes them for real adverts.

What we do NOT scrape: LinkedIn (CLAUDE.md forbids it) and Indeed (its terms forbid it). Always check a site's
robots.txt and terms before adding it here.
"""

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from bs4 import BeautifulSoup

from app.pipeline.web import PoliteFetcher

log = logging.getLogger("larp.jobs")

SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "jobs_seed.json"
GRADCRACKER_PAGES = ["computing-technology"]  # which discipline listings to read
MAX_PAGES_PER_LISTING = 3  # keep it small: we are guests on their site


@dataclass
class RawJob:
    """A job as a source found it, before it is tagged and saved. Only facts, no personal data."""

    title: str
    company: str
    url: str  # the job's own page; also how we avoid duplicates
    source: str
    location: Optional[str] = None
    work_mode: Optional[str] = None  # on-site, hybrid, remote
    level: Optional[str] = None  # internship, graduate, entry
    salary_text: Optional[str] = None
    summary: Optional[str] = None
    closes_on: Optional[datetime] = None
    sponsorship: str = "unknown"  # yes, no, unknown


# ----------------------------------------------------------------------------
# Gradcracker
# ----------------------------------------------------------------------------

DEADLINE_FORMATS = ("%B %d, %Y", "%d %B %Y", "%d/%m/%Y")


def parse_deadline(text: Optional[str]) -> Optional[datetime]:
    """'October 31st, 2026' or '5pm, October 23rd, 2026' -> a date. 'Ongoing' (or anything odd) -> None."""
    if not text:
        return None
    cleaned = re.sub(r"^\d{1,2}(:\d{2})?\s*(am|pm),?\s*", "", text.strip(), flags=re.I)  # drop a leading time
    cleaned = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", cleaned)  # 31st -> 31
    for fmt in DEADLINE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def company_from_url(url: str) -> str:
    """Gradcracker puts the employer in the address: /hub/89/bae-systems/graduate-job/... -> 'BAE Systems'."""
    match = re.search(r"/hub/\d+/([^/]+)/", url)
    if not match:
        return "Unknown employer"
    words = match.group(1).replace("-", " ").split()
    return " ".join(w.upper() if len(w) <= 3 else w.capitalize() for w in words)


def level_from_title(title: str, url: str) -> str:
    low = f"{title} {url}".lower()
    if re.search(r"intern|placement|spring|summer", low):
        return "internship"
    if "apprentice" in low:
        return "entry"
    return "graduate"


def _is_job_link(tag) -> bool:
    href = tag.get("href", "")
    return "/hub/" in href and "/graduate-job/" in href


def parse_gradcracker_listing(html: str) -> List[RawJob]:
    """Read one Gradcracker listing page. Each job is a card with a title link and Deadline / Salary / Location facts."""
    soup = BeautifulSoup(html, "html.parser")
    cards = {}
    for link in soup.find_all("a", href=True):
        if not _is_job_link(link):
            continue
        # Climb to the biggest block that still holds only THIS job's link: that is its card.
        card = link
        while card.parent is not None:
            parent = card.parent
            if len({a["href"] for a in parent.find_all("a", href=True) if _is_job_link(a)}) > 1:
                break
            card = parent
        cards[link["href"]] = (link, card)

    jobs = []
    for href, (link, card) in cards.items():
        title = link.get_text(" ", strip=True)
        texts = list(card.stripped_strings)
        if not title or title.lower() == "view job":  # the second link on a card says 'View job'
            title = next((t for t in texts if t.lower() != "view job"), "")
        if "Deadline" not in texts:  # not a real listing card (for example the featured banner)
            continue

        def fact(label: str) -> Optional[str]:
            return texts[texts.index(label) + 1] if label in texts and texts.index(label) + 1 < len(texts) else None

        mode = "hybrid" if "hybrid" in (fact("Location") or "").lower() else ("remote" if "remote" in (fact("Location") or "").lower() else None)
        jobs.append(RawJob(
            title=title[:150], company=company_from_url(href), url=href.split("?")[0], source="gradcracker",
            location=(fact("Location") or "")[:100] or None, work_mode=mode, level=level_from_title(title, href),
            salary_text=(fact("Salary") if fact("Salary") not in (None, "Competitive") else None),
            summary=" ".join(t for t in texts[1:3] if t not in ("Add to Shortlist", "Shortlisted", "Deadline"))[:300] or None,
            closes_on=parse_deadline(fact("Deadline")),
        ))
    return jobs


class GradcrackerSource:
    """Reads the first few pages of each listing in GRADCRACKER_PAGES, politely."""

    name = "gradcracker"

    def __init__(self, fetcher: Optional[PoliteFetcher] = None):
        self.fetcher = fetcher or PoliteFetcher()

    def fetch(self) -> List[RawJob]:
        jobs: List[RawJob] = []
        for discipline in GRADCRACKER_PAGES:
            for page in range(1, MAX_PAGES_PER_LISTING + 1):
                url = f"https://www.gradcracker.com/search/{discipline}/graduate-jobs" + (f"?page={page}" if page > 1 else "")
                try:
                    status, html = self.fetcher.get(url)  # raises PermissionError if robots.txt says no
                except PermissionError as problem:
                    log.warning("Skipping %s: %s", url, problem)
                    break
                except Exception as problem:  # network trouble: stop this listing, keep what we have
                    log.warning("Could not fetch %s: %s", url, problem)
                    break
                if status != 200:
                    break
                found = parse_gradcracker_listing(html)
                if not found:
                    break
                jobs.extend(found)
        return jobs


# ----------------------------------------------------------------------------
# Demo jobs
# ----------------------------------------------------------------------------


class SeedJobsSource:
    """The invented demo jobs. Dates are written as 'closes in N days' so they never go out of date."""

    name = "demo"

    def __init__(self, now: Optional[datetime] = None):
        self.now = now or datetime.now(timezone.utc)

    def fetch(self) -> List[RawJob]:
        from datetime import timedelta

        items = json.loads(SEED_FILE.read_text(encoding="utf-8"))
        return [RawJob(
            title=i["title"], company=i["company"], url=f"demo://job/{n}", source="demo", location=i.get("location"),
            work_mode=i.get("work_mode"), level=i.get("level"), salary_text=i.get("salary"), summary=i.get("summary"),
            closes_on=self.now + timedelta(days=i["closes_in_days"]), sponsorship=i.get("sponsorship", "unknown"),
        ) for n, i in enumerate(items, start=1)]
