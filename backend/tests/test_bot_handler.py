from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from types import SimpleNamespace
from typing import Any

import pytest
from PIL import Image

from app.services import (
    assignment_service,
    bot_handler,
    bot_messages,
    citizen_service,
    classification_service,
    complaint_service,
    geocode_service,
    nsfw_check_service,
    session_service,
    storage_service,
    triage_service,
)
from app.services.telegram_api import Incoming, TelegramError, parse_update


def _make_jpeg_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (64, 48), color="red").save(buf, format="JPEG")
    return buf.getvalue()


def _make_gif_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (64, 48), color="blue").save(buf, format="GIF")
    return buf.getvalue()


class FakeClient:
    def __init__(self) -> None:
        self.sent_messages: list[dict[str, Any]] = []
        self.sent_photos: list[dict[str, Any]] = []
        self.answered_callbacks: list[dict[str, Any]] = []
        self.chat_actions: list[dict[str, Any]] = []
        self.edited_markups: list[dict[str, Any]] = []
        self.files: dict[str, bytes] = {}
        self.file_error: Exception | None = None

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.sent_messages.append(
            {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
        )
        return {"ok": True}

    def send_photo(
        self,
        chat_id: int,
        photo: bytes,
        caption: str | None = None,
    ) -> dict[str, Any]:
        self.sent_photos.append(
            {"chat_id": chat_id, "photo": photo, "caption": caption}
        )
        return {"ok": True}

    def send_chat_action(self, chat_id: int, action: str = "typing") -> None:
        self.chat_actions.append({"chat_id": chat_id, "action": action})

    def edit_message_reply_markup(
        self,
        chat_id: int,
        message_id: int,
        reply_markup: dict[str, Any] | None = None,
    ) -> None:
        self.edited_markups.append(
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "reply_markup": reply_markup,
            }
        )

    def answer_callback(
        self,
        callback_id: str,
        text: str | None = None,
    ) -> None:
        self.answered_callbacks.append(
            {"callback_id": callback_id, "text": text}
        )

    def get_file_bytes(self, file_id: str, max_bytes: int) -> bytes:
        if self.file_error:
            raise self.file_error
        if file_id in self.files:
            data = self.files[file_id]
            if len(data) > max_bytes:
                raise TelegramError("File is too large")
            return data
        raise TelegramError("File not found")


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    def get(self, key: str) -> str | None:
        return self.store.get(key)

    def setex(self, key: str, time: int, value: str) -> None:
        self.store[key] = value

    def delete(self, key: str) -> None:
        self.store.pop(key, None)


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.put_calls: list[tuple[str, bytes, str]] = []
        self.delete_calls: list[str] = []

    def put_object(self, key: str, data: bytes, content_type: str) -> None:
        self.objects[key] = (data, content_type)
        self.put_calls.append((key, data, content_type))

    def delete_object(self, key: str) -> None:
        self.objects.pop(key, None)
        self.delete_calls.append(key)

    def object_exists(self, key: str) -> bool:
        return key in self.objects


class FakeDB:
    def __init__(self) -> None:
        self.commit_count = 0
        self.rollback_count = 0
        self.flush_count = 0
        self.zones: dict[int, Any] = {}

    def commit(self) -> None:
        self.commit_count += 1

    def rollback(self) -> None:
        self.rollback_count += 1

    def flush(self) -> None:
        self.flush_count += 1

    def get(self, model: Any, ident: Any) -> Any:
        return self.zones.get(ident)

    def execute(self, stmt: Any) -> Any:
        return SimpleNamespace(
            scalar_one_or_none=lambda: None,
            scalars=lambda: SimpleNamespace(all=lambda: []),
        )


@pytest.fixture(autouse=True)
def reset_classifiers():
    yield
    if hasattr(classification_service, "set_classifier"):
        classification_service.set_classifier(None)
    if hasattr(classification_service, "set_image_classifier"):
        classification_service.set_image_classifier(None)
    if hasattr(classification_service, "set_text_classifier"):
        classification_service.set_text_classifier(None)
    if hasattr(nsfw_check_service, "set_classifier"):
        nsfw_check_service.set_classifier(None)


@pytest.fixture(autouse=True)
def mock_geocode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        geocode_service,
        "reverse_geocode",
        lambda lat, lon, client=None: "Test Locality, Solapur",
    )


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    r = FakeRedis()
    monkeypatch.setattr(session_service, "get_redis", lambda: r)
    return r


@pytest.fixture
def fake_storage(monkeypatch: pytest.MonkeyPatch) -> FakeStorage:
    s = FakeStorage()
    monkeypatch.setattr(storage_service, "get_storage", lambda: s)
    return s


@pytest.fixture
def fake_db() -> FakeDB:
    return FakeDB()


