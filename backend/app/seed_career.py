"""
Loads the career-engine seed data into the database:

  seed/skills.json       the skill list (5 categories) and the synonyms for each skill
  seed/work_values.json  the UCL Careers values activity
  seed/roles.json        the searchable career paths, with the skills and values each one asks for
  seed/badges.json       the badges a student can earn

Safe to run every time the server starts: anything that already exists is skipped.
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from app.models import Badge, Role, RoleSkill, RoleWorkValue, Skill, SkillSynonym, WorkValue

SEED_DIR = Path(__file__).resolve().parent / "seed"


def _read(name: str):
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def load_skills(session: Session) -> int:
    """Add any missing skills and their synonyms. Returns how many new skills were added."""
    existing = {s.name: s.id for s in session.exec(select(Skill)).all()}
    known_terms = set(session.exec(select(SkillSynonym.term)).all())

    added = 0
    for item in _read("skills.json"):
        if item["name"] not in existing:
            skill = Skill(name=item["name"], category=item["category"])
            session.add(skill)
            session.flush()  # gives the new skill its id
            existing[item["name"]] = skill.id
            added += 1
        # The skill's own name counts as a synonym too, so "python" finds Python.
        for term in [item["name"], *item["synonyms"]]:
            term = term.lower()
            if term not in known_terms:
                session.add(SkillSynonym(term=term, skill_id=existing[item["name"]]))
                known_terms.add(term)
    session.commit()
    return added


def load_work_values(session: Session) -> int:
    """Add any missing work values. Returns how many were added."""
    existing = set(session.exec(select(WorkValue.title)).all())
    added = 0
    for item in _read("work_values.json"):
        if item["title"] not in existing:
            session.add(WorkValue(title=item["title"], description=item["description"]))
            added += 1
    session.commit()
    return added


def load_roles(session: Session) -> int:
    """Add any missing roles with their skills and values. Needs skills and work values loaded first."""
    skill_ids = {s.name: s.id for s in session.exec(select(Skill)).all()}
    value_ids = {v.title: v.id for v in session.exec(select(WorkValue)).all()}
    existing = set(session.exec(select(Role.name)).all())

    added = 0
    for item in _read("roles.json"):
        if item["name"] in existing:
            continue
        role = Role(
            name=item["name"],
            sector=item["sector"],
            alumni_count=item["alumni_count"],
            median_start_salary_k=item["median_start_salary_k"],
            description=item["description"],
        )
        session.add(role)
        session.flush()
        for s in item["skills"]:
            session.add(RoleSkill(role_id=role.id, skill_id=skill_ids[s["skill"]], importance=s["importance"]))
        for v in item["values"]:
            session.add(RoleWorkValue(role_id=role.id, work_value_id=value_ids[v["value"]], strength=v["strength"]))
        added += 1
    session.commit()
    return added


def load_badges(session: Session) -> int:
    """Add any missing badges. Returns how many were added."""
    existing = set(session.exec(select(Badge.code)).all())
    added = 0
    for item in _read("badges.json"):
        if item["code"] not in existing:
            session.add(Badge(**item))
            added += 1
    session.commit()
    return added


def load_career_data(session: Session) -> dict:
    """Load everything above, in the right order. Returns how many of each were added."""
    return {
        "skills": load_skills(session),
        "work_values": load_work_values(session),
        "roles": load_roles(session),
        "badges": load_badges(session),
    }
