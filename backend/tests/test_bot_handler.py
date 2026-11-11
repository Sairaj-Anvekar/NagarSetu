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

    def commit(self) -> None:
        self.commit_count += 1

    def rollback(self) -> None:
        self.rollback_count += 1

    def flush(self) -> None:
        self.flush_count += 1

    def execute(self, stmt: Any) -> Any:
        return SimpleNamespace(scalar_one_or_none=lambda: None)


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
    callback_data: str = "cat:ok",
    callback_id: str = "cb_1",
    username: str = "sunita",
    first_name: str = "Sunita",
) -> Incoming:
    raw = {
        "update_id": update_id,
        "callback_query": {
            "id": callback_id,
            "from": {"id": chat_id, "username": username, "first_name": first_name},
            "message": {
                "message_id": 100,
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
        assert text.isascii()
        assert "TESTTOKEN" not in text
        assert "token" not in text.lower() or "tracking" in text.lower()


def test_command_start(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    inc = _msg_update(text="/start")
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 2
    assert bot_messages.WELCOME_TEXT in fake_client.sent_messages[0]["text"]
    assert bot_messages.MSG_NEW_REPORT in fake_client.sent_messages[1]["text"]

    sess = session_service.load_session(inc.chat_id)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_INPUT
    _assert_message_invariants(fake_client)


def test_command_help(fake_db: FakeDB, fake_client: FakeClient) -> None:
    inc = _msg_update(text="/help")
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 1
    assert bot_messages.HELP_TEXT in fake_client.sent_messages[0]["text"]
    assert "/new" in fake_client.sent_messages[0]["text"]
    assert "/status" in fake_client.sent_messages[0]["text"]
    assert "/mycomplaints" in fake_client.sent_messages[0]["text"]
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
    _assert_message_invariants(fake_client)


def test_text_input_streetlight_classification(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    text = "Streetlights not working on the main road"
    inc = _msg_update(text=text)
    bot_handler.handle_update(fake_db, fake_client, inc)

    sess = session_service.load_session(inc.chat_id)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_CONFIRMATION
    assert sess["category"] == "Streetlight & Power Outage"
    assert sess["description"] == text

    assert len(fake_client.sent_messages) == 1
    msg = fake_client.sent_messages[0]
    assert "Streetlight & Power Outage" in msg["text"]
    assert "Is this correct?" in msg["text"]
    assert msg["reply_markup"] is not None
    _assert_message_invariants(fake_client)


def test_text_too_short(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    inc = _msg_update(text="help")
    bot_handler.handle_update(fake_db, fake_client, inc)

    assert len(fake_client.sent_messages) == 1
    assert bot_messages.MSG_TEXT_TOO_SHORT in fake_client.sent_messages[0]["text"]
    assert session_service.load_session(inc.chat_id) is None
    _assert_message_invariants(fake_client)


def test_photo_with_caption_pothole(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["file_1"] = jpeg

    inc = _msg_update(
        photo_file_id="file_1",
        photo_file_size=len(jpeg),
        caption="huge pothole on the road",
    )
    bot_handler.handle_update(fake_db, fake_client, inc)

    sess = session_service.load_session(inc.chat_id)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_CONFIRMATION
    assert sess["category"] == "Potholes & Road Damage"
    assert sess["description"] == "huge pothole on the road"
    assert sess["image_key"].startswith("complaints/")
    assert sess["image_key"].endswith(".jpg")
    assert fake_storage.object_exists(sess["image_key"])
    _assert_message_invariants(fake_client)


def test_photo_without_caption_description_none(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["file_2"] = jpeg

    inc = _msg_update(photo_file_id="file_2", photo_file_size=len(jpeg))
    bot_handler.handle_update(fake_db, fake_client, inc)

    sess = session_service.load_session(inc.chat_id)
    assert sess is not None
    assert sess["description"] is None
    assert sess["image_key"] is not None
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


def test_full_happy_path_text(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    text = "Streetlights not working on the main road"
    # Step 1: user sends text
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=1, text=text))
    # Step 2: user taps "Yes, that is correct"
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    # Step 3: user sends location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    # Step 4: user taps Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    c = created[0]
    assert c["category"] == "Streetlight & Power Outage"
    assert c["description"] == text
    assert c["latitude"] == 17.684
    assert c["longitude"] == 75.880
    assert c["image_object_key"] is None
    assert c["ai_classification_source"] == "text"

    assert len(mock_domain_services["assigned_complaints"]) == 1
    assert fake_db.commit_count == 1
    assert len(mock_domain_services["triage_entries"]) == 0
    assert session_service.load_session(123456) is None

    last_msg = fake_client.sent_messages[-1]["text"]
    assert "GRV-2026-TEST" in last_msg
    assert "Status: Submitted" in last_msg
    _assert_message_invariants(fake_client)


def test_low_confidence_path_triggers_triage(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    # "qqzz xx" matches stub default (confidence 0.30)
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="qqzz xx")
    )
    conf_msg = fake_client.sent_messages[-1]["text"]
    assert "not fully sure" in conf_msg

    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    triage_entries = mock_domain_services["triage_entries"]
    assert len(triage_entries) == 1
    complaint, cat, conf = triage_entries[0]
    assert conf == 0.30
    _assert_message_invariants(fake_client)


def test_photo_without_caption_description_prompt_and_skip(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_nocap"] = jpeg

    # Send photo without caption
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, photo_file_id="f_nocap", photo_file_size=len(jpeg)),
    )
    # Confirm category
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    # Send location
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    sess = session_service.load_session(123456)
    assert sess is not None
    assert sess["state"] == session_service.State.AWAITING_DESCRIPTION
    assert (
        bot_messages.MSG_ASK_DESCRIPTION in fake_client.sent_messages[-1]["text"]
    )

    # Tap Skip
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="desc:skip")
    )
    sess_sum = session_service.load_session(123456)
    assert sess_sum["state"] == session_service.State.SUMMARY

    # Submit
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=5, callback_data="sub:yes")
    )
    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    assert created[0]["description"] is None
    _assert_message_invariants(fake_client)


def test_typing_description_in_awaiting_description(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    fake_storage: FakeStorage,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    jpeg = _make_jpeg_bytes()
    fake_client.files["f_cap2"] = jpeg

    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=1, photo_file_id="f_cap2", photo_file_size=len(jpeg)),
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    # Type description
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=4, text="Water leaking from underground pipeline"),
    )

    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.SUMMARY
    assert sess["description"] == "Water leaking from underground pipeline"
    _assert_message_invariants(fake_client)