@pytest.fixture
def fake_client() -> FakeClient:
    return FakeClient()


@pytest.fixture(autouse=True)
def mock_domain_services(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[Any]]:
    calls: dict[str, list[Any]] = {
        "created_complaints": [],
        "assigned_complaints": [],
        "triage_entries": [],
    }

    monkeypatch.setattr(
        citizen_service,
        "get_or_create_citizen",
        lambda db, chat_id, username, full_name: SimpleNamespace(
            id="citizen-1"
        ),
    )

    def _create_complaint(db, **kwargs):
        calls["created_complaints"].append(kwargs)
        return SimpleNamespace(id="c-1", tracking_code="GRV-2026-TEST")

    monkeypatch.setattr(complaint_service, "create_complaint", _create_complaint)

    def _assign(db, complaint_id, now=None):
        calls["assigned_complaints"].append((complaint_id, now))
        return SimpleNamespace(id="a-1", worker_id=2)

    monkeypatch.setattr(assignment_service, "assign_complaint", _assign)

    def _triage(db, complaint, predicted_category, ai_confidence):
        calls["triage_entries"].append(
            (complaint, predicted_category, ai_confidence)
        )
        return SimpleNamespace(id="t-1")

    monkeypatch.setattr(triage_service, "create_triage_entry", _triage)

    return calls


def _msg_update(
    update_id: int = 1,
    chat_id: int = 123456,
    text: str | None = None,
    caption: str | None = None,
    photo_file_id: str | None = None,
    photo_file_size: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    username: str = "sunita",
    first_name: str = "Sunita",
) -> Incoming:
    msg: dict[str, Any] = {
        "message_id": 100,
        "chat": {"id": chat_id, "type": "private"},
        "from": {"id": chat_id, "username": username, "first_name": first_name},
    }
    if text is not None:
        msg["text"] = text
    if caption is not None:
        msg["caption"] = caption
    if photo_file_id is not None:
        msg["photo"] = [
            {
                "file_id": photo_file_id,
                "file_size": photo_file_size or 500,
                "width": 64,
                "height": 48,
            }
        ]
    if latitude is not None and longitude is not None:
        msg["location"] = {"latitude": latitude, "longitude": longitude}

    inc = parse_update({"update_id": update_id, "message": msg})
    assert inc is not None
    return inc


def _cb_update(
    update_id: int = 2,
    chat_id: int = 123456,
    callback_data: str = "sub:yes",
    callback_id: str = "cb_1",
    message_id: int = 100,
    username: str = "sunita",
    first_name: str = "Sunita",
) -> Incoming:
    raw = {
        "update_id": update_id,
        "callback_query": {
            "id": callback_id,
            "from": {"id": chat_id, "username": username, "first_name": first_name},
            "message": {
                "message_id": message_id,
                "chat": {"id": chat_id, "type": "private"},
            },
            "data": callback_data,
        },
    }
    inc = parse_update(raw)
    assert inc is not None
    return inc


def _assert_message_invariants(fake_client: FakeClient) -> None:
    for m in fake_client.sent_messages:
        text = m["text"]
        assert "TESTTOKEN" not in text
        assert "token" not in text.lower() or "tracking" in text.lower()


def test_command_start_cleans_and_does_not_create_session(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    # First create a session with an uploaded photo
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_start"] = jpeg
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, photo_file_id="f_start", photo_file_size=len(jpeg)),
    )
    sess = session_service.load_session(123456)
    assert sess is not None
    key = sess["image_key"]
    assert fake_storage.object_exists(key)

    # Now send /start
    fake_client.sent_messages.clear()
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=2, text="/start"))

    assert len(fake_client.sent_messages) == 1
    msg = fake_client.sent_messages[0]
    assert bot_messages.WELCOME_TEXT in msg["text"]
    kb = msg["reply_markup"]["keyboard"]
    labels = [btn["text"] for row in kb for btn in row]
    assert labels == ["Lodge Complaint", "Track Complaint", "My Complaints"]
    # Session and photo must be discarded, no session created
    assert session_service.load_session(123456) is None
    assert not fake_storage.object_exists(key)
    _assert_message_invariants(fake_client)


def test_menu_lodge_complaint_creates_session(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="Lodge Complaint"))
    assert bot_messages.MSG_NEW_REPORT in fake_client.sent_messages[-1]["text"]
    sess = session_service.load_session(123456)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_INPUT

    # Test with lowercase and extra spaces
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="  lodge complaint  "))
    sess2 = session_service.load_session(123456)
    assert sess2 is not None
    assert sess2["state"] == session_service.State.AWAITING_INPUT
    _assert_message_invariants(fake_client)


