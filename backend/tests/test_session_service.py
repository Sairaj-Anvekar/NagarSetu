from __future__ import annotations

import json
from typing import Any

import pytest

from app.core.config import get_settings
from app.services import session_service
from app.services.session_service import (
    State,
    delete_session,
    load_session,
    new_session,
    save_session,
    session_key,
)


class FakeRedis:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._ttls: dict[str, int] = {}

    def setex(self, key: str, ttl: int, value: str) -> bool:
        self._data[key] = value
        self._ttls[key] = ttl
        return True

    def get(self, key: str) -> str | None:
        return self._data.get(key)

    def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._data:
                del self._data[k]
                count += 1
            self._ttls.pop(k, None)
        return count

    def ttl(self, key: str) -> int:
        return self._ttls.get(key, -2)


@pytest.fixture
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(session_service, "get_redis", lambda: fake)
    return fake


def test_new_session_has_all_keys():
    session = new_session()
    assert session["state"] == State.AWAITING_INPUT
    expected_keys = {
        "state",
        "input_type",
        "category",
        "confidence",
        "source",
        "image_key",
        "description",
        "latitude",
        "longitude",
        "hint",
    }
    assert set(session.keys()) == expected_keys
    for k in expected_keys:
        if k != "state":
            assert session[k] is None


def test_save_load_round_trip_and_ttl(fake_redis: FakeRedis):
    chat_id = 888123
    data: dict[str, Any] = new_session()
    data["state"] = State.AWAITING_LOCATION.value
    data["category"] = "Potholes & Road Damage"
    data["confidence"] = 0.85
    data["source"] = "image"
    data["image_key"] = "grievances/img1.jpg"

    save_session(chat_id, data)
    loaded = load_session(chat_id)
    assert loaded == data

    settings = get_settings()
    key = session_key(chat_id)
    assert fake_redis.ttl(key) == settings.telegram_session_ttl_seconds


def test_load_missing_chat_returns_none(fake_redis: FakeRedis):
    assert load_session(99999999) is None


def test_corrupted_json_returns_none_and_deletes_key(fake_redis: FakeRedis):
    chat_id = 777123
    key = session_key(chat_id)
    fake_redis._data[key] = "not-json-content-here{"

    loaded = load_session(chat_id)
    assert loaded is None
    assert fake_redis.get(key) is None


def test_json_list_returns_none_and_deletes_key(fake_redis: FakeRedis):
    chat_id = 666123
    key = session_key(chat_id)
    fake_redis._data[key] = json.dumps(["item1", "item2"])

    loaded = load_session(chat_id)
    assert loaded is None
    assert fake_redis.get(key) is None


def test_delete_session_removes_key(fake_redis: FakeRedis):
    chat_id = 555123
    save_session(chat_id, new_session())
    assert load_session(chat_id) is not None

    delete_session(chat_id)
    assert load_session(chat_id) is None
    assert fake_redis.get(session_key(chat_id)) is None


def test_independent_chat_sessions(fake_redis: FakeRedis):
    chat_a = 1001
    chat_b = 1002

    session_a = new_session()
    session_a["category"] = "Solid Waste & Garbage"
    session_b = new_session()
    session_b["category"] = "Waterlogging & Drainage"

    save_session(chat_a, session_a)
    save_session(chat_b, session_b)

    loaded_a = load_session(chat_a)
    loaded_b = load_session(chat_b)
    assert loaded_a is not None and loaded_a["category"] == "Solid Waste & Garbage"
    assert loaded_b is not None and loaded_b["category"] == "Waterlogging & Drainage"

    delete_session(chat_a)
    assert load_session(chat_a) is None
    assert load_session(chat_b) is not None


def test_session_key_format():
    assert session_key(12345) == "tg:session:12345"
    assert session_key("user_abc") == "tg:session:user_abc"