def test_manual_category_override(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="qqzz xx")
    )
    # Tap "No, choose another"
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:no")
    )
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_CATEGORY
    assert (
        bot_messages.MSG_CHOOSE_CATEGORY in fake_client.sent_messages[-1]["text"]
    )

    # Tap index 4 (Illegal Encroachment)
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=3, callback_data="cat:4")
    )
    sess = session_service.load_session(123456)
    assert sess["category"] == "Illegal Encroachment"
    assert sess["source"] == "manual"
    assert sess["state"] == session_service.State.AWAITING_LOCATION

    # Location + Submit
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=4, latitude=17.684, longitude=75.880),
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=5, callback_data="sub:yes")
    )

    assert len(mock_domain_services["triage_entries"]) == 0
    created = mock_domain_services["created_complaints"]
    assert len(created) == 1
    assert created[0]["category"] == "Illegal Encroachment"
    assert created[0]["ai_classification_source"] == "manual"
    _assert_message_invariants(fake_client)


def test_invalid_category_index_replies_use_buttons(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:no")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=3, callback_data="cat:9")
    )

    assert bot_messages.MSG_USE_BUTTONS in fake_client.sent_messages[-1]["text"]
    sess = session_service.load_session(123456)
    assert sess["state"] == session_service.State.AWAITING_CATEGORY
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
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    # Send text instead of location
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


def test_invalid_latitude_replies_location_not_expected(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
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


def test_callback_with_no_session_replies_expired(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=1, callback_data="cat:ok")
    )
    assert bot_messages.MSG_EXPIRED in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_submit_pressed_in_awaiting_confirmation_replies_use_buttons(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    mock_domain_services: dict[str, list[Any]],
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    # Tapping submit directly while awaiting confirmation
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="sub:yes")
    )

    assert bot_messages.MSG_USE_BUTTONS in fake_client.sent_messages[-1]["text"]
    assert len(mock_domain_services["created_complaints"]) == 0
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
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    # Cancel at summary
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:no")
    )

    assert not fake_storage.object_exists(key)
    assert session_service.load_session(123456) is None
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[-1]["text"]
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
    bot_handler.handle_update(fake_db, fake_client, _msg_update(update_id=2, text="/cancel"))

    assert not fake_storage.object_exists(key)
    assert session_service.load_session(123456) is None
    assert bot_messages.MSG_CANCELLED in fake_client.sent_messages[-1]["text"]
    _assert_message_invariants(fake_client)


def test_create_complaint_error_rollbacks_and_keeps_session(
    fake_db: FakeDB,
    fake_client: FakeClient,
    fake_redis: FakeRedis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bot_handler.handle_update(
        fake_db, fake_client, _msg_update(update_id=1, text="Streetlights out")
    )
    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
    )
    bot_handler.handle_update(
        fake_db,
        fake_client,
        _msg_update(update_id=3, latitude=17.684, longitude=75.880),
    )

    monkeypatch.setattr(
        complaint_service,
        "create_complaint",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("DB write fail")),
    )

    bot_handler.handle_update(
        fake_db, fake_client, _cb_update(update_id=4, callback_data="sub:yes")
    )

    assert fake_db.rollback_count >= 1
    assert bot_messages.MSG_SAVE_FAILED in fake_client.sent_messages[-1]["text"]
    # Session must be KEPT so citizen can retry
    assert session_service.load_session(123456) is not None
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
        fake_db, fake_client, _cb_update(update_id=2, callback_data="cat:ok")
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
    assert "Your recent complaints:" in text
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
