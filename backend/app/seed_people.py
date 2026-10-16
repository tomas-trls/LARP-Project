"""
Fills in the invented students (and adds invented alumni) with everything the newer screens need.

seed/profiles.json holds the original questionnaire answers. This file adds, from seed/people_extra.json:
  - for every student: a bio, hometown, education, experience, skills, a Big Five result, the societies they are in,
    saved career routes (the first is active, with its five scores), and a few hidden fields / visa flags;
  - ten invented ALUMNI with jobs in popular roles and a monthly request limit (so People -> Career has someone to show);
  - connections (accepted and pending) and follows, so the Profile and People tabs are not empty.

Everyone here is invented. Safe to run twice: students that already have details are skipped.
Run it AFTER the career data (skills, roles) and the societies are loaded.
"""

import json
from datetime import timedelta
from pathlib import Path

from sqlmodel import Session, select

from app.auth import hash_password
from app.models import (
    Connection, Education, Experience, Follow, Role, Society, SocietyMember, Tag, User, UserRoute, UserSkill, UserTag, now,
)
from app.routes_career import compute_fit, store_scores
from app.seed_profiles import SEED_PASSWORD
from app.skills import skills_for_profile

EXTRA_FILE = Path(__file__).resolve().parent / "seed" / "people_extra.json"


def add_experience_and_skills(session: Session, user: User, education: list, experience: list, skill_names: list) -> None:
    """Write education and experience rows, then the skills (typed ones plus those spotted in the wording)."""
    for item in education:
        session.add(Education(user_id=user.id, institution="UCL", **item))
    rows = [Experience(user_id=user.id, **item) for item in experience]
    session.add_all(rows)
    text_parts = [f"{e['degree']} UCL {e.get('grade') or ''}" for e in education]
    text_parts += [f"{x.title} {x.organisation} {x.description or ''}" for x in rows]
    for skill_id, source in skills_for_profile(session, skill_names, text_parts, rows).items():
        session.add(UserSkill(user_id=user.id, skill_id=skill_id, source=source))


def add_routes(session: Session, user: User, role_names: list) -> None:
    """Save the career routes; the first one is active. The five scores are worked out like a real student's."""
    roles = {r.name: r for r in session.exec(select(Role)).all()}
    for position, name in enumerate(role_names):
        route = UserRoute(user_id=user.id, role_id=roles[name].id, source="chosen", is_active=position == 0)
        session.add(route)
        session.flush()
        store_scores(session, route, compute_fit(session, user, roles[name]))


def load_people_details(session: Session) -> dict:
    """Add the details above. Returns how many students were filled in, alumni added and connections made."""
    data = json.loads(EXTRA_FILE.read_text(encoding="utf-8"))
    users = {u.ucl_email: u for u in session.exec(select(User)).all()}
    societies = {s.name: s for s in session.exec(select(Society)).all()}
    tag_ids = {t.name: t.id for t in session.exec(select(Tag)).all()}
    counts = {"students": 0, "alumni": 0, "connections": 0}

    for email, d in data["students"].items():
        user = users.get(email)
        if user is None or session.exec(select(Education).where(Education.user_id == user.id)).first():
            continue  # not loaded, or already filled in
        add_experience_and_skills(session, user, d["education"], d["experience"], d["skills"])
        user.bio, user.hometown, user.big_five = d["bio"], d["hometown"], d["big_five"]
        user.hidden_fields, user.needs_visa_sponsorship = d["hidden_fields"], d["needs_visa_sponsorship"]
        user.onboarding_step = 6
        session.add(user)
        session.flush()
        add_routes(session, user, d["routes"])
        for name in d["societies"]:
            session.add(SocietyMember(society_id=societies[name].id, user_id=user.id))
        counts["students"] += 1

    password_hash = hash_password(SEED_PASSWORD)
    for d in data["alumni"]:
        if d["ucl_email"] in users:
            continue
        alum = User(
            name=d["name"], ucl_email=d["ucl_email"], password_hash=password_hash, campus="main", travel_ok=True,
            alcohol_pref="drinks", goal="career", course=d["degree"], is_alumni=True, alumni_verified=True,
            grad_year=d["grad_year"], headline=d["headline"], bio=d["bio"], hometown=d["hometown"],
            max_alumni_requests_per_month=d["max_requests_per_month"], onboarding_step=6,
        )
        session.add(alum)
        session.flush()
        for name in d["tags"]:
            session.add(UserTag(user_id=alum.id, tag_id=tag_ids[name]))
        add_experience_and_skills(session, alum, [{"degree": d["degree"], "grade": None}], d["experience"], d["skills"])
        users[alum.ucl_email] = alum
        counts["alumni"] += 1

    # Connections: the older ones first, so lists show the newest on top.
    have = {(c.user_id, c.other_user_id) for c in session.exec(select(Connection)).all()}
    for position, (a, b, status, kind, note) in enumerate(data["connections"]):
        if (users[a].id, users[b].id) in have or (users[b].id, users[a].id) in have:
            continue
        session.add(Connection(user_id=users[a].id, other_user_id=users[b].id, status=status, kind=kind, note=note,
                               created_at=now() - timedelta(days=len(data["connections"]) - position)))
        counts["connections"] += 1
    for a, b in data["follows"]:
        if session.get(Follow, (users[a].id, users[b].id)) is None:
            session.add(Follow(user_id=users[a].id, followed_user_id=users[b].id))

    for society in societies.values():
        society.member_count = len(session.exec(select(SocietyMember).where(SocietyMember.society_id == society.id)).all())
        session.add(society)
    session.commit()
    return counts
