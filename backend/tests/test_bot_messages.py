from __future__ import annotations

import json
from datetime import UTC, datetime
from types import SimpleNamespace

import httpx

from app.core.categories import category_names
from app.services import bot_messages
from app.services.telegram_api import TelegramClient


def test_message_constants_non_empty_and_no_brackets() -> None:
    constants = [
        bot_messages.WELCOME_TEXT,
        bot_messages.HELP_TEXT,
        bot_messages.MSG_NEW_REPORT,
        bot_messages.MSG_TRACK_PROMPT,
        bot_messages.MSG_LOCATION_RECEIVED,
        bot_messages.MSG_CHOOSE_CATEGORY,
        bot_messages.MSG_EXPIRED,
        bot_messages.MSG_USE_BUTTONS,
        bot_messages.MSG_CANCELLED,
        bot_messages.MSG_PHOTO_DOWNLOAD_FAILED,
        bot_messages.MSG_PHOTO_TOO_LARGE,
        bot_messages.MSG_IMAGE_REJECTED,
        bot_messages.MSG_IMAGE_UNCLEAR,
        bot_messages.MSG_STORAGE_DOWN,
        bot_messages.MSG_TEXT_TOO_SHORT,
        bot_messages.MSG_SAVE_FAILED,
        bot_messages.MSG_STATUS_USAGE,
        bot_messages.MSG_STATUS_NOT_FOUND,
        bot_messages.MSG_GENERIC_ERROR,
        bot_messages.MSG_LOCATION_NOT_EXPECTED,
    ]
    for text in constants:
        assert isinstance(text, str)
        assert len(text.strip()) > 0
        assert "<" not in text
        assert ">" not in text


def test_msg_image_unclear_exact_and_no_class_names() -> None:
    expected = (
        "Unable to process this image. Please retake the photo or re-upload a clear image."
    )
    assert bot_messages.MSG_IMAGE_UNCLEAR == expected
    lower = bot_messages.MSG_IMAGE_UNCLEAR.lower()
    assert "garbage" not in lower
    assert "pothole" not in lower
    assert "waterlogging" not in lower


def test_format_ist() -> None:
    dt = datetime(2026, 11, 10, 6, 30, tzinfo=UTC)
    assert bot_messages.format_ist(dt) == "10 Nov 2026, 12:00 PM IST"


def test_format_detected() -> None:
    prompt_loc = "📍 Now share the exact location of the problem using the button below."
    confident_text = bot_messages.format_detected("Potholes & Road Damage", confident=True)
    assert "🔎 Detected: Potholes & Road Damage" in confident_text
    assert prompt_loc in confident_text
    assert "not fully sure" not in confident_text
    assert "%" not in confident_text

    not_confident_text = bot_messages.format_detected(
        "Potholes & Road Damage", confident=False
    )
    assert "🔎 Detected: Potholes & Road Damage" in not_confident_text
    assert "not fully sure, so an official will double-check it for you." in not_confident_text
    assert prompt_loc in not_confident_text
    assert "%" not in not_confident_text


def test_format_eta() -> None:
    assert bot_messages.format_eta(1) == "about 1 hour"
    assert bot_messages.format_eta(4) == "about 4 hours"
    assert bot_messages.format_eta(24) == "1 day"
    assert bot_messages.format_eta(48) == "2 days"
    assert bot_messages.format_eta(72) == "3 days"
    assert bot_messages.format_eta(168) == "7 days"


def test_format_summary() -> None:
    dt = datetime(2026, 11, 10, 6, 30, tzinfo=UTC)

    # Without description and without photo
    s1 = bot_messages.format_summary(
        category="Potholes & Road Damage",
        location_text="Kegaon, Solapur North, Solapur",
        when=dt,
        description=None,
        has_photo=False,
        sla_hours=48,
    )
    assert "📝 Please review your complaint" in s1
    assert "🗂 Category: Potholes & Road Damage" in s1
    assert "📍 Location: Kegaon, Solapur North, Solapur" in s1
    assert bot_messages.format_ist(dt) in s1
    assert "⏳ Estimated time: 2 days" in s1
    assert "Details" not in s1
    assert "Photo" not in s1
    assert "Target" not in s1
    assert "All correct? Tap Confirm & Submit." in s1

    # With description and with photo
    s2 = bot_messages.format_summary(
        category="Solid Waste & Garbage",
        location_text="Old Pune Naka",
        when=dt,
        description="Large garbage pile near main gate",
        has_photo=True,
        sla_hours=24,
    )
    assert "🗂 Category: Solid Waste & Garbage" in s2
    assert "📍 Location: Old Pune Naka" in s2
    assert bot_messages.format_ist(dt) in s2
    assert "⏳ Estimated time: 1 day" in s2
    assert "💬 Details: Large garbage pile near main gate" in s2
    assert "📷 Photo: attached" in s2
    assert "Target" not in s2


