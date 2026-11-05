import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import limiter
from app.db.session import get_db
from app.main import app
from app.services import auth_service


@pytest.fixture
def enable_rate_limiter():
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


def test_admin_login_rate_limiting(
    client: TestClient,
    enable_rate_limiter: None,
    monkeypatch: pytest.MonkeyPatch,
):
    def fake_authenticate(db, username, password):
        raise auth_service.InvalidCredentials()

    monkeypatch.setattr(
        auth_service, "authenticate_admin", fake_authenticate
    )

    def mock_db():
        yield None

    app.dependency_overrides[get_db] = mock_db
    try:
        login_payload = {
            "username": "admin_user",
            "password": "wrong_password",
        }
        for _ in range(10):
            response = client.post(
                "/api/v1/auth/admin/login",
                json=login_payload,
            )
            assert response.status_code == 401

        rate_limited_response = client.post(
            "/api/v1/auth/admin/login",
            json=login_payload,
        )
        assert rate_limited_response.status_code == 429
        assert rate_limited_response.json() == {
            "detail": "Too many requests"
        }
    finally:
        app.dependency_overrides.pop(get_db, None)

