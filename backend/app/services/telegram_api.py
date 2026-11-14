from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class TelegramError(Exception):
    pass


@dataclass(frozen=True)
class Incoming:
    kind: str
    update_id: int
    chat_id: int
    user_id: int | None
    username: str | None
    first_name: str | None
    message_id: int | None
    text: str | None
    caption: str | None
    photo_file_id: str | None
    photo_file_size: int | None
    latitude: float | None
    longitude: float | None
    callback_id: str | None
    callback_data: str | None


def parse_update(update: dict) -> Incoming | None:
    try:
        if not isinstance(update, dict):
            return None

        update_id = update["update_id"]

        if "message" in update:
            msg = update["message"]
            if not isinstance(msg, dict):
                return None
            chat = msg.get("chat")
            if not isinstance(chat, dict) or chat.get("type") != "private":
                return None
            chat_id = chat["id"]

            from_user = msg.get("from") or {}
            user_id = from_user.get("id") if isinstance(from_user, dict) else None
            username = from_user.get("username") if isinstance(from_user, dict) else None
            first_name = from_user.get("first_name") if isinstance(from_user, dict) else None
            message_id = msg.get("message_id")
            text = msg.get("text")
            caption = msg.get("caption")

            photo_file_id: str | None = None
            photo_file_size: int | None = None
            photo_list = msg.get("photo")
            if isinstance(photo_list, list) and photo_list:
                best_photo: dict | None = None
                for item in photo_list:
                    if not isinstance(item, dict):
                        continue
                    if best_photo is None:
                        best_photo = item
                    else:
                        item_size = item.get("file_size")
                        best_size = best_photo.get("file_size")
                        if item_size is not None and best_size is not None:
                            if item_size > best_size:
                                best_photo = item
                        elif item_size is not None:
                            best_photo = item
                if best_photo is None and photo_list:
                    last = photo_list[-1]
                    if isinstance(last, dict):
                        best_photo = last
                if best_photo is not None:
                    photo_file_id = best_photo.get("file_id")
                    photo_file_size = best_photo.get("file_size")

            latitude: float | None = None
            longitude: float | None = None
            loc = msg.get("location")
            if isinstance(loc, dict):
                latitude = loc.get("latitude")
                longitude = loc.get("longitude")

            return Incoming(
                kind="message",
                update_id=update_id,
                chat_id=chat_id,
                user_id=user_id,
                username=username,
                first_name=first_name,
                message_id=message_id,
                text=text,
                caption=caption,
                photo_file_id=photo_file_id,
                photo_file_size=photo_file_size,
                latitude=latitude,
                longitude=longitude,
                callback_id=None,
                callback_data=None,
            )

        if "callback_query" in update:
            cb = update["callback_query"]
            if not isinstance(cb, dict):
                return None
            nested_msg = cb.get("message")
            if not isinstance(nested_msg, dict):
                return None
            chat = nested_msg.get("chat")
            if not isinstance(chat, dict) or chat.get("type") != "private":
                return None
            chat_id = chat["id"]

            from_user = cb.get("from") or {}
            user_id = from_user.get("id") if isinstance(from_user, dict) else None
            username = from_user.get("username") if isinstance(from_user, dict) else None
            first_name = from_user.get("first_name") if isinstance(from_user, dict) else None
            callback_id = cb.get("id")
            callback_data = cb.get("data")
            message_id = nested_msg.get("message_id")

            return Incoming(
                kind="callback",
                update_id=update_id,
                chat_id=chat_id,
                user_id=user_id,
                username=username,
                first_name=first_name,
                message_id=message_id,
                text=None,
                caption=None,
                photo_file_id=None,
                photo_file_size=None,
                latitude=None,
                longitude=None,
                callback_id=callback_id,
                callback_data=callback_data,
            )

        return None
    except (KeyError, TypeError, AttributeError):
        return None


def inline_keyboard(rows: list[list[tuple[str, str]]]) -> dict:
    return {
        "inline_keyboard": [
            [{"text": text, "callback_data": data} for text, data in row]
            for row in rows
        ]
    }


