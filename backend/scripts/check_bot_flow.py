from __future__ import annotations

import random
import sys
from io import BytesIO
from typing import Any

from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import (
    Citizen,
    Complaint,
    ComplaintAssignment,
    ComplaintLog,
    TriageQueue,
    Worker,
)
from app.services import (
    bot_handler,
    bot_messages,
    classification_service,
    geocode_service,
    image_service,
    notification_service,
    nsfw_check_service,
    session_service,
    storage_service,
    task_service,
    telegram_api,
)
from app.services.telegram_api import Incoming, TelegramError


def make_jpeg_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (64, 48), color="green").save(buf, format="JPEG")
    return buf.getvalue()


class FakeBotClient:
    def __init__(self) -> None:
        self.messages: list[dict[str, Any]] = []
        self.photos: list[dict[str, Any]] = []
        self.callbacks: list[dict[str, Any]] = []
        self.files: dict[str, bytes] = {}

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.messages.append(
            {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
        )
        return {"ok": True}

    def send_photo(
        self,
        chat_id: int,
        photo: bytes,
        caption: str | None = None,
    ) -> dict[str, Any]:
        self.photos.append(
            {"chat_id": chat_id, "photo": photo, "caption": caption}
        )
        return {"ok": True}

    def send_chat_action(self, chat_id: int, action: str = "typing") -> None:
        pass

    def edit_message_reply_markup(
        self,
        chat_id: int,
        message_id: int,
        reply_markup: dict[str, Any] | None = None,
    ) -> None:
        pass

    def answer_callback(
        self,
        callback_id: str,
        text: str | None = None,
    ) -> None:
        self.callbacks.append({"callback_id": callback_id, "text": text})

    def get_file_bytes(self, file_id: str, max_bytes: int) -> bytes:
        if file_id in self.files:
            data = self.files[file_id]
            if len(data) > max_bytes:
                raise TelegramError("File is too large")
            return data
        raise TelegramError("File not found")


class FakeCompletionClient:
    def __init__(self, photo_error: bool = False) -> None:
        self.photo_error = photo_error
        self.sent_photos: list[dict[str, Any]] = []
        self.sent_messages: list[dict[str, Any]] = []

    def send_photo(
        self, chat_id: int, photo: bytes, caption: str | None = None
    ) -> dict[str, Any]:
        if self.photo_error:
            raise TelegramError("Photo upload failed")
        self.sent_photos.append(
            {"chat_id": chat_id, "photo": photo, "caption": caption}
        )
        return {"ok": True}

    def send_message(
        self, chat_id: int, text: str, reply_markup: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        self.sent_messages.append(
            {"chat_id": chat_id, "text": text, "reply_markup": reply_markup}
        )
        return {"ok": True}


def make_msg(
    update_id: int,
    chat_id: int,
    text: str | None = None,
    caption: str | None = None,
    photo_file_id: str | None = None,
    photo_file_size: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    username: str = "flow_citizen",
    first_name: str = "Citizen",
) -> Incoming:
    msg: dict[str, Any] = {
        "message_id": update_id,
        "chat": {"id": chat_id, "type": "private"},
        "from": {"id": chat_id, "username": username, "first_name": first_name},
    }
    if text is not None:
        msg["text"] = text
    if caption is not None:
        msg["caption"] = caption
    if photo_file_id is not None:
        msg["photo"] = [
            {
                "file_id": photo_file_id,
                "file_size": photo_file_size or 500,
                "width": 64,
                "height": 48,
            }
        ]
    if latitude is not None and longitude is not None:
        msg["location"] = {"latitude": latitude, "longitude": longitude}

    raw = {"update_id": update_id, "message": msg}
    inc = telegram_api.parse_update(raw)
    assert inc is not None
    return inc


def make_cb(
    update_id: int,
    chat_id: int,
    data: str,
    callback_id: str = "cb_1",
    username: str = "flow_citizen",
    first_name: str = "Citizen",
) -> Incoming:
    raw = {
        "update_id": update_id,
        "callback_query": {
            "id": callback_id,
            "from": {"id": chat_id, "username": username, "first_name": first_name},
            "message": {
                "message_id": update_id,
                "chat": {"id": chat_id, "type": "private"},
            },
            "data": data,
        },
    }
    inc = telegram_api.parse_update(raw)
    assert inc is not None
    return inc


def main() -> None:
    settings = get_settings()
    if settings.app_env != "development":
        print("FAIL: check_bot_flow must only run in development environment")
        sys.exit(1)

    tables_to_check = [
        "citizen",
        "complaint",
        "complaint_log",
        "complaint_assignment",
        "triage_queue",
        "resolution",
    ]

    engine = get_engine()
    db = Session(engine)

    real_storage = storage_service.get_storage()
    real_redis = session_service.get_redis()
    uploaded_storage_keys: set[str] = set()

    orig_put = real_storage.put_object

    def tracking_put(key: str, data: bytes, content_type: str) -> None:
        uploaded_storage_keys.add(key)
        return orig_put(key, data, content_type)

    real_storage.put_object = tracking_put

    orig_reverse_geocode = geocode_service.reverse_geocode
    geocode_service.reverse_geocode = (
        lambda lat, lon, client=None: "Test Locality, Solapur"
    )

    orig_classify_image = classification_service.classify_image

    def stub_classify_image(
        data: bytes, hint: str | None = None
    ) -> classification_service.Prediction:
        if hint and "pothole" in hint.lower():
            return classification_service.Prediction(
                category="Potholes & Road Damage",
                confidence=0.85,
                source="image",
                model="stub",
                needs_review=False,
            )
        return classification_service.Prediction(
            category="Solid Waste & Garbage",
            confidence=0.30,
            source="image",
            model="stub",
            needs_review=True,
        )

    classification_service.classify_image = stub_classify_image

    orig_make_client = notification_service._make_client

    used_chat_ids: set[int] = set()
    chat_counter = random.randint(8100000000, 8900000000)
    update_counter = 1

    def next_chat_id() -> int:
        nonlocal chat_counter
        chat_counter += 1
        used_chat_ids.add(chat_counter)
        return chat_counter

    def next_uid() -> int:
        nonlocal update_counter
        update_counter += 1
        return update_counter

    def run_check(num: int, name: str, passed: bool) -> None:
        status_text = "PASS" if passed else "FAIL"
        print(f"Check {num} ({name}): {status_text}")
        if not passed:
            sys.exit(1)

    def has_two_summary_buttons(msg: dict[str, Any]) -> bool:
        rows = (msg.get("reply_markup") or {}).get("inline_keyboard") or []
        cb_datas = [btn["callback_data"] for row in rows for btn in row]
        return len(rows) == 1 and cb_datas == ["sub:yes", "sub:no"]

    start_counts: dict[str, int] = {}

    try:
        start_counts = {
            t: db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0
            for t in tables_to_check
        }

        # Check 1: /start replies with the 3-label menu and creates no session
        cid_1 = next_chat_id()
        client_1 = FakeBotClient()
        bot_handler.handle_update(
            db, client_1, make_msg(next_uid(), cid_1, text="/start"), commit=db.flush
        )
        sess_1 = session_service.load_session(cid_1)
        kb_1 = (
            client_1.messages[0].get("reply_markup", {}).get("keyboard", [])
            if client_1.messages
            else []
        )
        labels_1 = [btn["text"] for row in kb_1 for btn in row]
        ok_1 = (
            len(client_1.messages) >= 1
            and bot_messages.WELCOME_TEXT in client_1.messages[0]["text"]
            and labels_1
            == ["Lodge Complaint", "Track Complaint", "My Complaints"]
            and sess_1 is None
            and real_redis.exists(session_service.session_key(cid_1)) == 0
        )
        run_check(1, "start replies with 3-label menu and creates no session", ok_1)

        # Check 2: "Lodge Complaint" creates a session in AWAITING_INPUT
        cid_2 = next_chat_id()
        client_2 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_2,
            make_msg(next_uid(), cid_2, text="Lodge Complaint"),
            commit=db.flush,
        )
        sess_2 = session_service.load_session(cid_2)
        ttl_2 = real_redis.ttl(session_service.session_key(cid_2))
        ok_2 = (
            len(client_2.messages) >= 1
            and bot_messages.MSG_NEW_REPORT in client_2.messages[0]["text"]
            and sess_2 is not None
            and sess_2["state"] == session_service.State.AWAITING_INPUT
            and real_redis.exists(session_service.session_key(cid_2)) == 1
            and 1 <= ttl_2 <= 1200
        )
        run_check(2, "Lodge Complaint creates session in AWAITING_INPUT", ok_2)

        # Check 3: text "Streetlights not working on the main road", skip photo,
        # location 17.684, 75.880, then "sub:yes"
        cid_3 = next_chat_id()
        client_3 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_3,
            make_msg(
                next_uid(),
                cid_3,
                text="Streetlights not working on the main road",
            ),
            commit=db.flush,
        )
        sess_3_evi = session_service.load_session(cid_3)
        evi_prompt_ok_3 = (
            sess_3_evi is not None
            and sess_3_evi["state"] == session_service.State.AWAITING_EVIDENCE
            and bot_messages.MSG_ASK_EVIDENCE in client_3.messages[-1]["text"]
        )
        bot_handler.handle_update(
            db,
            client_3,
            make_cb(next_uid(), cid_3, "evi:skip"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_3,
            make_msg(next_uid(), cid_3, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
        summary_msg_3 = client_3.messages[-1]["text"]
        summary_buttons_ok_3 = has_two_summary_buttons(client_3.messages[-1])
        sess_3_mid = session_service.load_session(cid_3)
        ttl_3_mid = real_redis.ttl(session_service.session_key(cid_3))
        mid_flow_ok_3 = (
            sess_3_mid is not None
            and real_redis.exists(session_service.session_key(cid_3)) == 1
            and 1 <= ttl_3_mid <= 1200
            and summary_buttons_ok_3
            and evi_prompt_ok_3
        )
        bot_handler.handle_update(
            db,
            client_3,
            make_cb(next_uid(), cid_3, "sub:yes"),
            commit=db.flush,
        )

        citizen_3 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_3)
        ).scalar_one()
        complaint_3 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_3.id)
        ).scalar_one()
        logs_3 = db.execute(
            select(ComplaintLog).where(
                ComplaintLog.complaint_id == complaint_3.id
            )
        ).scalars().all()
        triage_3 = db.execute(
            select(TriageQueue).where(
                TriageQueue.complaint_id == complaint_3.id
            )
        ).scalars().all()
        assigns_3 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_3.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalars().all()

        ok_3 = (
            complaint_3.category == "Streetlight"
            and complaint_3.zone is not None
            and complaint_3.zone.name == "Zone A"
            and complaint_3.status == "Submitted"
            and complaint_3.ai_classification_source == "text"
            and complaint_3.image_object_key is None
            and len(logs_3) == 3
            and len(triage_3) == 0
            and len(assigns_3) == 0
            and complaint_3.tracking_code in client_3.messages[-1]["text"]
            and session_service.load_session(cid_3) is None
            and real_redis.exists(session_service.session_key(cid_3)) == 0
            and mid_flow_ok_3
            and "Test Locality, Solapur" in summary_msg_3
            and "Supporting photo: none" in summary_msg_3
        )
        run_check(3, "full text complaint flow with skip", ok_3)

        # Check 4: photo with caption -> Potholes, assigned to worker +919000000002, storage exists
        cid_4 = next_chat_id()
        client_4 = FakeBotClient()
        jpeg_4 = make_jpeg_bytes()
        client_4.files["photo_4"] = jpeg_4
        bot_handler.handle_update(
            db,
            client_4,
            make_msg(
                next_uid(),
                cid_4,
                photo_file_id="photo_4",
                photo_file_size=len(jpeg_4),
                caption="huge pothole on the road",
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_4,
            make_msg(next_uid(), cid_4, latitude=17.68, longitude=75.875),
            commit=db.flush,
        )
        summary_buttons_ok_4 = has_two_summary_buttons(client_4.messages[-1])
        bot_handler.handle_update(
            db,
            client_4,
            make_cb(next_uid(), cid_4, "sub:yes"),
            commit=db.flush,
        )

        citizen_4 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_4)
        ).scalar_one()
        complaint_4 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_4.id)
        ).scalar_one()
        assign_4 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_4.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalar_one_or_none()

        ok_4 = (
            summary_buttons_ok_4
            and complaint_4.category == "Potholes & Road Damage"
            and assign_4 is not None
            and assign_4.worker is not None
            and assign_4.worker.phone == "+919000000002"
            and complaint_4.image_object_key is not None
            and real_storage.object_exists(complaint_4.image_object_key)
        )
        run_check(4, "captioned photo assigned to worker", ok_4)

        # Check 5: photo without caption -> reply has "not fully sure", submit -> triage row 0.30
        cid_5 = next_chat_id()
        client_5 = FakeBotClient()
        jpeg_5 = make_jpeg_bytes()
        client_5.files["photo_5"] = jpeg_5
        bot_handler.handle_update(
            db,
            client_5,
            make_msg(
                next_uid(),
                cid_5,
                photo_file_id="photo_5",
                photo_file_size=len(jpeg_5),
            ),
            commit=db.flush,
        )
        not_sure_present = "not fully sure" in client_5.messages[-1]["text"]

        bot_handler.handle_update(
            db,
            client_5,
            make_msg(next_uid(), cid_5, latitude=17.675, longitude=75.865),
            commit=db.flush,
        )
        summary_buttons_ok_5 = has_two_summary_buttons(client_5.messages[-1])
        bot_handler.handle_update(
            db,
            client_5,
            make_cb(next_uid(), cid_5, "sub:yes"),
            commit=db.flush,
        )

        citizen_5 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_5)
        ).scalar_one()
        complaint_5 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_5.id)
        ).scalar_one()
        triage_5 = db.execute(
            select(TriageQueue).where(
                TriageQueue.complaint_id == complaint_5.id
            )
        ).scalar_one_or_none()

        ok_5 = (
            summary_buttons_ok_5
            and not_sure_present
            and triage_5 is not None
            and triage_5.status.lower() == "pending"
            and round(triage_5.ai_confidence, 2) == 0.30
        )
        run_check(5, "photo without caption queues triage with confidence 0.30", ok_5)

        # Check 6: removed category callbacks in SUMMARY reply use-the-buttons
        # and leave the Redis session unchanged
        cid_6 = next_chat_id()
        client_6 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_6,
            make_msg(next_uid(), cid_6, text="qqzz xx"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_6,
            make_cb(next_uid(), cid_6, "evi:skip"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_6,
            make_msg(next_uid(), cid_6, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
        summary_buttons_ok_6 = has_two_summary_buttons(client_6.messages[-1])
        sess_6_before = session_service.load_session(cid_6)

        bot_handler.handle_update(
            db,
            client_6,
            make_cb(next_uid(), cid_6, "sub:cat"),
            commit=db.flush,
        )
        reply_sub_cat = client_6.messages[-1]["text"]
        sess_6_after_sub_cat = session_service.load_session(cid_6)

        bot_handler.handle_update(
            db,
            client_6,
            make_cb(next_uid(), cid_6, "cat:0"),
            commit=db.flush,
        )
        reply_cat_0 = client_6.messages[-1]["text"]
        sess_6_after_cat_0 = session_service.load_session(cid_6)

        citizen_6 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_6)
        ).scalar_one_or_none()

        ok_6 = (
            summary_buttons_ok_6
            and sess_6_before is not None
            and sess_6_before["state"] == session_service.State.SUMMARY
            and bot_messages.MSG_USE_BUTTONS in reply_sub_cat
            and sess_6_after_sub_cat == sess_6_before
            and bot_messages.MSG_USE_BUTTONS in reply_cat_0
            and sess_6_after_cat_0 == sess_6_before
            and citizen_6 is None
        )
        run_check(6, "removed category callbacks leave SUMMARY session unchanged", ok_6)

        # Check 7: location 17.00, 75.50 (outside every zone) -> zone None,
        # no assignment, gets tracking code
        cid_7 = next_chat_id()
        client_7 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_7,
            make_msg(
                next_uid(), cid_7, text="Streetlight outage outside zones"
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_7,
            make_cb(next_uid(), cid_7, "evi:skip"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_7,
            make_msg(next_uid(), cid_7, latitude=17.00, longitude=75.50),
            commit=db.flush,
        )
        summary_buttons_ok_7 = has_two_summary_buttons(client_7.messages[-1])
        bot_handler.handle_update(
            db,
            client_7,
            make_cb(next_uid(), cid_7, "sub:yes"),
            commit=db.flush,
        )

        citizen_7 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_7)
        ).scalar_one()
        complaint_7 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_7.id)
        ).scalar_one()
        assign_7 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_7.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalars().all()

        ok_7 = (
            summary_buttons_ok_7
            and complaint_7.zone_id is None
            and len(assign_7) == 0
            and complaint_7.tracking_code in client_7.messages[-1]["text"]
        )
        run_check(7, "outside zones stored with zone None", ok_7)

        # Check 8: text /cancel -> session gone; photo /cancel -> uploaded object deleted;
        # sub:no button -> session gone
        cid_8a = next_chat_id()
        client_8a = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_8a,
            make_msg(next_uid(), cid_8a, text="Pothole problem cancel test"),
            commit=db.flush,
        )
        ttl_8a_mid = real_redis.ttl(session_service.session_key(cid_8a))
        mid_ok_8a = (
            real_redis.exists(session_service.session_key(cid_8a)) == 1
            and 1 <= ttl_8a_mid <= 1200
        )
        bot_handler.handle_update(
            db,
            client_8a,
            make_msg(next_uid(), cid_8a, text="/cancel"),
            commit=db.flush,
        )
        sess_8a = session_service.load_session(cid_8a)
        redis_no_8a = real_redis.exists(session_service.session_key(cid_8a)) == 0

        cid_8b = next_chat_id()
        client_8b = FakeBotClient()
        jpeg_8 = make_jpeg_bytes()
        client_8b.files["photo_8"] = jpeg_8
        bot_handler.handle_update(
            db,
            client_8b,
            make_msg(
                next_uid(),
                cid_8b,
                photo_file_id="photo_8",
                photo_file_size=len(jpeg_8),
            ),
            commit=db.flush,
        )
        sess_8b = session_service.load_session(cid_8b)
        assert sess_8b is not None
        key_8b = sess_8b["image_key"]
        obj_existed_before = real_storage.object_exists(key_8b)
        ttl_8b_mid = real_redis.ttl(session_service.session_key(cid_8b))
        mid_ok_8b = (
            real_redis.exists(session_service.session_key(cid_8b)) == 1
            and 1 <= ttl_8b_mid <= 1200
        )
        bot_handler.handle_update(
            db,
            client_8b,
            make_msg(next_uid(), cid_8b, text="/cancel"),
            commit=db.flush,
        )
        obj_exists_after = real_storage.object_exists(key_8b)
        sess_8b_after = session_service.load_session(cid_8b)
        redis_no_8b = real_redis.exists(session_service.session_key(cid_8b)) == 0

        # sub:no button cancel test
        cid_8c = next_chat_id()
        client_8c = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_8c,
            make_msg(next_uid(), cid_8c, text="Encroachment problem cancel sub:no test"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_8c,
            make_cb(next_uid(), cid_8c, "evi:skip"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_8c,
            make_msg(next_uid(), cid_8c, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
        summary_buttons_ok_8c = has_two_summary_buttons(client_8c.messages[-1])
        sess_8c_mid = session_service.load_session(cid_8c)
        ttl_8c_mid = real_redis.ttl(session_service.session_key(cid_8c))
        mid_ok_8c = (
            sess_8c_mid is not None
            and real_redis.exists(session_service.session_key(cid_8c)) == 1
            and 1 <= ttl_8c_mid <= 1200
            and summary_buttons_ok_8c
        )
        bot_handler.handle_update(
            db,
            client_8c,
            make_cb(next_uid(), cid_8c, "sub:no"),
            commit=db.flush,
        )
        redis_no_8c = real_redis.exists(session_service.session_key(cid_8c)) == 0
        sess_8c_after = session_service.load_session(cid_8c)
        sub_no_msg_ok = (
            len(client_8c.messages) >= 1
            and bot_messages.MSG_CANCELLED in client_8c.messages[-1]["text"]
        )

        ok_8 = (
            mid_ok_8a
            and sess_8a is None
            and redis_no_8a
            and mid_ok_8b
            and obj_existed_before
            and not obj_exists_after
            and sess_8b_after is None
            and redis_no_8b
            and mid_ok_8c
            and sess_8c_after is None
            and redis_no_8c
            and sub_no_msg_ok
        )
        run_check(8, "cancel and sub:no clear session, redis keys, and storage", ok_8)

        # Check 9: NSFW photo -> rejected, no session, nothing uploaded
        cid_9 = next_chat_id()
        client_9 = FakeBotClient()
        jpeg_9 = make_jpeg_bytes()
        client_9.files["photo_9"] = jpeg_9
        nsfw_check_service.set_classifier(lambda b: 0.99)
        try:
            bot_handler.handle_update(
                db,
                client_9,
                make_msg(
                    next_uid(),
                    cid_9,
                    photo_file_id="photo_9",
                    photo_file_size=len(jpeg_9),
                ),
                commit=db.flush,
            )
            sess_9 = session_service.load_session(cid_9)
            ok_9 = (
                bot_messages.MSG_IMAGE_REJECTED in client_9.messages[-1]["text"]
                and sess_9 is None
            )
        finally:
            nsfw_check_service.set_classifier(None)
        run_check(9, "NSFW photo rejected", ok_9)

        # Check 10: tracking code typed in lower case returns "Status: Submitted"
        # for own citizen and not-found for other; "My Complaints" lists newest first
        client_10 = FakeBotClient()
        code_lower = complaint_3.tracking_code.lower()
        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_3, text=code_lower),
            commit=db.flush,
        )
        reply_status_own = client_10.messages[-1]["text"]

        cid_10_other = next_chat_id()
        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_10_other, text=code_lower),
            commit=db.flush,
        )
        reply_status_other = client_10.messages[-1]["text"]

        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_3, text="My Complaints"),
            commit=db.flush,
        )
        reply_mycomplaints = client_10.messages[-1]["text"]

        ok_10 = (
            "Status: Submitted" in reply_status_own
            and complaint_3.category in reply_status_own
            and bot_messages.MSG_STATUS_NOT_FOUND in reply_status_other
            and complaint_3.tracking_code in reply_mycomplaints
        )
        run_check(10, "tracking code lookup and my complaints", ok_10)

        # Check 11: callback with no session replies expired
        cid_11 = next_chat_id()
        client_11 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_11,
            make_cb(next_uid(), cid_11, "sub:yes"),
            commit=db.flush,
        )
        ok_11 = bot_messages.MSG_EXPIRED in client_11.messages[-1]["text"]
        run_check(11, "callback without session expires", ok_11)

        # Check 12: completion notice -> complete complaint from check 4,
        # prepare notice, send photo and fallback to message
        worker = db.execute(
            select(Worker).where(Worker.phone == "+919000000002")
        ).scalar_one()
        task_service.start_task(
            db=db, worker=worker, complaint_id=complaint_4.id
        )

        comp_jpeg = make_jpeg_bytes()
        validated_comp = image_service.validate_image(comp_jpeg)
        note = "Pothole filled and road leveled completely."
        comp_res = task_service.complete_task(
            db=db,
            worker=worker,
            complaint_id=complaint_4.id,
            note=note,
            photo_bytes=comp_jpeg,
            image=validated_comp,
        )
        uploaded_storage_keys.add(comp_res.photo_key)

        notice = notification_service.prepare_completion_notice(
            db, complaint_4.id
        )
        assert notice is not None
        assert notice["chat_id"] == cid_4
        assert notice["tracking_code"] == complaint_4.tracking_code

        # Photo delivery
        fake_comp_client = FakeCompletionClient(photo_error=False)
        notification_service._make_client = lambda: fake_comp_client
        res_photo = notification_service.send_completion_notice(
            notice["chat_id"],
            notice["tracking_code"],
            notice["category"],
            note,
            comp_jpeg,
        )
        photo_ok = (
            res_photo is True
            and len(fake_comp_client.sent_photos) == 1
            and notice["tracking_code"]
            in fake_comp_client.sent_photos[0]["caption"]
            and note in fake_comp_client.sent_photos[0]["caption"]
        )

        # Fallback to text message
        fake_fallback_client = FakeCompletionClient(photo_error=True)
        notification_service._make_client = lambda: fake_fallback_client
        res_fallback = notification_service.send_completion_notice(
            notice["chat_id"],
            notice["tracking_code"],
            notice["category"],
            note,
            comp_jpeg,
        )
        fallback_ok = (
            res_fallback is True
            and len(fake_fallback_client.sent_messages) == 1
            and notice["tracking_code"]
            in fake_fallback_client.sent_messages[0]["text"]
            and note in fake_fallback_client.sent_messages[0]["text"]
        )

        ok_12 = photo_ok and fallback_ok
        run_check(12, "completion notification delivery and fallback", ok_12)

        # Check 13: text complaint flow with supporting photo uploaded at final confirmation
        cid_13 = next_chat_id()
        client_13 = FakeBotClient()
        jpeg_13 = make_jpeg_bytes()
        client_13.files["evi_photo_13"] = jpeg_13
        bot_handler.handle_update(
            db,
            client_13,
            make_msg(
                next_uid(),
                cid_13,
                text="Streetlights not working on the main road",
            ),
            commit=db.flush,
        )
        sess_13_evi = session_service.load_session(cid_13)
        bot_handler.handle_update(
            db,
            client_13,
            make_msg(
                next_uid(),
                cid_13,
                photo_file_id="evi_photo_13",
                photo_file_size=len(jpeg_13),
            ),
            commit=db.flush,
        )
        storage_count_before_submit = len(uploaded_storage_keys)
        bot_handler.handle_update(
            db,
            client_13,
            make_msg(next_uid(), cid_13, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
        summary_msg_13 = client_13.messages[-1]["text"]
        bot_handler.handle_update(
            db,
            client_13,
            make_cb(next_uid(), cid_13, "sub:yes"),
            commit=db.flush,
        )
        citizen_13 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_13)
        ).scalar_one()
        complaint_13 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_13.id)
        ).scalar_one()

        ok_13 = (
            complaint_13.category == "Streetlight"
            and complaint_13.ai_classification_source == "text"
            and complaint_13.image_object_key is not None
            and real_storage.object_exists(complaint_13.image_object_key)
            and complaint_13.image_object_key in uploaded_storage_keys
            and len(uploaded_storage_keys) == storage_count_before_submit + 1
            and "Supporting photo: attached" in summary_msg_13
            and session_service.load_session(cid_13) is None
            and sess_13_evi is not None
            and sess_13_evi["state"] == session_service.State.AWAITING_EVIDENCE
        )
        run_check(13, "text complaint flow with supporting photo", ok_13)

        # Check 14: rollback and verify all counts, redis keys, and storage objects are restored
        db.rollback()

        for cid in used_chat_ids:
            session_service.delete_session(cid)

        for k in list(uploaded_storage_keys):
            try:
                real_storage.delete_object(k)
            except Exception:
                pass

        end_counts = {
            t: db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0
            for t in tables_to_check
        }

        counts_match = end_counts == start_counts
        redis_clean = all(
            session_service.load_session(cid) is None for cid in used_chat_ids
        )
        storage_clean = all(
            not real_storage.object_exists(k) for k in uploaded_storage_keys
        )

        ok_14 = counts_match and redis_clean and storage_clean
        run_check(14, "rollback and resource cleanup", ok_14)

    finally:
        db.rollback()
        real_storage.put_object = orig_put
        geocode_service.reverse_geocode = orig_reverse_geocode
        classification_service.classify_image = orig_classify_image
        notification_service._make_client = orig_make_client
        nsfw_check_service.set_classifier(None)

        for cid in used_chat_ids:
            try:
                session_service.delete_session(cid)
            except Exception:
                pass

        for k in list(uploaded_storage_keys):
            try:
                real_storage.delete_object(k)
            except Exception:
                pass

        db.close()


if __name__ == "__main__":
    main()
