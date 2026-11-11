from __future__ import annotations

import json
from datetime import UTC, datetime
from types import SimpleNamespace

import httpx

from app.core.categories import category_names
from app.services import bot_messages
from app.services.telegram_api import TelegramClient


def test_message_constants_non_empty_and_ascii() -> None:
    constants = [
        bot_messages.WELCOME_TEXT,
        bot_messages.HELP_TEXT,
        bot_messages.MSG_NEW_REPORT,
        bot_messages.MSG_EXPIRED,
        bot_messages.MSG_USE_BUTTONS,
        bot_messages.MSG_SHARE_LOCATION,
        bot_messages.MSG_ASK_DESCRIPTION,
        bot_messages.MSG_CHOOSE_CATEGORY,
        bot_messages.MSG_CANCELLED,
        bot_messages.MSG_PHOTO_DOWNLOAD_FAILED,
        bot_messages.MSG_PHOTO_TOO_LARGE,
        bot_messages.MSG_IMAGE_REJECTED,
        bot_messages.MSG_STORAGE_DOWN,
        bot_messages.MSG_TEXT_TOO_SHORT,
        bot_messages.MSG_SAVE_FAILED,
        bot_messages.MSG_STATUS_USAGE,
        bot_messages.MSG_STATUS_NOT_FOUND,
        bot_messages.MSG_GENERIC_ERROR,
        bot_messages.MSG_PHOTO_NOT_EXPECTED,
        bot_messages.MSG_LOCATION_NOT_EXPECTED,
    ]
    for text in constants:
        assert isinstance(text, str)
        assert len(text.strip()) > 0
        assert text.isascii()


def test_format_ist() -> None:
    dt = datetime(2026, 11, 10, 6, 30, tzinfo=UTC)
    assert bot_messages.format_ist(dt) == "10 Nov 2026, 12:00 PM IST"


def test_format_confirmation() -> None:
    confident_text = bot_messages.format_confirmation("Potholes", 0.91, True)
    assert "91%" in confident_text
    assert "Is this correct?" in confident_text
    assert "not fully sure" not in confident_text

    not_confident_text = bot_messages.format_confirmation("Potholes", 0.45, False)
    assert "not fully sure" in not_confident_text
    assert "Is this correct?" in not_confident_text


def test_format_summary() -> None:
    summary = bot_messages.format_summary(
        category="Potholes & Road Damage",
        department="Roads & Traffic",
        latitude=17.68,
        longitude=75.88,
        description=None,
        has_photo=False,
        sla_hours=48,
    )
    assert "Potholes & Road Damage" in summary
    assert "Roads & Traffic" in summary
    assert "17.680000, 75.880000" in summary
    assert "within 48 hours" in summary
    assert "none" in summary


def test_format_submitted() -> None:
    code = "GRV-2026-TEST"
    submitted = bot_messages.format_submitted(code)
    assert submitted.count(code) == 2
    assert "Status: Submitted" in submitted


def test_format_status() -> None:
    completed_complaint = SimpleNamespace(
        tracking_code="GRV-2026-0001",
        category="Streetlight & Power Outage",
        status="Completed",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=datetime(2026, 11, 11, 8, 30, tzinfo=UTC),
    )
    text_completed = bot_messages.format_status(completed_complaint)
    assert "Resolved:" in text_completed

    submitted_complaint = SimpleNamespace(
        tracking_code="GRV-2026-0002",
        category="Solid Waste & Garbage",
        status="Submitted",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=None,
    )
    text_submitted = bot_messages.format_status(submitted_complaint)
    assert "Resolved:" not in text_submitted


def test_format_my_complaints() -> None:
    assert "/new" in bot_messages.format_my_complaints([])

    complaints = [
        SimpleNamespace(
            tracking_code="GRV-2026-0001",
            category="Potholes & Road Damage",
            status="In Progress",
        ),
        SimpleNamespace(
            tracking_code="GRV-2026-0002",
            category="Solid Waste & Garbage",
            status="Submitted",
        ),
    ]
    text = bot_messages.format_my_complaints(complaints)
    assert "1. GRV-2026-0001 - Potholes & Road Damage - In Progress" in text
    assert "2. GRV-2026-0002 - Solid Waste & Garbage - Submitted" in text


def test_keyboards_callback_data_and_structure() -> None:
    keyboards = [
        bot_messages.confirm_keyboard(),
        bot_messages.category_keyboard(category_names()),
        bot_messages.skip_keyboard(),
        bot_messages.submit_keyboard(),
    ]
    for kb in keyboards:
        for row in kb["inline_keyboard"]:
            for button in row:
                cb_data = button["callback_data"]
                assert len(cb_data.encode("utf-8")) <= 64

    cat_kb = bot_messages.category_keyboard(category_names())
    buttons = [row[0] for row in cat_kb["inline_keyboard"]]
    assert len(buttons) == 6
    assert [b["callback_data"] for b in buttons] == [f"cat:{i}" for i in range(6)]

    sub_kb = bot_messages.submit_keyboard()
    assert len(sub_kb["inline_keyboard"]) == 1
    row = sub_kb["inline_keyboard"][0]
    assert [b["callback_data"] for b in row] == ["sub:yes", "sub:no"]


def test_telegram_client_get_me() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bot123456:TESTTOKEN/getMe"
        assert request.method == "POST"
        return httpx.Response(
            200,
            json={
                "ok": True,
                "result": {"id": 123456, "is_bot": True, "first_name": "TestBot"},
            },
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)
        me = client.get_me()
        assert me == {"id": 123456, "is_bot": True, "first_name": "TestBot"}


def test_telegram_client_delete_webhook() -> None:
    recorded_body: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bot123456:TESTTOKEN/deleteWebhook"
        assert request.method == "POST"
        recorded_body.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True, "result": True})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)
        client.delete_webhook()
        assert len(recorded_body) == 1
        assert recorded_body[0] == {"drop_pending_updates": False}
