from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.categories import CATEGORIES, category_names
from app.core.config import get_settings
from app.services import (
    assignment_service,
    bot_messages,
    citizen_service,
    classification_service,
    complaint_service,
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
    remove_keyboard,
)

logger = logging.getLogger(__name__)


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


def _command(inc: Incoming) -> str | None:
    if not inc.text or not inc.text.startswith("/"):
        return None
    first_word = inc.text.split()[0]
    return first_word.split("@")[0].lower()


def _discard(chat_id: int, session: dict | None) -> None:
    if session and session.get("image_key"):
        try:
            storage_service.get_storage().delete_object(session["image_key"])
        except Exception:
            pass
    session_service.delete_session(chat_id)


def _show_summary(client: TelegramClient, chat_id: int, session: dict) -> None:
    session["state"] = session_service.State.SUMMARY
    session_service.save_session(chat_id, session)

    category = session["category"]
    cat_info = CATEGORIES[category]
    department = cat_info.department_name
    sla_hours = cat_info.sla_hours
    latitude = session["latitude"]
    longitude = session["longitude"]
    description = session.get("description")
    has_photo = bool(session.get("image_key"))

    text = bot_messages.format_summary(
        category=category,
        department=department,
        latitude=latitude,
        longitude=longitude,
        description=description,
        has_photo=has_photo,
        sla_hours=sla_hours,
    )
    _say(client, chat_id, text, markup=bot_messages.submit_keyboard())


def _submit(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict,
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
    citizen = citizen_service.get_or_create_citizen(
        db, inc.chat_id, inc.username, inc.first_name
    )

    try:
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
        if (
            source in ("image", "text")
            and confidence is not None
            and confidence < settings.ai_confidence_threshold
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
    _say(
        client,
        inc.chat_id,
        bot_messages.format_submitted(complaint.tracking_code),
        markup=remove_keyboard(),
    )


def _handle_new_input(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict | None,
) -> None:
    if session is None:
        session = session_service.new_session()

    if session.get("image_key"):
        try:
            storage_service.get_storage().delete_object(session["image_key"])
        except Exception:
            pass
        session["image_key"] = None

    settings = get_settings()

    if inc.photo_file_id is not None:
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

        prediction = classification_service.classify_image(data, hint=inc.caption)
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
    elif inc.text is not None:
        text = inc.text.strip()
        if len(text) < 5:
            _say(client, inc.chat_id, bot_messages.MSG_TEXT_TOO_SHORT)
            return

        prediction = classification_service.classify_text(text)
        session["description"] = text[:1000]
        session["input_type"] = "text"
        session["source"] = "text"
        session["image_key"] = None
    else:
        return

    session["category"] = prediction.category
    session["confidence"] = prediction.confidence
    session["state"] = session_service.State.AWAITING_CONFIRMATION
    session_service.save_session(inc.chat_id, session)

    msg = bot_messages.format_confirmation(
        prediction.category,
        prediction.confidence,
        classification_service.is_confident(prediction),
    )
    _say(client, inc.chat_id, msg, markup=bot_messages.confirm_keyboard())


def _handle_callback(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    now: datetime,
    commit: Any,
) -> None:
    data = inc.callback_data or ""
    session = session_service.load_session(inc.chat_id)
    if session is None:
        _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
        return

    state = session.get("state")

    if data == "cat:ok":
        if state != session_service.State.AWAITING_CONFIRMATION:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        session["state"] = session_service.State.AWAITING_LOCATION
        session_service.save_session(inc.chat_id, session)
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_SHARE_LOCATION,
            markup=location_keyboard("Share my location"),
        )
        return

    if data == "cat:no":
        if state != session_service.State.AWAITING_CONFIRMATION:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        session["state"] = session_service.State.AWAITING_CATEGORY
        session_service.save_session(inc.chat_id, session)
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_CHOOSE_CATEGORY,
            markup=bot_messages.category_keyboard(category_names()),
        )
        return

    if data.startswith("cat:"):
        if state != session_service.State.AWAITING_CATEGORY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        idx_str = data[4:]
        names = category_names()
        try:
            idx = int(idx_str)
            if idx < 0 or idx >= len(names):
                raise ValueError
        except ValueError:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return

        session["category"] = names[idx]
        session["source"] = "manual"
        session["state"] = session_service.State.AWAITING_LOCATION
        session_service.save_session(inc.chat_id, session)
        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_SHARE_LOCATION,
            markup=location_keyboard("Share my location"),
        )
        return

    if data == "desc:skip":
        if state != session_service.State.AWAITING_DESCRIPTION:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        _show_summary(client, inc.chat_id, session)
        return

    if data == "sub:no":
        if state != session_service.State.SUMMARY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        _discard(inc.chat_id, session)
        _say(client, inc.chat_id, bot_messages.MSG_CANCELLED)
        return

    if data == "sub:yes":
        if state != session_service.State.SUMMARY:
            _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
            return
        _submit(db, client, inc, session, now, commit)
        return

    _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)


