"""Checks the fake student profiles and the demo accounts."""

from sqlmodel import select

from app.models import Tag, User, UserTag
from app.seed_profiles import SEED_PASSWORD, load_profiles


def names_of_tags(session, user):
    rows = session.exec(
        select(Tag.name).join(UserTag, UserTag.tag_id == Tag.id).where(UserTag.user_id == user.id)
    ).all()
    return set(rows)


def test_profiles_load_and_loading_twice_does_not_duplicate(session):
    added = load_profiles(session)
    assert 30 <= added <= 40
    assert load_profiles(session) == 0
    assert len(session.exec(select(User)).all()) == added


def test_seed_users_are_varied(session):
    load_profiles(session)
    users = session.exec(select(User)).all()

    campuses = [u.campus for u in users]
    assert campuses.count("main") > campuses.count("canary") > 0
    assert "both" in campuses
    assert {"career", "social", "both"} <= {u.goal for u in users}
    assert 5 in {u.year for u in users}  # at least one postgraduate

    assert sum(u.alcohol_pref == "bars_no_drink" for u in users) >= 2
    assert sum(u.alcohol_pref == "avoid" for u in users) >= 2
    assert sum(u.linkedin_max_optin for u in users) >= 3
    # Anyone who opted in must have a link to share.
    assert all(u.linkedin_url for u in users if u.linkedin_max_optin)


def test_finance_and_chess_cluster_exists(session):
    load_profiles(session)
    users = session.exec(select(User)).all()
    cluster = [u for u in users if {"finance", "chess"} <= names_of_tags(session, u)]
    assert len(cluster) >= 4


def test_demo_accounts_exist_and_can_log_in(session, client):
    load_profiles(session)
    for email, campus, goal in [
        ("demo.main@ucl.ac.uk", "main", "career"),
        ("demo.canary@ucl.ac.uk", "canary", "social"),
    ]:
        user = session.exec(select(User).where(User.ucl_email == email)).one()
        assert (user.campus, user.goal) == (campus, goal)

        token = client.post("/api/login", json={"ucl_email": email, "password": SEED_PASSWORD}).json()["token"]
        me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["ucl_email"] == email


def test_seed_passwords_are_hashed(session):
    load_profiles(session)
    for user in session.exec(select(User)).all():
        assert user.password_hash != SEED_PASSWORD
        assert user.password_hash.startswith("$2")
