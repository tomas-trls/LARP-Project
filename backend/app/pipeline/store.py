"""
Saving events to the database.

- add or update by the event's link (source_url), so running the pipeline twice never duplicates anything;
- skip an event that has the same title and start time as one we already have (a different link to the same event);
- delete events that have already ended.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from sqlmodel import Session, delete, select

from app.models import Event, EventSave, EventSkill, EventTag, EventWorkValue, Group, Tag
from app.pipeline.normalise import to_utc
from app.skills import SkillMatcher


@dataclass
class ReadyEvent:
    """An event that has been cleaned and tagged, ready to save."""

    title: str
    url: str
    source: str
    area: str
    event_type: str
    alcohol_role: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location_name: str = ""
    description: str = ""
    image_url: Optional[str] = None
    tags: List[str] = field(default_factory=list)


def category_for(event_type: str) -> str:
    """Career events are 'opportunities'; everything else is 'social'. Events run by a society are 'society' (set when
    they are linked to their society, see seed_societies.link_society_events)."""
    return "opportunity" if event_type == "career" else "social"


def backfill_event_data(session: Session) -> int:
    """Give events that were saved before categories and skill tags existed a category and skills. Safe to run often."""
    from app.seed_societies import link_society_events  # imported here to keep the two modules independent

    matcher = SkillMatcher(session)
    tagged = set(session.exec(select(EventSkill.event_id)).all())
    changed = link_society_events(session)  # society events get their society first, then their category below
    for event in session.exec(select(Event)).all():
        wanted = "society" if event.society_id is not None and event.event_type != "career" else category_for(event.event_type)
        if event.category != wanted:
            event.category = wanted
            session.add(event)
            changed += 1
        if event.id not in tagged:
            for skill_id in matcher.find(f"{event.title} {event.description or ''}"):
                session.add(EventSkill(event_id=event.id, skill_id=skill_id))
                changed += 1
    session.commit()
    return changed


def _aware(moment: Optional[datetime]) -> Optional[datetime]:
    if moment is not None and moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def has_ended(start: Optional[datetime], end: Optional[datetime], now: datetime) -> bool:
    finish = _aware(end or start)
    return finish is not None and finish < now


def _same_event_key(title: str, start: Optional[datetime]):
    return (" ".join(title.lower().split()), _aware(start))


def save_events(session: Session, events: List[ReadyEvent], now: datetime) -> dict:
    """Insert new events and update existing ones. Returns counts: added, updated, duplicates."""
    tag_ids = {name: id for name, id in session.exec(select(Tag.name, Tag.id)).all()}
    matcher = SkillMatcher(session)  # finds the skills an event builds, from its title and description
    by_url = {e.source_url: e for e in session.exec(select(Event)).all() if e.source_url}
    seen_keys = {_same_event_key(e.title, e.start_time): e.source_url for e in by_url.values()}
    counts = {"added": 0, "updated": 0, "duplicates": 0}

    for item in events:
        start, end = to_utc(item.start_time), to_utc(item.end_time)
        existing = by_url.get(item.url)

        if existing is None:
            key = _same_event_key(item.title, start)
            if key in seen_keys and start is not None:  # same title and time under another link
                counts["duplicates"] += 1
                continue
            existing = Event(title=item.title, event_type=item.event_type, source_url=item.url)
            session.add(existing)
            counts["added"] += 1
        else:
            counts["updated"] += 1

        existing.title = item.title
        existing.description = item.description
        existing.start_time, existing.end_time = start, end
        existing.location_name = item.location_name
        existing.area = item.area
        existing.event_type = item.event_type
        existing.category = "society" if existing.society_id is not None and item.event_type != "career" else category_for(item.event_type)
        existing.alcohol_role = item.alcohol_role
        existing.source = item.source
        existing.image_url = item.image_url
        existing.updated_at = now
        session.flush()  # gives a new event its id

        by_url[item.url] = existing
        seen_keys[_same_event_key(item.title, start)] = item.url

        # Replace the skills the event builds (the same skill list roles and jobs use).
        session.exec(delete(EventSkill).where(EventSkill.event_id == existing.id))
        for skill_id in matcher.find(f"{item.title} {item.description}"):
            session.add(EventSkill(event_id=existing.id, skill_id=skill_id))

        # Replace the event's tags with the new ones.
        session.exec(delete(EventTag).where(EventTag.event_id == existing.id))
        for name in item.tags:
            if name in tag_ids:
                session.add(EventTag(event_id=existing.id, tag_id=tag_ids[name]))

    session.commit()
    return counts


def delete_ended(session: Session, now: datetime) -> int:
    """Remove events that are over (and detach them from any group that had picked them)."""
    removed = 0
    for event in session.exec(select(Event)).all():
        if has_ended(event.start_time, event.end_time, now):
            for group in session.exec(select(Group).where(Group.first_event_id == event.id)).all():
                group.first_event_id = None
                session.add(group)
            session.exec(delete(EventTag).where(EventTag.event_id == event.id))
            session.exec(delete(EventSkill).where(EventSkill.event_id == event.id))
            session.exec(delete(EventWorkValue).where(EventWorkValue.event_id == event.id))
            session.exec(delete(EventSave).where(EventSave.event_id == event.id))
            session.delete(event)
            removed += 1
    session.commit()
    return removed