def _handle_message_in_state(
    db: Session,
    client: TelegramClient,
    inc: Incoming,
    session: dict,
    now: datetime,
    commit: Any,
) -> None:
    state = session.get("state")

    if state == session_service.State.AWAITING_LOCATION:
        if inc.latitude is not None and inc.longitude is not None:
            lat = inc.latitude
            lng = inc.longitude
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                _say(client, inc.chat_id, bot_messages.MSG_LOCATION_NOT_EXPECTED)
                return
            session["latitude"] = lat
            session["longitude"] = lng
            _say(
                client,
                inc.chat_id,
                "Location received.",
                markup=remove_keyboard(),
            )
            if session.get("description") is None:
                session["state"] = session_service.State.AWAITING_DESCRIPTION
                session_service.save_session(inc.chat_id, session)
                _say(
                    client,
                    inc.chat_id,
                    bot_messages.MSG_ASK_DESCRIPTION,
                    markup=bot_messages.skip_keyboard(),
                )
            else:
                _show_summary(client, inc.chat_id, session)
            return

        _say(
            client,
            inc.chat_id,
            bot_messages.MSG_LOCATION_NOT_EXPECTED,
            markup=location_keyboard("Share my location"),
        )
        return

    if state == session_service.State.AWAITING_DESCRIPTION:
        if inc.photo_file_id is not None or (
            inc.latitude is not None and inc.longitude is not None
        ):
            _say(client, inc.chat_id, bot_messages.MSG_PHOTO_NOT_EXPECTED)
            return

        if inc.text is not None:
            text = inc.text.strip()
            if text:
                session["description"] = text[:1000]
                _show_summary(client, inc.chat_id, session)
                return
            return

        return

    if state in (
        session_service.State.AWAITING_CONFIRMATION,
        session_service.State.AWAITING_CATEGORY,
        session_service.State.SUMMARY,
    ):
        _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)
        return

    _say(client, inc.chat_id, bot_messages.MSG_USE_BUTTONS)


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

    # (1) Callback update
    if inc.kind == "callback":
        if inc.callback_id:
            try:
                client.answer_callback(inc.callback_id)
            except TelegramError:
                pass
        _handle_callback(db, client, inc, now, commit)
        return

    # (2) Message with a command
    cmd = _command(inc)
    if cmd is not None:
        session = session_service.load_session(inc.chat_id)
        if cmd == "/start":
            _say(client, inc.chat_id, bot_messages.WELCOME_TEXT)
            _discard(inc.chat_id, session)
            fresh = session_service.new_session()
            session_service.save_session(inc.chat_id, fresh)
            _say(client, inc.chat_id, bot_messages.MSG_NEW_REPORT)
            return

        if cmd in ("/new", "/report"):
            _discard(inc.chat_id, session)
            fresh = session_service.new_session()
            session_service.save_session(inc.chat_id, fresh)
            _say(client, inc.chat_id, bot_messages.MSG_NEW_REPORT)
            return

        if cmd == "/help":
            _say(client, inc.chat_id, bot_messages.HELP_TEXT)
            return

        if cmd == "/cancel":
            _discard(inc.chat_id, session)
            _say(client, inc.chat_id, bot_messages.MSG_CANCELLED)
            return

        if cmd == "/status":
            tokens = inc.text.split() if inc.text else []
            if len(tokens) < 2 or not tokens[1].strip():
                _say(client, inc.chat_id, bot_messages.MSG_STATUS_USAGE)
                return
            citizen = citizen_service.get_or_create_citizen(
                db, inc.chat_id, inc.username, inc.first_name
            )
            raw_code = tokens[1].strip()
            norm_code = citizen_service.normalize_tracking_code(raw_code)
            complaint = citizen_service.find_citizen_complaint(
                db, citizen.id, norm_code
            )
            if complaint is None:
                _say(client, inc.chat_id, bot_messages.MSG_STATUS_NOT_FOUND)
            else:
                _say(
                    client,
                    inc.chat_id,
                    bot_messages.format_status(complaint, now),
                )
            return

        if cmd == "/mycomplaints":
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

        _say(client, inc.chat_id, bot_messages.HELP_TEXT)
        return

    # (3) Non-command message
    has_photo = inc.photo_file_id is not None
    has_text = bool(inc.text and inc.text.strip())
    has_location = inc.latitude is not None and inc.longitude is not None

    if not (has_photo or has_text or has_location):
        return

    session = session_service.load_session(inc.chat_id)

    if session is None:
        if has_photo or has_text:
            _handle_new_input(db, client, inc, session)
            return
        if has_location:
            _say(client, inc.chat_id, bot_messages.MSG_EXPIRED)
            return
        return

    if session.get("state") == session_service.State.AWAITING_INPUT:
        if has_photo or has_text:
            _handle_new_input(db, client, inc, session)
            return
        return

    _handle_message_in_state(db, client, inc, session, now, commit)
