"""
Run the event pipeline from the command line (from the backend folder):

    .venv\\Scripts\\python -m app.pipeline                 # safe: loads only the hand-checked curated file
    .venv\\Scripts\\python -m app.pipeline --live          # also visits the Students' Union page and runs the web search
    .venv\\Scripts\\python -m app.pipeline --live --source su_whats_on        # just one live source
    .venv\\Scripts\\python -m app.pipeline --live --break su_whats_on         # pretend that source broke (tests the fallback)

--live is refused while DEMO_MODE=true in .env. A trail of what the search did is saved to
backend/last_search_notes.txt so you can read exactly why each page was kept or dropped.
"""

import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session

from app import settings
from app.database import create_db_and_tables, engine
from app.pipeline.base import DateWindow
from app.pipeline.claude_tagger import ClaudeTagger
from app.pipeline.runner import build_sources, refresh_events
from app.seed_tags import load_tags

NOTES_FILE = Path(__file__).resolve().parents[2] / "last_search_notes.txt"


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m app.pipeline", description="Refresh the events in the database.")
    parser.add_argument("--live", action="store_true", help="visit the internet (Students' Union page and web search)")
    parser.add_argument("--source", action="append", help="only run this source (repeatable): su_whats_on, category_sweep, curated")
    parser.add_argument("--break", dest="break_source", help="make this source fail on purpose, to test the fallback")
    parser.add_argument("--window-days", type=int, default=settings.EVENT_WINDOW_DAYS, help="how many days ahead to look")
    parser.add_argument("--no-claude", action="store_true", help="skip the Claude tagging pass")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if args.live and settings.DEMO_MODE:
        print("Refusing to go live: DEMO_MODE=true in .env. Set DEMO_MODE=false there if you really want to visit the internet.")
        return 2
    if args.live and not settings.ANTHROPIC_API_KEY and "su_whats_on" not in (args.source or []):
        print("The web search needs ANTHROPIC_API_KEY in .env (it is empty). Add it, or run only the Students' Union page with --source su_whats_on.")
        return 2

    create_db_and_tables()
    window = DateWindow.from_days(datetime.now(timezone.utc), args.window_days)
    sources = build_sources(live=args.live, break_source=args.break_source, only=args.source)
    tagger = ClaudeTagger() if args.live and not args.no_claude else None

    with Session(engine) as session:
        load_tags(session)
        report = refresh_events(session, sources, window=window, tagger=tagger)

    print(f"\nWindow: {window.start:%d %b %Y} to {window.end:%d %b %Y}")
    for item in report["sources"]:
        extra = f"  ({item['error']})" if item["error"] else ""
        print(f"  {item['name']:<16} {item['status']:<7} {item['found']} events{extra}")
    print(f"Added {report['added']}, updated {report['updated']}, skipped {report['duplicates']} duplicates, removed {report['removed_ended']} ended.")

    notes = [line for source in sources for line in getattr(source, "notes", [])]
    if notes:
        NOTES_FILE.write_text("\n".join(notes), encoding="utf-8")
        print(f"The search trail was saved to {NOTES_FILE.name} (why each page was kept or dropped).")
    for source in sources:
        provider = getattr(source, "provider", None)
        if provider is not None and hasattr(provider, "input_tokens"):
            print(f"Search used {provider.searches} queries, {provider.web_searches} web searches, "
                  f"{provider.input_tokens} input and {provider.output_tokens} output tokens.")
    if tagger and tagger.calls:
        print(f"Tagging asked Claude about {tagger.calls} events ({tagger.input_tokens} input, {tagger.output_tokens} output tokens).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
