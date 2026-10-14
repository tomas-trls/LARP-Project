"""
Settings read from the .env file in the project root (never committed).

If .env is missing we fall back to obviously-fake values, so the app and the
tests still run. Copy .env.example to .env and put real values in it.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# .env sits in the project root, one level above backend/.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Secret used to sign login tokens. Anyone who knows it can forge a login.
JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-secret-change-me-this-is-not-secure")

# Key for the /api/admin/* routes.
ADMIN_KEY = os.getenv("ADMIN_KEY", "dev-only-admin-key")

# true = no live scraping and no live Claude calls.
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

# true = only @ucl.ac.uk emails can register (the real rule).
# Set REQUIRE_UCL_EMAIL=false in .env for the demo, where students can't make UCL addresses.
REQUIRE_UCL_EMAIL = os.getenv("REQUIRE_UCL_EMAIL", "true").lower() == "true"

# How long a login token stays valid.
TOKEN_HOURS = 24

# --- Event pipeline (Step 6) ---

# Used by the live search and the Claude tagging. Empty means "no key": those parts are skipped.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

# How far ahead to look for events, in days.
EVENT_WINDOW_DAYS = int(os.getenv("EVENT_WINDOW_DAYS", "30"))

# Which search strategy and which search engine to use (see docs/EVENT_SEARCH_LOGIC.md).
EVENT_FINDER = os.getenv("EVENT_FINDER", "category_sweep")
EVENT_SEARCH_PROVIDER = os.getenv("EVENT_SEARCH_PROVIDER", "anthropic_web_search")

# The Claude model that runs the web searches, and the cheap one that tags events.
EVENT_SEARCH_MODEL = os.getenv("EVENT_SEARCH_MODEL", "claude-opus-5-5")
EVENT_TAG_MODEL = os.getenv("EVENT_TAG_MODEL", "claude-haiku-5-5")

# Who to name in the User-Agent when we visit other people's websites, so they can contact us.
# Set SCRAPER_CONTACT in .env (an email or a web page). We never put your email in anywhere on our own.
SCRAPER_CONTACT = os.getenv("SCRAPER_CONTACT", "").strip()