def test_menu_track_complaint(fake_db: FakeDB, fake_client: FakeClient) -> None:
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="Track Complaint"))
    assert bot_messages.MSG_TRACK_PROMPT in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_menu_my_complaints_and_help_do_not_touch_session(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    sess = session_service.new_session()
    sess["state"] = session_service.State.AWAITING_LOCATION.value
    sess["category"] = "Potholes & Road Damage"
    session_service.save_session(123456, sess)

    # Send "/help"
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="/help"))
    assert bot_messages.HELP_TEXT in fake_client.sent_messages[-1]["text"]
    sess_after_help = session_service.load_session(123456)
    assert sess_after_help == sess

    # Send "My Complaints"
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="My Complaints"))
    sess_after_mine = session_service.load_session(123456)
    assert sess_after_mine == sess
    _assert_message_invariants(fake_client)


def test_command_help(fake_db: FakeDB, fake_client: FakeClient) -> None:
    inc = _msg_update(text="/help")
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 1
    assert bot_messages.HELP_TEXT in fake_client.sent_messages[0]["text"]
    _assert_message_invariants(fake_client)


def test_command_cancel_without_session(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    inc = _msg_update(text="/cancel")
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 1
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[0]["text"]
    assert "keyboard" in fake_client.sent_messages[0]["reply_markup"]
    _assert_message_invariants(fake_client)


def test_direct_tracking_code_lookup(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    complaint_obj = SimpleNamespace(
        tracking_code="GRV-2026-AB12",
        category="Roads",
        status="Submitted",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=None,
    )
    monkeypatch.setattr(
        citizen_service,
        "find_citizen_complaint",
        lambda db, citizen_id, code: complaint_obj if code == "GRV-2026-AB12" else None,
    )

    # Found case
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="grv-2026-ab12"))
    text = fake_client.sent_messages[-1]["text"]
    assert "Status: Submitted" in text
    assert "GRV-2026-AB12" in text

    # Not found case
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="grv-2026-zz99"))
    assert bot_messages.MSG_STATUS_NOT_FOUND in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_photo_intake_typing_and_reply_format(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_type"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, photo_file_id="f_type", photo_file_size=len(jpeg)),
    )
    assert len(fake_client.chat_actions) == 1
    assert fake_client.chat_actions[0]["action"] == "typing"

    msg = fake_client.sent_messages[-1]
    assert "Detected:" in msg["text"]
    assert "%" not in msg["text"]
    assert msg["reply_markup"]["keyboard"][0][0]["request_location"] is True

    sess = session_service.load_session(123456)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_LOCATION
    _assert_message_invariants(fake_client)


def test_low_confidence_text_reply(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    # "qqzz xx" has low confidence (0.30)
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="qqzz xx"))
    assert len(fake_client.chat_actions) == 1
    assert fake_client.chat_actions[0]["action"] == "typing"
    msg = fake_client.sent_messages[-1]["text"]
    assert "Detected:" in msg
    assert "not fully sure" in msg
    assert "%" not in msg
    _assert_message_invariants(fake_client)


def test_text_too_short(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    inc = _msg_update(text="/help")
    bot_handler.handle_update(fake_db, fake_client, inc)

    # Note: "/help" matches Help intent
    assert bot_messages.HELP_TEXT in fake_client.sent_messages[0]["text"]

    # Short non-intent text
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="bad"))
    assert bot_messages.MSG_TEXT_TOO_SHORT in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_photo_gif_rejected(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    gif = _make_gif_bytes()
    fake_client.files["file_gif"] = gif

    inc = _msg_update(photo_file_id="file_gif", photo_file_size=len(gif))
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_storage.put_calls) == 0
    assert len(fake_client.sent_messages) == 1
    assert "Photo must be a JPG, PNG or WebP image" in fake_client.sent_messages[0]["text"]
    _assert_message_invariants(fake_client)


def test_photo_nsfw_rejected(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    nsfw_check_service.set_classifier(lambda b: 0.99)
    jpeg = _make_jpeg_bytes()
    fake_client.files["file_nsfw"] = jpeg

    inc = _msg_update(photo_file_id="file_nsfw", photo_file_size=len(jpeg))
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_storage.put_calls) == 0
    assert len(fake_client.sent_messages) == 1
    assert bot_messages.MSG_IMAGE_REJECTED in fake_client.sent_messages[0]["text"]
    _assert_message_invariants(fake_client)


