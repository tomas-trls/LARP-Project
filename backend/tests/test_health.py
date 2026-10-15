"""Checks that the back end starts and the health route answers."""

from fastapi.testclient import TestClient

from app.main import app

# TestClient calls the app directly, so no server needs to be running.
client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert isinstance(response.json()["demo_mode"], bool)


def test_cors_allows_the_front_end():
    # A browser sends an Origin header; the answer must say that origin is allowed.
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocks_other_sites():
    response = client.get("/api/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in response.headers
