"""
Event and venue recommendations: which things should this student go to?

Event score (0 to 1) = 0.45 x interest + 0.20 x goal + 0.20 x proximity + 0.15 x timing,
and then the alcohol rule is applied on top.

Venues are the same idea without timing (a venue is always open):
    0.50 x interest + 0.30 x proximity + 0.20 x goal   (venues count as social)

The alcohol rule only ever HIDES things for students who chose "avoid", and only
where alcohol is the main point. Students who go to bars without drinking still
see bar events; their score is just lowered a little.

Like matching.py, this works on plain objects (not database rows), and "now" is
passed in, so the tests can fix the date.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Session, select

from app.matching import Person, TagInfo, tag_similarity
from app.models import Event, EventTag, Tag, Venue, VenueTag

# ---------------------------------------------------------------------------
# The numbers you may want to tweak
# ---------------------------------------------------------------------------

# Event weights (add up to 1.0).
EW_INTEREST, EW_GOAL, EW_PROXIMITY, EW_TIMING = 0.45, 0.20, 0.20, 0.15
# Venue weights (add up to 1.0).
VW_INTEREST, VW_PROXIMITY, VW_GOAL = 0.50, 0.30, 0.20

GOAL_MISMATCH = 0.3  # goal part when the event type is not what the student wants
PROXIMITY_TRAVEL_OK, PROXIMITY_NO_TRAVEL = 0.8, 0.4

# The alcohol rule. For each preference: what to do with an event/venue where alcohol is
# central / optional / not involved. A number multiplies the score; None means "hide it".
ALCOHOL_RULE = {
    "drinks": {"central": 1.0, "optional": 1.0, "none": 1.0},
    "bars_no_drink": {"central": 0.7, "optional": 1.0, "none": 1.0},
    "avoid": {"central": None, "optional": 0.85, "none": 1.0},
}
# How strict each preference is (used when a group picks an event: the strictest member wins).
STRICTNESS = {"drinks": 0, "bars_no_drink": 1, "avoid": 2}

# ---------------------------------------------------------------------------
# The data the scoring needs
# ---------------------------------------------------------------------------


@dataclass
class EventItem:
    id: int
    title: str
    event_type: str  # career, social
    area: str  # main, canary, other
    alcohol_role: str  # central, optional, none
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location_name: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    tags: List[TagInfo] = field(default_factory=list)


@dataclass
class VenueItem:
    id: int
    name: str
    area: str
    alcohol_role: str
    category: Optional[str] = None
    address: Optional[str] = None
    url: Optional[str] = None
    tags: List[TagInfo] = field(default_factory=list)


@dataclass
class Scored:
    """An event or venue with its score and a one-line reason."""
    item: object  # an EventItem or a VenueItem
    total: float
    reason: str


# ---------------------------------------------------------------------------
# The parts of the score
# ---------------------------------------------------------------------------


def interest_part(person: Person, tags: List[TagInfo]):
    """
    For each tag of the event, take its best match among the student's tags, then average.
    Returns (score, the student's tag that matched best, how well that tag matched).
    """
    if not person.tags or not tags:
        return 0.0, None, 0.0
    total, best_tag, best_similarity = 0.0, None, 0.0
    for tag in tags:
        similarity, mine = max(((tag_similarity(t, tag), t) for t in person.tags), key=lambda pair: pair[0])
        total += similarity
        if similarity > best_similarity:
            best_tag, best_similarity = mine.name, similarity
    return total / len(tags), best_tag, best_similarity


def goal_part(goal: str, wanted: str) -> float:
    """1.0 if the event type is what the student wants (or they want both), otherwise 0.3."""
    return 1.0 if goal == "both" or goal == wanted else GOAL_MISMATCH


def covers(campus: str, area: str) -> bool:
    """Is this area one of the student's campuses? ('other' is nobody's campus.)"""
    return area in ("main", "canary") and campus in (area, "both")


def proximity_part(person: Person, area: str) -> float:
    """In their campus area 1.0. Elsewhere 0.8 if happy to travel, otherwise 0.4."""
    if covers(person.campus, area):
        return 1.0
    return PROXIMITY_TRAVEL_OK if person.travel_ok else PROXIMITY_NO_TRAVEL


def timing_part(start: Optional[datetime], now: datetime) -> float:
    """Within 7 days 1.0, 8 to 14 days 0.8, 15 to 28 days 0.5, later (or no date) 0.3."""
    if start is None:
        return 0.3
    days = (_aware(start) - now).total_seconds() / 86400
    if days <= 7:
        return 1.0
    if days <= 14:
        return 0.8
    if days <= 28:
        return 0.5
    return 0.3


def alcohol_factor(preference: str, alcohol_role: str) -> Optional[float]:
    """What the alcohol rule does: a number to multiply the score by, or None to hide it."""
    return ALCOHOL_RULE[preference][alcohol_role]


def _aware(moment: datetime) -> datetime:
    """Make sure a datetime has a timezone (UTC), so we can compare it with 'now'."""
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def has_ended(event: EventItem, now: datetime) -> bool:
    """True once the event is over. Events with no times at all are never 'over'."""
    finish = event.end_time or event.start_time
    return finish is not None and _aware(finish) < now


# ---------------------------------------------------------------------------
# Reasons
# ---------------------------------------------------------------------------


def when_text(start: Optional[datetime], end: Optional[datetime], now: datetime) -> str:
    """'Today', 'Tomorrow', 'On Tuesday', 'Next Tuesday' or 'In 16 days'."""
    if start is None:
        return "Date to be announced."
    start = _aware(start)
    if start <= now and (end is None or _aware(end) >= now):
        return "Happening now."
    days = (start.date() - now.date()).days
    if days <= 0:
        return "Today."
    if days == 1:
        return "Tomorrow."
    if days < 7:
        return f"On {start.strftime('%A')}."
    if days < 14:
        return f"Next {start.strftime('%A')}."
    return f"In {days} days."


def interest_clause(best_tag: Optional[str], best_similarity: float) -> Optional[str]:
    if best_tag is None:
        return None
    if best_similarity >= 1.0:
        return f"Matches your interest in {best_tag}."
    if best_similarity >= 0.5:
        return f"Close to your interest in {best_tag}."
    return None


def place_clause(proximity: float) -> str:
    if proximity >= 1.0:
        return "In your campus area."
    if proximity >= PROXIMITY_TRAVEL_OK:
        return "A bit further away, but you are happy to travel."
    return "Further from your campus."


# ---------------------------------------------------------------------------
# Scoring and ranking
# ---------------------------------------------------------------------------


def score_event(person: Person, event: EventItem, now: datetime, alcohol_pref: Optional[str] = None) -> Optional[Scored]:
    """
    Score one event for one student. Returns None if it should not be shown
    (it has ended, or it is hidden by the alcohol rule).
    `alcohol_pref` overrides the student's own preference (used for groups).
    """
    if has_ended(event, now):
        return None
    factor = alcohol_factor(alcohol_pref or person.alcohol_pref, event.alcohol_role)
    if factor is None:
        return None

    interest, best_tag, best_similarity = interest_part(person, event.tags)
    proximity = proximity_part(person, event.area)
    total = (
        EW_INTEREST * interest
        + EW_GOAL * goal_part(person.goal, event.event_type)
        + EW_PROXIMITY * proximity
        + EW_TIMING * timing_part(event.start_time, now)
    )

    clauses = [interest_clause(best_tag, best_similarity), place_clause(proximity),
               when_text(event.start_time, event.end_time, now)]
    reason = " ".join(c for c in clauses if c)
    return Scored(item=event, total=min(1.0, total * factor), reason=reason)


def score_venue(person: Person, venue: VenueItem) -> Optional[Scored]:
    """Score one venue for one student, or None if the alcohol rule hides it."""
    factor = alcohol_factor(person.alcohol_pref, venue.alcohol_role)
    if factor is None:
        return None

    interest, best_tag, best_similarity = interest_part(person, venue.tags)
    proximity = proximity_part(person, venue.area)
    total = (
        VW_INTEREST * interest
        + VW_PROXIMITY * proximity
        + VW_GOAL * goal_part(person.goal, "social")  # venues count as social
    )

    clauses = [interest_clause(best_tag, best_similarity), place_clause(proximity)]
    return Scored(item=venue, total=min(1.0, total * factor), reason=" ".join(c for c in clauses if c))


def _best_first(scored: List[Scored]) -> List[Scored]:
    """Highest score first; the id breaks ties so the order never changes."""
    return sorted(scored, key=lambda s: (-s.total, s.item.id))


def _interleave(career: List[Scored], social: List[Scored]) -> List[Scored]:
    """Alternate career and social events (starting with whichever list has the better top item)."""
    if not career or not social:
        return career + social  # only one kind left: nothing to mix
    first, second = (career, social) if career[0].total >= social[0].total else (social, career)
    merged = []
    for i in range(max(len(first), len(second))):
        merged += first[i:i + 1] + second[i:i + 1]
    return merged


def rank_events(
    person: Person, events: List[EventItem], now: datetime,
    event_type: Optional[str] = None, area: Optional[str] = None, limit: int = 20,
) -> List[Scored]:
    """The best events for a student, best first. Students whose goal is 'both' get career and social mixed."""
    scored = []
    for event in events:
        if event_type and event.event_type != event_type:
            continue
        if area and event.area != area:
            continue
        result = score_event(person, event, now)
        if result is not None:
            scored.append(result)

    ranked = _best_first(scored)
    if person.goal == "both" and not event_type:
        career = [s for s in ranked if s.item.event_type == "career"]
        social = [s for s in ranked if s.item.event_type != "career"]
        ranked = _interleave(career, social)
    return ranked[:limit]


def rank_venues(
    person: Person, venues: List[VenueItem],
    category: Optional[str] = None, area: Optional[str] = None, limit: int = 20,
) -> List[Scored]:
    """The best venues for a student, best first."""
    scored = []
    for venue in venues:
        if category and venue.category != category:
            continue
        if area and venue.area != area:
            continue
        result = score_venue(person, venue)
        if result is not None:
            scored.append(result)
    return _best_first(scored)[:limit]


def best_event_for_group(members: List[Person], events: List[EventItem], now: datetime) -> Optional[Scored]:
    """
    A group's first event: the best average score across the members, where
      - the strictest alcohol preference in the group applies to everyone, and
      - every member can reach it (it is on their campus, or they are happy to travel).
    Returns None if nothing suits everyone.
    """
    if not members:
        return None
    strictest = max((m.alcohol_pref for m in members), key=lambda pref: STRICTNESS[pref])

    best, best_average = None, -1.0
    for event in events:
        if not all(covers(m.campus, event.area) or m.travel_ok for m in members):
            continue
        results = [score_event(m, event, now, alcohol_pref=strictest) for m in members]
        if any(r is None for r in results):
            continue  # ended, or hidden for the group
        average = sum(r.total for r in results) / len(results)
        if average > best_average or (average == best_average and event.id < best.id):
            best, best_average = event, average

    if best is None:
        return None
    reason = "The best fit for everyone in your group. " + when_text(best.start_time, best.end_time, now)
    return Scored(item=best, total=best_average, reason=reason)


# ---------------------------------------------------------------------------
# Reading from the database
# ---------------------------------------------------------------------------


def _tags_by(session: Session, link_table, key_column) -> dict:
    """item id -> list of its tags, in two queries however many items there are."""
    tags = {}
    rows = session.exec(
        select(key_column, Tag.name, Tag.subgroup, Tag.category)
        .join(Tag, Tag.id == link_table.tag_id).order_by(Tag.id)
    ).all()
    for item_id, name, subgroup, category in rows:
        tags.setdefault(item_id, []).append(TagInfo(name, subgroup, category))
    return tags


def events_from_db(session: Session) -> List[EventItem]:
    """Every event as an EventItem."""
    tags = _tags_by(session, EventTag, EventTag.event_id)
    return [
        EventItem(
            id=e.id, title=e.title, event_type=e.event_type, area=e.area, alcohol_role=e.alcohol_role,
            start_time=e.start_time, end_time=e.end_time, location_name=e.location_name,
            description=e.description, source_url=e.source_url, tags=tags.get(e.id, []),
        )
        for e in session.exec(select(Event).order_by(Event.id)).all()
    ]


def venues_from_db(session: Session) -> List[VenueItem]:
    """Every venue as a VenueItem."""
    tags = _tags_by(session, VenueTag, VenueTag.venue_id)
    return [
        VenueItem(
            id=v.id, name=v.name, area=v.area, alcohol_role=v.alcohol_role, category=v.category,
            address=v.address, url=v.url, tags=tags.get(v.id, []),
        )
        for v in session.exec(select(Venue).order_by(Venue.id)).all()
    ]