def location_keyboard(button_text: str) -> dict:
    return {
        "keyboard": [[{"text": button_text, "request_location": True}]],
        "resize_keyboard": True,
        "one_time_keyboard": True,
    }


def remove_keyboard() -> dict:
    return {"remove_keyboard": True}


class TelegramClient:
    def __init__(
        self,
        token: str,
        base_url: str = "https://api.telegram.org",
        client: httpx.Client | None = None,
    ) -> None:
        self._token = token
        self._base_url = base_url.rstrip("/")
        self._client = client or httpx.Client()
        self._own_client = client is None

    def __repr__(self) -> str:
        return f"<TelegramClient base_url={self._base_url!r}>"

    def close(self) -> None:
        if self._own_client:
            self._client.close()

    def __enter__(self) -> TelegramClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _call(
        self,
        method: str,
        json: dict | None = None,
        data: dict | None = None,
        files: dict | None = None,
        timeout: float = 15.0,
    ) -> Any:
        url = f"{self._base_url}/bot{self._token}/{method}"
        try:
            resp = self._client.post(
                url,
                json=json,
                data=data,
                files=files,
                timeout=timeout,
            )
        except httpx.HTTPError as exc:
            raise TelegramError(
                f"Telegram {method} request failed ({type(exc).__name__})"
            ) from None

        try:
            payload = resp.json()
        except Exception:
            raise TelegramError(
                f"Telegram {method} failed: unparsable response ({resp.status_code})"
            ) from None

        if not isinstance(payload, dict):
            raise TelegramError(f"Telegram {method} failed: invalid response structure")

        if resp.status_code != 200 or not payload.get("ok"):
            desc = payload.get("description") or resp.status_code
            raise TelegramError(f"Telegram {method} failed: {desc}")

        return payload.get("result")

    def get_updates(
        self,
        offset: int | None = None,
        timeout: int = 30,
    ) -> list[dict]:
        payload: dict[str, Any] = {
            "timeout": timeout,
            "allowed_updates": ["message", "callback_query"],
        }
        if offset is not None:
            payload["offset"] = offset
        res = self._call("getUpdates", json=payload, timeout=float(timeout + 10))
        return res if isinstance(res, list) else []

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: dict | None = None,
    ) -> dict:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text[:4000],
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        res = self._call("sendMessage", json=payload)
        return res if isinstance(res, dict) else {}

    def send_photo(
        self,
        chat_id: int,
        photo: bytes,
        caption: str | None = None,
    ) -> dict:
        data: dict[str, Any] = {"chat_id": str(chat_id)}
        if caption is not None:
            data["caption"] = caption[:1000]
        files = {"photo": ("photo.jpg", photo, "image/jpeg")}
        res = self._call("sendPhoto", data=data, files=files, timeout=30.0)
        return res if isinstance(res, dict) else {}

    def answer_callback(
        self,
        callback_id: str,
        text: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {"callback_query_id": callback_id}
        if text is not None:
            payload["text"] = text
        self._call("answerCallbackQuery", json=payload)

    def get_file_bytes(self, file_id: str, max_bytes: int) -> bytes:
        result = self._call("getFile", json={"file_id": file_id})
        if not isinstance(result, dict):
            raise TelegramError("File download failed: invalid getFile response")

        file_path = result.get("file_path")
        if not file_path:
            raise TelegramError("File download failed: missing file_path")

        file_size = result.get("file_size")
        if file_size is not None and file_size > max_bytes:
            raise TelegramError("File is too large")

        download_url = f"{self._base_url}/file/bot{self._token}/{file_path}"
        try:
            resp = self._client.get(download_url, timeout=30.0)
        except httpx.HTTPError as exc:
            raise TelegramError(
                f"File download request failed ({type(exc).__name__})"
            ) from None

        if resp.status_code != 200:
            raise TelegramError(f"File download failed: {resp.status_code}")

        content = resp.content
        if len(content) > max_bytes:
            raise TelegramError("File is too large")

        return content

    def get_me(self) -> dict:
        res = self._call("getMe")
        return res if isinstance(res, dict) else {}

    def delete_webhook(self) -> None:
        self._call("deleteWebhook", json={"drop_pending_updates": False})


