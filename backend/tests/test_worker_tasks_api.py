from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest

from app.api.deps import get_current_worker
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.schemas.tasks import DeferOut, HistoryItemOut, TaskOut
from app.services import task_service

CONTRACT_KEYS = {
    "id",
    "tracking_code",
    "category",
    "description",
    "image_url",
    "latitude",
    "longitude",
    "priority",
    "status",
    "sla_deadline",
    "is_overdue",
}

SAMPLE_UUID = "12345678-1234-5678-1234-567812345678"

ROUTES = [
    ("GET", "/api/v1/workers/me/tasks", None),
    ("GET", "/api/v1/workers/me/history", None),
    ("GET", f"/api/v1/complaints/{SAMPLE_UUID}", None),
    ("PATCH", f"/api/v1/complaints/{SAMPLE_UUID}/start", None),
    (
        "PATCH",
        f"/api/v1/complaints/{SAMPLE_UUID}/defer",
        {"reason": "Valid deferral reason"},
    ),
]


class FakeSession:
    def __init__(self, get_obj: Any = None) -> None:
        self.get_obj = get_obj
        self.commit_called = False
        self.rollback_called = False

    def get(self, model: Any, ident: Any) -> Any:
        return self.get_obj

    def commit(self) -> None:
        self.commit_called = True

    def rollback(self) -> None:
        self.rollback_called = True


@pytest.fixture(autouse=True)
def cleanup_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def make_auth_headers(role: str = "worker", sub: str = "1") -> dict[str, str]:
    token = create_access_token(subject=sub, role=role)
    return {"Authorization": f"Bearer {token}"}


fake_active_worker = SimpleNamespace(id=1, is_active=True)
now_dt = datetime.now(UTC)

sample_task = TaskOut(
    id=SAMPLE_UUID,
    tracking_code="NGS-2026-0001",
    category="Potholes & Road Damage",
    description="Deep pothole near junction",
    image_url=None,
    latitude=17.68,
    longitude=75.875,
    priority="high",
    status="Submitted",
    sla_deadline=now_dt,
    is_overdue=False,
)

sample_history_item = HistoryItemOut(
    id=SAMPLE_UUID,
    tracking_code="NGS-2026-0001",
    category="Potholes & Road Damage",
    description="Deep pothole near junction",
    image_url=None,
    latitude=17.68,
    longitude=75.875,
    priority="high",
    status="Completed",
    sla_deadline=now_dt,
    is_overdue=False,
    resolved_at=now_dt,
)


def test_routes_missing_token_returns_401(client):
    for method, path, json_body in ROUTES:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.patch(path, json=json_body)
        assert resp.status_code == 401
        assert "Bearer" in resp.headers.get("www-authenticate", "")


def test_routes_admin_token_returns_403(client):
    headers = make_auth_headers(role="admin")
    for method, path, json_body in ROUTES:
        if method == "GET":
            resp = client.get(path, headers=headers)
        else:
            resp = client.patch(path, json=json_body, headers=headers)
        assert resp.status_code == 403
        assert resp.json() == {"detail": "Worker access required"}


def test_worker_token_inactive_worker_returns_401(client):
    fake_session = FakeSession(get_obj=SimpleNamespace(id=1, is_active=False))
    app.dependency_overrides[get_db] = lambda: fake_session
    headers = make_auth_headers(role="worker")
    resp = client.get("/api/v1/workers/me/tasks", headers=headers)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Account is deactivated"}
    assert "Bearer" in resp.headers.get("www-authenticate", "")


def test_worker_token_nonexistent_worker_returns_401(client):
    fake_session = FakeSession(get_obj=None)
    app.dependency_overrides[get_db] = lambda: fake_session
    headers = make_auth_headers(role="worker")
    resp = client.get("/api/v1/workers/me/tasks", headers=headers)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Invalid token"}
    assert "Bearer" in resp.headers.get("www-authenticate", "")


def test_get_my_tasks_contract(client, monkeypatch):
    app.dependency_overrides[get_current_worker] = lambda: fake_active_worker
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session
    monkeypatch.setattr(
        task_service,
        "list_active_tasks",
        lambda db, worker, page, page_size: ([sample_task], 1),
    )

    resp = client.get("/api/v1/workers/me/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"items", "total", "page", "page_size"}
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert set(item.keys()) == CONTRACT_KEYS
    assert isinstance(item["id"], str)
    assert not any("citizen" in k.lower() for k in item.keys())


def test_get_my_history(client, monkeypatch):
    app.dependency_overrides[get_current_worker] = lambda: fake_active_worker
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session
    monkeypatch.setattr(
        task_service,
        "list_history",
        lambda db, worker, page, page_size: ([sample_history_item], 1),
    )

    resp = client.get("/api/v1/workers/me/history")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"items", "total", "page", "page_size"}
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert "resolved_at" in item
    assert item["resolved_at"] is not None


