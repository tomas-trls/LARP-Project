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
