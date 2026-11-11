from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.api.deps import get_current_worker
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.schemas.tasks import TaskOut
from app.services import bot_messages, notification_service, task_service
from app.services.task_service import CompleteResult, TaskConflict
from app.services.telegram_api import TelegramError

URL = "/api/v1/complaints/11111111-1111-1111-1111-111111111111/complete"
VALID_NOTE = "Repaired the road surface with hot asphalt mix."


def _make_jpeg(size: tuple[int, int] = (64, 48)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color="blue").save(buffer, format="JPEG")
    return buffer.getvalue()


class FakeTelegramClient:
    def __init__(
        self,
        photo_error: bool = False,
        message_error: bool = False,
        unexpected_error: bool = False,
    ) -> None:
        self.photo_error = photo_error
        self.message_error = message_error
        self.unexpected_error = unexpected_error
        self.sent_photos: list[dict[str, Any]] = []
        self.sent_messages: list[dict[str, Any]] = []

    def send_photo(
        self,
        chat_id: int,
        photo: bytes,
        caption: str | None = None,
    ) -> dict[str, Any]:
        if self.unexpected_error:
            raise RuntimeError("Unexpected client failure")
        if self.photo_error:
            raise TelegramError("Photo send failed")
        self.sent_photos.append(
            {"chat_id": chat_id, "photo": photo, "caption": caption}
        )
        return {"ok": True}

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if self.message_error:
            raise TelegramError("Message send failed")
        self.sent_messages.append(
            {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
        )
        return {"ok": True}


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
    app.dependency_overrides[get_current_worker] = lambda: SimpleNamespace(
        id=1, is_active=True
    )
    token = create_access_token(subject="1", role="worker")
    return {"Authorization": f"Bearer {token}"}


def test_send_completion_notice_no_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notification_service, "_make_client", lambda: None)
    result = notification_service.send_completion_notice(
        chat_id=12345,
        tracking_code="GRV-2026-TEST",
        category="Roads",
        note="Repaired pothole",
        photo_bytes=b"jpegbytes",
    )
    assert result is False


def test_send_completion_notice_success_photo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeTelegramClient()
    monkeypatch.setattr(notification_service, "_make_client", lambda: fake_client)
    photo_data = b"image_binary_content"
    result = notification_service.send_completion_notice(
        chat_id=12345,
        tracking_code="GRV-2026-0001",
        category="Potholes & Road Damage",
        note="Fixed road surface",
        photo_bytes=photo_data,
    )
    assert result is True
    assert len(fake_client.sent_photos) == 1
    call = fake_client.sent_photos[0]
    assert call["chat_id"] == 12345
    assert call["photo"] == photo_data
    expected_caption = bot_messages.format_completion(
        "GRV-2026-0001", "Potholes & Road Damage", "Fixed road surface"
    )
    assert call["caption"] == expected_caption
    assert "GRV-2026-0001" in call["caption"]
    assert "Potholes & Road Damage" in call["caption"]
    assert "Fixed road surface" in call["caption"]
    assert len(fake_client.sent_messages) == 0


def test_send_completion_notice_photo_fails_fallback_to_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeTelegramClient(photo_error=True)
    monkeypatch.setattr(notification_service, "_make_client", lambda: fake_client)
    result = notification_service.send_completion_notice(
        chat_id=12345,
        tracking_code="GRV-2026-0001",
        category="Potholes & Road Damage",
        note="Fixed road surface",
        photo_bytes=b"image_bytes",
    )
    assert result is True
    assert len(fake_client.sent_photos) == 0
    assert len(fake_client.sent_messages) == 1
    msg_call = fake_client.sent_messages[0]
    assert msg_call["chat_id"] == 12345
    expected_text = bot_messages.format_completion(
        "GRV-2026-0001", "Potholes & Road Damage", "Fixed road surface"
    )
    assert msg_call["text"] == expected_text


def test_send_completion_notice_both_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeTelegramClient(photo_error=True, message_error=True)
    monkeypatch.setattr(notification_service, "_make_client", lambda: fake_client)
    result = notification_service.send_completion_notice(
        chat_id=12345,
        tracking_code="GRV-2026-0001",
        category="Potholes & Road Damage",
        note="Fixed road surface",
        photo_bytes=b"image_bytes",
    )
    assert result is False


def test_send_completion_notice_unexpected_runtime_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeTelegramClient(unexpected_error=True)
    monkeypatch.setattr(notification_service, "_make_client", lambda: fake_client)
    result = notification_service.send_completion_notice(
        chat_id=12345,
        tracking_code="GRV-2026-0001",
        category="Potholes & Road Damage",
        note="Fixed road surface",
        photo_bytes=b"image_bytes",
    )
    assert result is False


def test_prepare_completion_notice_success() -> None:
    class FakeResult:
        def scalar_one_or_none(self):
            return SimpleNamespace(
                tracking_code="GRV-2026-0001",
                category="Solid Waste & Garbage",
                citizen=SimpleNamespace(telegram_chat_id=777888999),
            )

    class FakeDB:
        def execute(self, stmt):
            return FakeResult()

    notice = notification_service.prepare_completion_notice(FakeDB(), "dummy-id")
    assert notice == {
        "chat_id": 777888999,
        "tracking_code": "GRV-2026-0001",
        "category": "Solid Waste & Garbage",
    }


