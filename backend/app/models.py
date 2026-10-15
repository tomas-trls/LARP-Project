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

    # --- New profile and settings columns (re-plan, push P1a) ---
    bio: Optional[str] = None
    hometown: Optional[str] = None  # "Where are you from?"
    relationship_status: Optional[str] = None  # optional
    zodiac: Optional[str] = None  # optional
    profile_note: Optional[str] = None  # the final "add a specific comment" box
    avatar_url: Optional[str] = None
    is_alumni: bool = False
    grad_year: Optional[int] = None  # alumni only
    headline: Optional[str] = None  # e.g. "Data Analyst at Deloitte"
    personality_type: Optional[str] = None  # result of the statements, e.g. ambivert
    theme: str = "light"  # light, dark
    connection_style: str = "request"  # swipe, request
    onboarding_step: int = 0  # how far through the profile creator they got (0 = not started, 6 = done)


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
    """Something a student is looking for, or offers (tutoring, design, ...).

    DEPRECATED: the new screens do not use this. It stays only until the register route
    and the seed profiles stop writing to it, then the table is deleted.
    """

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

    # --- New columns (re-plan, push P1a) ---
    category: str = "social"  # opportunity (career events), social, society
    society_id: Optional[int] = Field(default=None, foreign_key="society.id")  # set when a society hosts it
    employer: Optional[str] = None  # e.g. Deloitte, for career events


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
    kind: str = "auto"  # auto (auto-paired group), event (people going to one event)


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
    kind: str = "all"  # all, career, social (the new People tab keeps two lists)
    starter: Optional[str] = None  # a conversation starter based on shared ground


# =====================================================================
# NEW TABLES (back-end re-plan). See docs/DATABASE_DIAGRAM.md.
# =====================================================================

# --- Profile (CV or manual entry) ---------------------------------------------


class Education(SQLModel, table=True):
    """One degree or course on a student's profile."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    degree: str  # e.g. MSc Business Analytics
    institution: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    grade: Optional[str] = None  # e.g. 2:1, Distinction


class Experience(SQLModel, table=True):
    """One job, internship, society role or project on a student's profile."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    organisation: str
    location: Optional[str] = None
    start: Optional[str] = None  # written as YYYY-MM
    end: Optional[str] = None  # YYYY-MM, or empty if it is current
    description: Optional[str] = None
    kind: str = "job"  # job, internship, society, project


class UserLanguage(SQLModel, table=True):
    """A language the student speaks."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    language: str
    level: str = "fluent"  # basic, conversational, fluent, native


class CVUpload(SQLModel, table=True):
    """A CV the student uploaded. We keep the extracted text, not the file itself."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str
    raw_text: Optional[str] = None
    status: str = "parsing"  # parsing, done, failed
    parsed_json: dict = Field(default_factory=dict, sa_column=Column(JSON))  # what was found, before the student edits it
    created_at: datetime = Field(default_factory=now)


class PersonalityAnswer(SQLModel, table=True):
    """A student's answer to one agree/disagree statement."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    statement_id: str = Field(primary_key=True)  # id from seed/personality.json
    value: int  # 1 (strongly disagree) to 5 (strongly agree)


class EmailVerification(SQLModel, table=True):
    """A one-time code sent to a UCL email address at sign-up."""

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    code_hash: str  # hashed, like a password
    expires_at: datetime
    used: bool = False


# --- Career engine -------------------------------------------------------------


class Skill(SQLModel, table=True):
    """One canonical skill. CVs, roles, jobs and society roles all point at these rows."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    category: str  # academics, skills, teamwork, experience, leadership


class SkillSynonym(SQLModel, table=True):
    """Another way of writing a skill ("cooperative" means the teamwork skill)."""

    term: str = Field(primary_key=True)  # always lower case
    skill_id: int = Field(foreign_key="skill.id", index=True)


