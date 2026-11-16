from __future__ import annotations

import logging
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.categories import CATEGORIES, category_names
from app.core.config import get_settings
from app.models import Zone
from app.services import (
    assignment_service,
    bot_messages,
    citizen_service,
    classification_service,
    complaint_service,
    geocode_service,
    image_service,
    nsfw_check_service,
    session_service,
    storage_service,
    triage_service,
)
from app.services.telegram_api import (
    Incoming,
    TelegramClient,
    TelegramError,
    location_keyboard,
    main_menu_keyboard,
)

logger = logging.getLogger(__name__)

TRACKING_CODE = re.compile(r"^GRV-\d{4}-[A-Za-z0-9]{4}$", re.I)


def _best_effort(fn: Any, *args: Any) -> None:
    try:
        fn(*args)
    except TelegramError as exc:
        logger.warning("Telegram request failed (%s)", type(exc).__name__)


def _typing(client: TelegramClient, chat_id: int) -> None:
    _best_effort(client.send_chat_action, chat_id, "typing")


def _strip_buttons(client: TelegramClient, inc: Incoming) -> None:
    if inc.message_id is not None:
        _best_effort(
            client.edit_message_reply_markup,
            inc.chat_id,
            inc.message_id,
            None,
        )


def _say(
    client: TelegramClient,
    chat_id: int,
    text: str,
    markup: dict | None = None,
) -> bool:
    try:
        client.send_message(chat_id, text, reply_markup=markup)
        return True
    except TelegramError as exc:
        logger.warning("Failed to send message (%s)", type(exc).__name__)
        return False


def _discard(chat_id: int, session: dict | None) -> None:
    if session and session.get("image_key"):
        try:
            storage_service.get_storage().delete_object(session["image_key"])
        except Exception:
            pass
    session_service.delete_session(chat_id)


def _intent(inc: Incoming) -> str | None:
    if inc.text is None:
        return None

    raw = inc.text.strip()
    if not raw:
        return None

    if raw.startswith("/"):
        first_word = raw.split()[0]
        cmd = first_word.split("@")[0].lower()
        if cmd == "/start":
            return "start"
        if cmd in ("/new", "/report"):
            return "new"
        if cmd == "/help":
            return "help"
        if cmd == "/cancel":
            return "cancel"
        if cmd == "/status":
            return "status"
        if cmd == "/mycomplaints":
            return "mine"
        return "help"

    cf = raw.casefold()
    if cf == "lodge complaint":
        return "new"
    if cf == "track complaint":
        return "track"
    if cf == "my complaints":
        return "mine"

    return None


def _reply_status(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    raw_code: str,
    now: datetime,
) -> None:
    citizen = citizen_service.get_or_create_citizen(
        db, inc.chat_id, inc.username, inc.first_name
    )
    norm_code = citizen_service.normalize_tracking_code(raw_code)
    complaint = citizen_service.find_citizen_complaint(
        db, citizen.id, norm_code
    )
    if complaint is None:
        _say(client, inc.chat_id, bot_messages.MSG_STATUS_NOT_FOUND)
    else:
        _say(client, inc.chat_id, bot_messages.format_status(complaint, now))


def _describe_location(db: Session, latitude: float, longitude: float) -> str:
    try:
        name = geocode_service.reverse_geocode(latitude, longitude)
        if name:
            return name

        zone_id = complaint_service.find_zone_id(db, latitude, longitude)
        if zone_id is not None:
            zone = db.get(Zone, zone_id)
            if zone is not None and zone.name:
                return zone.name

        return "Pinned location"
    except Exception as exc:
        logger.warning("Failed to describe location (%s)", type(exc).__name__)
        return "Pinned location"


def _show_summary(
    client: TelegramClient,
    chat_id: int,
    session: dict[str, Any],
    now: datetime,
) -> None:
    category = session.get("category", "")
    address = session.get("address") or "Pinned location"
    description = session.get("description")
    has_photo = bool(session.get("image_key"))
    sla_hours = CATEGORIES[category].sla_hours if category in CATEGORIES else 48

    text = bot_messages.format_summary(
        category=category,
        location_text=address,
        when=now,
        description=description,
        has_photo=has_photo,
        sla_hours=sla_hours,
    )
    _say(client, chat_id, text, markup=bot_messages.summary_keyboard())


