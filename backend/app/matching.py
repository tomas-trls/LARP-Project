"""
The matching engine: how well do two students fit?

Two students get a score from 0 to 1. It is a weighted sum of five parts plus a
small campus bonus:

    score = min(1, 0.40*I + 0.20*G + 0.20*C + 0.10*E + 0.10*V + B)

    I = interests      G = goals        C = course or field
    E = experience     V = vibe         B = campus bonus

The score is symmetrical: score(A, B) is always the same as score(B, A).
Nobody is ever filtered out (cross-campus pairs score just as well), so the
parts only nudge the ranking.

The scoring works on plain `Person` objects, not database rows, so it is easy
to test. `people_from_db` turns database rows into Person objects.
"""

import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List, NamedTuple, Optional

from sqlmodel import Session, select

from app.models import Tag, User, UserTag

# ---------------------------------------------------------------------------
# The numbers you may want to tweak
# ---------------------------------------------------------------------------

# How much each part counts towards the final score (they add up to 1.0).
W_INTERESTS = 0.40
W_GOALS = 0.20
W_COURSE = 0.20
W_EXPERIENCE = 0.10
W_VIBE = 0.10

CAMPUS_BONUS = 0.05

# Tag similarity: same tag / same subgroup / same category / unrelated.
TAG_SAME = 1.0
TAG_SAME_SUBGROUP = 0.5
TAG_SAME_CATEGORY = 0.2

# Course is free text, so "same field" is worked out from keywords in the course name.
# The first field with a matching keyword wins. A course with no keyword has no field.
COURSE_FIELDS = {
    "tech": ["computer", "software", "data science", "artificial", "machine learning", "information"],
    "business and quant": ["econom", "financ", "management", "business", "statistic", "mathematic",
                           "entrepreneur", "accounting"],
    "law and society": ["law", "politic", "international relations", "history", "philosophy", "english",
                        "geography", "sociology", "sustainab"],
    "health and science": ["biomedical", "biochem", "medicine", "psychology", "engineering", "chemistry",
                           "physics", "biology", "health"],
}

# Alcohol preferences sit on a line: drinks - bars_no_drink - avoid.
VIBE_POSITION = {"drinks": 0, "bars_no_drink": 1, "avoid": 2}

# Words used when writing a reason.
CAMPUS_NAMES = {"main": "the main campus", "canary": "Canary Wharf"}
GOAL_NAMES = {"career": "career events", "social": "social events", "both": "career and social events"}


# ---------------------------------------------------------------------------
# The data the scoring needs
# ---------------------------------------------------------------------------

class TagInfo(NamedTuple):
    """One interest tag and where it sits in the tag tree."""
    name: str
    subgroup: str
    category: str


@dataclass
class Person:
    """Everything the matching engine needs to know about one student."""
    id: int
    name: str
    campus: str  # main, canary, both
    travel_ok: bool
    alcohol_pref: str  # drinks, bars_no_drink, avoid
    goal: str  # career, social, both
    course: Optional[str] = None
    year: Optional[int] = None
    industries: List[str] = field(default_factory=list)
    tags: List[TagInfo] = field(default_factory=list)


@dataclass
class MatchScore:
    """The result of scoring two people: the total, each part, and the shared tags."""
    total: float
    interests: float
    goals: float
    course: float
    experience: float
    vibe: float
    campus_bonus: float
    shared_tags: List[str]


@dataclass
class Match:
    """One row of a ranked list: who, how well, and why."""
    person: Person
    score: MatchScore
    reason: str


TAGS_FILE = Path(__file__).resolve().parent / "seed" / "tags.json"


@lru_cache(maxsize=1)
def _tag_table() -> dict:
    """Every tag by name, read once from tags.json."""
    table = {}
    for category in json.loads(TAGS_FILE.read_text(encoding="utf-8")):
        for subgroup in category["subgroups"]:
            for name in subgroup["tags"]:
                table[name] = TagInfo(name, subgroup["name"], category["category"])
    return table


def tag_info(name: str) -> TagInfo:
    """Look a tag up by name, e.g. tag_info("chess"). Handy in tests."""
    return _tag_table()[name]


