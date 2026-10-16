"""
The logic behind the Home screen: the recommended actions, the featured event and the feed.

Everything here is plain rules, no AI, so every action and every "why" line can be explained and tested.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app import opportunities as opp
from app.models import Connection, Event, EventSave, Job, JobSave, Society, User

LONDON = ZoneInfo("Europe/London")
CATEGORY_FOR_FILTER = {"careers": "opportunity", "social": "social", "societies": "society"}
FEATURED_WITHIN_DAYS = 14  # the featured event should be coming up soon
MAX_ACTIONS = 3
APPLY_REMINDER_DAYS = 7  # a saved job closing within this many days gets a reminder


def greeting(user: User, now: datetime, upcoming_count: int) -> dict:
    local = now.astimezone(LONDON)
    part = "morning" if local.hour < 12 else "afternoon" if local.hour < 18 else "evening"
    return {"name": user.name.split()[0], "part_of_day": part, "date": local.date().isoformat(),
            "weekday": local.strftime("%A"), "upcoming_events": upcoming_count}


def friends_of(session: Session, user: User) -> set:
    """Ids of people the student is connected to (both sides accepted)."""
    rows = session.exec(select(Connection).where(
        Connection.status == "accepted", (Connection.user_id == user.id) | (Connection.other_user_id == user.id))).all()
    return {c.other_user_id if c.user_id == user.id else c.user_id for c in rows}


def connections_going(session: Session, friends: set) -> Dict[int, int]:
    """event id -> how many of the student's connections are going."""
    if not friends:
        return {}
    counts: Dict[int, int] = {}
    for row in session.exec(select(EventSave).where(EventSave.user_id.in_(friends), EventSave.status == "going")).all():
        counts[row.event_id] = counts.get(row.event_id, 0) + 1
    return counts


def cta_for(event: Event) -> str:
    """The button label: career events are booked elsewhere, social and society events are joined."""
    return "Book" if event.category == "opportunity" else "Join"


def event_card(event: Event, why: str, saved: Optional[str], going: int, society_name: Optional[str]) -> dict:
    return {
        "event_id": event.id, "title": event.title, "category": event.category, "start_time": event.start_time,
        "end_time": event.end_time, "location_name": event.location_name, "area": event.area,
        "employer": event.employer, "society": society_name, "source_url": event.source_url, "image_url": event.image_url,
        "why": why, "connections_going": going, "saved_status": saved, "cta": cta_for(event),
    }


def feed(session: Session, user: User, now: datetime) -> tuple:
    """All upcoming events, soonest first, each with a 'why'. Returns (focus, cards, ranked career events)."""
    from app.events import events_from_db, rank_events
    from app.routes_events import person_for

    focus, career = opp.rank_career_events(session, user, now)
    career_reason = {e["event_id"]: e["reason"] for e in career}

    base = {s.item.id: s.reason for s in rank_events(person_for(session, user), events_from_db(session), now, limit=1000)}
    saved = {s.event_id: s.status for s in session.exec(select(EventSave).where(EventSave.user_id == user.id)).all()}
    going = connections_going(session, friends_of(session, user))
    societies = {s.id: s.name for s in session.exec(select(Society)).all()}

    cards = []
    for event in session.exec(select(Event)).all():
        if event.id not in base or opp_ended(event, now):  # events the student's preferences rule out are left out
            continue
        why = career_reason.get(event.id) or base[event.id]
        n = going.get(event.id, 0)
        if n:
            why += f" - {n} of your connection{'s are' if n > 1 else ' is'} going"
        cards.append(event_card(event, why, saved.get(event.id), n, societies.get(event.society_id)))

    far = datetime.max.replace(tzinfo=timezone.utc)
    cards.sort(key=lambda c: opp.aware(c["start_time"]) or far)
    return focus, cards, career


def filter_counts(cards: List[dict]) -> Dict[str, int]:
    """How many events each filter chip would show."""
    counts = {"all": len(cards)}
    for name, category in CATEGORY_FOR_FILTER.items():
        counts[name] = sum(1 for c in cards if c["category"] == category)
    return counts


def opp_ended(event: Event, now: datetime) -> bool:
    finish = opp.aware(event.end_time or event.start_time)
    return finish is not None and finish < now


