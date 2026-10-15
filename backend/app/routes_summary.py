"""
The Profile tab's summary: stats, badges, the active route and saved routes, settings.

    GET /api/profile/summary

Needs a login token. (Editing the profile itself is in routes_profile.py; alert settings are in routes_messages.py.)
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app import badges, people
from app.auth import get_current_user
from app.database import get_session
from app.models import (
    Badge, Connection, EventSave, GroupMember, Group, Role, RouteScore, SocietyMember, Tag, User, UserBadge, UserRoute, UserTag,
)
from app.routes_messages import preferences

router = APIRouter(prefix="/api/profile")


def route_title(session: Session, route: UserRoute) -> str:
    role = session.get(Role, route.role_id) if route.role_id else None
    return role.name if role else (route.custom_title or "Custom route")


@router.get("/summary")
def profile_summary(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Everything the Profile tab shows. Badges are checked each time, so a new one appears (and is announced) here."""
    newly = badges.award(session, user)

    earned = {b.badge_code: b for b in session.exec(select(UserBadge).where(UserBadge.user_id == user.id)).all()}
    progress = badges.progress(session, user)
    badge_rows = session.exec(select(Badge).order_by(Badge.code)).all()

    routes = session.exec(select(UserRoute).where(UserRoute.user_id == user.id).order_by(UserRoute.id)).all()
    active = next((r for r in routes if r.is_active), None)
    scores = session.exec(select(RouteScore).where(RouteScore.route_id == active.id)).all() if active else []

    lists = people.connection_lists(session, user)
    connections = lists["connections"]
    groups = session.exec(select(GroupMember).join(Group, Group.id == GroupMember.group_id)
                          .where(GroupMember.user_id == user.id, Group.kind == "event")).all()
    hobbies = session.exec(select(Tag.name).join(UserTag, UserTag.tag_id == Tag.id).where(UserTag.user_id == user.id)).all()

    return {
        "user": {"id": user.id, "name": user.name, "headline": user.headline, "avatar_url": user.avatar_url,
                 "course": user.course, "year": user.year, "is_alumni": user.is_alumni, "bio": user.bio},
        "stats": {
            "events_attended": len(session.exec(select(EventSave).where(EventSave.user_id == user.id, EventSave.status == "attended")).all()),
            "connections": len(connections),
            "societies": len(session.exec(select(SocietyMember).where(SocietyMember.user_id == user.id)).all()),
            "event_groups": len(groups),
        },
        "badges": {
            "earned": [{"code": b.code, "name": b.name, "how_earned": b.how_earned, "earned_at": earned[b.code].earned_at}
                       for b in badge_rows if b.code in earned],
            "locked": [{"code": b.code, "name": b.name, "how_earned": b.how_earned,
                        "progress": {"current": progress[b.code][0], "target": progress[b.code][1]}}
                       for b in badge_rows if b.code not in earned and b.code in progress],
            "newly_earned": newly,
        },
        "connections": lists["connections"],  # who you are connected with (created_at = when you connected)
        "requests_waiting": len(lists["incoming"]),
        "active_route": {"route_id": active.id, "title": route_title(session, active), "fit_pct": active.fit_pct,
                         "scores": [{"category": s.category, "user_score": s.user_score, "benchmark_score": s.benchmark_score}
                                    for s in scores]} if active else None,
        "saved_routes": [{"route_id": r.id, "title": route_title(session, r), "fit_pct": r.fit_pct, "is_active": r.is_active}
                         for r in routes],
        "settings": {
            "theme": user.theme, "connection_style": user.connection_style, "alcohol_pref": user.alcohol_pref,
            "needs_visa_sponsorship": user.needs_visa_sponsorship, "hidden_fields": user.hidden_fields or [],
            "notifications": preferences(session, user),
        },
        "profile_progress": {"onboarding_step": user.onboarding_step, "hobbies": len(hobbies),
                             "took_personality_check": bool(user.big_five), "has_route": active is not None},
    }