def test_photo_telegram_download_error(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    fake_client.file_error = TelegramError("Network timeout")
    inc = _msg_update(photo_file_id="bad_file", photo_file_size=1000)
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 1
    assert (
        bot_messages.MSG_PHOTO_DOWNLOAD_FAILED
        in fake_client.sent_messages[0]["text"]
    )
    _assert_message_invariants(fake_client)


def test_location_intake_ordering_and_summary(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights not working")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    fake_client.sent_messages.clear()

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    assert len(fake_client.sent_messages) == 2
    msg1 = fake_client.sent_messages[0]
    assert msg1["text"] == bot_messages.MSG_LOCATION_RECEIVED
    assert "keyboard" in msg1["reply_markup"]

    msg2 = fake_client.sent_messages[1]
    assert "Please review your complaint" in msg2["text"]
    assert "Test Locality, Solapur" in msg2["text"]
    rows = msg2["reply_markup"]["inline_keyboard"]
    assert len(rows) == 1
    cb_datas = [btn["callback_data"] for row in rows for btn in row]
    assert cb_datas == ["sub:yes", "sub:no"]
    _assert_message_invariants(fake_client)


def test_location_fallbacks(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        geocode_service, "reverse_geocode", lambda lat, lon, client=None: None
    )

    fake_db.zones[1] = SimpleNamespace(id=1, name="Zone A")
    monkeypatch.setattr(
        complaint_service,
        "find_zone_id",
        lambda db, lat, lng: 1 if lat == 17.684 else None,
    )

    # 1. Zone match fallback
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Pothole issue on road")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, latitude=17.684, longitude=75.880)
    )
    summary1 = fake_client.sent_messages[-1]["text"]
    assert "Location: Zone A" in summary1

    # 2. No zone match -> "Pinned location"
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=4, text="/cancel"))
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=5, text="Pothole issue on road")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=6, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=7, latitude=17.000, longitude=75.000)
    )
    summary2 = fake_client.sent_messages[-1]["text"]
    assert "Location: Pinned location" in summary2
    _assert_message_invariants(fake_client)


def test_summary_state_text_and_location_updates(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Pothole on main road")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, latitude=17.684, longitude=75.880)
    )

    # 3-character text -> MSG_TEXT_TOO_SHORT
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=4, text="abc"))
    assert bot_messages.MSG_TEXT_TOO_SHORT in fake_client.sent_messages[-1]["text"]

    # >= 5 character text -> updates description and re-shows summary
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=5, text="Near water tank gate")
    )
    summary = fake_client.sent_messages[-1]["text"]
    assert "Details: Near water tank gate" in summary
    sess = session_service.load_session(123456)
    assert sess["description"] == "Near water tank gate"

    # Photo in summary -> MSG_USE_BUTTONS
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=6, photo_file_id="dummy", photo_file_size=100),
    )
    assert bot_messages.MSG_USE_BUTTONS in fake_client.sent_messages[-1]["text"]

    # New location updates coordinates and address
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=7, latitude=17.690, longitude=75.890)
    )
    sess_loc = session_service.load_session(123456)
    assert sess_loc["latitude"] == 17.690
    assert sess_loc["longitude"] == 75.890
    _assert_message_invariants(fake_client)


def test_button_stripping_and_failed_save_retention(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Broken streetlight")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, latitude=17.684, longitude=75.880)
    )

    # Simulate save failure on submit
    orig_create = complaint_service.create_complaint
    monkeypatch.setattr(
        complaint_service,
        "create_complaint",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("DB fail")),
    )
    fake_client.edited_markups.clear()
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )
    # Buttons NOT stripped on failed save
    assert len(fake_client.edited_markups) == 0
    # Session kept
    assert session_service.load_session(123456) is not None
    assert fake_db.rollback_count >= 1
    assert bot_messages.MSG_SAVE_FAILED in fake_client.sent_messages[-1]["text"]

    # Retry submit after save recovers -> buttons stripped and session cleared
    monkeypatch.setattr(complaint_service, "create_complaint", orig_create)
    fake_client.edited_markups.clear()
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=5, callback_data="sub:yes")
    )
    assert len(fake_client.edited_markups) == 1
    assert fake_client.edited_markups[0]["message_id"] == 100
    assert session_service.load_session(123456) is None
    _assert_message_invariants(fake_client)


