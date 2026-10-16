"""
Fills an empty database with the events, venues and jobs, every time the server starts.

The data comes from the files in app/seed/ (the hand-checked events and venues, and the demo jobs).
Nothing is scraped from the internet here. Events and venues only load when there are none. The demo jobs are topped up on every launch (nothing is added twice).

The same code that runs for a live refresh links everything up:
  - events get a category, a society (if one runs them) and the skills they build;
  - jobs get the role they advertise and the skills they ask for.
"""

from sqlmodel import Session, select

from app.jobs import refresh_jobs
from app.models import Event, Venue
from app.pipeline.finders.curated_file import CURATED_FILE
from app.pipeline.job_scraper import SeedJobsSource
from app.pipeline.runner import build_sources, refresh_events
from app.pipeline.store import backfill_event_data
from app.seed_events import SEED_DIR, load_test_events, load_test_venues, load_venues


def load_events_venues_jobs(session: Session) -> dict:
    """Load whatever is missing. Returns how many events, venues and jobs were added."""
    added = {"events": 0, "venues": 0, "jobs": 0}

    if session.exec(select(Event)).first() is None:
        if CURATED_FILE.exists():
            added["events"] = refresh_events(session, build_sources(live=False))["added"]  # offline: no internet, no Claude
        if session.exec(select(Venue)).first() is None and (SEED_DIR / "venues.json").exists():
            added["venues"] = load_venues(session)
        if added["events"] == 0 and added["venues"] == 0:  # nothing real to load: use the invented ones so the app is not empty
            added["events"], added["venues"] = load_test_events(session), load_test_venues(session)
        backfill_event_data(session)  # link society events to their society; set category and skills for every event

    # Jobs run on every launch (not only when empty): a job already saved is skipped, a new one in the file is added,
    # and every demo job's closing date is pushed forward again, so the demo jobs are always open.
    added["jobs"] = refresh_jobs(session, [SeedJobsSource()])["added"]  # linked to roles and skills

    return added