# ---------------------------------------------------------------------------
# The five parts
# ---------------------------------------------------------------------------

def tag_similarity(a: TagInfo, b: TagInfo) -> float:
    """Same tag 1.0, same subgroup 0.5, same category 0.2, otherwise 0."""
    if a.name == b.name:
        return TAG_SAME
    if a.subgroup == b.subgroup:
        return TAG_SAME_SUBGROUP
    if a.category == b.category:
        return TAG_SAME_CATEGORY
    return 0.0


def _one_sided_interest(mine: List[TagInfo], theirs: List[TagInfo]) -> float:
    """For each of my tags take its best match among their tags, then average."""
    return sum(max(tag_similarity(t, u) for u in theirs) for t in mine) / len(mine)


def interest_score(a: Person, b: Person) -> float:
    """I: how alike the interests are. Averaging both directions keeps it symmetrical."""
    if not a.tags or not b.tags:
        return 0.0
    return (_one_sided_interest(a.tags, b.tags) + _one_sided_interest(b.tags, a.tags)) / 2


def goal_score(a: Person, b: Person) -> float:
    """G: same goal 1.0, one of them 'both' 0.7, career against social 0.2."""
    if a.goal == b.goal:
        return 1.0
    if "both" in (a.goal, b.goal):
        return 0.7
    return 0.2


def _clean(text: Optional[str]) -> str:
    """Lower-case and tidy spaces so 'Economics ' and 'economics' compare equal."""
    return " ".join((text or "").lower().split())


def field_of(course: Optional[str]) -> Optional[str]:
    """The broad field of a course (for example 'tech'), or None if we don't recognise it."""
    course = _clean(course)
    for field_name, keywords in COURSE_FIELDS.items():
        if any(word in course for word in keywords):
            return field_name
    return None


def course_score(a: Person, b: Person) -> float:
    """C: same course 1.0, same field 0.5, otherwise 0.1."""
    if _clean(a.course) and _clean(a.course) == _clean(b.course):
        return 1.0
    field_a = field_of(a.course)
    if field_a is not None and field_a == field_of(b.course):
        return 0.5
    return 0.1


def year_score(a: Person, b: Person) -> float:
    """Same year 1.0, one apart 0.6, further apart 0.3. A missing year counts as 0.6."""
    if a.year is None or b.year is None:
        return 0.6
    gap = abs(a.year - b.year)
    if gap == 0:
        return 1.0
    if gap == 1:
        return 0.6
    return 0.3


def industry_score(a: Person, b: Person) -> float:
    """Shared industry 1.0, both none 0.8, only one has any 0.4, different industries 0.3."""
    industries_a = {_clean(i) for i in a.industries}
    industries_b = {_clean(i) for i in b.industries}
    if not industries_a and not industries_b:
        return 0.8
    if not industries_a or not industries_b:
        return 0.4
    if industries_a & industries_b:
        return 1.0
    return 0.3


def experience_score(a: Person, b: Person) -> float:
    """E: the average of the year score and the industry score."""
    return (year_score(a, b) + industry_score(a, b)) / 2


def vibe_score(a: Person, b: Person) -> float:
    """V: same alcohol preference 1.0, neighbouring 0.6, drinks against avoid 0.3."""
    gap = abs(VIBE_POSITION[a.alcohol_pref] - VIBE_POSITION[b.alcohol_pref])
    return {0: 1.0, 1: 0.6, 2: 0.3}[gap]


def _campuses(person: Person) -> set:
    """The campuses a person counts as being on ('both' means both)."""
    return {"main", "canary"} if person.campus == "both" else {person.campus}


def campus_bonus(a: Person, b: Person) -> float:
    """B: +0.05 when they share a campus and at least one is not happy to travel."""
    shares_campus = bool(_campuses(a) & _campuses(b))
    someone_stays_put = not (a.travel_ok and b.travel_ok)
    return CAMPUS_BONUS if shares_campus and someone_stays_put else 0.0


# ---------------------------------------------------------------------------
# Putting it together
# ---------------------------------------------------------------------------

