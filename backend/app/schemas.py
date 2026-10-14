"""
The shapes of data going in and out of the API (what the front end sends and receives).

Pydantic checks every incoming request against these shapes. If something is
wrong (bad campus, non-UCL email...) FastAPI answers 422 with a clear message
before our own code runs.
"""

from datetime import datetime
from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app import settings

# The allowed values for the fixed-choice answers.
Campus = Literal["main", "canary", "both"]
AlcoholPref = Literal["drinks", "bars_no_drink", "avoid"]
Goal = Literal["career", "social", "both"]

# A short piece of text with no stray spaces at the ends.
ShortText = Annotated[str, Field(min_length=1, max_length=100)]

MAX_TAGS = 8


def check_ucl_email(value: str) -> str:
    """Lower-case the email and make sure it is a UCL one (or just email-shaped, in demo mode)."""
    value = value.strip().lower()
    name, _, domain = value.partition("@")
    if settings.REQUIRE_UCL_EMAIL:
        if not name or domain != "ucl.ac.uk":
            raise ValueError("Please use your UCL email address (ending in @ucl.ac.uk).")
    elif not name or "." not in domain or " " in value:
        # Demo mode: any address will do, as long as it looks like name@something.something.
        raise ValueError("Please enter an email address like you@example.com.")
    return value


LINKEDIN_PREFIXES = (
    "https://www.linkedin.com/in/",
    "https://linkedin.com/in/",
    "https://uk.linkedin.com/in/",
)


def check_linkedin_url(value: Optional[str]) -> Optional[str]:
    """A LinkedIn link must be a profile address on linkedin.com. Blank means 'no link'.

    The link is shown to other students as a clickable link, so we must never store
    something else (such as a javascript: address) there.
    """
    if value is None or value.strip() == "":
        return None
    value = value.strip()
    if not value.lower().startswith(LINKEDIN_PREFIXES) or " " in value:
        raise ValueError("Please use your LinkedIn profile link, like https://www.linkedin.com/in/your-name")
    return value


class RegisterIn(BaseModel):
    """Everything sent when a student creates an account (account fields + questionnaire answers)."""

    name: str = Field(min_length=1, max_length=100)
    ucl_email: str
    # bcrypt only looks at the first 72 bytes, so we cap the length.
    password: str = Field(min_length=8, max_length=72)

    campus: Campus
    travel_ok: bool = False
    alcohol_pref: AlcoholPref
    goal: Goal
    course: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = Field(default=None, ge=1, le=5)  # 1-4 undergraduate, 5 = postgraduate
    experience_industry: List[ShortText] = Field(default_factory=list, max_length=10)
    experience_note: Optional[str] = Field(default=None, max_length=500)  # display only
    availability: List[ShortText] = Field(default_factory=list, max_length=10)
    linkedin_url: Optional[str] = Field(default=None, max_length=200)
    linkedin_max_optin: bool = False

    tag_ids: List[int] = Field(default_factory=list, max_length=MAX_TAGS)
    looking_for: List[ShortText] = Field(default_factory=list, max_length=10)
    offers: List[ShortText] = Field(default_factory=list, max_length=10)

    @field_validator("ucl_email")
    @classmethod
    def email_must_be_ucl(cls, value):
        return check_ucl_email(value)

    @field_validator("linkedin_url")
    @classmethod
    def link_must_be_linkedin(cls, value):
        return check_linkedin_url(value)


class LoginIn(BaseModel):
    ucl_email: str
    password: str

    @field_validator("ucl_email")
    @classmethod
    def tidy_email(cls, value):
        return value.strip().lower()


class PreferencesIn(BaseModel):
    """Fields a student can change later. Anything left out stays as it was."""

    campus: Optional[Campus] = None
    travel_ok: Optional[bool] = None
    alcohol_pref: Optional[AlcoholPref] = None
    goal: Optional[Goal] = None
    linkedin_max_optin: Optional[bool] = None
    linkedin_url: Optional[str] = Field(default=None, max_length=200)

    @field_validator("linkedin_url")
    @classmethod
    def link_must_be_linkedin(cls, value):
        return check_linkedin_url(value)


class ProfileOut(BaseModel):
    """A student's own profile. There is deliberately no password or hash here."""

    id: int
    name: str
    ucl_email: str
    campus: str
    travel_ok: bool
    alcohol_pref: str
    goal: str
    course: Optional[str]
    year: Optional[int]
    experience_industry: list
    experience_note: Optional[str]
    availability: list
    linkedin_url: Optional[str]
    linkedin_max_optin: bool
    tags: List[str]  # tag names
    looking_for: List[str]
    offers: List[str]


class MatchOut(BaseModel):
    """One person in a ranked match list. Deliberately no email, hash or LinkedIn link."""

    user_id: int
    name: str
    course: Optional[str]
    year: Optional[int]
    campus: str
    score: float
    shared_tags: List[str]
    reason: str


class LinkedInOut(BaseModel):
    """One opted-in student in the LinkedIn Max queue. Their link is here only because they chose to share it.
    Deliberately no email, hash or alcohol preference."""

    user_id: int
    name: str
    course: Optional[str]
    year: Optional[int]
    campus: str
    linkedin_url: str
    score: float
    shared_tags: List[str]
    reason: str


class GroupMemberOut(BaseModel):
    user_id: int
    name: str
    course: Optional[str]
    year: Optional[int]
    campus: str


class FirstEventOut(BaseModel):
    """The event suggested for a group's first meet-up."""

    event_id: int
    title: str
    start_time: Optional[datetime]
    location_name: Optional[str]
    area: str
    event_type: str
    alcohol_role: str
    reason: str


class GroupOut(BaseModel):
    id: int
    members: List[GroupMemberOut]
    shared_interests: List[str]
    first_event: Optional[FirstEventOut] = None  # None if no event suits every member


class EventOut(BaseModel):
    """One event in a student's ranked list."""

    event_id: int
    title: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    location_name: Optional[str]
    area: str
    event_type: str
    alcohol_role: str
    tags: List[str]
    score: float
    reason: str
    source_url: Optional[str]


class VenueOut(BaseModel):
    """One venue in a student's ranked list."""

    venue_id: int
    name: str
    category: Optional[str]
    area: str
    address: Optional[str]
    url: Optional[str]
    alcohol_role: str
    tags: List[str]
    score: float
    reason: str


class PairOut(BaseModel):
    """Answer to 'put me in a group': either a group, or 'waiting'."""

    status: Literal["grouped", "waiting"]
    group: Optional[GroupOut] = None
    message: Optional[str] = None


class RegisterOut(BaseModel):
    user: ProfileOut
    token: str


class TokenOut(BaseModel):
    token: str
