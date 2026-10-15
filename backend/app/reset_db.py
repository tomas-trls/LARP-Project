"""
One command to wipe the database and reload all the seed data.

Run it from the backend folder:
    .venv\Scripts\python -m app.reset_db                    # real, hand-checked events and venues
    .venv\Scripts\python -m app.reset_db --with-test-data   # also add the invented test events and venues

WARNING: this deletes larp.db, including any accounts created by hand.
Stop the server first (Windows will not let us delete the file while it is open).
"""

import sys

from sqlmodel import Session

from app.database import DB_FILE, create_db_and_tables, engine
from app.jobs import refresh_jobs
from app.match_cache import rebuild_match_cache
from app.pipeline.finders.curated_file import CURATED_FILE
from app.pipeline.job_scraper import SeedJobsSource
from app.pipeline.runner import build_sources, refresh_events
from app.pipeline.store import backfill_event_data
from app.seed_career import load_career_data
from app.seed_events import SEED_DIR, load_test_events, load_test_venues, load_venues
from app.seed_profiles import SEED_PASSWORD, load_profiles
from app.seed_tags import load_tags


def reset_db(with_test_data: bool = False):
    """Delete the database, rebuild the tables, load tags, students, events and venues."""
    engine.dispose()  # let go of any open connection to the file
    if DB_FILE.exists():
        DB_FILE.unlink()

    create_db_and_tables()
    with Session(engine) as session:
        tags = load_tags(session)
        career = load_career_data(session)
        students = load_profiles(session)
        matches = rebuild_match_cache(session)

        # Real events: the hand-checked file, put through the same pipeline as live events (offline, no Claude).
        events = 0
        if CURATED_FILE.exists():
            report = refresh_events(session, build_sources(live=False))
            events = report["added"]
        venues = load_venues(session) if (SEED_DIR / "venues.json").exists() else 0

        test_events = test_venues = 0
        if with_test_data or (events == 0 and venues == 0):  # nothing real yet: fall back so the app is not empty
            test_events, test_venues = load_test_events(session), load_test_venues(session)

        backfill_event_data(session)  # category (opportunity / social) and skills for every event
        jobs = refresh_jobs(session, [SeedJobsSource()])  # the invented demo jobs (no internet)

    print(f"Database reset: {tags} tags, {students} students (including 2 demo accounts) loaded.")
    print(f"Career data: {career['skills']} skills, {career['roles']} roles, {career['work_values']} work values, {career['badges']} badges.")
    print(f"Loaded {events} real curated events and {venues} real venues.")
    if test_events or test_venues:
        print(f"Also loaded {test_events} INVENTED test events and {test_venues} invented test venues.")
    print(f"Loaded {jobs['added']} demo jobs (invented employers; the real scraper only runs with DEMO_MODE=false).")
    print(f"Saved {matches} match-list rows (each student's top 20).")
    print(f"Every seed account uses the password: {SEED_PASSWORD}")
    print("Demo logins: demo.main@ucl.ac.uk (main campus, career) and demo.canary@ucl.ac.uk (Canary Wharf, social)")


if __name__ == "__main__":
    reset_db(with_test_data="--with-test-data" in sys.argv)
