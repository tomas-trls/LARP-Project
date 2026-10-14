"""Shared test set-up: a throw-away in-memory database, never larp.db."""

import socket

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app import settings
from app.database import get_session
from app.main import app
from app.match_cache import rebuild_match_cache
from app.seed_events import load_test_events, load_test_venues
from app.seed_profiles import SEED_PASSWORD, load_profiles
from app.seed_tags import load_tags


@pytest.fixture(autouse=True)
def no_internet_in_tests(monkeypatch):
    """Safety net: a test that tries to reach the internet fails loudly instead of quietly spending money or hitting a real site."""
    real_connect = socket.socket.connect

    def only_local(self, address, *args, **kwargs):
        host = address[0] if isinstance(address, tuple) else str(address)
        if host not in ("127.0.0.1", "::1", "localhost"):
            raise AssertionError(f"A test tried to reach the internet ({host}). Use a fake instead.")
        return real_connect(self, address, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", only_local)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)  # a real key in .env must never be used by tests
    monkeypatch.setattr(settings, "REQUIRE_UCL_EMAIL", True)  # tests check the real rule, whatever .env says


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        load_tags(session)  # most tests need the tag list to exist
        yield session


@pytest.fixture
def client(session):
    # Make the routes use the test database instead of larp.db.
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def seeded(session):
    """The 32 seed students, with their match lists saved (like after reset_db)."""
    load_profiles(session)
    rebuild_match_cache(session)


@pytest.fixture
def with_events(session):
    """The invented test events and venues (never real data)."""
    load_test_events(session)
    load_test_venues(session)


@pytest.fixture
def login(client):
    """login("demo.main@ucl.ac.uk") gives the header that proves who you are."""

    def do_login(email, password=SEED_PASSWORD):
        token = client.post("/api/login", json={"ucl_email": email, "password": password}).json()["token"]
        return {"Authorization": f"Bearer {token}"}

    return do_login
