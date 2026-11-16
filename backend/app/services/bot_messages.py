from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any

from app.services.telegram_api import inline_keyboard, main_menu_keyboard

__all__ = [
    "IST",
    "HELP_TEXT",
    "MSG_CANCELLED",
    "MSG_CHOOSE_CATEGORY",
    "MSG_EXPIRED",
    "MSG_GENERIC_ERROR",
    "MSG_IMAGE_REJECTED",
    "MSG_IMAGE_UNCLEAR",
    "MSG_LOCATION_NOT_EXPECTED",
    "MSG_LOCATION_RECEIVED",
    "MSG_NEW_REPORT",
    "MSG_PHOTO_DOWNLOAD_FAILED",
    "MSG_PHOTO_TOO_LARGE",
    "MSG_SAVE_FAILED",
    "MSG_STATUS_NOT_FOUND",
    "MSG_STATUS_USAGE",
    "MSG_STORAGE_DOWN",
    "MSG_TEXT_TOO_SHORT",
    "MSG_TRACK_PROMPT",
    "MSG_USE_BUTTONS",
    "WELCOME_TEXT",
    "category_keyboard",
    "format_completion",
    "format_detected",
    "format_eta",
    "format_ist",
    "format_my_complaints",
    "format_status",
    "format_submitted",
    "format_summary",
    "main_menu_keyboard",
    "summary_keyboard",
]

IST = timezone(timedelta(hours=5, minutes=30))

WELCOME_TEXT = (
    "👋 Namaste! Welcome to the Solapur Municipal Corporation Grievance Bot.\n\n"
    "Spotted a garbage pile, a broken streetlight or a pothole? "
    "Tell me, and I will send it straight to the right department.\n\n"
    "Choose an option below to get started."
)

HELP_TEXT = (
    "ℹ️ How I can help\n\n"
    "📝 Lodge Complaint - report a civic problem\n"
    "🔎 Track Complaint - check progress with your grievance code\n"
    "📋 My Complaints - see your recent complaints\n\n"
    "Shortcuts: /new, /status CODE, /mycomplaints, /cancel"
)

MSG_NEW_REPORT = (
    "📸 Send me a photo of the problem, or describe it in a few words.\n\n"
    "Tip: a short caption on your photo helps me choose the right category."
)

MSG_TRACK_PROMPT = "🔎 Send me your grievance code, for example GRV-2026-AB12."

MSG_LOCATION_RECEIVED = "📍 Got it! Location saved."

MSG_CHOOSE_CATEGORY = "🗂 No problem. Which category fits best?"

MSG_EXPIRED = (
    "⌛ This request timed out after 20 minutes of inactivity. "
    "Tap Lodge Complaint to start again."
)

MSG_USE_BUTTONS = "👆 Please use the buttons above, or send /cancel to stop."

MSG_CANCELLED = (
    "🛑 Cancelled. Tap Lodge Complaint whenever you want to report a problem."
)

MSG_PHOTO_DOWNLOAD_FAILED = (
    "⚠️ I could not download your photo. Please try sending it again."
)

MSG_PHOTO_TOO_LARGE = "⚠️ That photo is too large. Please send a smaller one."

MSG_IMAGE_REJECTED = (
    "🚫 I cannot accept this image. Please send a different photo of the problem."
)

MSG_IMAGE_UNCLEAR = (
    "Unable to process this image. Please retake the photo or re-upload a clear image."
)

MSG_STORAGE_DOWN = (
    "⚠️ Photo storage is busy right now. Please try again in a few minutes."
)

MSG_TEXT_TOO_SHORT = (
    "✏️ Please describe the problem in a few words (at least 5 characters)."
)

MSG_SAVE_FAILED = (
    "⚠️ Sorry, I could not save your complaint just now. "
    "Please tap Confirm & Submit again in a moment."
)

MSG_STATUS_USAGE = (
    "🔎 Send /status followed by your grievance code, "
    "for example /status GRV-2026-AB12."
)

MSG_STATUS_NOT_FOUND = (
    "I could not find a complaint with that code on your account. "
    "Please check the code and try again."
)

MSG_GENERIC_ERROR = "⚠️ Something went wrong on my side. Please try again."

