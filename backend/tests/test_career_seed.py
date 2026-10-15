"""Tests for the career-engine seed data (skills, roles, work values, badges)."""

from sqlmodel import select

from app.models import Badge, Role, RoleSkill, RoleWorkValue, Skill, SkillSynonym, WorkValue
from app.seed_career import load_career_data

CATEGORIES = {"academics", "skills", "teamwork", "experience", "leadership"}


def test_loads_everything(session):
    added = load_career_data(session)
    assert added["skills"] > 50
    assert added["roles"] == 150
    assert added["work_values"] == 43
    assert added["badges"] > 0


def test_running_twice_adds_nothing_new(session):
    load_career_data(session)
    second = load_career_data(session)
    assert second == {"skills": 0, "work_values": 0, "roles": 0, "badges": 0}


def test_every_skill_is_in_one_of_the_five_categories(session):
    load_career_data(session)
    assert {s.category for s in session.exec(select(Skill)).all()} == CATEGORIES


def test_every_role_has_skills_in_all_five_categories(session):
    load_career_data(session)
    category_of = {s.id: s.category for s in session.exec(select(Skill)).all()}
    for role in session.exec(select(Role)).all():
        skills = session.exec(select(RoleSkill).where(RoleSkill.role_id == role.id)).all()
        assert {category_of[rs.skill_id] for rs in skills} == CATEGORIES, role.name
        assert session.exec(select(RoleWorkValue).where(RoleWorkValue.role_id == role.id)).first() is not None


def test_synonyms_point_at_the_right_skill(session):
    load_career_data(session)
    teamwork = session.get(SkillSynonym, "cooperative")  # the example from the brief
    assert session.get(Skill, teamwork.skill_id).name == "Teamwork"
    assert session.get(Skill, session.get(SkillSynonym, "python").skill_id).name == "Python"


def test_work_values_come_from_the_ucl_activity(session):
    load_career_data(session)
    titles = set(session.exec(select(WorkValue.title)).all())
    assert {"Money", "Autonomy", "Helping society"} <= titles
    assert session.exec(select(Badge)).first() is not None


def test_personality_file_is_the_short_big_five_check():
    import json

    from app.seed_career import SEED_DIR

    data = json.loads((SEED_DIR / "personality.json").read_text(encoding="utf-8"))
    assert len(data["items"]) == 10
    traits = [i["trait"] for i in data["items"]]
    assert {t: traits.count(t) for t in set(traits)} == {  # two statements for each of the five traits
        "extraversion": 2, "agreeableness": 2, "conscientiousness": 2, "neuroticism": 2, "openness": 2}
