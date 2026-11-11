from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

from app.services.telegram_api import inline_keyboard

IST = timezone(timedelta(hours=5, minutes=30))

WELCOME_TEXT = (
    "Welcome to NagarSetu, the civic complaint assistant. Send a photo of the "
    "problem (you can add a caption) or describe it in a few words, and I will "
    "register your complaint. Type /help to see all commands."
)

HELP_TEXT = (
    "/new - Report a new problem\n"
    "/status CODE - Check the status of a complaint\n"
    "/mycomplaints - List your recent complaints\n"
    "/cancel - Cancel the current report\n"
    "/help - Show this help message"
)

MSG_NEW_REPORT = (
    "Send a photo of the problem (a caption helps), or describe it in a few words."
)
MSG_EXPIRED = "This request has expired. Send /new to start again."
MSG_USE_BUTTONS = "Please use the buttons above to continue, or send /cancel to stop."
MSG_SHARE_LOCATION = (
    "Now share the exact location of the problem. Tap the button below, or use the "
    "paperclip menu, choose Location and pick the spot on the map."
)
MSG_ASK_DESCRIPTION = (
    "You can add a short description (optional). Type it now, or press Skip."
)
MSG_CHOOSE_CATEGORY = "Please choose the correct category:"
MSG_CANCELLED = "Cancelled. Send /new whenever you want to report a problem."
MSG_PHOTO_DOWNLOAD_FAILED = "I could not download your photo. Please try again."
MSG_PHOTO_TOO_LARGE = "That photo is too large. Please send a smaller one."
MSG_IMAGE_REJECTED = "This image cannot be accepted. Please send a different photo."
MSG_STORAGE_DOWN = (
    "Photo storage is temporarily unavailable. Please try again in a few minutes."
)
MSG_TEXT_TOO_SHORT = (
    "Please describe the problem in a few words (at least 5 characters)."
)
MSG_SAVE_FAILED = (
    "Sorry, I could not save your complaint. Please press Submit again in a moment."
)
MSG_STATUS_USAGE = (
    "Send /status followed by your tracking code, for example /status GRV-2026-AB12."
)
MSG_STATUS_NOT_FOUND = "I could not find a complaint with that code on your account."
MSG_GENERIC_ERROR = "Something went wrong. Please try again."
MSG_PHOTO_NOT_EXPECTED = "Please type your description as text, or press Skip."
MSG_LOCATION_NOT_EXPECTED = (
    "Please share the location using the button below or the paperclip menu."
)


def format_ist(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    dt_ist = dt.astimezone(IST)
    return dt_ist.strftime("%d %b %Y, %I:%M %p") + " IST"


def format_confirmation(category: str, confidence: float, confident: bool) -> str:
    pct = round(confidence * 100)
    msg = f"I think this is: {category}\nConfidence: {pct}%"
    if not confident:
        msg += "\nI am not fully sure, so an official may double check it."
    msg += "\nIs this correct?"
    return msg


def format_summary(
    category: str,
    department: str,
    latitude: float,
    longitude: float,
    description: str | None,
    has_photo: bool,
    sla_hours: int,
) -> str:
    desc_str = description if description else "none"
    photo_str = "attached" if has_photo else "none"
    return (
        "Please check your complaint:\n"
        f"Category: {category}\n"
        f"Department: {department}\n"
        f"Location: {latitude:.6f}, {longitude:.6f}\n"
        f"Description: {desc_str}\n"
        f"Photo: {photo_str}\n"
        f"Expected resolution: within {sla_hours} hours"
    )


def format_submitted(code: str) -> str:
    return (
        "Your complaint has been submitted.\n"
        f"Tracking code: {code}\n"
        "Status: Submitted\n"
        f"Send /status {code} any time to check progress."
    )


def format_status(complaint: SimpleNamespace | Any, now: Any = None) -> str:
    status_val = getattr(complaint.status, "value", complaint.status)
    lines = [
        f"Complaint {complaint.tracking_code}",
        f"Category: {complaint.category}",
        f"Status: {status_val}",
        f"Submitted: {format_ist(complaint.created_at)}",
        f"Target date: {format_ist(complaint.sla_deadline)}",
    ]
    if status_val == "Completed" and getattr(complaint, "resolved_at", None):
        lines.append(f"Resolved: {format_ist(complaint.resolved_at)}")
    return "\n".join(lines)


def format_my_complaints(complaints: list[SimpleNamespace | Any]) -> str:
    if not complaints:
        return "You have not submitted any complaints yet. Send /new to report a problem."
    lines = ["Your recent complaints:"]
    for i, c in enumerate(complaints, start=1):
        status_val = getattr(c.status, "value", c.status)
        lines.append(f"{i}. {c.tracking_code} - {c.category} - {status_val}")
    return "\n".join(lines)


def format_completion(code: str, category: str, note: str) -> str:
    return (
        f"Your complaint {code} ({category}) has been resolved.\n"
        f"Resolution note: {note}"
    )


def confirm_keyboard() -> dict:
    return inline_keyboard(
        [
            [("Yes, that is correct", "cat:ok")],
            [("No, choose another", "cat:no")],
        ]
    )


def category_keyboard(names: list[str]) -> dict:
    rows = [[(name, f"cat:{i}")] for i, name in enumerate(names)]
    return inline_keyboard(rows)


def skip_keyboard() -> dict:
    return inline_keyboard([[("Skip", "desc:skip")]])


def submit_keyboard() -> dict:
    return inline_keyboard([[("Submit", "sub:yes"), ("Cancel", "sub:no")]])
