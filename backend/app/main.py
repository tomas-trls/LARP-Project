"""
LARP back end: the entry point.

This file creates the FastAPI "app" object and lists the API routes.
Run it from the backend folder with:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to see and try every route.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlmodel import Session, select

from app import settings
from app.database import create_db_and_tables, engine, get_session
from app.models import Tag
from app.routes_admin import router as admin_router
from app.routes_dev import router as dev_router
from app.routes_events import router as events_router
from app.routes_linkedin import router as linkedin_router
from app.routes_pairing import router as pairing_router
from app.routes_users import router as users_router
from app.seed_tags import load_tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs once when the server starts: make the tables, then load the tags."""
    create_db_and_tables()
    with Session(engine) as session:
        load_tags(session)
    yield


# The app object. Every route below is attached to it.
app = FastAPI(title="LARP API", version="0.1.0", lifespan=lifespan)

# Account routes: register, login, /me, /me/preferences.
app.include_router(users_router)

# Matches and groups: /api/matches, /api/pair/auto, /api/group.
app.include_router(pairing_router)

# Things to do: /api/events and /api/venues.
app.include_router(events_router)

# LinkedIn Max: /api/linkedin-max (links people choose to share; we never contact LinkedIn).
app.include_router(linkedin_router)

# Admin only (needs the ADMIN_KEY): /api/admin/refresh-events.
app.include_router(admin_router)

# Read-only "look inside the database" pages at /dev/tables (development only).
app.include_router(dev_router)


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
