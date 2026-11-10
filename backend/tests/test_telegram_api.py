import json

import httpx
import pytest

from app.services.telegram_api import (
    TelegramClient,
    TelegramError,
    inline_keyboard,
    location_keyboard,
    parse_update,
    remove_keyboard,
)

TOKEN = "123456:TESTTOKEN"


def test_parse_update_private_text_message():
    raw = {
        "update_id": 1001,
        "message": {
            "message_id": 42,
            "from": {
                "id": 999,
                "is_bot": False,
                "first_name": "Ramesh",
                "username": "ramesh_s",
            },
            "chat": {
                "id": 888,
                "type": "private",
                "first_name": "Ramesh",
                "username": "ramesh_s",
            },
            "date": 1700000000,
            "text": "Hello bot",
        },
    }
    incoming = parse_update(raw)
    assert incoming is not None
    assert incoming.kind == "message"
    assert incoming.update_id == 1001
    assert incoming.chat_id == 888
    assert incoming.user_id == 999
    assert incoming.username == "ramesh_s"
    assert incoming.first_name == "Ramesh"
    assert incoming.message_id == 42
    assert incoming.text == "Hello bot"
    assert incoming.caption is None
    assert incoming.photo_file_id is None
    assert incoming.photo_file_size is None
    assert incoming.latitude is None
    assert incoming.longitude is None
    assert incoming.callback_id is None
    assert incoming.callback_data is None


def test_parse_update_photo_picks_largest():
    raw = {
        "update_id": 1002,
        "message": {
            "message_id": 43,
            "from": {"id": 999, "username": "ramesh_s"},
            "chat": {"id": 888, "type": "private"},
            "caption": "Broken road here",
            "photo": [
                {"file_id": "small_id", "file_size": 1024, "width": 100, "height": 100},
                {"file_id": "large_id", "file_size": 1048576, "width": 1200, "height": 1200},
                {"file_id": "medium_id", "file_size": 20480, "width": 400, "height": 400},
            ],
        },
    }
    incoming = parse_update(raw)
    assert incoming is not None
    assert incoming.kind == "message"
    assert incoming.caption == "Broken road here"
    assert incoming.photo_file_id == "large_id"
    assert incoming.photo_file_size == 1048576


def test_parse_update_location():
    raw = {
        "update_id": 1003,
        "message": {
            "message_id": 44,
            "from": {"id": 999},
            "chat": {"id": 888, "type": "private"},
            "location": {"latitude": 17.6599, "longitude": 75.9064},
        },
    }
    incoming = parse_update(raw)
    assert incoming is not None
    assert incoming.kind == "message"
    assert incoming.latitude == 17.6599
    assert incoming.longitude == 75.9064


def test_parse_update_callback_query():
    raw = {
        "update_id": 1004,
        "callback_query": {
            "id": "cb_query_999",
            "from": {"id": 999, "username": "ramesh_s", "first_name": "Ramesh"},
            "message": {
                "message_id": 50,
                "chat": {"id": 888, "type": "private"},
                "text": "Choose category",
            },
            "data": "cat:pothole",
        },
    }
    incoming = parse_update(raw)
    assert incoming is not None
    assert incoming.kind == "callback"
    assert incoming.update_id == 1004
    assert incoming.chat_id == 888
    assert incoming.user_id == 999
    assert incoming.username == "ramesh_s"
    assert incoming.first_name == "Ramesh"
    assert incoming.message_id == 50
    assert incoming.callback_id == "cb_query_999"
    assert incoming.callback_data == "cat:pothole"


def test_parse_update_group_chat_ignored():
    raw = {
        "update_id": 1005,
        "message": {
            "message_id": 51,
            "chat": {"id": -100123456789, "type": "supergroup"},
            "text": "Hello group",
        },
    }
    assert parse_update(raw) is None


def test_parse_update_unknown_type_and_malformed():
    assert parse_update({"update_id": 1006, "channel_post": {"text": "broadcast"}}) is None
    assert parse_update({"message": {}}) is None
    assert parse_update({}) is None
    assert parse_update(None) is None  # type: ignore[arg-type]