def pick_featured(cards: List[dict], career: List[dict], now: datetime) -> Optional[dict]:
    """The best career event starting within two weeks (best = builds most of the gap), else the soonest event."""
    soon = now + timedelta(days=FEATURED_WITHIN_DAYS)
    by_id = {c["event_id"]: c for c in cards}
    for item in career:
        card = by_id.get(item["event_id"])
        start = opp.aware(card["start_time"]) if card else None
        if card and start is not None and start <= soon:
            return card
    return cards[0] if cards else None


def build_actions(session: Session, user: User, now: datetime, focus, career: List[dict]) -> List[dict]:
    """Up to three recommended actions, in priority order. The first is the 'action of the day'."""
    from app import fit

    actions: List[dict] = []
    have = fit.user_skill_ids(session, user.id)

    if not have:
        actions.append({"kind": "add_profile", "title": "Add your CV or details",
                        "detail": "Your profile unlocks routes, jobs and events that fit you.", "cta": "Upload CV",
                        "ref": None})
    if focus is None:
        actions.append({"kind": "pick_route", "title": "Choose your career path",
                        "detail": "Pick a target role, or let us suggest routes from your profile.", "cta": "Choose",
                        "ref": None})
        return actions[:MAX_ACTIONS]

    # A saved job that closes soon.
    saved_ids = [s.job_id for s in session.exec(select(JobSave).where(JobSave.user_id == user.id, JobSave.status == "saved")).all()]
    closing = []
    for job in session.exec(select(Job).where(Job.id.in_(saved_ids))).all() if saved_ids else []:
        closes = opp.aware(job.closes_on)
        if closes is not None and now <= closes <= now + timedelta(days=APPLY_REMINDER_DAYS):
            closing.append((closes, job))
    if closing:
        closes, job = min(closing, key=lambda pair: pair[0])
        days = max(0, (closes - now).days)
        actions.append({"kind": "finish_application", "title": f"Finish your application to {job.company}",
                        "detail": f"{job.title} closes {'today' if days == 0 else f'in {days} day' + ('s' if days != 1 else '')}.",
                        "cta": "Open job", "ref": {"type": "job", "id": job.id}})

    # The event that builds the most of the route's gap.
    soon = now + timedelta(days=FEATURED_WITHIN_DAYS)
    builders = [e for e in career if e["build_score"] > 0 and opp.aware(e["start_time"]) and opp.aware(e["start_time"]) <= soon]
    if builders:
        best = builders[0]
        actions.append({"kind": "attend_event", "title": f"Go to {best['title']}", "detail": best["reason"],
                        "cta": "See event", "ref": {"type": "event", "id": best["event_id"]}})

    # The best job not yet saved.
    _, rows, saved = opp.rank_jobs(session, user, now)
    for match, on_route, job, skills, why in rows:
        if job.id not in saved and on_route:
            actions.append({"kind": "review_job", "title": f"{job.title} at {job.company}",
                            "detail": f"{match}% match. {why}", "cta": "See job", "ref": {"type": "job", "id": job.id}})
            break

    if not actions:
        actions.append({"kind": "explore", "title": "Explore what's on this week",
                        "detail": "Browse events and societies that fit your interests.", "cta": "Explore", "ref": None})
    return actions[:MAX_ACTIONS]


def this_week(session: Session, user: User, now: datetime, focus, career: List[dict]) -> dict:
    """The digest: new jobs and events that build the route's gap (also what the Monday email will list)."""
    if focus is None:
        return {"new_jobs": [], "events_that_build": []}
    _, rows, _ = opp.rank_jobs(session, user, now)
    week_ago = now - timedelta(days=7)
    new_jobs = [{"id": j.id, "title": j.title, "company": j.company, "match_pct": m, "is_demo": j.source == "demo"}
                for m, on_route, j, skills, why in rows if opp.aware(j.scraped_at) >= week_ago][:3]
    return {"new_jobs": new_jobs,
            "events_that_build": [{"event_id": e["event_id"], "title": e["title"], "reason": e["reason"]}
                                  for e in career if e["build_score"] > 0][:3]}
