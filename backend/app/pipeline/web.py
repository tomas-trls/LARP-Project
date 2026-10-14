"""
Polite web access, shared by everything that visits another website.

The rules (from the spec):
  - say who we are in the User-Agent, with a contact you set in .env (SCRAPER_CONTACT);
  - read robots.txt and do not fetch anything it disallows;
  - wait at least a second between requests to the same website;
  - fetch event information only, never personal data.
"""

import time
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from app.settings import SCRAPER_CONTACT

MIN_SECONDS_BETWEEN_REQUESTS = 2.0  # per website (the spec asks for at least 1)
TIMEOUT_SECONDS = 20


def user_agent() -> str:
    contact = SCRAPER_CONTACT or "no contact set"
    return f"LARP-student-project/0.1 (UCL hackathon; reads public event pages only; contact: {contact})"


class PoliteFetcher:
    """Fetches pages one at a time, checking robots.txt and pausing between requests."""

    def __init__(self, session: Optional[requests.Session] = None, sleep=time.sleep, clock=time.monotonic):
        self._http = session or requests.Session()
        self._sleep = sleep
        self._clock = clock
        self._robots: Dict[str, Optional[RobotFileParser]] = {}
        self._last_request: Dict[str, float] = {}

    def allowed(self, url: str) -> bool:
        """Does the site's robots.txt allow us to fetch this URL? (If robots.txt can't be read, we assume yes.)"""
        parts = urlparse(url)
        host = f"{parts.scheme}://{parts.netloc}"
        if host not in self._robots:
            parser = RobotFileParser()
            try:
                self._wait(host)
                response = self._http.get(f"{host}/robots.txt", headers={"User-Agent": user_agent()}, timeout=TIMEOUT_SECONDS)
                parser.parse(response.text.splitlines() if response.status_code == 200 else [])
            except requests.RequestException:
                parser = None
            self._robots[host] = parser
        parser = self._robots[host]
        return True if parser is None else parser.can_fetch(user_agent(), url)

    def get(self, url: str) -> Tuple[int, str]:
        """(status code, page text). Raises PermissionError if robots.txt says no."""
        if not self.allowed(url):
            raise PermissionError(f"robots.txt does not allow fetching {url}")
        parts = urlparse(url)
        self._wait(f"{parts.scheme}://{parts.netloc}")
        response = self._http.get(url, headers={"User-Agent": user_agent(), "Accept": "text/html,application/xhtml+xml"}, timeout=TIMEOUT_SECONDS)
        return response.status_code, response.text

    def _wait(self, host: str) -> None:
        """Pause so we never hit one website more than once every couple of seconds."""
        last = self._last_request.get(host)
        if last is not None:
            remaining = MIN_SECONDS_BETWEEN_REQUESTS - (self._clock() - last)
            if remaining > 0:
                self._sleep(remaining)
        self._last_request[host] = self._clock()
