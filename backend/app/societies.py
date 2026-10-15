"""
The logic behind the Societies tab: a read-only view of the societies that appear in the Students' Union events,
and the events linked to the ones a student says they are in.

LARP does not create or run societies. Membership is self-reported ("I'm in this society"); it decides which
society events a student sees here and feeds social matching.
"""

from datetime import datetime, timezone
from typing import Dict, List

from sqlmodel import Session, select

from app import opportunities as opp
from app.models import Event, Society, SocietyMember, User


def member_counts(session: Session) -> Dict[int, int]:
    """society id -> how many LARP students say they are in it."""
    counts: Dict[int, int] = {}
    for row in session.exec(select(SocietyMember)).all():
        counts[row.society_id] = counts.get(row.society_id, 0) + 1
    return counts


def upcoming_events(session: Session, society_id: int, now: datetime) -> List[Event]:
    """Events linked to the society that have not ended, soonest first."""
    far = datetime.max.replace(tzinfo=timezone.utc)
    events = [e for e in session.exec(select(Event).where(Event.society_id == society_id)).all()
              if (opp.aware(e.end_time or e.start_time) or far) >= now]
    return sorted(events, key=lambda e: opp.aware(e.start_time) or far)


def directory(session: Session, user: User, now: datetime) -> List[dict]:
    """Every known society, the ones I am in first, then by name."""
    counts = member_counts(session)
    mine = {m.society_id for m in session.exec(select(SocietyMember).where(SocietyMember.user_id == user.id)).all()}
    upcoming: Dict[int, int] = {}
    for event in session.exec(select(Event).where(Event.society_id.is_not(None))).all():
        finish = opp.aware(event.end_time or event.start_time)
        if finish is None or finish >= now:
            upcoming[event.society_id] = upcoming.get(event.society_id, 0) + 1
    cards = [{"id": s.id, "name": s.name, "category": s.category, "member_count": counts.get(s.id, 0),
              "upcoming_events": upcoming.get(s.id, 0), "joined": s.id in mine}
             for s in session.exec(select(Society)).all()]
    cards.sort(key=lambda c: (not c["joined"], c["name"].lower()))
    return cards


def detail(session: Session, user: User, society: Society, now: datetime) -> dict:
    """One society: whether I am in it and its upcoming events."""
    card = next(c for c in directory(session, user, now) if c["id"] == society.id)
    return {**card, "events": [{
        "event_id": e.id, "title": e.title, "category": e.category, "start_time": e.start_time,
        "end_time": e.end_time, "location_name": e.location_name, "source_url": e.source_url,
    } for e in upcoming_events(session, society.id, now)]}