def test_wrong_state_callbacks(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    sess = session_service.new_session()
    sess["state"] = session_service.State.AWAITING_LOCATION.value
    sess["category"] = "Roads"
    session_service.save_session(123456, sess)

    for idx, cb_data in enumerate(["sub:yes", "sub:no"], start=1):
        bot_handler.handle_update(
            fake_db, fake_client, _cb_update(update_id=idx, callback_data=cb_data)
        )
        assert bot_messages.MSG_USE_BUTTONS in fake_client.sent_messages[-1]["text"]
        assert len(mock_domain_services["created_complaints"]) == 0
        assert session_service.load_session(123456) == sess

    _assert_message_invariants(fake_client)


@pytest.mark.parametrize(
    "bad_state",
    ["AWAITING_CATEGORY", "AWAITING_CONFIRMATION", "BOGUS"],
)
def test_invalid_or_legacy_session_state_discarded_with_photo(
    bad_state: str,
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    key = f"complaints/legacy-{bad_state}/photo.jpg"
    fake_storage.put_object(key, b"fake-jpeg", "image/jpeg")

    sess = session_service.new_session()
    sess["state"] = bad_state
    sess["image_key"] = key
    session_service.save_session(123456, sess)

    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="hello")
    )
    assert bot_messages.MSG_EXPIRED in fake_client.sent_messages[-1]["text"]
    assert session_service.load_session(123456) is None
    assert not fake_storage.object_exists(key)
    assert key in fake_storage.delete_calls

    # Also verify a callback on a leftover invalid session discards photo and expires
    key_cb = f"complaints/legacy-cb-{bad_state}/photo.jpg"
    fake_storage.put_object(key_cb, b"fake-jpeg", "image/jpeg")
    sess_cb = session_service.new_session()
    sess_cb["state"] = bad_state
    sess_cb["image_key"] = key_cb
    session_service.save_session(123456, sess_cb)

    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="sub:yes")
    )
    assert bot_messages.MSG_EXPIRED in fake_client.sent_messages[-1]["text"]
    assert session_service.load_session(123456) is None
    assert not fake_storage.object_exists(key_cb)
    assert key_cb in fake_storage.delete_calls
    _assert_message_invariants(fake_client)


def test_removed_and_unknown_callbacks_reply_use_buttons(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Broken streetlight")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    before = session_service.load_session(123456)
    assert before is not None
    assert before["state"] == session_service.State.SUMMARY

    fake_client.edited_markups.clear()
    for idx, cb_data in enumerate(["sub:cat", "cat:0", "cat:back", "cat:xyz"], start=4):
        bot_handler.handle_update(
            fake_db, fake_client, _cb_update(update_id=idx, callback_data=cb_data)
        )
        assert bot_messages.MSG_USE_BUTTONS in fake_client.sent_messages[-1]["text"]
        assert len(mock_domain_services["created_complaints"]) == 0
        assert session_service.load_session(123456) == before

    assert len(fake_client.edited_markups) == 0
    _assert_message_invariants(fake_client)


def test_full_happy_path_text(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    text = "Streetlights not working on the main road"
    # Step 1: user sends text -> AWAITING_EVIDENCE
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=1, text=text))
    # Step 2: user taps Skip -> AWAITING_LOCATION
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    # Step 3: user sends location -> SUMMARY
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    # Step 4: user taps Confirm & Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    c = created[0]
    assert c["category"] == "Streetlight"
    assert c["description"] == text
    assert c["latitude"] == 17.684
    assert c["longitude"] == 75.880
    assert c["image_object_key"] is None
    assert c["ai_classification_source"] == "text"

    assert len(mock_domain_services["assigned_complaints"]) == 1
    assert fake_db.commit_count == 1
    assert len(mock_domain_services["triage_entries"]) == 0
    assert session_service.load_session(123456) is None

    last_msg = fake_client.sent_messages[-1]
    assert "GRV-2026-TEST" in last_msg["text"]
    assert "Your grievance code:" in last_msg["text"]
    assert "keyboard" in last_msg["reply_markup"]  # main_menu_keyboard
    _assert_message_invariants(fake_client)


def test_full_happy_path_captioned_photo(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_cap"] = jpeg

    # 1. Photo with caption
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_cap",
            photo_file_size=len(jpeg),
            caption="huge pothole on the road",
        ),
    )
    # 2. Location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.680, longitude=75.875),
    )
    # 3. Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=3, callback_data="sub:yes")
    )

    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    assert created[0]["category"] == "Potholes & Road Damage"
    assert created[0]["description"] == "huge pothole on the road"
    assert created[0]["latitude"] == 17.680
    assert created[0]["longitude"] == 75.875
    assert fake_storage.object_exists(created[0]["image_object_key"])

    assert len(mock_domain_services["assigned_complaints"]) == 1
    assert fake_db.commit_count == 1
    _assert_message_invariants(fake_client)


def test_low_confidence_triggers_triage(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    # "qqzz xx" has low confidence (0.30)
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="qqzz xx")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, latitude=17.684, longitude=75.880)
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    triage_entries = mock_domain_services["triage_entries"]
    assert len(triage_entries) == 1
    complaint, cat, conf = triage_entries[0]
    assert conf == 0.30
    _assert_message_invariants(fake_client)


def test_invalid_latitude_replies_location_not_expected(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=95.0, longitude=75.880),
    )
    assert (
        bot_messages.MSG_LOCATION_NOT_EXPECTED
        in fake_client.sent_messages[-1]["text"]
    )
    sess = session_service.load_session(123456)
    assert sess["latitude"] is None
    _assert_message_invariants(fake_client)


def test_text_in_awaiting_location_replies_location_not_expected(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, text="near post office")
    )
    assert (
        bot_messages.MSG_LOCATION_NOT_EXPECTED
        in fake_client.sent_messages[-1]["text"]
    )
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_LOCATION
    _assert_message_invariants(fake_client)


