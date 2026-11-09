from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.api.deps import get_current_worker
from app.api.v1 import worker_tasks
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.schemas.tasks import TaskOut
from app.services import (
    nsfw_check_service,
    storage_service,
    task_service,
)
from app.services.task_service import CompleteResult, TaskConflict, TaskNotFound

URL = "/api/v1/complaints/11111111-1111-1111-1111-111111111111/complete"
VALID_NOTE = "Repaired the road surface with hot asphalt mix."


def _make_jpeg(size: tuple[int, int] = (64, 48)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color="green").save(buffer, format="JPEG")
    return buffer.getvalue()


class FakeSession:
    def __init__(self, worker_obj: Any = None, commit_raises: bool = False) -> None:
        self.worker_obj = worker_obj
        self.commit_raises = commit_raises
        self.commit_count = 0
        self.rollback_count = 0

    def get(self, model: Any, ident: Any) -> Any:
        return self.worker_obj

    def commit(self) -> None:
        self.commit_count += 1
        if self.commit_raises:
            raise RuntimeError("Database commit error")

    def rollback(self) -> None:
        self.rollback_count += 1

    def close(self) -> None:
        pass


@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def fake_db():
    session = FakeSession()

    def _get_db_override():
        yield session

    app.dependency_overrides[get_db] = _get_db_override
    return session


@pytest.fixture
def worker_auth(fake_db):
    app.dependency_overrides[get_current_worker] = lambda: SimpleNamespace(id=1, is_active=True)
    token = create_access_token(subject="1", role="worker")
    return {"Authorization": f"Bearer {token}"}


def test_complete_no_token(client: TestClient):
    res = client.patch(
        URL,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 401


def test_complete_admin_token_forbidden(client: TestClient, fake_db):
    admin_token = create_access_token(subject="1", role="admin")
    res = client.patch(
        URL,
        headers={"Authorization": f"Bearer {admin_token}"},
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Worker access required"


def test_complete_inactive_worker_unauthorized(client: TestClient, fake_db):
    fake_db.worker_obj = SimpleNamespace(id=1, is_active=False)
    worker_token = create_access_token(subject="1", role="worker")
    res = client.patch(
        URL,
        headers={"Authorization": f"Bearer {worker_token}"},
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Account is deactivated"


def test_complete_only_note(client: TestClient, worker_auth):
    res = client.patch(URL, headers=worker_auth, data={"note": VALID_NOTE})
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "photo" in last_locs


def test_complete_only_photo(client: TestClient, worker_auth):
    res = client.patch(
        URL,
        headers=worker_auth,
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "note" in last_locs


def test_complete_note_too_short(client: TestClient, worker_auth):
    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": "short"},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "note" in last_locs


def test_complete_note_too_long(client: TestClient, worker_auth):
    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": "x" * 501},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "note" in last_locs


def test_complete_bad_note_and_text_photo(client: TestClient, worker_auth, monkeypatch):
    called = False

    def _fake_complete(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": "short"},
        files={"photo": ("p.txt", b"plain text content", "text/plain")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "note" in last_locs
    assert "photo" in last_locs
    assert not called


def test_complete_text_file_as_photo(client: TestClient, worker_auth):
    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.txt", b"plain text", "text/plain")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "photo" in last_locs


def test_complete_upload_exceeds_max_bytes(client: TestClient, worker_auth, monkeypatch):
    monkeypatch.setattr(worker_tasks, "_max_upload_bytes", lambda: 1000)
    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", b"x" * 2000, "image/jpeg")},
    )
    assert res.status_code == 422
    last_locs = [err["loc"][-1] for err in res.json()["detail"]]
    assert "photo" in last_locs


def test_complete_nsfw_rejected(client: TestClient, worker_auth, monkeypatch):
    called = False

    def _fake_complete(*args, **kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)
    nsfw_check_service.set_classifier(lambda b: 0.99)
    try:
        res = client.patch(
            URL,
            headers=worker_auth,
            data={"note": VALID_NOTE},
            files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
        )
        assert res.status_code == 422
        assert any(err["msg"] == "This image cannot be accepted" for err in res.json()["detail"])
        assert not called
    finally:
        nsfw_check_service.set_classifier(None)


def test_complete_success(client: TestClient, worker_auth, fake_db, monkeypatch):
    jpeg_bytes = _make_jpeg()
    received_args: dict[str, Any] = {}

    expected_task = TaskOut(
        id="11111111-1111-1111-1111-111111111111",
        tracking_code="NGR-2026-0001",
        category="Roads",
        description="Pothole repaired",
        image_url="http://localhost:4566/photo.jpg",
        latitude=17.68,
        longitude=75.875,
        priority="Medium",
        status="Completed",
        sla_deadline=datetime.now(UTC),
        is_overdue=False,
    )

    def _fake_complete(db, worker, complaint_id, note, photo_bytes, image):
        received_args["note"] = note
        received_args["photo_bytes"] = photo_bytes
        return CompleteResult(task=expected_task, photo_key="resolutions/x/y.jpg")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": f"  {VALID_NOTE}  "},
        files={"photo": ("p.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert res.status_code == 200
    data = res.json()
    assert len(data.keys()) == 11
    assert data["status"] == "Completed"
    assert fake_db.commit_count == 1
    assert received_args["note"] == VALID_NOTE
    assert received_args["photo_bytes"] == jpeg_bytes


def test_complete_task_conflict(client: TestClient, worker_auth, fake_db, monkeypatch):
    def _fake_complete(*args, **kwargs):
        raise TaskConflict("Task is already completed")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 409
    assert res.json()["detail"] == "Task is already completed"
    assert fake_db.commit_count == 0
    assert fake_db.rollback_count == 1


def test_complete_task_not_found(client: TestClient, worker_auth, fake_db, monkeypatch):
    def _fake_complete(*args, **kwargs):
        raise TaskNotFound()

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Task not found"
    assert fake_db.rollback_count == 1


def test_complete_storage_error(client: TestClient, worker_auth, fake_db, monkeypatch):
    def _fake_complete(*args, **kwargs):
        raise storage_service.StorageError("Storage down")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 503
    assert res.json()["detail"] == "Photo storage is unavailable. Please try again."
    assert fake_db.rollback_count == 1


def test_complete_commit_failure_cleans_storage(
    client: TestClient, worker_auth, fake_db, monkeypatch
):
    fake_db.commit_raises = True
    deleted_keys: list[str] = []

    class FakeStorage:
        def delete_object(self, key: str) -> None:
            deleted_keys.append(key)

    monkeypatch.setattr(storage_service, "get_storage", lambda: FakeStorage())

    expected_task = TaskOut(
        id="11111111-1111-1111-1111-111111111111",
        tracking_code="NGR-2026-0001",
        category="Roads",
        description="Pothole repaired",
        image_url=None,
        latitude=17.68,
        longitude=75.875,
        priority="Medium",
        status="Completed",
        sla_deadline=datetime.now(UTC),
        is_overdue=False,
    )

    def _fake_complete(*args, **kwargs):
        return CompleteResult(task=expected_task, photo_key="resolutions/test/photo.jpg")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    with pytest.raises(RuntimeError, match="Database commit error"):
        client.patch(
            URL,
            headers=worker_auth,
            data={"note": VALID_NOTE},
            files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
        )

    assert "resolutions/test/photo.jpg" in deleted_keys
    assert fake_db.rollback_count == 1