def score_pair(a: Person, b: Person) -> MatchScore:
    """Score two people from 0 to 1, keeping every part so we can explain the result."""
    parts = {
        "interests": interest_score(a, b),
        "goals": goal_score(a, b),
        "course": course_score(a, b),
        "experience": experience_score(a, b),
        "vibe": vibe_score(a, b),
        "campus_bonus": campus_bonus(a, b),
    }
    total = (
        W_INTERESTS * parts["interests"]
        + W_GOALS * parts["goals"]
        + W_COURSE * parts["course"]
        + W_EXPERIENCE * parts["experience"]
        + W_VIBE * parts["vibe"]
        + parts["campus_bonus"]
    )
    names_b = {t.name for t in b.tags}
    shared = sorted(t.name for t in a.tags if t.name in names_b)  # sorted = same answer both ways round
    return MatchScore(total=min(1.0, total), shared_tags=shared, **parts)


def _join_words(words: List[str]) -> str:
    """['a', 'b', 'c'] becomes 'a, b and c'."""
    if len(words) <= 1:
        return "".join(words)
    return ", ".join(words[:-1]) + " and " + words[-1]


def make_reason(a: Person, b: Person, score: MatchScore) -> str:
    """
    A plain-English reason built from a template (not generated text).
    It picks up to two things the two people have in common, most important first.
    """
    pieces = []

    # 1. Interests
    if score.shared_tags:
        pieces.append("you both like " + _join_words(score.shared_tags[:3]))
    elif score.interests >= 0.2:
        pieces.append("your interests are closely related")

    # 2. Goals
    if a.goal == b.goal:
        pieces.append("you are both here for " + GOAL_NAMES[a.goal])

    # 3. Same course
    if _clean(a.course) and _clean(a.course) == _clean(b.course):
        pieces.append(f"you both study {a.course}")

    # 4. Same campus
    if a.campus == b.campus and a.campus in CAMPUS_NAMES:
        pieces.append(f"you are both based at {CAMPUS_NAMES[a.campus]}")

    # 5. Same going-out style
    if a.alcohol_pref == b.alcohol_pref:
        pieces.append("you like the same kind of nights out")

    if not pieces:
        return "You come from different backgrounds, which could make for a fresh conversation."

    pieces = pieces[:2]
    sentence = pieces[0][0].upper() + pieces[0][1:]
    if len(pieces) == 2:
        sentence += ", and " + pieces[1]
    return sentence + "."


def rank_matches(me: Person, others: List[Person], limit: int = 20) -> List[Match]:
    """
    Score `me` against everyone else and return the best `limit`, best first.
    Nobody is filtered out: students on another campus are ranked like anyone else.
    """
    matches = []
    for other in others:
        if other.id == me.id:
            continue  # never match someone with themselves
        score = score_pair(me, other)
        matches.append(Match(person=other, score=score, reason=make_reason(me, other, score)))

    # Highest score first; the id breaks ties so the order is always the same.
    matches.sort(key=lambda m: (-m.score.total, m.person.id))
    return matches[:limit]


# ---------------------------------------------------------------------------
# Reading people from the database
# ---------------------------------------------------------------------------

def people_from_db(session: Session) -> List[Person]:
    """Every student as a Person. Uses two queries however many students there are."""
    # user_id -> list of that user's tags
    tags_by_user = {}
    rows = session.exec(
        select(UserTag.user_id, Tag.name, Tag.subgroup, Tag.category)
        .join(Tag, Tag.id == UserTag.tag_id)
        .order_by(Tag.id)
    ).all()
    for user_id, name, subgroup, category in rows:
        tags_by_user.setdefault(user_id, []).append(TagInfo(name, subgroup, category))

    return [
        Person(
            id=u.id,
            name=u.name,
            campus=u.campus,
            travel_ok=u.travel_ok,
            alcohol_pref=u.alcohol_pref,
            goal=u.goal,
            course=u.course,
            year=u.year,
            industries=u.experience_industry or [],
            tags=tags_by_user.get(u.id, []),
        )
        for u in session.exec(select(User).order_by(User.id)).all()
    ]