def test_callback_with_no_session_replies_expired(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=1, callback_data="sub:yes")
    )
    assert bot_messages.MSG_EXPIRED in fake_client.sent_messages[-1]["text"]
    assert len(fake_client.edited_markups) == 1
    _assert_message_invariants(fake_client)


def test_sub_no_cancels_and_deletes_uploaded_object(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_cancel"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_cancel",
            photo_file_size=len(jpeg),
            caption="test photo",
        ),
    )
    sess = session_service.load_session(123456)
    key = sess["image_key"]
    assert fake_storage.object_exists(key)

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.684, longitude=75.880),
    )

    # Cancel at summary
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=3, callback_data="sub:no")
    )

    assert not fake_storage.object_exists(key)
    assert session_service.load_session(123456) is None
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[-1]["text"]
    assert "keyboard" in fake_client.sent_messages[-1]["reply_markup"]
    _assert_message_invariants(fake_client)


def test_command_cancel_during_photo_flow_deletes_uploaded_object(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_cancel2"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_cancel2",
            photo_file_size=len(jpeg),
        ),
    )
    sess = session_service.load_session(123456)
    key = sess["image_key"]
    assert fake_storage.object_exists(key)

    # Send /cancel
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=2, text="/cancel")
    )

    assert not fake_storage.object_exists(key)
    assert session_service.load_session(123456) is None
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_double_submission_second_attempt_expires(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    # First submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )
    assert len(mock_domain_services["created_complaints"]) == 1

    # Second submit (double tap)
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=5, callback_data="sub:yes")
    )
    assert len(mock_domain_services["created_complaints"]) == 1
    assert bot_messages.MSG_EXPIRED in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_status_command_usage(fake_db: FakeDB, fake_client: FakeClient) -> None:
    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="/status"))
    assert bot_messages.MSG_STATUS_USAGE in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_status_command_found(
    fake_db: FakeDB,
    fake_client: FakeClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    complaint_obj = SimpleNamespace(
        tracking_code="GRV-2026-TEST",
        category="Roads",
        status="Submitted",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=None,
    )
    monkeypatch.setattr(
        citizen_service,
        "find_citizen_complaint",
        lambda db, citizen_id, code: complaint_obj,
    )

    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(text="/status grv-2026-test")
    )

    text = fake_client.sent_messages[-1]["text"]
    assert "Status: Submitted" in text
    assert "Roads" in text
    _assert_message_invariants(fake_client)


def test_status_command_not_found(
    fake_db: FakeDB,
    fake_client: FakeClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        citizen_service,
        "find_citizen_complaint",
        lambda db, citizen_id, code: None,
    )

    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(text="/status GRV-2026-MISSING")
    )
    assert (
        bot_messages.MSG_STATUS_NOT_FOUND in fake_client.sent_messages[-1]["text"]
    )
    _assert_message_invariants(fake_client)


def test_mycomplaints_command(
    fake_db: FakeDB,
    fake_client: FakeClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    complaints = [
        SimpleNamespace(
            tracking_code="GRV-2026-0001",
            category="Roads",
            status="Submitted",
        ),
        SimpleNamespace(
            tracking_code="GRV-2026-0002",
            category="Garbage",
            status="Completed",
        ),
    ]
    monkeypatch.setattr(
        citizen_service,
        "list_recent_complaints",
        lambda db, citizen_id, limit: complaints,
    )

    bot_handler.handle_update(fake_db, fake_client, _msg_update(text="/mycomplaints"))

    text = fake_client.sent_messages[-1]["text"]
    assert "Your recent complaints" in text
    assert "1. GRV-2026-0001" in text
    assert "2. GRV-2026-0002" in text
    _assert_message_invariants(fake_client)


def test_group_chat_update_ignored_by_parser() -> None:
    raw = {
        "update_id": 999,
        "message": {
            "message_id": 100,
            "chat": {"id": -100123456, "type": "group"},
            "text": "/start",
        },
    }
    assert parse_update(raw) is None


def test_photo_image_not_accepted_rejection(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_classify(data: bytes, hint: str | None = None):
        raise classification_service.ImageNotAccepted("blurry image")

    monkeypatch.setattr(classification_service, "classify_image", fake_classify)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_unclear"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_unclear",
            photo_file_size=len(jpeg),
        ),
    )

    last_msg = fake_client.sent_messages[-1]["text"]
    assert last_msg == bot_messages.MSG_IMAGE_UNCLEAR

    msg_lower = last_msg.lower()
    assert "garbage" not in msg_lower
    assert "pothole" not in msg_lower
    assert "waterlogging" not in msg_lower

    assert len(fake_storage.put_calls) == 0
    assert session_service.load_session(123456) is None
    assert len(mock_domain_services["created_complaints"]) == 0
    _assert_message_invariants(fake_client)


