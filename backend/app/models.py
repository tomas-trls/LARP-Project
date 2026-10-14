"""
Database tables.

Each class below is one table; each attribute is one column.
Fields with a fixed set of allowed values (like campus) are stored as plain
text, and the allowed values are listed in the comments. Step 2 checks them
when a student registers.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def now():
    """Current time (UTC, with timezone), used as the default for 'created at' style columns."""
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """One row per student. Questionnaire answers live here and in user_tags / user_needs."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    ucl_email: str = Field(unique=True, index=True)
    password_hash: str  # a bcrypt hash, never the real password
    linkedin_url: Optional[str] = None
    campus: str  # main, canary, both
    travel_ok: bool = False
    alcohol_pref: str  # drinks, bars_no_drink, avoid
    goal: str  # career, social, both
    course: Optional[str] = None
    year: Optional[int] = None
    experience_industry: list = Field(default_factory=list, sa_column=Column(JSON))  # list of industries
    experience_note: Optional[str] = None  # free text, display only
    availability: list = Field(default_factory=list, sa_column=Column(JSON))  # list of free times
    linkedin_max_optin: bool = False  # only share LinkedIn if the student opts in
    auto_pair_opt_in: bool = False  # true once they ask to be put in a group (the auto-pair pool)
    created_at: datetime = Field(default_factory=now)


class Tag(SQLModel, table=True):
    """One interest tag. Students AND events use this same list, so they can be compared."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    category: str  # e.g. Hobbies
    subgroup: str  # e.g. Games and strategy


class UserTag(SQLModel, table=True):
    """Links a student to a tag they picked (up to about 8 each)."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class UserNeed(SQLModel, table=True):
    """Something a student is looking for, or offers (tutoring, design, ...)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str  # looking_for, offers
    skill: str


class Event(SQLModel, table=True):
    """A dated event (career talk, social night, ...)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location_name: Optional[str] = None
    area: str = "other"  # main, canary, other
    event_type: str  # career, social
    alcohol_role: str = "none"  # central, optional, none
    source: str = "curated"  # where it came from, e.g. su or curated
    source_url: Optional[str] = Field(default=None, unique=True)  # stops duplicates on re-scrape
    image_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=now)


class EventTag(SQLModel, table=True):
    """Links an event to its tags (up to 3 each)."""

    event_id: int = Field(foreign_key="event.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class Venue(SQLModel, table=True):
    """An always-available place suggestion (café, bar, arcade). Not dated."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: Optional[str] = None
    area: str = "other"  # main, canary, other
    address: Optional[str] = None
    url: Optional[str] = None
    alcohol_role: str = "none"  # central, optional, none
    verified_on: Optional[datetime] = None  # when we last checked it still exists


class VenueTag(SQLModel, table=True):
    """Links a venue to its tags (up to 3 each), so venues can be matched to interests."""

    venue_id: int = Field(foreign_key="venue.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class ClassificationCache(SQLModel, table=True):
    """Claude's answer for one event, saved so each event is only ever asked about once."""

    source_url: str = Field(primary_key=True)
    text_hash: str = Field(primary_key=True)  # changes if the event's title or description changes
    answer: dict = Field(default_factory=dict, sa_column=Column(JSON))  # {"tags": [...], "event_type": ..., "alcohol_role": ...}
    created_at: datetime = Field(default_factory=now)


class Group(SQLModel, table=True):
    """An auto-paired group of students."""

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=now)
    first_event_id: Optional[int] = Field(default=None, foreign_key="event.id")


class GroupMember(SQLModel, table=True):
    """Links a student to their group (4 to 6 members; 3 allowed in the demo)."""

    group_id: int = Field(foreign_key="group.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)


class MatchCache(SQLModel, table=True):
    """Saved top-20 matches per student, so lists load fast. Refreshed when someone joins."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    other_user_id: int = Field(foreign_key="user.id", primary_key=True)
    score: float
    reason: Optional[str] = None
    computed_at: datetime = Field(default_factory=now)
