from __future__ import annotations

import logging
import sys
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Complaint
from app.services import bot_messages
from app.services.telegram_api import TelegramClient, TelegramError

logger = logging.getLogger(__name__)


def _make_client() -> TelegramClient | None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return None
    return TelegramClient(
        token=settings.telegram_bot_token,
        base_url=settings.telegram_api_base,
    )


def prepare_completion_notice(
    db: Session,
    complaint_id: UUID | str,
) -> dict[str, int | str] | None:
    stmt = (
        select(Complaint)
        .join(Complaint.citizen)
        .where(Complaint.id == complaint_id)
    )
    complaint = db.execute(stmt).scalar_one_or_none()
    if complaint is None or complaint.citizen is None:
        return None
    chat_id = complaint.citizen.telegram_chat_id
    if chat_id is None:
        return None
    return {
        "chat_id": chat_id,
        "tracking_code": complaint.tracking_code,
        "category": complaint.category,
    }


def send_completion_notice(
    chat_id: int,
    tracking_code: str,
    category: str,
    note: str,
    photo_bytes: bytes,
) -> bool:
    mod = sys.modules[__name__]
    client: TelegramClient | None = mod._make_client()
    if client is None:
        logger.info("Telegram not configured, completion notice skipped")
        return False

    text = bot_messages.format_completion(tracking_code, category, note)
    try:
        try:
            client.send_photo(chat_id, photo_bytes, caption=text)
            return True
        except TelegramError:
            client.send_message(chat_id, text)
            return True
    except TelegramError:
        return False
    except Exception as exc:
        logger.warning(
            "Failed to send completion notice (%s)",
            type(exc).__name__,
        )
        return False