def test_keyboard_builders():
    inline = inline_keyboard([[("Button 1", "data_1"), ("Button 2", "data_2")]])
    assert inline == {
        "inline_keyboard": [
            [
                {"text": "Button 1", "callback_data": "data_1"},
                {"text": "Button 2", "callback_data": "data_2"},
            ]
        ]
    }

    loc = location_keyboard("Share Location")
    assert loc == {
        "keyboard": [[{"text": "Share Location", "request_location": True}]],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }

    rem = remove_keyboard()
    assert rem == {"remove_keyboard": True}


def test_get_updates_payload_and_url():
    recorded_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        recorded_requests.append(request)
        return httpx.Response(
            200,
            json={"ok": True, "result": [{"update_id": 101, "message": {"text": "hi"}}]},
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        updates = tg.get_updates(offset=50, timeout=25)

    assert len(recorded_requests) == 1
    req = recorded_requests[0]
    assert req.url.path == f"/bot{TOKEN}/getUpdates"
    body = json.loads(req.content.decode("utf-8"))
    assert body["offset"] == 50
    assert body["timeout"] == 25
    assert body["allowed_updates"] == ["message", "callback_query"]
    assert len(updates) == 1
    assert updates[0]["update_id"] == 101


def test_send_message_truncation_and_no_parse_mode():
    recorded_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        recorded_requests.append(request)
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 55}})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        long_text = "A" * 5000
        res = tg.send_message(chat_id=12345, text=long_text)

    assert res["message_id"] == 55
    assert len(recorded_requests) == 1
    req = recorded_requests[0]
    assert req.url.path == f"/bot{TOKEN}/sendMessage"
    body = json.loads(req.content.decode("utf-8"))
    assert body["chat_id"] == 12345
    assert len(body["text"]) == 4000
    assert "parse_mode" not in body


def test_send_photo_multipart_and_caption_truncation():
    recorded_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        recorded_requests.append(request)
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 56}})

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        long_caption = "B" * 1500
        res = tg.send_photo(chat_id=12345, photo=b"fake-image-bytes", caption=long_caption)

    assert res["message_id"] == 56
    assert len(recorded_requests) == 1
    req = recorded_requests[0]
    assert req.url.path == f"/bot{TOKEN}/sendPhoto"
    content_type = req.headers.get("content-type", "")
    assert content_type.startswith("multipart/form-data")
    assert b"fake-image-bytes" in req.content
    # Check that 1000 characters of 'B' are present in the multipart body, but not 1500
    assert b"B" * 1000 in req.content
    assert b"B" * 1001 not in req.content


def test_ok_false_raises_telegram_error_with_description():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={"ok": False, "error_code": 400, "description": "Bad Request: chat not found"},
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        with pytest.raises(TelegramError) as exc_info:
            tg.send_message(chat_id=999, text="hello")

    assert "Bad Request: chat not found" in str(exc_info.value)


def test_connect_error_does_not_leak_token():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused to target host")

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        with pytest.raises(TelegramError) as exc_info:
            tg.get_updates()

    error_msg = str(exc_info.value)
    assert "ConnectError" in error_msg
    assert "TESTTOKEN" not in error_msg


def test_repr_does_not_leak_token():
    tg = TelegramClient(token=TOKEN)
    rep = repr(tg)
    assert "TESTTOKEN" not in rep
    assert "TelegramClient" in rep


def test_get_file_bytes_flow_and_size_limit():
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if "getFile" in path:
            return httpx.Response(
                200,
                json={
                    "ok": True,
                    "result": {
                        "file_id": "file_abc_123",
                        "file_path": "photos/file_0.jpg",
                        "file_size": 2048,
                    },
                },
            )
        if "/file/bot" in path:
            return httpx.Response(200, content=b"real-image-payload-data")
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as http_client:
        tg = TelegramClient(token=TOKEN, client=http_client)
        # Success case within limit
        data = tg.get_file_bytes(file_id="file_abc_123", max_bytes=4096)
        assert data == b"real-image-payload-data"

        # Exceeds max_bytes
        with pytest.raises(TelegramError) as exc_info:
            tg.get_file_bytes(file_id="file_abc_123", max_bytes=1024)
        assert "too large" in str(exc_info.value).lower()

