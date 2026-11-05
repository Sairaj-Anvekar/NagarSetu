from collections.abc import Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.security import decode_access_token
from app.db.session import get_db
from app.main import app
from app.services.auth_service import AccountDisabled, InvalidCredentials


@pytest.fixture(autouse=True)
def override_db() -> Generator[None, None, None]:
    def _fake_get_db() -> Generator[None, None, None]:
        yield None

    app.dependency_overrides[get_db] = _fake_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


def test_admin_login_success(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_admin = MagicMock()
    fake_admin.id = 42
    fake_admin.username = "admin"
    fake_admin.full_name = "Dev Admin"
    fake_admin.is_active = True

    monkeypatch.setattr(
        "app.services.auth_service.authenticate_admin",
        lambda db, username, password: fake_admin,
    )

    response = client.post(
        "/api/v1/auth/admin/login",
        json={"username": "admin", "password": "any-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "admin"
    assert data["user"]["id"] == "42"
    assert isinstance(data["user"]["id"], str)

    decoded = decode_access_token(data["access_token"])
    assert decoded["role"] == "admin"
    assert decoded["sub"] == "42"


def test_admin_login_wrong_password(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_auth(db: object, username: str, password: str) -> None:
        raise InvalidCredentials()

    monkeypatch.setattr("app.services.auth_service.authenticate_admin", fake_auth)

    response = client.post(
        "/api/v1/auth/admin/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"


def test_admin_login_disabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_auth(db: object, username: str, password: str) -> None:
        raise AccountDisabled()

    monkeypatch.setattr("app.services.auth_service.authenticate_admin", fake_auth)

    response = client.post(
        "/api/v1/auth/admin/login",
        json={"username": "admin", "password": "password"},
    )
    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "This account is deactivated. Contact an administrator."
    )


def test_worker_login_success(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_worker = MagicMock()
    fake_worker.id = 101
    fake_worker.name = "Dev Worker"
    fake_worker.phone = "+919000000001"
    fake_worker.is_active = True

    monkeypatch.setattr(
        "app.services.auth_service.authenticate_worker",
        lambda db, phone, pin: fake_worker,
    )

    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "+919000000001", "pin": "1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "worker"
    assert data["user"]["id"] == "101"

    decoded = decode_access_token(data["access_token"])
    assert decoded["role"] == "worker"
    assert decoded["sub"] == "101"


def test_worker_login_invalid_credentials(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_auth(db: object, phone: str, pin: str) -> None:
        raise InvalidCredentials()

    monkeypatch.setattr("app.services.auth_service.authenticate_worker", fake_auth)

    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "+919000000001", "pin": "9999"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid phone or PIN"


def test_worker_login_disabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_auth(db: object, phone: str, pin: str) -> None:
        raise AccountDisabled()

    monkeypatch.setattr("app.services.auth_service.authenticate_worker", fake_auth)

    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "+919000000001", "pin": "1234"},
    )
    assert response.status_code == 403
    assert (
        response.json()["detail"]
        == "This account is deactivated. Contact an administrator."
    )


def test_worker_login_short_pin(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "+919000000001", "pin": "12"},
    )
    assert response.status_code == 422


def test_worker_login_non_digit_pin(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "+919000000001", "pin": "abcd"},
    )
    assert response.status_code == 422


def test_admin_login_empty_username(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/admin/login",
        json={"username": "", "password": "password"},
    )
    assert response.status_code == 422


def test_worker_login_normalizes_phone(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured_phone: dict[str, str] = {}

    def fake_auth(db: object, phone: str, pin: str) -> MagicMock:
        captured_phone["phone"] = phone
        fake_worker = MagicMock()
        fake_worker.id = 1
        fake_worker.name = "Worker"
        fake_worker.is_active = True
        return fake_worker

    monkeypatch.setattr("app.services.auth_service.authenticate_worker", fake_auth)

    response = client.post(
        "/api/v1/auth/worker/login",
        json={"phone": "98765 43210", "pin": "1234"},
    )
    assert response.status_code == 200
    assert captured_phone.get("phone") == "+919876543210"


def test_cors_preflight_admin_login(client: TestClient) -> None:
    response = client.options(
        "/api/v1/auth/admin/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