def _apply_location(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict[str, Any],
    now: datetime,
) -> None:
    lat = inc.latitude
    lng = inc.longitude
    if lat is None or lng is None or not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        _say(client, inc.chat_id, bot_messages.MSG_LOCATION_NOT_EXPECTED)
        return

    session["latitude"] = lat
    session["longitude"] = lng
    session["address"] = _describe_location(db, lat, lng)
    session["state"] = session_service.State.SUMMARY.value
    session_service.save_session(inc.chat_id, session)

    _say(
        client,
        inc.chat_id,
        bot_messages.MSG_LOCATION_RECEIVED,
        markup=main_menu_keyboard(),
    )
    _show_summary(client, inc.chat_id, session, now)


def _submit(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict[str, Any],
    now: datetime,
    commit: Any,
) -> None:
    category = session.get("category")
    latitude = session.get("latitude")
    longitude = session.get("longitude")
    if category is None or latitude is None or longitude is None:
        session_service.delete_session(inc.chat_id)
        _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
        return

    settings = get_settings()

    try:
        citizen = citizen_service.get_or_create_citizen(
            db, inc.chat_id, inc.username, inc.first_name
        )
        complaint = complaint_service.create_complaint(
            db,
            citizen_id=citizen.id,
            category=category,
            description=session.get("description"),
            image_object_key=session.get("image_key"),
            latitude=latitude,
            longitude=longitude,
            ai_confidence=session.get("confidence"),
            ai_classification_source=session.get("source"),
            now=now,
        )

        source = session.get("source")
        confidence = session.get("confidence")
        needs_review = session.get("needs_review", False)
        if source in ("image", "text") and (
            (confidence is not None and confidence < settings.ai_confidence_threshold)
            or needs_review
        ):
            triage_service.create_triage_entry(
                db,
                complaint,
                session["category"],
                session["confidence"],
            )

        assignment_service.assign_complaint(db, complaint.id, now=now)
        commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Failed to submit complaint (%s)", type(exc).__name__)
        _say(client, inc.chat_id, bot_messages.MSG_SAVE_FAILED)
        return

    session_service.delete_session(inc.chat_id)
    _strip_buttons(client, inc)
    _say(
        client,
        inc.chat_id,
        bot_messages.format_submitted(complaint.tracking_code),
        markup=main_menu_keyboard(),
    )


def _handle_callback(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    now: datetime,
    commit: Any,
) -> None:
    session = session_service.load_session(inc.chat_id)
    if session is None:
        _strip_buttons(client, inc)
        _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
        return

    state = session.get("state")
    data = inc.callback_data or ""

    if data == "sub:yes":
        if state != session_service.State.SUMMARY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        _submit(db, client, inc, session, now, commit)
        return

    if data == "sub:cat":
        if state != session_service.State.SUMMARY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        session["state"] = session_service.State.AWAITING_CATEGORY.value
        session_service.save_session(inc.chat_id, session)
        _strip_buttons(client, inc)
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_CHOOSE_CATEGORY,
            markup=bot_messages.category_keyboard(category_names()),
        )
        return

    if data == "sub:no":
        if state != session_service.State.SUMMARY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        _strip_buttons(client, inc)
        _discard(inc.chat_id, session)
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_CANCELLED,
            markup=main_menu_keyboard(),
        )
        return

    if data == "cat:back":
        if state != session_service.State.AWAITING_CATEGORY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        session["state"] = session_service.State.SUMMARY.value
        session_service.save_session(inc.chat_id, session)
        _strip_buttons(client, inc)
        _show_summary(client, inc.chat_id, session, now)
        return

    if data.startswith("cat:"):
        if state != session_service.State.AWAITING_CATEGORY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        idx_str = data[4:]
        names = category_names()
        try:
            idx = int(idx_str)
            if not (0 <= idx < 6 and idx < len(names)):
                raise ValueError
        except ValueError:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return

        session["category"] = names[idx]
        session["source"] = "manual"
        session["state"] = session_service.State.SUMMARY.value
        session_service.save_session(inc.chat_id, session)
        _strip_buttons(client, inc)
        _show_summary(client, inc.chat_id, session, now)
        return

    _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)