def test_get_complaint(client, monkeypatch):
    app.dependency_overrides[get_current_worker] = lambda: fake_active_worker
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session

    # 200 success
    monkeypatch.setattr(
        task_service,
        "get_task",
        lambda db, worker, complaint_id: sample_task,
    )
    resp = client.get(f"/api/v1/complaints/{SAMPLE_UUID}")
    assert resp.status_code == 200
    assert resp.json()["id"] == SAMPLE_UUID

    # 404 TaskNotFound
    def raise_not_found(db, worker, complaint_id):
        raise task_service.TaskNotFound()

    monkeypatch.setattr(task_service, "get_task", raise_not_found)
    resp = client.get(f"/api/v1/complaints/{SAMPLE_UUID}")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Task not found"}

    # 422 for not-a-uuid
    resp = client.get("/api/v1/complaints/not-a-uuid")
    assert resp.status_code == 422


def test_patch_start(client, monkeypatch):
    app.dependency_overrides[get_current_worker] = lambda: fake_active_worker

    # 200 success
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session
    in_progress_task = sample_task.model_copy(update={"status": "In-Progress"})
    monkeypatch.setattr(
        task_service,
        "start_task",
        lambda db, worker, complaint_id: in_progress_task,
    )
    resp = client.patch(f"/api/v1/complaints/{SAMPLE_UUID}/start")
    assert resp.status_code == 200
    assert resp.json()["status"] == "In-Progress"
    assert fake_session.commit_called is True
    assert fake_session.rollback_called is False

    # 409 TaskConflict
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session

    def raise_conflict(db, worker, complaint_id):
        raise task_service.TaskConflict("Task is already completed")

    monkeypatch.setattr(task_service, "start_task", raise_conflict)
    resp = client.patch(f"/api/v1/complaints/{SAMPLE_UUID}/start")
    assert resp.status_code == 409
    assert resp.json() == {"detail": "Task is already completed"}
    assert fake_session.commit_called is False
    assert fake_session.rollback_called is True

    # 404 TaskNotFound
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session

    def raise_not_found(db, worker, complaint_id):
        raise task_service.TaskNotFound()

    monkeypatch.setattr(task_service, "start_task", raise_not_found)
    resp = client.patch(f"/api/v1/complaints/{SAMPLE_UUID}/start")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Task not found"}
    assert fake_session.commit_called is False
    assert fake_session.rollback_called is True


def test_patch_defer(client, monkeypatch):
    app.dependency_overrides[get_current_worker] = lambda: fake_active_worker

    # 422 with reason "abc"
    resp = client.patch(
        f"/api/v1/complaints/{SAMPLE_UUID}/defer", json={"reason": "abc"}
    )
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"][-1] == "reason"

    # 200 success
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session
    defer_out = DeferOut(
        id=SAMPLE_UUID, status="Submitted", carry_forward_count=1
    )
    monkeypatch.setattr(
        task_service,
        "defer_task",
        lambda db, worker, complaint_id, reason: defer_out,
    )
    resp = client.patch(
        f"/api/v1/complaints/{SAMPLE_UUID}/defer",
        json={"reason": "Road is blocked by ongoing sewer work"},
    )
    assert resp.status_code == 200
    assert set(resp.json().keys()) == {"id", "status", "carry_forward_count"}
    assert resp.json() == {
        "id": SAMPLE_UUID,
        "status": "Submitted",
        "carry_forward_count": 1,
    }
    assert fake_session.commit_called is True
    assert fake_session.rollback_called is False

    # 404 TaskNotFound
    fake_session = FakeSession()
    app.dependency_overrides[get_db] = lambda: fake_session

    def raise_not_found(db, worker, complaint_id, reason):
        raise task_service.TaskNotFound()

    monkeypatch.setattr(task_service, "defer_task", raise_not_found)
    resp = client.patch(
        f"/api/v1/complaints/{SAMPLE_UUID}/defer",
        json={"reason": "Road is blocked by ongoing sewer work"},
    )
    assert resp.status_code == 404
    assert resp.json() == {"detail": "Task not found"}
    assert fake_session.commit_called is False
    assert fake_session.rollback_called is True