def test_format_submitted() -> None:
    code = "GRV-2026-AB12"
    submitted = bot_messages.format_submitted(code)
    assert code in submitted
    assert "🎫 Your grievance code:" in submitted
    assert "Track Complaint" in submitted


def test_format_completion() -> None:
    code = "GRV-2026-AB12"
    category = "Streetlight"
    note = "Replaced bulb on pole 14"
    completion = bot_messages.format_completion(code, category, note)
    assert code in completion
    assert category in completion
    assert note in completion


def test_format_status() -> None:
    completed_complaint = SimpleNamespace(
        tracking_code="GRV-2026-0001",
        category="Streetlight",
        status="Completed",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=datetime(2026, 11, 11, 8, 30, tzinfo=UTC),
    )
    text_completed = bot_messages.format_status(completed_complaint)
    assert "Status: Completed" in text_completed
    assert "✅ Submitted → ✅ In-Progress → ✅ Completed" in text_completed
    assert "Resolved:" in text_completed

    in_progress_complaint = SimpleNamespace(
        tracking_code="GRV-2026-0002",
        category="Potholes & Road Damage",
        status="In-Progress",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=None,
    )
    text_in_progress = bot_messages.format_status(in_progress_complaint)
    assert "Status: In-Progress" in text_in_progress
    assert "✅ Submitted → 🟡 In-Progress → ⚪ Completed" in text_in_progress
    assert "Resolved:" not in text_in_progress

    submitted_complaint = SimpleNamespace(
        tracking_code="GRV-2026-0003",
        category="Solid Waste & Garbage",
        status="Submitted",
        created_at=datetime(2026, 11, 10, 6, 0, tzinfo=UTC),
        sla_deadline=datetime(2026, 11, 12, 6, 0, tzinfo=UTC),
        resolved_at=None,
    )
    text_submitted = bot_messages.format_status(submitted_complaint)
    assert "Status: Submitted" in text_submitted
    assert "🟢 Submitted → ⚪ In-Progress → ⚪ Completed" in text_submitted
    assert "Resolved:" not in text_submitted


def test_format_my_complaints() -> None:
    assert bot_messages.format_my_complaints([]) == (
        "📭 You have not submitted any complaints yet. Tap Lodge Complaint to report a problem."
    )

    complaints = [
        SimpleNamespace(
            tracking_code="GRV-2026-0001",
            category="Potholes & Road Damage",
            status="In-Progress",
        ),
        SimpleNamespace(
            tracking_code="GRV-2026-0002",
            category="Solid Waste & Garbage",
            status="Submitted",
        ),
    ]
    text = bot_messages.format_my_complaints(complaints)
    assert "1. GRV-2026-0001\n   Potholes & Road Damage - In-Progress" in text
    assert "2. GRV-2026-0002\n   Solid Waste & Garbage - Submitted" in text


def test_keyboards_callback_data_and_structure() -> None:
    sum_kb = bot_messages.summary_keyboard()
    cat_kb = bot_messages.category_keyboard(category_names())

    for kb in [sum_kb, cat_kb]:
        for row in kb["inline_keyboard"]:
            for button in row:
                cb_data = button["callback_data"]
                assert len(cb_data.encode("utf-8")) <= 64

    # summary_keyboard data is exactly sub:yes, sub:cat, sub:no
    sum_rows = sum_kb["inline_keyboard"]
    assert len(sum_rows) == 2
    assert [b["callback_data"] for b in sum_rows[0]] == ["sub:yes"]
    assert [b["callback_data"] for b in sum_rows[1]] == ["sub:cat", "sub:no"]
    assert sum_rows[0][0]["text"] == "Confirm & Submit"
    assert sum_rows[1][0]["text"] == "Change category"
    assert sum_rows[1][1]["text"] == "Cancel"

    # category_keyboard(category_names()) has 6 category buttons cat:0 to cat:5 plus cat:back
    cat_rows = cat_kb["inline_keyboard"]
    assert len(cat_rows) == 7
    for i in range(6):
        assert cat_rows[i][0]["callback_data"] == f"cat:{i}"
        assert cat_rows[i][0]["text"] == category_names()[i]
    assert cat_rows[6][0]["callback_data"] == "cat:back"
    assert cat_rows[6][0]["text"] == "Back"


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
