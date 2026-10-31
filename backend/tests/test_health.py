import pytest
from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_returns_200_when_all_checks_ok(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_checks = {
        "database": {"ok": True, "detail": "postgis test"},
        "redis": {"ok": True, "detail": "pong"},
    }
    monkeypatch.setattr("app.services.health_service.run_checks", lambda: fake_checks)
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "checks": fake_checks}


def test_ready_returns_503_when_a_check_fails(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_checks = {
        "database": {"ok": True, "detail": "postgis test"},
        "redis": {"ok": False, "detail": "ConnectionError"},
    }
    monkeypatch.setattr("app.services.health_service.run_checks", lambda: fake_checks)
    response = client.get("/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "not_ready"
    assert data["checks"]["redis"]["ok"] is False
