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
    uploaded_storage_keys: set[str] = set()

    orig_put = real_storage.put_object

    def tracking_put(key: str, data: bytes, content_type: str) -> None:
        uploaded_storage_keys.add(key)
        return orig_put(key, data, content_type)

    real_storage.put_object = tracking_put

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

    start_counts: dict[str, int] = {}

    try:
        start_counts = {
            t: db.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0
            for t in tables_to_check
        }

        # Check 1: /start replies and session is AWAITING_INPUT
        cid_1 = next_chat_id()
        client_1 = FakeBotClient()
        bot_handler.handle_update(
            db, client_1, make_msg(next_uid(), cid_1, text="/start"), commit=db.flush
        )
        sess_1 = session_service.load_session(cid_1)
        ok_1 = (
            len(client_1.messages) >= 2
            and bot_messages.WELCOME_TEXT in client_1.messages[0]["text"]
            and bot_messages.MSG_NEW_REPORT in client_1.messages[1]["text"]
            and sess_1 is not None
            and sess_1["state"] == session_service.State.AWAITING_INPUT
        )
        run_check(1, "start initializes session", ok_1)

        # Check 2: text flow -> Streetlight & Power Outage, Zone A,
        # Submitted, 3 logs, no triage, no assignment
        cid_2 = next_chat_id()
        client_2 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_2,
            make_msg(
                next_uid(),
                cid_2,
                text="Streetlights not working on the main road",
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_2,
            make_cb(next_uid(), cid_2, "cat:ok"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_2,
            make_msg(next_uid(), cid_2, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_2,
            make_cb(next_uid(), cid_2, "sub:yes"),
            commit=db.flush,
        )

        citizen_2 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_2)
        ).scalar_one()
        complaint_2 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_2.id)
        ).scalar_one()
        logs_2 = db.execute(
            select(ComplaintLog).where(
                ComplaintLog.complaint_id == complaint_2.id
            )
        ).scalars().all()
        triage_2 = db.execute(
            select(TriageQueue).where(
                TriageQueue.complaint_id == complaint_2.id
            )
        ).scalars().all()
        assigns_2 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_2.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalars().all()

        ok_2 = (
            complaint_2.category == "Streetlight & Power Outage"
            and complaint_2.zone is not None
            and complaint_2.zone.name == "Zone A"
            and complaint_2.status == "Submitted"
            and complaint_2.ai_classification_source == "text"
            and len(logs_2) == 3
            and len(triage_2) == 0
            and len(assigns_2) == 0
            and complaint_2.tracking_code in client_2.messages[-1]["text"]
            and session_service.load_session(cid_2) is None
        )
        run_check(2, "full text complaint flow", ok_2)

        # Check 3: photo with caption -> Potholes, assigned to worker +919000000002, storage exists
        cid_3 = next_chat_id()
        client_3 = FakeBotClient()
        jpeg_3 = make_jpeg_bytes()
        client_3.files["photo_3"] = jpeg_3
        bot_handler.handle_update(
            db,
            client_3,
            make_msg(
                next_uid(),
                cid_3,
                photo_file_id="photo_3",
                photo_file_size=len(jpeg_3),
                caption="huge pothole on the road",
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_3,
            make_cb(next_uid(), cid_3, "cat:ok"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_3,
            make_msg(next_uid(), cid_3, latitude=17.68, longitude=75.875),
            commit=db.flush,
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
        assign_3 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_3.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalar_one_or_none()

        ok_3 = (
            complaint_3.category == "Potholes & Road Damage"
            and assign_3 is not None
            and assign_3.worker is not None
            and assign_3.worker.phone == "+919000000002"
            and complaint_3.image_object_key is not None
            and real_storage.object_exists(complaint_3.image_object_key)
        )
        run_check(3, "photo with caption assigned to worker", ok_3)

        # Check 4: photo without caption -> asks description, desc:skip, submit -> triage row 0.30
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
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_4,
            make_cb(next_uid(), cid_4, "cat:ok"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_4,
            make_msg(next_uid(), cid_4, latitude=17.675, longitude=75.865),
            commit=db.flush,
        )
        asked_desc = (
            bot_messages.MSG_ASK_DESCRIPTION in client_4.messages[-1]["text"]
        )
        bot_handler.handle_update(
            db,
            client_4,
            make_cb(next_uid(), cid_4, "desc:skip"),
            commit=db.flush,
        )
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
        triage_4 = db.execute(
            select(TriageQueue).where(
                TriageQueue.complaint_id == complaint_4.id
            )
        ).scalar_one_or_none()

        ok_4 = (
            asked_desc
            and complaint_4.description is None
            and triage_4 is not None
            and round(triage_4.ai_confidence, 2) == 0.30
        )
        run_check(4, "photo without caption queues triage", ok_4)

        # Check 5: text "qqzz xx" -> cat:no -> cat:4 -> location -> sub:yes
        # -> Illegal Encroachment, manual, NO triage
        cid_5 = next_chat_id()
        client_5 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_5,
            make_msg(next_uid(), cid_5, text="qqzz xx"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_5,
            make_cb(next_uid(), cid_5, "cat:no"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_5,
            make_cb(next_uid(), cid_5, "cat:4"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_5,
            make_msg(next_uid(), cid_5, latitude=17.684, longitude=75.880),
            commit=db.flush,
        )
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
        ).scalars().all()

        ok_5 = (
            complaint_5.category == "Illegal Encroachment"
            and complaint_5.ai_classification_source == "manual"
            and len(triage_5) == 0
        )
        run_check(5, "manual category override", ok_5)

        # Check 6: location 17.00, 75.50 (outside every zone) -> zone None,
        # no assignment, gets tracking code
        cid_6 = next_chat_id()
        client_6 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_6,
            make_msg(
                next_uid(), cid_6, text="Streetlight outage outside zones"
            ),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_6,
            make_cb(next_uid(), cid_6, "cat:ok"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_6,
            make_msg(next_uid(), cid_6, latitude=17.00, longitude=75.50),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_6,
            make_cb(next_uid(), cid_6, "sub:yes"),
            commit=db.flush,
        )

        citizen_6 = db.execute(
            select(Citizen).where(Citizen.telegram_chat_id == cid_6)
        ).scalar_one()
        complaint_6 = db.execute(
            select(Complaint).where(Complaint.citizen_id == citizen_6.id)
        ).scalar_one()
        assign_6 = db.execute(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == complaint_6.id,
                ComplaintAssignment.is_active.is_(True),
            )
        ).scalars().all()

        ok_6 = (
            complaint_6.zone_id is None
            and len(assign_6) == 0
            and complaint_6.tracking_code in client_6.messages[-1]["text"]
        )
        run_check(6, "outside zones stored with zone None", ok_6)

        # Check 7: text message while in AWAITING_LOCATION replies reminder, session unchanged
        cid_7 = next_chat_id()
        client_7 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_7,
            make_msg(next_uid(), cid_7, text="Garbage dump on street"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_7,
            make_cb(next_uid(), cid_7, "cat:ok"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_7,
            make_msg(next_uid(), cid_7, text="near bus stand"),
            commit=db.flush,
        )
        sess_7 = session_service.load_session(cid_7)
        ok_7 = (
            bot_messages.MSG_LOCATION_NOT_EXPECTED
            in client_7.messages[-1]["text"]
            and sess_7 is not None
            and sess_7["state"] == session_service.State.AWAITING_LOCATION
        )
        run_check(7, "location reminder leaves session unchanged", ok_7)

        # Check 8: text /cancel -> session gone; photo /cancel -> uploaded object deleted
        cid_8a = next_chat_id()
        client_8a = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_8a,
            make_msg(next_uid(), cid_8a, text="Pothole problem cancel test"),
            commit=db.flush,
        )
        bot_handler.handle_update(
            db,
            client_8a,
            make_msg(next_uid(), cid_8a, text="/cancel"),
            commit=db.flush,
        )
        sess_8a = session_service.load_session(cid_8a)

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
        key_8b = sess_8b["image_key"]
        obj_existed_before = real_storage.object_exists(key_8b)
        bot_handler.handle_update(
            db,
            client_8b,
            make_msg(next_uid(), cid_8b, text="/cancel"),
            commit=db.flush,
        )
        obj_exists_after = real_storage.object_exists(key_8b)
        sess_8b_after = session_service.load_session(cid_8b)

        ok_8 = (
            sess_8a is None
            and obj_existed_before
            and not obj_exists_after
            and sess_8b_after is None
        )
        run_check(8, "cancel clears session and storage", ok_8)

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

        # Check 10: /status with lower-case tracking code -> Status: Submitted;
        # other citizen gets not found; /mycomplaints lists newest first
        client_10 = FakeBotClient()
        code_lower = complaint_2.tracking_code.lower()
        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_2, text=f"/status {code_lower}"),
            commit=db.flush,
        )
        reply_status_own = client_10.messages[-1]["text"]

        cid_10_other = next_chat_id()
        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_10_other, text=f"/status {code_lower}"),
            commit=db.flush,
        )
        reply_status_other = client_10.messages[-1]["text"]

        bot_handler.handle_update(
            db,
            client_10,
            make_msg(next_uid(), cid_2, text="/mycomplaints"),
            commit=db.flush,
        )
        reply_mycomplaints = client_10.messages[-1]["text"]

        ok_10 = (
            "Status: Submitted" in reply_status_own
            and complaint_2.category in reply_status_own
            and bot_messages.MSG_STATUS_NOT_FOUND in reply_status_other
            and complaint_2.tracking_code in reply_mycomplaints
        )
        run_check(10, "status and mycomplaints commands", ok_10)

        # Check 11: callback with no session replies expired
        cid_11 = next_chat_id()
        client_11 = FakeBotClient()
        bot_handler.handle_update(
            db,
            client_11,
            make_cb(next_uid(), cid_11, "cat:ok"),
            commit=db.flush,
        )
        ok_11 = bot_messages.MSG_EXPIRED in client_11.messages[-1]["text"]
        run_check(11, "callback without session expires", ok_11)

        # Check 12: completion notice -> complete complaint from check 3,
        # prepare notice, send photo and fallback to message
        worker = db.execute(
            select(Worker).where(Worker.phone == "+919000000002")
        ).scalar_one()
        task_service.start_task(
            db=db, worker=worker, complaint_id=complaint_3.id
        )

        comp_jpeg = make_jpeg_bytes()
        validated_comp = image_service.validate_image(comp_jpeg)
        note = "Pothole filled and road leveled completely."
        comp_res = task_service.complete_task(
            db=db,
            worker=worker,
            complaint_id=complaint_3.id,
            note=note,
            photo_bytes=comp_jpeg,
            image=validated_comp,
        )
        uploaded_storage_keys.add(comp_res.photo_key)

        notice = notification_service.prepare_completion_notice(
            db, complaint_3.id
        )
        assert notice is not None
        assert notice["chat_id"] == cid_3
        assert notice["tracking_code"] == complaint_3.tracking_code

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

        # Check 13: rollback and verify all counts, redis keys, and storage objects are restored
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

        ok_13 = counts_match and redis_clean and storage_clean
        run_check(13, "rollback and resource cleanup", ok_13)

    finally:
        db.rollback()
        real_storage.put_object = orig_put
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