def test_photo_needs_review_confidence_055_shows_not_sure_and_creates_triage(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pred = classification_service.Prediction(
        category="Potholes & Road Damage",
        confidence=0.55,
        source="image",
        model="mobilenetv2-v2",
        needs_review=True,
    )
    monkeypatch.setattr(classification_service, "classify_image", lambda *a, **kw: pred)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_review"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_review",
            photo_file_size=len(jpeg),
        ),
    )
    detected_msg = fake_client.sent_messages[-1]["text"]
    assert "not fully sure" in detected_msg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.684, longitude=75.880),
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _cb_update(update_id=3, callback_data="sub:yes"),
    )

    assert len(mock_domain_services["triage_entries"]) == 1
    complaint, cat, conf = mock_domain_services["triage_entries"][0]
    assert cat == "Potholes & Road Damage"
    assert conf == 0.55
    _assert_message_invariants(fake_client)


def test_photo_needs_review_confidence_095_creates_triage(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pred = classification_service.Prediction(
        category="Solid Waste & Garbage",
        confidence=0.95,
        source="image",
        model="mobilenetv2-v2",
        needs_review=True,
    )
    monkeypatch.setattr(classification_service, "classify_image", lambda *a, **kw: pred)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_rev95"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_rev95",
            photo_file_size=len(jpeg),
        ),
    )
    detected_msg = fake_client.sent_messages[-1]["text"]
    assert "not fully sure" in detected_msg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.684, longitude=75.880),
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _cb_update(update_id=3, callback_data="sub:yes"),
    )

    assert len(mock_domain_services["triage_entries"]) == 1
    complaint, cat, conf = mock_domain_services["triage_entries"][0]
    assert cat == "Solid Waste & Garbage"
    assert conf == 0.95
    _assert_message_invariants(fake_client)


def test_photo_clear_prediction_confidence_095_creates_no_triage(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pred = classification_service.Prediction(
        category="Waterlogging & Drainage",
        confidence=0.95,
        source="image",
        model="mobilenetv2-v2",
        needs_review=False,
    )
    monkeypatch.setattr(classification_service, "classify_image", lambda *a, **kw: pred)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_clear"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=1,
            photo_file_id="f_clear",
            photo_file_size=len(jpeg),
        ),
    )
    detected_msg = fake_client.sent_messages[-1]["text"]
    assert "not fully sure" not in detected_msg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.684, longitude=75.880),
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _cb_update(update_id=3, callback_data="sub:yes"),
    )

    assert len(mock_domain_services["triage_entries"]) == 0
    _assert_message_invariants(fake_client)


def test_evidence_text_path_with_photo(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_evi_test"] = jpeg

    # 1. Text input
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, text="Streetlights not working on the main road"),
    )
    sess1 = session_service.load_session(123456)
    assert sess1["state"] == session_service.State.AWAITING_EVIDENCE
    assert sess1["source"] == "text"
    assert bot_messages.MSG_ASK_EVIDENCE in fake_client.sent_messages[-1]["text"]

    # 2. Upload supporting photo
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(
            update_id=2,
            photo_file_id="f_evi_test",
            photo_file_size=len(jpeg),
        ),
    )
    sess2 = session_service.load_session(123456)
    assert sess2["state"] == session_service.State.AWAITING_LOCATION
    assert sess2["evidence_photo_file_id"] == "f_evi_test"
    # Nothing in storage yet
    assert len(fake_storage.objects) == 0

    # 3. Location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    sess3 = session_service.load_session(123456)
    assert sess3["state"] == session_service.State.SUMMARY
    summary_msg = fake_client.sent_messages[-1]["text"]
    assert "Supporting photo: attached" in summary_msg

    # 4. Confirm & Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )
    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    c = created[0]
    assert c["category"] == "Streetlight"
    assert c["ai_classification_source"] == "text"
    assert c["image_object_key"] is not None
    assert fake_storage.object_exists(c["image_object_key"])
    assert session_service.load_session(123456) is None
    _assert_message_invariants(fake_client)


def test_evidence_text_path_with_skip(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    # 1. Text input
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, text="Streetlights not working on the main road"),
    )
    sess1 = session_service.load_session(123456)
    assert sess1["state"] == session_service.State.AWAITING_EVIDENCE

    # 2. Skip photo
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:skip")
    )
    sess2 = session_service.load_session(123456)
    assert sess2["state"] == session_service.State.AWAITING_LOCATION
    assert sess2["evidence_photo_file_id"] is None

    # 3. Location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    summary_msg = fake_client.sent_messages[-1]["text"]
    assert "Supporting photo: none" in summary_msg

    # 4. Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )
    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    c = created[0]
    assert c["image_object_key"] is None
    assert c["ai_classification_source"] == "text"
    assert len(fake_storage.objects) == 0
    assert session_service.load_session(123456) is None
    _assert_message_invariants(fake_client)