def _handle_message_in_state(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict[str, Any],
    now: datetime,
    commit: Any,
) -> None:
    state = session.get("state")

    if state == session_service.State.AWAITING_LOCATION:
        if inc.latitude is not None and inc.longitude is not None:
            _apply_location(db, client, inc, session, now)
            return
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_LOCATION_NOT_EXPECTED,
            markup=location_keyboard("Share my location"),
        )
        return

    if state == session_service.State.SUMMARY:
        if inc.latitude is not None and inc.longitude is not None:
            _apply_location(db, client, inc, session, now)
            return

        if inc.text is not None:
            trimmed = inc.text.strip()
            if len(trimmed) >= 5:
                session["description"] = trimmed[:1000]
                session_service.save_session(inc.chat_id, session)
                _show_summary(client, inc.chat_id, session, now)
                return
            _say(client, inc.chat_id, bot_messages.MSG_TEXT_TOO_SHORT)
            return

        if inc.photo_file_id is not None:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return

        _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
        return

    if state == session_service.State.AWAITING_CATEGORY:
        _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
        return

    _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)


def _handle_new_input(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict | None,
) -> None:
    settings = get_settings()

    if inc.photo_file_id is not None:
        _typing(client, inc.chat_id)
        if (
            inc.photo_file_size is not None
            and inc.photo_file_size > settings.max_upload_bytes
        ):
            _say(client, inc.chat_id, bot_messages.MSG_PHOTO_TOO_LARGE)
            return

        try:
            data = client.get_file_bytes(
                inc.photo_file_id, settings.max_upload_bytes
            )
        except TelegramError as exc:
            if "too large" in str(exc).lower():
                _say(client, inc.chat_id, bot_messages.MSG_PHOTO_TOO_LARGE)
            else:
                _say(client, inc.chat_id, bot_messages.MSG_PHOTO_DOWNLOAD_FAILED)
            return

        try:
            image = image_service.validate_image(
                data, max_bytes=settings.max_upload_bytes
            )
        except image_service.ImageRejected as exc:
            _say(client, inc.chat_id, str(exc))
            return

        verdict = nsfw_check_service.check_image(data)
        if not verdict.allowed:
            _say(client, inc.chat_id, bot_messages.MSG_IMAGE_REJECTED)
            return

        try:
            prediction = classification_service.classify_image(data, hint=inc.caption)
        except classification_service.ImageNotAccepted:
            _say(client, inc.chat_id, bot_messages.MSG_IMAGE_UNCLEAR)
            return

        if session is None:
            session = session_service.new_session()

        if session.get("image_key"):
            try:
                storage_service.get_storage().delete_object(session["image_key"])
            except Exception:
                pass
            session["image_key"] = None

        key = f"complaints/{uuid.uuid4()}/photo.{image.extension}"
        try:
            storage_service.get_storage().put_object(
                key, data, image.content_type
            )
        except storage_service.StorageError:
            _say(client, inc.chat_id, bot_messages.MSG_STORAGE_DOWN)
            return

        caption = (
            inc.caption.strip()[:1000]
            if inc.caption and inc.caption.strip()
            else None
        )
        session["description"] = caption
        session["input_type"] = "image"
        session["source"] = "image"
        session["image_key"] = key
        session["needs_review"] = prediction.needs_review
    elif inc.text is not None:
        _typing(client, inc.chat_id)
        text = inc.text.strip()
        if len(text) < 5:
            _say(client, inc.chat_id, bot_messages.MSG_TEXT_TOO_SHORT)
            return

        if session is None:
            session = session_service.new_session()

        if session.get("image_key"):
            try:
                storage_service.get_storage().delete_object(session["image_key"])
            except Exception:
                pass
            session["image_key"] = None

        prediction = classification_service.classify_text(text)
        session["description"] = text[:1000]
        session["input_type"] = "text"
        session["source"] = "text"
        session["image_key"] = None
        session["needs_review"] = prediction.needs_review
    else:
        return

    session["category"] = prediction.category
    session["confidence"] = prediction.confidence
    session["state"] = session_service.State.AWAITING_LOCATION.value
    session_service.save_session(inc.chat_id, session)

    msg = bot_messages.format_detected(
        prediction.category,
        classification_service.is_confident(prediction),
    )
    _say(
        client,
        inc.chat_id,
        msg,
        markup=location_keyboard("Share my location"),
    )