def test_prepare_completion_notice_missing() -> None:
    class FakeResult:
        def scalar_one_or_none(self):
            return None

    class FakeDB:
        def execute(self, stmt):
            return FakeResult()

    assert (
        notification_service.prepare_completion_notice(FakeDB(), "missing-id") is None
    )


def test_api_complete_success_schedules_notice(
    client: TestClient,
    worker_auth: dict[str, str],
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    jpeg_bytes = _make_jpeg()
    recorded_calls: list[dict[str, Any]] = []

    notice_dict = {
        "chat_id": 999999999,
        "tracking_code": "GRV-2026-9999",
        "category": "Potholes & Road Damage",
    }
    monkeypatch.setattr(
        notification_service,
        "prepare_completion_notice",
        lambda db, complaint_id: notice_dict,
    )

    def _fake_send_completion_notice(chat_id, tracking_code, category, note, photo_bytes):
        recorded_calls.append(
            {
                "chat_id": chat_id,
                "tracking_code": tracking_code,
                "category": category,
                "note": note,
                "photo_bytes": photo_bytes,
            }
        )
        return True

    monkeypatch.setattr(
        notification_service,
        "send_completion_notice",
        _fake_send_completion_notice,
    )

    expected_task = TaskOut(
        id="11111111-1111-1111-1111-111111111111",
        tracking_code="GRV-2026-9999",
        category="Potholes & Road Damage",
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
        return CompleteResult(task=expected_task, photo_key="resolutions/x/y.jpg")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": f"  {VALID_NOTE}  "},
        files={"photo": ("p.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert res.status_code == 200
    assert fake_db.commit_count == 1
    assert len(recorded_calls) == 1
    call = recorded_calls[0]
    assert call["chat_id"] == 999999999
    assert call["tracking_code"] == "GRV-2026-9999"
    assert call["category"] == "Potholes & Road Damage"
    assert call["note"] == VALID_NOTE
    assert call["photo_bytes"] == jpeg_bytes


def test_api_complete_prepare_notice_raises_runtime_error_still_200(
    client: TestClient,
    worker_auth: dict[str, str],
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    jpeg_bytes = _make_jpeg()
    recorded_calls: list[dict[str, Any]] = []

    def _failing_prepare(db, complaint_id):
        raise RuntimeError("Prepare notice failure")

    monkeypatch.setattr(
        notification_service,
        "prepare_completion_notice",
        _failing_prepare,
    )
    monkeypatch.setattr(
        notification_service,
        "send_completion_notice",
        lambda *args: recorded_calls.append(args),
    )

    expected_task = TaskOut(
        id="11111111-1111-1111-1111-111111111111",
        tracking_code="GRV-2026-9999",
        category="Potholes & Road Damage",
        description="Pothole repaired",
        image_url="http://localhost:4566/photo.jpg",
        latitude=17.68,
        longitude=75.875,
        priority="Medium",
        status="Completed",
        sla_deadline=datetime.now(UTC),
        is_overdue=False,
    )
    monkeypatch.setattr(
        task_service,
        "complete_task",
        lambda *args, **kwargs: CompleteResult(
            task=expected_task, photo_key="resolutions/x/y.jpg"
        ),
    )

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert res.status_code == 200
    assert fake_db.commit_count == 1
    assert len(recorded_calls) == 0


def test_api_complete_prepare_notice_returns_none(
    client: TestClient,
    worker_auth: dict[str, str],
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    jpeg_bytes = _make_jpeg()
    recorded_calls: list[dict[str, Any]] = []

    monkeypatch.setattr(
        notification_service,
        "prepare_completion_notice",
        lambda db, complaint_id: None,
    )
    monkeypatch.setattr(
        notification_service,
        "send_completion_notice",
        lambda *args: recorded_calls.append(args),
    )

    expected_task = TaskOut(
        id="11111111-1111-1111-1111-111111111111",
        tracking_code="GRV-2026-9999",
        category="Potholes & Road Damage",
        description="Pothole repaired",
        image_url="http://localhost:4566/photo.jpg",
        latitude=17.68,
        longitude=75.875,
        priority="Medium",
        status="Completed",
        sla_deadline=datetime.now(UTC),
        is_overdue=False,
    )
    monkeypatch.setattr(
        task_service,
        "complete_task",
        lambda *args, **kwargs: CompleteResult(
            task=expected_task, photo_key="resolutions/x/y.jpg"
        ),
    )

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert res.status_code == 200
    assert len(recorded_calls) == 0


def test_api_complete_error_path_never_calls_recorder(
    client: TestClient,
    worker_auth: dict[str, str],
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorded_calls: list[dict[str, Any]] = []

    def _fake_complete(*args, **kwargs):
        raise TaskConflict("Task is already completed")

    monkeypatch.setattr(task_service, "complete_task", _fake_complete)
    monkeypatch.setattr(
        notification_service,
        "send_completion_notice",
        lambda *args: recorded_calls.append(args),
    )

    res = client.patch(
        URL,
        headers=worker_auth,
        data={"note": VALID_NOTE},
        files={"photo": ("p.jpg", _make_jpeg(), "image/jpeg")},
    )

    assert res.status_code == 409
    assert fake_db.commit_count == 0
    assert len(recorded_calls) == 0