def test_evidence_wrong_input_stays_in_state(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    # 1. Text input
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights broken")
    )
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_EVIDENCE

    # 2. Send plain text -> reminder, state unchanged
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=2, text="Here is some text")
    )
    assert bot_messages.MSG_EVIDENCE_REMINDER in fake_client.sent_messages[-1]["text"]
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_EVIDENCE

    # 3. Send location -> reminder, state unchanged
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=3, latitude=17.684, longitude=75.880)
    )
    assert bot_messages.MSG_EVIDENCE_REMINDER in fake_client.sent_messages[-1]["text"]
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_EVIDENCE

    # 4. Send non-text/non-photo message (e.g. sticker/document) -> reminder, state unchanged
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=4)
    )
    assert bot_messages.MSG_EVIDENCE_REMINDER in fake_client.sent_messages[-1]["text"]
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_EVIDENCE
    _assert_message_invariants(fake_client)


def test_evidence_cancel_deletes_session_and_nothing_uploaded(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    # 1. Text input
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights broken")
    )
    assert session_service.load_session(123456) is not None

    # 2. Tap Cancel
    fake_client.edited_markups.clear()
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="evi:cancel")
    )
    assert len(fake_client.edited_markups) == 1
    assert session_service.load_session(123456) is None
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[-1]["text"]
    assert len(fake_storage.objects) == 0
    _assert_message_invariants(fake_client)


def test_evidence_image_classifier_never_called(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    classifier_called = False

    def mock_classify_image(*args, **kwargs):
        nonlocal classifier_called
        classifier_called = True
        raise AssertionError(
            "Image classifier should never be called for supporting evidence photo!"
        )

    monkeypatch.setattr(classification_service, "classify_image", mock_classify_image)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_no_classify"] = jpeg

    # 1. Text input
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights broken")
    )

    # 2. Send photo in AWAITING_EVIDENCE
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, photo_file_id="f_no_classify", photo_file_size=len(jpeg)),
    )

    # 3. Location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    # 4. Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    assert not classifier_called
    assert len(mock_domain_services["created_complaints"]) == 1
    assert mock_domain_services["created_complaints"][0]["ai_classification_source"] == "text"
    _assert_message_invariants(fake_client)


def test_evidence_photo_first_regression_completely_unchanged(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pred = classification_service.Prediction(
        category="Potholes & Road Damage",
        confidence=0.88,
        source="image",
        model="mobilenetv2-v2",
        needs_review=False,
    )
    monkeypatch.setattr(classification_service, "classify_image", lambda *a, **kw: pred)

    jpeg = _make_jpeg_bytes()
    fake_client.files["f_regr"] = jpeg

    # 1. Photo first
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, photo_file_id="f_regr", photo_file_size=len(jpeg)),
    )
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_LOCATION  # Directly AWAITING_LOCATION!
    assert sess["source"] == "image"
    assert sess["image_key"] is not None
    assert fake_storage.object_exists(sess["image_key"])

    # 2. Location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=2, latitude=17.684, longitude=75.880),
    )
    summary_msg = fake_client.sent_messages[-1]["text"]
    assert "📷 Photo: attached" in summary_msg
    assert "Supporting photo:" not in summary_msg

    # 3. Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=3, callback_data="sub:yes")
    )
    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    c = created[0]
    assert c["category"] == "Potholes & Road Damage"
    assert c["ai_classification_source"] == "image"
    _assert_message_invariants(fake_client)


def test_evidence_nsfw_photo_rejected_stays_in_state(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    nsfw_check_service.set_classifier(lambda data: 0.99)
    try:
        jpeg = _make_jpeg_bytes()
        fake_client.files["f_unsafe"] = jpeg

        # 1. Text input
        bot_handler.handle_update(
            fake_db, fake_client, _msg_update(update_id=1, text="Garbage dumped")
        )
        sess = session_service.load_session(123456)
        assert sess["state"] == session_service.State.AWAITING_EVIDENCE

        # 2. Send unsafe photo
        bot_handler.handle_update(
            fake_db,
            fake_client,
            _msg_update(update_id=2, photo_file_id="f_unsafe", photo_file_size=len(jpeg)),
        )
        assert bot_messages.MSG_IMAGE_REJECTED in fake_client.sent_messages[-1]["text"]
        sess = session_service.load_session(123456)
        assert sess["state"] == session_service.State.AWAITING_EVIDENCE
        assert sess["evidence_photo_file_id"] is None
        _assert_message_invariants(fake_client)
    finally:
        nsfw_check_service.set_classifier(None)