def handle_update(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    now: datetime | None = None,
    commit: Any = None,
) -> None:
    logger.info("Handling update %s (kind=%s)", inc.update_id, inc.kind)

    if now is None:
        now = datetime.now(UTC)
    if commit is None:
        commit = db.commit

    # (1) Callback updates
    if inc.kind == "callback":
        if inc.callback_id:
            _best_effort(client.answer_callback, inc.callback_id)
        _handle_callback(db, client, inc, now, commit)
        return

    # (2) A message whose _intent is not None
    intent = _intent(inc)
    if intent is not None:
        session = session_service.load_session(inc.chat_id)

        if intent == "start":
            _discard(inc.chat_id, session)
            _say(
                client,
                inc.chat_id,
                bot_messages.WELCOME_TEXT,
                markup=main_menu_keyboard(),
            )
            return

        if intent == "new":
            _discard(inc.chat_id, session)
            fresh = session_service.new_session()
            session_service.save_session(inc.chat_id, fresh)
            _say(client, inc.chat_id, bot_messages.MSG_NEW_REPORT)
            return

        if intent == "help":
            _say(client, inc.chat_id, bot_messages.HELP_TEXT)
            return

        if intent == "cancel":
            _discard(inc.chat_id, session)
            _say(
                client,
                inc.chat_id,
                bot_messages.MSG_CANCELLED,
                markup=main_menu_keyboard(),
            )
            return

        if intent == "track":
            _say(client, inc.chat_id, bot_messages.MSG_TRACK_PROMPT)
            return

        if intent == "status":
            tokens = inc.text.split() if inc.text else []
            if len(tokens) < 2 or not tokens[1].strip():
                _say(client, inc.chat_id, bot_messages.MSG_STATUS_USAGE)
                return
            _reply_status(db, client, inc, tokens[1].strip(), now)
            return

        if intent == "mine":
            citizen = citizen_service.get_or_create_citizen(
                db, inc.chat_id, inc.username, inc.first_name
            )
            recent = citizen_service.list_recent_complaints(
                db, citizen.id, limit=5
            )
            _say(
                client,
                inc.chat_id,
                bot_messages.format_my_complaints(recent),
            )
            return

    # (3) Other messages
    has_photo = inc.photo_file_id is not None
    has_text = bool(inc.text and inc.text.strip())
    has_location = inc.latitude is not None and inc.longitude is not None

    if not (has_photo or has_text or has_location):
        return

    session = session_service.load_session(inc.chat_id)

    # Legacy/expired states
    if session is not None and session.get("state") in (
        session_service.State.AWAITING_CONFIRMATION,
        session_service.State.AWAITING_DESCRIPTION,
    ):
        _discard(inc.chat_id, session)
        _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
        return

    # Direct tracking code lookup when no session or in AWAITING_INPUT
    if has_text and (
        session is None
        or session.get("state") == session_service.State.AWAITING_INPUT
    ):
        trimmed = inc.text.strip()
        if TRACKING_CODE.match(trimmed):
            _reply_status(db, client, inc, trimmed, now)
            return

    if session is None:
        if has_photo or has_text:
            _handle_new_input(db, client, inc, session)
            return
        if has_location:
            _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
            return
        return

    state = session.get("state")
    if state == session_service.State.AWAITING_INPUT:
        if has_photo or has_text:
            _handle_new_input(db, client, inc, session)
            return
        return

    if state in (
        session_service.State.AWAITING_LOCATION,
        session_service.State.SUMMARY,
        session_service.State.AWAITING_CATEGORY,
    ):
        _handle_message_in_state(db, client, inc, session, now, commit)
        return
