"""Checks the read-only database viewer at /dev/tables."""

from fastapi.testclient import TestClient

from app.main import app
from app.seed_profiles import load_profiles


def test_index_lists_every_table(client):
    response = client.get("/dev/tables")
    assert response.status_code == 200
    for name in ["user", "tag", "usertag", "userneed", "group", "groupmember", "matchcache", "event", "eventtag", "venue"]:
        assert f"/dev/tables/{name}" in response.text


def test_table_page_shows_rows_but_never_password_hashes(client, session):
    load_profiles(session)
    response = client.get("/dev/tables/user")
    assert response.status_code == 200
    assert "Ava Brightwell" in response.text
    assert "[hidden]" in response.text
    assert "$2b$" not in response.text  # bcrypt hashes start like this


def test_tag_table_shows_the_37_tags(client):
    response = client.get("/dev/tables/tag")
    assert "chess" in response.text
    assert "(37 rows)" in response.text


def test_unknown_table_is_404(client):
    assert client.get("/dev/tables/nope").status_code == 404


def test_other_computers_are_refused(session):
    outsider = TestClient(app, client=("8.8.8.8", 50000))
    assert outsider.get("/dev/tables").status_code == 404


def test_viewer_is_not_listed_on_the_api_docs_page(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert not any(p.startswith("/dev") for p in paths)