MSG_LOCATION_NOT_EXPECTED = (
    "📍 Please share the location using the button below, or the paperclip menu."
)


def format_eta(hours: int) -> str:
    if hours < 24:
        if hours == 1:
            return "about 1 hour"
        return f"about {hours} hours"
    if hours % 24 == 0:
        days = hours // 24
        if days == 1:
            return "1 day"
        return f"{days} days"
    return f"{hours} hours"


def format_ist(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    dt_ist = dt.astimezone(IST)
    return dt_ist.strftime("%d %b %Y, %I:%M %p") + " IST"


def format_detected(category: str, confident: bool) -> str:
    msg = f"🔎 Detected: {category}"
    if not confident:
        msg += "\n\nI am not fully sure, so an official will double-check it for you."
    msg += "\n\n📍 Now share the exact location of the problem using the button below."
    return msg


def format_summary(
    category: str,
    location_text: str,
    when: datetime,
    description: str | None,
    has_photo: bool,
    sla_hours: int,
) -> str:
    msg = (
        "📝 Please review your complaint\n\n"
        f"🗂 Category: {category}\n"
        f"📍 Location: {location_text}\n"
        f"🕒 Date: {format_ist(when)}"
    )
    if description and description.strip():
        msg += f"\n💬 Details: {description.strip()[:200]}"
    if has_photo:
        msg += "\n📷 Photo: attached"
    msg += f"\n⏳ Estimated time: {format_eta(sla_hours)}"
    msg += (
        "\n\nAll correct? Tap Confirm & Submit.\n"
        "Wrong category? Tap Change category.\n"
        "Want to add details? Just type a short note."
    )
    return msg


def format_submitted(code: str) -> str:
    return (
        "✅ Complaint registered!\n\n"
        "🎫 Your grievance code:\n"
        f"{code}\n\n"
        "Save this code to track your complaint. "
        "You can send it to me any time, or tap Track Complaint.\n\n"
        "Thank you for helping keep Solapur clean and safe. 🙏"
    )


def format_completion(code: str, category: str, note: str) -> str:
    return (
        "✅ Good news! Your complaint has been resolved.\n\n"
        f"🎫 Code: {code}\n"
        f"🗂 Category: {category}\n"
        f"📝 Note from the field team: {note}\n\n"
        "Thank you for helping make Solapur better. 🙏"
    )


def format_status(complaint: SimpleNamespace | Any, now: Any = None) -> str:
    status_val = getattr(complaint.status, "value", complaint.status)
    if status_val == "In-Progress":
        progress = "✅ Submitted → 🟡 In-Progress → ⚪ Completed"
    elif status_val == "Completed":
        progress = "✅ Submitted → ✅ In-Progress → ✅ Completed"
    else:
        progress = "🟢 Submitted → ⚪ In-Progress → ⚪ Completed"

    lines = [
        f"🎫 Complaint {complaint.tracking_code}",
        f"🗂 Category: {complaint.category}",
        f"📌 Status: {status_val}",
        progress,
        "",
        f"🕒 Submitted: {format_ist(complaint.created_at)}",
        f"⏳ Expected by: {format_ist(complaint.sla_deadline)}",
    ]
    if status_val == "Completed" and getattr(complaint, "resolved_at", None):
        lines.append(f"✅ Resolved: {format_ist(complaint.resolved_at)}")
    return "\n".join(lines)


def format_my_complaints(complaints: list[SimpleNamespace | Any]) -> str:
    if not complaints:
        return (
            "📭 You have not submitted any complaints yet. "
            "Tap Lodge Complaint to report a problem."
        )
    items = []
    for i, c in enumerate(complaints, start=1):
        status_val = getattr(c.status, "value", c.status)
        items.append(f"{i}. {c.tracking_code}\n   {c.category} - {status_val}")
    return "📋 Your recent complaints\n\n" + "\n\n".join(items)


def summary_keyboard() -> dict:
    return inline_keyboard(
        [
            [("Confirm & Submit", "sub:yes")],
            [("Change category", "sub:cat"), ("Cancel", "sub:no")],
        ]
    )


def category_keyboard(names: list[str]) -> dict:
    rows = [[(name, f"cat:{i}")] for i, name in enumerate(names)]
    rows.append([("Back", "cat:back")])
    return inline_keyboard(rows)
