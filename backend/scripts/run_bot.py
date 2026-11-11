from __future__ import annotations

import logging
import signal
import sys
import time
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.services import bot_handler, bot_messages, telegram_api
from app.services.telegram_api import TelegramClient, TelegramError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger("run_bot")


def main() -> None:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        logger.info("TELEGRAM_BOT_TOKEN is not set; the bot is disabled")
        sys.exit(0)

    client = TelegramClient(token, base_url=settings.telegram_api_base)

    me: dict[str, Any] | None = None
    for attempt in range(1, 6):
        try:
            me = client.get_me()
            break
        except TelegramError:
            if attempt < 5:
                time.sleep(3)

    if not me:
        logger.error("Could not reach Telegram or the token was rejected")
        sys.exit(1)

    username = me.get("username", "unknown")
    logger.info("Bot started as @%s", username)

    try:
        client.delete_webhook()
    except TelegramError as exc:
        logger.warning(
            "delete_webhook failed (%s); continuing",
            type(exc).__name__,
        )

    running = True

    def _handle_stop(signum: int, frame: Any) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _handle_stop)
    signal.signal(signal.SIGTERM, _handle_stop)

    offset: int | None = None
    backoff = 2
    engine = get_engine()

    while running:
        try:
            updates = client.get_updates(
                offset=offset,
                timeout=settings.telegram_poll_timeout,
            )
            backoff = 2
        except TelegramError as exc:
            logger.warning(
                "get_updates failed (%s), backing off %s seconds",
                type(exc).__name__,
                backoff,
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, 30)
            continue

        for update in updates:
            if not running:
                break
            update_id = update.get("update_id")
            if update_id is not None:
                offset = update_id + 1

            inc = telegram_api.parse_update(update)
            if inc is None:
                continue

            logger.info(
                "Processing update %s (kind=%s)",
                inc.update_id,
                inc.kind,
            )

            with Session(engine) as db:
                try:
                    bot_handler.handle_update(db, client, inc)
                    db.commit()
                except Exception as exc:
                    db.rollback()
                    logger.warning(
                        "update failed (update_id=%s, %s)",
                        inc.update_id,
                        type(exc).__name__,
                    )
                    try:
                        client.send_message(
                            inc.chat_id,
                            bot_messages.MSG_GENERIC_ERROR,
                        )
                    except Exception:
                        pass

    logger.info("Bot stopped gracefully")
    sys.exit(0)


if __name__ == "__main__":
    main()