class UserSkill(SQLModel, table=True):
    """A skill a student has."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    skill_id: int = Field(foreign_key="skill.id", primary_key=True)
    source: str = "manual"  # cv, manual


class Role(SQLModel, table=True):
    """One career path from the searchable list (Product Manager, Data Analyst, ...)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    sector: str
    alumni_count: int = 0
    median_start_salary_k: int = 0  # in thousands of pounds
    description: Optional[str] = None


class RoleSkill(SQLModel, table=True):
    """A skill a role asks for, and how much it matters (0 to 1)."""

    role_id: int = Field(foreign_key="role.id", primary_key=True)
    skill_id: int = Field(foreign_key="skill.id", primary_key=True)
    importance: float = 1.0


class WorkValue(SQLModel, table=True):
    """One item from the UCL Careers values activity (Money, Autonomy, ...)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(unique=True)
    description: Optional[str] = None
    added_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")  # set for a value a student made up


class UserWorkValue(SQLModel, table=True):
    """One of the student's top 3 to 5 work values. rank 1 is the most important."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    work_value_id: int = Field(foreign_key="workvalue.id", primary_key=True)
    rank: int


class RoleWorkValue(SQLModel, table=True):
    """A work value a role offers, and how strongly (0 to 1)."""

    role_id: int = Field(foreign_key="role.id", primary_key=True)
    work_value_id: int = Field(foreign_key="workvalue.id", primary_key=True)
    strength: float = 1.0


class UserRoute(SQLModel, table=True):
    """A career route a student saved. Exactly one is active at a time."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role_id: Optional[int] = Field(default=None, foreign_key="role.id")  # empty for a role they typed themselves
    custom_title: Optional[str] = None
    source: str = "chosen"  # chosen (picked from the list), suggested (by LARP)
    rationale: Optional[str] = None  # why it was suggested
    is_active: bool = False
    fit_pct: Optional[int] = None  # average of the five category scores
    created_at: datetime = Field(default_factory=now)


class RouteScore(SQLModel, table=True):
    """The student's score for one category of one route. Five rows per route."""

    route_id: int = Field(foreign_key="userroute.id", primary_key=True)
    category: str = Field(primary_key=True)  # academics, skills, teamwork, experience, leadership
    user_score: int  # 0 to 100
    benchmark_score: int  # what alumni in this role score
    matched_skills: list = Field(default_factory=list, sa_column=Column(JSON))
    missing_skills: list = Field(default_factory=list, sa_column=Column(JSON))


# --- Jobs (part of the Opportunities tab) ---------------------------------------


class Job(SQLModel, table=True):
    """A job listing, scraped from a public site or loaded from the seed file."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    company: str
    location: Optional[str] = None
    work_mode: Optional[str] = None  # on-site, hybrid, remote
    salary_text: Optional[str] = None
    summary: Optional[str] = None
    source: str = "seed"  # where it came from
    source_url: Optional[str] = Field(default=None, unique=True)  # stops duplicates on re-scrape
    posted_on: Optional[datetime] = None
    closes_on: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=now)
    role_id: Optional[int] = Field(default=None, foreign_key="role.id")  # the role type it advertises
    raw_text: Optional[str] = None


class JobSkill(SQLModel, table=True):
    """A skill a job advert asks for."""

    job_id: int = Field(foreign_key="job.id", primary_key=True)
    skill_id: int = Field(foreign_key="skill.id", primary_key=True)


class JobSave(SQLModel, table=True):
    """A job a student saved or applied for."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    job_id: int = Field(foreign_key="job.id", primary_key=True)
    status: str = "saved"  # saved, applied


class EventSave(SQLModel, table=True):
    """An event a student saved, is going to, or attended."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    event_id: int = Field(foreign_key="event.id", primary_key=True)
    status: str = "saved"  # saved, going, attended


# --- People --------------------------------------------------------------------


class Connection(SQLModel, table=True):
    """A request to connect between two people. Messaging unlocks once both agree."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)  # who sent it
    other_user_id: int = Field(foreign_key="user.id", index=True)  # who received it
    kind: str = "career"  # career, social
    status: str = "pending"  # pending, accepted, declined
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=now)


