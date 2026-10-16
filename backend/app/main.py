"""
LARP back end: the entry point.

This file creates the FastAPI "app" object and lists the API routes.
Run it from the backend folder with:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to see and try every route.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app import settings
from app.database import create_db_and_tables, engine, get_session
from app.models import Tag
from app.routes_admin import router as admin_router
from app.routes_career import router as career_router
from app.routes_dev import router as dev_router
from app.routes_event_groups import router as event_groups_router
from app.routes_events import router as events_router
from app.routes_messages import router as messages_router
from app.routes_people import router as people_router
from app.routes_societies import router as societies_router
from app.routes_summary import router as summary_router
from app.routes_home import router as home_router
from app.routes_opportunities import router as opportunities_router
from app.routes_linkedin import router as linkedin_router
from app.routes_pairing import router as pairing_router
from app.routes_profile import router as profile_router
from app.routes_users import router as users_router
from app.routes_avatars import router as avatars_router
from app.pipeline.store import backfill_event_data
from app.avatars import give_everyone_a_face
from app.match_cache import rebuild_match_cache
from app.seed_career import load_career_data
from app.seed_people import load_people_details
from app.seed_profiles import load_profiles
from app.seed_societies import load_societies
from app.seed_startup import load_events_venues_jobs
from app.seed_tags import load_tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs once when the server starts: make the tables, then load the tags and the invented students."""
    create_db_and_tables()
    with Session(engine) as session:
        load_tags(session)
        load_career_data(session)  # skills, roles, work values and badges
        load_societies(session)  # the society directory
        # The invented students (30 plus the 2 demo accounts), so the app is never empty.
        # Safe on every launch: anyone already in the database is skipped.
        if load_profiles(session):
            load_people_details(session)  # bios, skills, routes, alumni and connections (needs the career data and societies above)
            rebuild_match_cache(session)  # work out each student's top matches
        load_events_venues_jobs(session)  # events, venues and jobs from the seed files (only if none exist yet)
        backfill_event_data(session)  # category and skills for events saved before they existed
        give_everyone_a_face(session)  # a cartoon profile picture for anyone without one
    yield


# The app object. Every route below is attached to it.
app = FastAPI(title="LARP API", version="0.1.0", lifespan=lifespan)

# CORS: browsers block a page on one address from reading answers from another address,
# unless the back end says that page is allowed. This lets the front end (on its own Render URL) call us.
# We log in with a token in the Authorization header, not cookies, so allow_credentials isn't needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Account routes: register, login, /me, /me/preferences.
app.include_router(users_router)

# Profile: CV upload, review and save, details, personality, hobbies (/api/profile/...).
app.include_router(profile_router)

# Career engine: roles, work values, suggested routes, saved routes and the gap summary.
app.include_router(career_router)

# Matches and groups: /api/matches, /api/pair/auto, /api/group.
app.include_router(pairing_router)

# Things to do: /api/events and /api/venues.
app.include_router(events_router)

# Home screen: /api/home, plus saving / going / "I went" on events.
app.include_router(home_router)

# Opportunities tab: career events and jobs, ranked for the active route (/api/opportunities/...).
app.include_router(opportunities_router)

# People tab: career and social lists, connections, follows, block and report.
app.include_router(people_router)

# Profile tab summary: stats, badges, routes, settings (/api/profile/summary).
app.include_router(summary_router)

# Societies tab: directory, society events, joining, rep roles, announcements.
app.include_router(societies_router)

# Messages and notifications: chats between connections and in Event Groups, alerts and their settings.
app.include_router(messages_router)

# Event Groups: book an event, then join a group of 3 to 5 going to it.
app.include_router(event_groups_router)

# LinkedIn Max: /api/linkedin-max (links people choose to share; we never contact LinkedIn).
app.include_router(linkedin_router)

# Admin only (needs the ADMIN_KEY): /api/admin/refresh-events.
app.include_router(admin_router)

# Read-only "look inside the database" pages at /dev/tables (development only).
app.include_router(dev_router)
app.include_router(avatars_router)  # the fake profile pictures


@app.get("/api/health")
def health():
    """A tiny check the front end calls to see whether the back end is running.
    demo_mode tells the front end whether to offer demo helpers (like pre-filled answers)."""
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}


@app.get("/api/tags")
def get_tags(session: Session = Depends(get_session)):
    """All interest tags, grouped by category and then subgroup (used to build the questionnaire)."""
    tags = session.exec(select(Tag).order_by(Tag.id)).all()  # id order = order in tags.json

    # Build category -> subgroup -> tags, keeping the order we first see them in.
    categories = {}
    for tag in tags:
        subgroups = categories.setdefault(tag.category, {})
        subgroups.setdefault(tag.subgroup, []).append({"id": tag.id, "name": tag.name})

    return [
        {
            "category": category,
            "subgroups": [{"name": name, "tags": tag_list} for name, tag_list in subgroups.items()],
        }
        for category, subgroups in categories.items()
    ]
