"""Checks the database tables and the tags list. Uses a throw-away database, never larp.db."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app import models
from app.database import get_session
from app.main import app
from app.seed_tags import load_tags


@pytest.fixture
def session():
    # An in-memory database that disappears after each test.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session):
    # Make the routes use the test database instead of larp.db.
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_all_tables_exist(session):
    names = set(SQLModel.metadata.tables)
    expected = {
        "user", "tag", "usertag", "userneed", "group", "groupmember",
        "matchcache", "event", "eventtag", "venue",
    }
    assert expected <= names


def test_loads_37_tags(session):
    load_tags(session)
    tags = session.exec(select(models.Tag)).all()
    assert len(tags) == 37


def test_loading_twice_does_not_duplicate(session):
    load_tags(session)
    assert load_tags(session) == 0
    assert len(session.exec(select(models.Tag)).all()) == 37


def test_tags_endpoint_is_grouped(session, client):
    load_tags(session)
    response = client.get("/api/tags")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 4  # four categories
    assert sum(len(c["subgroups"]) for c in data) == 12  # twelve subgroups
    assert sum(len(s["tags"]) for c in data for s in c["subgroups"]) == 37

    # chess sits under Hobbies > Games and strategy
    hobbies = next(c for c in data if c["category"] == "Hobbies")
    games = next(s for s in hobbies["subgroups"] if s["name"] == "Games and strategy")
    assert "chess" in [t["name"] for t in games["tags"]]