class Follow(SQLModel, table=True):
    """One-way follow, for people who share a hobby."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    followed_user_id: int = Field(foreign_key="user.id", primary_key=True)


class EventPair(SQLModel, table=True):
    """Two students going to the same event together."""

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id", index=True)
    user_id: int = Field(foreign_key="user.id")  # who asked
    partner_id: int = Field(foreign_key="user.id")
    status: str = "pending"  # pending, accepted, declined


# --- Societies -----------------------------------------------------------------


class Society(SQLModel, table=True):
    """A student society or club."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    category: str  # Academic, Technology & science, Finance & enterprise, Sport, ...
    tagline: Optional[str] = None
    description: Optional[str] = None
    membership_price: Optional[float] = None  # in pounds, empty if free
    membership_url: Optional[str] = None
    member_count: int = 0


class SocietyTag(SQLModel, table=True):
    """Links a society to the interest tags it covers, used to rank societies by fit."""

    society_id: int = Field(foreign_key="society.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class SocietyMember(SQLModel, table=True):
    """A student who joined a society."""

    society_id: int = Field(foreign_key="society.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    role: str = "member"  # member, committee


class SocietyRole(SQLModel, table=True):
    """A student rep role a society is recruiting for."""

    id: Optional[int] = Field(default=None, primary_key=True)
    society_id: int = Field(foreign_key="society.id", index=True)
    title: str
    description: Optional[str] = None
    counts_as_category: str = "leadership"  # which of the five categories it builds
    is_open: bool = True


class SocietyRoleApplication(SQLModel, table=True):
    """A student's application for a society role."""

    role_id: int = Field(foreign_key="societyrole.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    status: str = "applied"  # applied, accepted, declined


class SocietyAnnouncement(SQLModel, table=True):
    """A post from a society, some of them for members only."""

    id: Optional[int] = Field(default=None, primary_key=True)
    society_id: int = Field(foreign_key="society.id", index=True)
    title: str
    body: str
    members_only: bool = False
    created_at: datetime = Field(default_factory=now)


# --- Messages, notifications, badges -----------------------------------------------


class Conversation(SQLModel, table=True):
    """A chat: one-to-one, a group, a society channel or an event chat."""

    id: Optional[int] = Field(default=None, primary_key=True)
    kind: str = "direct"  # direct, group, society, event, system
    title: Optional[str] = None
    group_id: Optional[int] = Field(default=None, foreign_key="group.id")
    society_id: Optional[int] = Field(default=None, foreign_key="society.id")
    event_id: Optional[int] = Field(default=None, foreign_key="event.id")
    created_at: datetime = Field(default_factory=now)


class ConversationMember(SQLModel, table=True):
    """Who is in a chat, and how far they have read."""

    conversation_id: int = Field(foreign_key="conversation.id", primary_key=True)
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    last_read_at: Optional[datetime] = None
    muted: bool = False


class Message(SQLModel, table=True):
    """One message in a chat."""

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id", index=True)
    sender_id: int = Field(foreign_key="user.id")
    body: str
    created_at: datetime = Field(default_factory=now)


class Notification(SQLModel, table=True):
    """An alert for a student (new match, message, event or role)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str  # match, message, event, role
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now)


class NotificationPref(SQLModel, table=True):
    """Which kinds of alert a student wants. A missing row means on."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    kind: str = Field(primary_key=True)  # match, message, event, role
    enabled: bool = True


class Badge(SQLModel, table=True):
    """A badge a student can earn (society badge, social badge)."""

    code: str = Field(primary_key=True)
    name: str
    how_earned: Optional[str] = None


class UserBadge(SQLModel, table=True):
    """A badge a student has earned."""

    user_id: int = Field(foreign_key="user.id", primary_key=True)
    badge_code: str = Field(foreign_key="badge.code", primary_key=True)
    earned_at: datetime = Field(default_factory=now)
