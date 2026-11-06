import pytest
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient

from app.api.deps import get_current_admin
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.services import worker_service


class SimpleAdmin:
    id = 1
    username = "admin"
    department_id = 1
    is_active = True


class FakeRef:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name


class FakeWorker:
    def __init__(
        self,
        id: int = 1,
        name: str = "Ramesh Kumar",
        phone: str = "+919876543210",
        department_id: int = 1,
        zone_id: int = 2,
        is_active: bool = True,
    ):
        self.id = id
        self.name = name
        self.phone = phone
        self.department_id = department_id
        self.zone_id = zone_id
        self.department = FakeRef(department_id, "Sanitation")
        self.zone = FakeRef(zone_id, "Central")
        self.is_active = is_active


@pytest.fixture(autouse=True)
def override_db():
    def mock_db():
        yield None

    app.dependency_overrides[get_db] = mock_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def as_admin():
    app.dependency_overrides[get_current_admin] = lambda: SimpleAdmin()
    yield
    app.dependency_overrides.pop(get_current_admin, None)


def test_get_workers_without_token_returns_401(client: TestClient):
    response = client.get("/api/v1/workers")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    assert response.headers.get("www-authenticate") == "Bearer"


def test_get_workers_with_garbage_token_returns_401(client: TestClient):
    response = client.get(
        "/api/v1/workers",
        headers={"Authorization": "Bearer garbage-token-value"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"
    assert response.headers.get("www-authenticate") == "Bearer"


def test_get_workers_with_expired_token_returns_401(client: TestClient):
    token = create_access_token(
        subject="1", role="admin", expires_minutes=-1
    )
    response = client.get(
        "/api/v1/workers",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"
    assert response.headers.get("www-authenticate") == "Bearer"


def test_get_workers_with_tampered_token_returns_401(client: TestClient):
    token = create_access_token(subject="1", role="admin")
    tampered = token[:-4] + ("1111" if token[-4:] != "1111" else "2222")
    response = client.get(
        "/api/v1/workers",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"
    assert response.headers.get("www-authenticate") == "Bearer"


def test_worker_token_returns_403_without_db(client: TestClient):
    token = create_access_token(subject="1", role="worker")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/workers", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_worker_token_rejected_on_all_admin_endpoints(client: TestClient):
    token = create_access_token(subject="1", role="worker")
    headers = {"Authorization": f"Bearer {token}"}

    res_post = client.post("/api/v1/workers", json={}, headers=headers)
    assert res_post.status_code == 403
    assert res_post.json()["detail"] == "Admin access required"

    res_patch = client.patch(
        "/api/v1/workers/1", json={"is_active": True}, headers=headers
    )
    assert res_patch.status_code == 403
    assert res_patch.json()["detail"] == "Admin access required"

    res_dept = client.get("/api/v1/departments", headers=headers)
    assert res_dept.status_code == 403
    assert res_dept.json()["detail"] == "Admin access required"

    res_zones = client.get("/api/v1/zones", headers=headers)
    assert res_zones.status_code == 403
    assert res_zones.json()["detail"] == "Admin access required"


def test_admin_get_workers_returns_200_and_expected_shapes(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    fake_worker = FakeWorker(id=1, name="Ramesh Kumar")
    monkeypatch.setattr(
        worker_service,
        "list_workers",
        lambda db, page, page_size, department_id: ([fake_worker], 1),
    )

    response = client.get("/api/v1/workers")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["id"] == "1"
    assert isinstance(item["id"], str)
    assert item["name"] == "Ramesh Kumar"
    assert item["phone"] == "+919876543210"
    assert item["department"] == {"id": "1", "name": "Sanitation"}
    assert item["zone"] == {"id": "2", "name": "Central"}
    assert item["is_active"] is True
    assert "pin" not in item
    assert "pin_hash" not in item


def test_admin_post_worker_valid_body_normalizes_phone(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    captured: dict[str, str] = {}

    def fake_create(db, data, department_id):
        captured["phone"] = data.phone
        return FakeWorker(
            id=1,
            name=data.name,
            phone=data.phone,
            department_id=department_id,
            zone_id=data.zone_id,
        )

    monkeypatch.setattr(worker_service, "create_worker", fake_create)

    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "98765 43210",
            "pin": "1234",
            "department_id": 1,
            "zone_id": 2,
        },
    )
    assert response.status_code == 201
    assert captured["phone"] == "+919876543210"

    body = response.json()
    assert body["id"] == "1"
    assert body["phone"] == "+919876543210"
    assert "pin" not in body
    assert "pin_hash" not in body


def test_admin_post_worker_short_pin_returns_422(
    client: TestClient, as_admin: None
):
    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "+919876543210",
            "pin": "12",
            "department_id": 1,
            "zone_id": 2,
        },
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert errors[0]["loc"][-1] == "pin"


def test_admin_post_worker_empty_name_returns_422(
    client: TestClient, as_admin: None
):
    response = client.post(
        "/api/v1/workers",
        json={
            "name": "   ",
            "phone": "+919876543210",
            "pin": "1234",
            "department_id": 1,
            "zone_id": 2,
        },
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert errors[0]["loc"][-1] == "name"


def test_admin_post_worker_duplicate_phone_returns_409(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    def fake_create_duplicate(db, data, department_id):
        raise worker_service.DuplicatePhone()

    monkeypatch.setattr(worker_service, "create_worker", fake_create_duplicate)

    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "+919876543210",
            "pin": "1234",
            "department_id": 1,
            "zone_id": 2,
        },
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A worker with this phone number already exists"
    )


def test_admin_post_worker_unknown_department_returns_422(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    def fake_create_invalid_dept(db, data, department_id):
        raise RequestValidationError(
            [
                {
                    "loc": ("body", "department_id"),
                    "msg": "Department not found",
                    "type": "value_error",
                }
            ]
        )

    monkeypatch.setattr(
        worker_service, "create_worker", fake_create_invalid_dept
    )

    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "+919876543210",
            "pin": "1234",
            "department_id": 999,
            "zone_id": 2,
        },
    )
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert errors[0]["loc"][-1] == "department_id"


def test_admin_patch_worker_returns_200(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(
        worker_service,
        "set_worker_active",
        lambda db, worker_id, is_active, department_id: FakeWorker(
            id=worker_id, is_active=is_active, department_id=department_id
        ),
    )

    response = client.patch("/api/v1/workers/1", json={"is_active": False})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "1"
    assert data["is_active"] is False


def test_admin_patch_worker_not_found_returns_404(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(
        worker_service,
        "set_worker_active",
        lambda db, worker_id, is_active, department_id: None,
    )

    response = client.patch("/api/v1/workers/999", json={"is_active": False})
    assert response.status_code == 404
    assert response.json()["detail"] == "Worker not found"


def test_admin_get_departments_and_zones_list_shape(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(
        worker_service,
        "list_departments",
        lambda db, page, page_size, department_id: (
            [FakeRef(1, "Sanitation"), FakeRef(2, "Roads")],
            2,
        ),
    )
    monkeypatch.setattr(
        worker_service,
        "list_zones",
        lambda db, page, page_size: (
            [FakeRef(1, "North"), FakeRef(2, "South")],
            2,
        ),
    )

    res_dept = client.get("/api/v1/departments")
    assert res_dept.status_code == 200
    body_dept = res_dept.json()
    assert body_dept["items"] == [
        {"id": "1", "name": "Sanitation"},
        {"id": "2", "name": "Roads"},
    ]
    assert body_dept["total"] == 2
    assert body_dept["page"] == 1
    assert body_dept["page_size"] == 20

    res_zones = client.get("/api/v1/zones")
    assert res_zones.status_code == 200
    body_zones = res_zones.json()
    assert body_zones["items"] == [
        {"id": "1", "name": "North"},
        {"id": "2", "name": "South"},
    ]
    assert body_zones["total"] == 2


def test_admin_get_workers_page_zero_returns_422(
    client: TestClient, as_admin: None
):
    response = client.get("/api/v1/workers?page=0")
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"][-1] == "page" for err in errors)


def test_admin_get_workers_passes_admin_department_id(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    captured: dict[str, int] = {}

    def fake_list(db, page, page_size, department_id):
        captured["department_id"] = department_id
        return [], 0

    monkeypatch.setattr(worker_service, "list_workers", fake_list)
    response = client.get("/api/v1/workers")
    assert response.status_code == 200
    assert captured.get("department_id") == 1


def test_admin_post_worker_body_department_id_ignored_uses_admin_dept(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    captured: dict[str, int] = {}

    def fake_create(db, data, department_id):
        captured["department_id"] = department_id
        return FakeWorker(
            id=1,
            name=data.name,
            phone=data.phone,
            department_id=department_id,
            zone_id=data.zone_id,
        )

    monkeypatch.setattr(worker_service, "create_worker", fake_create)
    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "+919876543210",
            "pin": "1234",
            "department_id": 3,
            "zone_id": 2,
        },
    )
    assert response.status_code == 201
    assert captured["department_id"] == 1


def test_admin_post_worker_without_department_id_succeeds(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    captured: dict[str, int] = {}

    def fake_create(db, data, department_id):
        captured["department_id"] = department_id
        return FakeWorker(
            id=1,
            name=data.name,
            phone=data.phone,
            department_id=department_id,
            zone_id=data.zone_id,
        )

    monkeypatch.setattr(worker_service, "create_worker", fake_create)
    response = client.post(
        "/api/v1/workers",
        json={
            "name": "Ramesh Kumar",
            "phone": "+919876543210",
            "pin": "1234",
            "zone_id": 2,
        },
    )
    assert response.status_code == 201
    assert captured["department_id"] == 1


def test_admin_patch_worker_fake_returns_none_gives_404(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(
        worker_service,
        "set_worker_active",
        lambda db, worker_id, is_active, department_id: None,
    )

    response = client.patch("/api/v1/workers/42", json={"is_active": False})
    assert response.status_code == 404
    assert response.json()["detail"] == "Worker not found"


def test_admin_get_departments_passes_admin_department_id(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    captured: dict[str, int] = {}

    def fake_list_departments(db, page, page_size, department_id):
        captured["department_id"] = department_id
        return [FakeRef(department_id, "Sanitation")], 1

    monkeypatch.setattr(
        worker_service, "list_departments", fake_list_departments
    )
    response = client.get("/api/v1/departments")
    assert response.status_code == 200
    assert captured["department_id"] == 1


def test_admin_get_zones_works_without_department(
    client: TestClient, as_admin: None, monkeypatch: pytest.MonkeyPatch
):
    called: list[bool] = []

    def fake_list_zones(db, page, page_size):
        called.append(True)
        return [FakeRef(1, "Zone A")], 1

    monkeypatch.setattr(worker_service, "list_zones", fake_list_zones)
    response = client.get("/api/v1/zones")
    assert response.status_code == 200
    assert len(called) == 1


