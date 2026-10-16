"""
The shapes of data for the profile routes (what the front end sends and receives).

Same idea as schemas.py: Pydantic checks every incoming request, and FastAPI answers 422
with a clear message when something is wrong.
"""

from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Text = Annotated[str, Field(min_length=1, max_length=120)]
LongText = Annotated[str, Field(max_length=600)]

# Profile fields a student may hide from other people (docs/DESIGN_DECISIONS.md, section 8).
HIDEABLE_FIELDS = (
    "bio", "hometown", "relationship_status", "zodiac", "education", "experience", "skills",
    "languages", "hobbies", "personality", "societies",
)


# ---- Parts of the profile (used both for the CV draft and for saving) ----


class EducationItem(BaseModel):
    degree: Text
    institution: Text
    start_year: Optional[int] = Field(default=None, ge=1950, le=2100)
    end_year: Optional[int] = Field(default=None, ge=1950, le=2100)
    grade: Optional[Annotated[str, Field(max_length=40)]] = None


class ExperienceItem(BaseModel):
    title: Text
    organisation: Text
    location: Optional[Annotated[str, Field(max_length=120)]] = None
    start: Optional[Annotated[str, Field(pattern=r"^\d{4}(-\d{2})?$")]] = None  # YYYY or YYYY-MM
    end: Optional[Annotated[str, Field(pattern=r"^\d{4}(-\d{2})?$")]] = None  # empty means current
    description: Optional[Annotated[str, Field(max_length=600)]] = None
    kind: Literal["job", "internship", "society", "project"] = "job"


class LanguageItem(BaseModel):
    language: Annotated[str, Field(min_length=1, max_length=40)]
    level: Literal["basic", "conversational", "fluent", "native"] = "fluent"


class ProfileSaveIn(BaseModel):
    """The reviewed profile. Saving REPLACES the old lists, so send everything the student wants to keep."""

    education: List[EducationItem] = Field(default_factory=list, max_length=15)
    experience: List[ExperienceItem] = Field(default_factory=list, max_length=30)
    skills: List[Annotated[str, Field(min_length=1, max_length=60)]] = Field(default_factory=list, max_length=60)
    languages: List[LanguageItem] = Field(default_factory=list, max_length=15)


class CVDraftOut(BaseModel):
    """What we found in the CV. Nothing is saved until the student reviews it and saves."""

    cv_id: int
    read_by: Literal["claude", "rules"]  # which reader produced it (rules = the simple offline reader)
    education: List[EducationItem]
    experience: List[ExperienceItem]
    skills: List[str]
    languages: List[LanguageItem]
    interests: List[str]


# ---- Reading the profile back ----


class SkillOut(BaseModel):
    id: int
    name: str
    category: str
    source: Optional[str] = None  # manual or detected


class ProfileFullOut(BaseModel):
    id: int
    name: str
    ucl_email: str
    headline: Optional[str]
    bio: Optional[str]
    hometown: Optional[str]
    relationship_status: Optional[str]
    zodiac: Optional[str]
    profile_note: Optional[str]
    avatar_url: Optional[str]
    linkedin_url: Optional[str]
    is_alumni: bool
    grad_year: Optional[int]
    needs_visa_sponsorship: bool
    hidden_fields: List[str]
    theme: str
    connection_style: str
    onboarding_step: int
    education: List[EducationItem]
    experience: List[ExperienceItem]
    skills: List[SkillOut]
    languages: List[LanguageItem]
    hobbies: List[str]
    big_five: dict


# ---- Small settings and details ----


class DetailsIn(BaseModel):
    """The 'about me' details and settings. Only the fields you send are changed."""

    headline: Optional[Annotated[str, Field(max_length=100)]] = None
    bio: Optional[Annotated[str, Field(max_length=500)]] = None
    hometown: Optional[Annotated[str, Field(max_length=80)]] = None
    relationship_status: Optional[Annotated[str, Field(max_length=40)]] = None
    zodiac: Optional[Annotated[str, Field(max_length=40)]] = None
    profile_note: Optional[Annotated[str, Field(max_length=500)]] = None
    avatar_url: Optional[Annotated[str, Field(max_length=300)]] = None
    needs_visa_sponsorship: Optional[bool] = None
    hidden_fields: Optional[List[str]] = None
    theme: Optional[Literal["light", "dark"]] = None
    connection_style: Optional[Literal["swipe", "request"]] = None
    onboarding_step: Optional[int] = Field(default=None, ge=0, le=6)
    alcohol_pref: Optional[Literal["drinks", "bars_no_drink", "avoid"]] = None  # "Do you drink?" (optional question)

    @field_validator("avatar_url")
    @classmethod
    def avatar_must_be_https(cls, value):
        """Shown to other students as an image link, so only https links are allowed."""
        if value and not value.lower().startswith("https://"):
            raise ValueError("The picture link must start with https://")
        return value or None

    @field_validator("hidden_fields")
    @classmethod
    def hidden_fields_must_be_known(cls, value):
        if value is not None:
            unknown = sorted(set(value) - set(HIDEABLE_FIELDS))
            if unknown:
                raise ValueError(f"Unknown field(s) {unknown}. You can hide: {', '.join(HIDEABLE_FIELDS)}")
            value = sorted(set(value))
        return value


class AddSkillsIn(BaseModel):
    """Skills to add to the profile (for example after an event). Existing skills are kept."""

    skills: List[Annotated[str, Field(min_length=1, max_length=60)]] = Field(min_length=1, max_length=20)


class HobbiesIn(BaseModel):
    tag_ids: List[int] = Field(default_factory=list, max_length=8)


class PersonalityIn(BaseModel):
    """Answers to the 10 Big Five statements: {"bfi1": 4, ...}. All ten are needed, each from 1 to 5."""

    answers: dict

    @field_validator("answers")
    @classmethod
    def check_answers(cls, value):
        for key, answer in value.items():
            if not isinstance(answer, int) or isinstance(answer, bool) or not 1 <= answer <= 5:
                raise ValueError(f"The answer for {key} must be a whole number from 1 to 5.")
        return value
