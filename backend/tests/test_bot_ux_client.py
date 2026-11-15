from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from app.core.config import get_settings
from app.services import geocode_service
from app.services.telegram_api import TelegramClient, TelegramError, main_menu_keyboard


def test_main_menu_keyboard() -> None:
    kb = main_menu_keyboard()
    assert kb["resize_keyboard"] is True
    assert kb["is_persistent"] is True
    assert len(kb["keyboard"]) == 2
    assert kb["keyboard"][0] == [
        {"text": "Lodge Complaint"},
        {"text": "Track Complaint"},
    ]
    assert kb["keyboard"][1] == [
        {"text": "My Complaints"},
    ]


def test_telegram_client_send_chat_action() -> None:
    recorded_body: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bot123456:TESTTOKEN/sendChatAction"
        assert request.method == "POST"
        recorded_body.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True, "result": True})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)
        client.send_chat_action(chat_id=12345, action="typing")

    assert len(recorded_body) == 1
    assert recorded_body[0] == {"chat_id": 12345, "action": "typing"}


def test_telegram_client_edit_message_reply_markup() -> None:
    recorded_body: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bot123456:TESTTOKEN/editMessageReplyMarkup"
        assert request.method == "POST"
        recorded_body.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True, "result": True})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)
        # 1. When None -> {"inline_keyboard": []}
        client.edit_message_reply_markup(chat_id=12345, message_id=88, reply_markup=None)
        # 2. When given markup -> sent as given
        markup = {"inline_keyboard": [[{"text": "OK", "callback_data": "ok"}]]}
        client.edit_message_reply_markup(chat_id=12345, message_id=88, reply_markup=markup)

    assert len(recorded_body) == 2
    assert recorded_body[0] == {
        "chat_id": 12345,
        "message_id": 88,
        "reply_markup": {"inline_keyboard": []},
    }
    assert recorded_body[1] == {
        "chat_id": 12345,
        "message_id": 88,
        "reply_markup": markup,
    }


def test_telegram_client_set_my_commands() -> None:
    recorded_body: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bot123456:TESTTOKEN/setMyCommands"
        assert request.method == "POST"
        recorded_body.append(json.loads(request.content))
        return httpx.Response(200, json={"ok": True, "result": True})

    commands = [
        ("new", "Report a problem"),
        ("status", "Check a complaint: /status CODE"),
    ]

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)
        client.set_my_commands(commands)

    assert len(recorded_body) == 1
    assert recorded_body[0] == {
        "commands": [
            {"command": "new", "description": "Report a problem"},
            {"command": "status", "description": "Check a complaint: /status CODE"},
        ]
    }


def test_telegram_client_methods_raise_on_ok_false() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={"ok": False, "description": "Bad Request: simulated error"},
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        client = TelegramClient(token="123456:TESTTOKEN", client=http_client)

        with pytest.raises(TelegramError, match="simulated error"):
            client.send_chat_action(chat_id=12345)

        with pytest.raises(TelegramError, match="simulated error"):
            client.edit_message_reply_markup(chat_id=12345, message_id=88)

        with pytest.raises(TelegramError, match="simulated error"):
            client.set_my_commands([("cmd", "desc")])


@pytest.fixture(autouse=True)
def _reset_geocode_cache_and_enable(monkeypatch: pytest.MonkeyPatch) -> None:
    geocode_service._cache.clear()
    settings = get_settings()
    monkeypatch.setattr(settings, "geocode_enabled", True)
    yield
    geocode_service._cache.clear()


def test_reverse_geocode_nominatim_success() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "address": {
                    "suburb": "Kegaon",
                    "city_district": "Solapur North",
                    "city": "Solapur",
                }
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res == "Kegaon, Solapur North, Solapur"


def test_reverse_geocode_duplicates_dropped() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "address": {
                    "suburb": "Solapur",
                    "city": "Solapur",
                }
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res == "Solapur"


def test_reverse_geocode_no_usable_parts() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"address": {"country": "India", "postcode": "413001"}},
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res is None


def test_reverse_geocode_failures_return_none() -> None:
    # HTTP 500
    c500 = httpx.Client(transport=httpx.MockTransport(lambda req: httpx.Response(500)))
    assert geocode_service.reverse_geocode(17.684, 75.880, client=c500) is None

    # ConnectTimeout
    def timeout_handler(req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("Connection timed out", request=req)

    ctimeout = httpx.Client(transport=httpx.MockTransport(timeout_handler))
    assert geocode_service.reverse_geocode(17.684, 75.880, client=ctimeout) is None

    # Invalid JSON
    cinvalid = httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(200, content=b"not valid json")
        )
    )
    assert geocode_service.reverse_geocode(17.684, 75.880, client=cinvalid) is None


def test_reverse_geocode_headers_and_params() -> None:
    recorded_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        recorded_requests.append(request)
        return httpx.Response(
            200,
            json={"address": {"suburb": "Kegaon", "city": "Solapur"}},
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = geocode_service.reverse_geocode(17.6841, 75.8802, client=client)
    assert res == "Kegaon, Solapur"
    assert len(recorded_requests) == 1
    req = recorded_requests[0]
    assert req.headers.get("user-agent", "").startswith("NagarSetu")
    assert req.url.params["lat"] == "17.6841"
    assert req.url.params["lon"] == "75.8802"
    assert req.url.params["format"] == "jsonv2"
    assert req.url.params["zoom"] == "16"
    assert req.url.params["addressdetails"] == "1"


def test_reverse_geocode_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "geocode_enabled", False)
    req_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal req_count
        req_count += 1
        return httpx.Response(200, json={"address": {"city": "Solapur"}})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res is None
    assert req_count == 0


def test_reverse_geocode_invalid_coordinates() -> None:
    req_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal req_count
        req_count += 1
        return httpx.Response(200, json={"address": {"city": "Solapur"}})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    assert geocode_service.reverse_geocode(95.0, 75.880, client=client) is None
    assert req_count == 0


def test_reverse_geocode_caching_same_rounded_pin() -> None:
    req_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal req_count
        req_count += 1
        return httpx.Response(
            200,
            json={"address": {"suburb": "Kegaon", "city": "Solapur"}},
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res1 = geocode_service.reverse_geocode(17.68401, 75.88002, client=client)
    res2 = geocode_service.reverse_geocode(17.68404, 75.88004, client=client)
    assert res1 == "Kegaon, Solapur"
    assert res2 == "Kegaon, Solapur"
    assert req_count == 1


def test_reverse_geocode_failure_not_cached() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(500)
        return httpx.Response(
            200,
            json={"address": {"suburb": "Kegaon", "city": "Solapur"}},
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    res1 = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res1 is None
    assert calls == 1

    res2 = geocode_service.reverse_geocode(17.684, 75.880, client=client)
    assert res2 == "Kegaon, Solapur"
    assert calls == 2
