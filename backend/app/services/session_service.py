from __future__ import annotations

import json
from enum import StrEnum
from functools import lru_cache
from typing import Any

import redis

from app.core.config import get_settings


class State(StrEnum):
    AWAITING_INPUT = "AWAITING_INPUT"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    AWAITING_CATEGORY = "AWAITING_CATEGORY"
    AWAITING_LOCATION = "AWAITING_LOCATION"
    AWAITING_DESCRIPTION = "AWAITING_DESCRIPTION"
    SUMMARY = "SUMMARY"


@lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.Redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=3,
    )


def session_key(chat_id: int | str) -> str:
    return f"tg:session:{chat_id}"


def new_session() -> dict[str, Any]:
    return {
        "state": State.AWAITING_INPUT.value,
        "input_type": None,
        "category": None,
        "confidence": None,
        "source": None,
        "image_key": None,
        "description": None,
        "latitude": None,
        "longitude": None,
        "hint": None,
    }


def load_session(chat_id: int | str) -> dict[str, Any] | None:
    r = get_redis()
    key = session_key(chat_id)
    raw = r.get(key)
    if raw is None:
        return None
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            r.delete(key)
            return None
        return data
    except (json.JSONDecodeError, TypeError):
        r.delete(key)
        return None


def save_session(chat_id: int | str, data: dict[str, Any]) -> None:
    r = get_redis()
    settings = get_settings()
    key = session_key(chat_id)
    r.setex(key, settings.telegram_session_ttl_seconds, json.dumps(data))


def delete_session(chat_id: int | str) -> None:
    r = get_redis()
    key = session_key(chat_id)
    r.delete(key)
