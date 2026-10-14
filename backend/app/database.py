"""
Database set-up.

SQLite keeps the whole database in one file (backend/larp.db), so there is
nothing to install. This file creates the connection ("engine") and gives
routes a way to open a "session" (a short conversation with the database).
"""

from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# larp.db sits in the backend folder, next to app/. It is git-ignored.
DB_FILE = Path(__file__).resolve().parent.parent / "larp.db"

# check_same_thread=False lets FastAPI use the connection from different threads.
engine = create_engine(f"sqlite:///{DB_FILE}", connect_args={"check_same_thread": False})


def create_db_and_tables():
    """Create every table defined in models.py (does nothing for tables that exist)."""
    # Importing models makes sure every table class is registered before we create them.
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI hands one session to each request and closes it afterwards."""
    with Session(engine) as session:
        yield session
