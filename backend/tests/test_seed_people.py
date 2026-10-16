"""Checks the invented people: every student has the newer profile details, there are alumni, and the demo accounts work."""

import pytest
from sqlmodel import select

from app.models import Connection, Education, Experience, SocietyMember, User, UserRoute, UserSkill
from app.seed_career import load_career_data
from app.seed_people import load_people_details
from app.seed_profiles import SEED_PASSWORD, load_profiles
from app.seed_societies import load_societies


@pytest.fixture
def people(session):
    load_career_data(session)
    load_societies(session)
    load_profiles(session)
    return load_people_details(session)


def log_in(client, email):
    token = client.post("/api/login", json={"ucl_email": email, "password": SEED_PASSWORD}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_everyone_gets_details_and_loading_twice_changes_nothing(session, people):
    assert people["students"] == 32 and people["alumni"] == 10 and people["connections"] == 19
    students = session.exec(select(User).where(User.is_alumni.is_(False))).all()
    for student in students:
        assert student.bio and student.hometown and student.big_five and student.onboarding_step == 6
    ids = {s.id for s in students}
    for table in (Education, UserRoute, UserSkill):
        assert {row.user_id for row in session.exec(select(table)).all()} >= ids  # nobody is left without any
    before = len(session.exec(select(UserSkill)).all())
    assert load_people_details(session) == {"students": 0, "alumni": 0, "connections": 0}
    assert len(session.exec(select(UserSkill)).all()) == before


def test_every_student_has_exactly_one_active_route_with_scores(session, people):
    for student in session.exec(select(User).where(User.is_alumni.is_(False))).all():
        routes = session.exec(select(UserRoute).where(UserRoute.user_id == student.id)).all()
        assert [r.is_active for r in routes].count(True) == 1 and all(r.fit_pct is not None for r in routes)


def test_alumni_have_jobs_a_headline_and_a_request_limit(session, people):
    alumni = session.exec(select(User).where(User.is_alumni.is_(True))).all()
    assert len(alumni) == 10
    for alum in alumni:
        assert alum.headline and alum.grad_year and alum.alumni_verified and alum.max_alumni_requests_per_month
        assert session.exec(select(Experience).where(Experience.user_id == alum.id, Experience.kind == "job")).first()


def test_the_demo_student_can_log_in_and_sees_career_people(client, people):
    headers = log_in(client, "demo.main@ucl.ac.uk")
    career = client.get("/api/people/career", headers=headers).json()
    assert career["active_route"] == "Data Analyst"
    names = [p["name"] for p in career["people"]]
    assert "Samira Okonkwo" in names and "Theo Marchetti" in names  # alumni who are Data Analysts
    assert career["people"][0]["kind"] == "alumnus"
    assert next(p for p in career["people"] if p["name"] == "Samira Okonkwo")["connection"] == "requested"


def test_the_demo_profile_shows_who_they_are_connected_with(client, people):
    headers = log_in(client, "demo.main@ucl.ac.uk")
    summary = client.get("/api/profile/summary", headers=headers).json()
    assert sorted(c["name"] for c in summary["connections"]) == ["Ava Brightwell", "Chloe Marlowe", "Jamal Pryce"]
    assert summary["requests_waiting"] == 2 and summary["stats"]["connections"] == 3
    assert summary["active_route"]["title"] == "Data Analyst" and len(summary["saved_routes"]) == 2
    assert [c["name"] for c in client.get("/api/connections", headers=headers).json()["incoming"]] == ["Dev Raman", "Felix Armitage"]


def test_the_social_demo_student_has_a_social_circle_and_societies(client, session, people):
    headers = log_in(client, "demo.canary@ucl.ac.uk")
    lists = client.get("/api/connections", headers=headers).json()
    assert sorted(c["name"] for c in lists["connections"]) == ["Kavya Nair", "Liam Doherty"]
    assert [c["name"] for c in lists["incoming"]] == ["Rafael Montoya"]
    social = client.get("/api/people/social", headers=headers).json()["people"]
    assert social and all("course" not in p and "headline" not in p for p in social)
    canary = session.exec(select(User).where(User.ucl_email == "demo.canary@ucl.ac.uk")).one()
    assert len(session.exec(select(SocietyMember).where(SocietyMember.user_id == canary.id)).all()) == 3


def test_hidden_fields_and_visa_flags_are_seeded(session, people):
    by_name = {u.name: u for u in session.exec(select(User)).all()}
    assert by_name["Kavya Nair"].hidden_fields == ["personality"] and by_name["Hamza Qureshi"].hidden_fields == ["hobbies"]
    assert by_name["Dev Raman"].needs_visa_sponsorship and not by_name["Ava Brightwell"].needs_visa_sponsorship


def test_connections_are_between_real_people_and_never_to_oneself(session, people):
    for c in session.exec(select(Connection)).all():
        assert c.user_id != c.other_user_id and c.status in ("accepted", "pending")
