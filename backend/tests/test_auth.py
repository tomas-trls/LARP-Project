"""Checks register, login, /api/me and /api/me/preferences."""

from sqlmodel import select

from app.models import User


def new_student(**changes):
    """A valid registration body. Pass keyword arguments to change a field."""
    body = {
        "name": "Test Student",
        "ucl_email": "test.student@ucl.ac.uk",
        "password": "correct-horse",
        "campus": "main",
        "travel_ok": True,
        "alcohol_pref": "bars_no_drink",
        "goal": "both",
        "course": "Economics",
        "year": 2,
        "tag_ids": [1, 23],
        "looking_for": ["tutoring"],
        "offers": ["design and creative"],
    }
    body.update(changes)
    return body


def register(client, **changes):
    return client.post("/api/register", json=new_student(**changes))


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- register ----------

def test_register_works_and_returns_token(client):
    response = register(client)
    assert response.status_code == 200
    data = response.json()
    assert data["token"]
    assert data["user"]["name"] == "Test Student"
    assert len(data["user"]["tags"]) == 2
    assert data["user"]["looking_for"] == ["tutoring"]
    assert data["user"]["offers"] == ["design and creative"]
    assert "password" not in data["user"] and "password_hash" not in data["user"]


def test_password_is_stored_as_a_hash(client, session):
    register(client)
    user = session.exec(select(User)).one()
    assert user.password_hash != "correct-horse"
    assert user.password_hash.startswith("$2")  # bcrypt hashes start like this


def test_email_is_lowercased(client):
    response = register(client, ucl_email="Mixed.Case@UCL.ac.uk")
    assert response.json()["user"]["ucl_email"] == "mixed.case@ucl.ac.uk"


def test_non_ucl_email_is_rejected(client):
    assert register(client, ucl_email="someone@gmail.com").status_code == 422
    assert register(client, ucl_email="someone@ucl.ac.uk.evil.com").status_code == 422
    assert register(client, ucl_email="@ucl.ac.uk").status_code == 422


def test_demo_mode_accepts_any_email_and_still_stores_the_account(client, monkeypatch):
    from app import settings

    monkeypatch.setattr(settings, "REQUIRE_UCL_EMAIL", False)
    response = register(client, ucl_email="Someone@Gmail.com")
    assert response.status_code == 200
    assert response.json()["user"]["ucl_email"] == "someone@gmail.com"
    # The account is real: it can log in again with the same email and password.
    login = client.post("/api/login", json={"ucl_email": "someone@gmail.com", "password": "correct-horse"})
    assert login.status_code == 200
    # Duplicates are still refused, and things that aren't emails at all are still rejected.
    assert register(client, ucl_email="SOMEONE@gmail.com").status_code == 409
    assert register(client, ucl_email="not-an-email").status_code == 422
    assert register(client, ucl_email="a b@c.com").status_code == 422


def test_duplicate_email_is_rejected(client):
    assert register(client).status_code == 200
    assert register(client).status_code == 409
    # Same address in different capitals counts as the same account.
    assert register(client, ucl_email="TEST.STUDENT@ucl.ac.uk").status_code == 409


def test_bad_input_is_rejected(client):
    assert register(client, password="short").status_code == 422
    assert register(client, campus="mars").status_code == 422
    assert register(client, alcohol_pref="always").status_code == 422
    assert register(client, goal="nothing").status_code == 422
    assert register(client, year=9).status_code == 422


def test_unknown_tag_is_rejected(client):
    response = register(client, tag_ids=[1, 9999])
    assert response.status_code == 422
    assert "9999" in response.json()["detail"]


def test_more_than_8_tags_is_rejected(client):
    assert register(client, tag_ids=list(range(1, 10))).status_code == 422


# ---------- login ----------

def test_login_works(client):
    register(client)
    response = client.post("/api/login", json={"ucl_email": "Test.Student@ucl.ac.uk", "password": "correct-horse"})
    assert response.status_code == 200
    assert response.json()["token"]


def test_wrong_password_or_email_gives_401(client):
    register(client)
    wrong_password = client.post("/api/login", json={"ucl_email": "test.student@ucl.ac.uk", "password": "nope-nope"})
    wrong_email = client.post("/api/login", json={"ucl_email": "nobody@ucl.ac.uk", "password": "correct-horse"})
    assert wrong_password.status_code == 401
    assert wrong_email.status_code == 401
    assert wrong_password.json() == wrong_email.json()  # same message, so emails can't be probed


# ---------- /api/me ----------

def test_me_needs_a_token(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers=auth_header("not-a-real-token")).status_code == 401


def test_me_returns_profile_without_hash(client):
    token = register(client).json()["token"]
    response = client.get("/api/me", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["ucl_email"] == "test.student@ucl.ac.uk"
    assert data["campus"] == "main"
    assert "password_hash" not in data


# ---------- /api/me/preferences ----------

def test_preferences_change_only_what_is_sent(client):
    token = register(client).json()["token"]
    response = client.put("/api/me/preferences", json={"campus": "canary"}, headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert data["campus"] == "canary"
    assert data["alcohol_pref"] == "bars_no_drink"  # untouched
    assert data["goal"] == "both"  # untouched


def test_preferences_reject_bad_values_and_need_a_token(client):
    token = register(client).json()["token"]
    assert client.put("/api/me/preferences", json={"campus": "mars"}, headers=auth_header(token)).status_code == 422
    assert client.put("/api/me/preferences", json={"campus": "main"}).status_code == 401


def test_cannot_opt_in_to_linkedin_without_a_link(client):
    token = register(client).json()["token"]
    headers = auth_header(token)

    response = client.put("/api/me/preferences", json={"linkedin_max_optin": True}, headers=headers)
    assert response.status_code == 400

    response = client.put(
        "/api/me/preferences",
        json={"linkedin_url": "https://www.linkedin.com/in/placeholder", "linkedin_max_optin": True},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["linkedin_max_optin"] is True
