"""Automated sanity and integration check for Telegram bot foundation services.

Verifies citizen upserts, complaint isolation, triage routing, Redis session
lifecycle, and rollback safety. Run with:
    python -m scripts.check_bot_foundations
"""

from __future__ import annotations

import random
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import Citizen, Complaint, ComplaintLog, TriageQueue
from app.services import session_service
from app.services.citizen_service import (
    find_citizen_complaint,
    get_or_create_citizen,
    list_recent_complaints,
)
from app.services.classification_service import classify_image, classify_text
from app.services.complaint_service import create_complaint
from app.services.session_service import (
    delete_session,
    load_session,
    new_session,
    save_session,
    session_key,
)
from app.services.triage_service import create_triage_entry


def get_table_counts(db: Session) -> dict[str, int]:
    return {
        "citizen": db.scalar(select(func.count()).select_from(Citizen)) or 0,
        "complaint": db.scalar(select(func.count()).select_from(Complaint)) or 0,
        "complaint_log": db.scalar(select(func.count()).select_from(ComplaintLog)) or 0,
        "triage_queue": db.scalar(select(func.count()).select_from(TriageQueue)) or 0,
    }


def run_checks() -> None:
    settings = get_settings()
    if settings.app_env.lower() != "development":
        print("FAIL: script refused unless APP_ENV == 'development'")
        sys.exit(1)

    engine = get_engine()
    db = Session(engine)
    r = session_service.get_redis()
    created_redis_keys: set[str] = set()

    try:
        start_counts = get_table_counts(db)

        # (1) get_or_create_citizen creates a citizen with the given chat id, username and name
        chat_id_a = random.randint(8000000000, 8999999999)
        c_a = get_or_create_citizen(
            db,
            chat_id=chat_id_a,
            username="citizen_alpha",
            full_name="Citizen Alpha",
        )
        if (
            c_a.id is None
            or c_a.telegram_chat_id != chat_id_a
            or c_a.telegram_username != "citizen_alpha"
            or c_a.full_name != "Citizen Alpha"
        ):
            print("FAIL: Check 1: get_or_create_citizen failed to create expected citizen")
            sys.exit(1)
        print("PASS: Check 1: get_or_create_citizen creates citizen with chat id, username, name")

        # (2) a second call with the same chat id returns the same row id and updates the username
        c_a2 = get_or_create_citizen(
            db,
            chat_id=chat_id_a,
            username="citizen_alpha_updated",
            full_name="Citizen Alpha",
        )
        if c_a2.id != c_a.id or c_a2.telegram_username != "citizen_alpha_updated":
            print("FAIL: Check 2: second call did not return same row id or update username")
            sys.exit(1)
        print("PASS: Check 2: get_or_create_citizen returns same row and updates username")

        # (3) create two complaints for two citizens and check lookup isolation & normalization
        chat_id_b = random.randint(8000000000, 8999999999)
        c_b = get_or_create_citizen(
            db,
            chat_id=chat_id_b,
            username="citizen_beta",
            full_name="Citizen Beta",
        )

        comp_a = create_complaint(
            db,
            citizen_id=c_a.id,
            category="Solid Waste & Garbage",
            description="Garbage at point A",
            image_object_key=None,
            latitude=17.675,
            longitude=75.865,
            ai_confidence=0.9,
            ai_classification_source="image",
        )
        comp_b = create_complaint(
            db,
            citizen_id=c_b.id,
            category="Solid Waste & Garbage",
            description="Garbage at point B",
            image_object_key=None,
            latitude=17.675,
            longitude=75.865,
            ai_confidence=0.9,
            ai_classification_source="image",
        )

        # Citizen A finds its own complaint with code in lowercase with spaces
        code_with_spaces = f"  {comp_a.tracking_code.lower()}  "
        found_a = find_citizen_complaint(db, c_a.id, code_with_spaces)
        if found_a is None or found_a.id != comp_a.id:
            print("FAIL: Check 3: citizen A could not find own complaint with lowercase code")
            sys.exit(1)

        # Citizen A looking up citizen B's code gets None
        found_cross = find_citizen_complaint(db, c_a.id, comp_b.tracking_code)
        if found_cross is not None:
            print("FAIL: Check 3: cross-citizen complaint lookup should return None")
            sys.exit(1)

        # Unknown code gets None
        found_unknown = find_citizen_complaint(db, c_a.id, "UNKNOWN-CODE-999")
        if found_unknown is not None:
            print("FAIL: Check 3: unknown code lookup returned non-None")
            sys.exit(1)
        print("PASS: Check 3: complaint lookup normalization and cross-citizen isolation")

        # (4) list_recent_complaints returns newest first and respects limit
        now = datetime.now(UTC)
        comp_a2 = create_complaint(
            db,
            citizen_id=c_a.id,
            category="Solid Waste & Garbage",
            description="Garbage complaint 2",
            image_object_key=None,
            latitude=17.675,
            longitude=75.865,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=now + timedelta(seconds=1),
        )
        comp_a3 = create_complaint(
            db,
            citizen_id=c_a.id,
            category="Solid Waste & Garbage",
            description="Garbage complaint 3",
            image_object_key=None,
            latitude=17.675,
            longitude=75.865,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=now + timedelta(seconds=2),
        )

        recent_2 = list_recent_complaints(db, c_a.id, limit=2)
        if (
            len(recent_2) != 2
            or recent_2[0].id != comp_a3.id
            or recent_2[1].id != comp_a2.id
        ):
            print("FAIL: Check 4: list_recent_complaints ordering or limit mismatch")
            sys.exit(1)
        print("PASS: Check 4: list_recent_complaints returns newest first with limit")

        # (5) create_triage_entry pending status, idempotency, confidence validation
        triage1 = create_triage_entry(db, comp_a, "Solid Waste & Garbage", 0.65)
        if (
            triage1.status != "pending"
            or triage1.predicted_category != "Solid Waste & Garbage"
            or triage1.ai_confidence != 0.65
        ):
            print("FAIL: Check 5: create_triage_entry pending row mismatch")
            sys.exit(1)

        triage2 = create_triage_entry(db, comp_a, "Solid Waste & Garbage", 0.65)
        if triage2.id != triage1.id:
            print("FAIL: Check 5: duplicate create_triage_entry returned a different row id")
            sys.exit(1)

        triage_rows_count = db.scalar(
            select(func.count()).where(TriageQueue.complaint_id == comp_a.id)
        )
        if triage_rows_count != 1:
            print("FAIL: Check 5: triage_queue has multiple rows for the same complaint")
            sys.exit(1)

        val_err_caught = False
        try:
            create_triage_entry(db, comp_b, "Solid Waste & Garbage", 1.5)
        except ValueError:
            val_err_caught = True
        if not val_err_caught:
            print("FAIL: Check 5: confidence 1.5 did not raise ValueError")
            sys.exit(1)
        print("PASS: Check 5: triage entry pending status, idempotency, and validation")

        # (6) real Redis session round trip with session_service
        chat_redis = random.randint(8000000000, 8999999999)
        r_key = session_key(chat_redis)
        created_redis_keys.add(r_key)

        sess_data = new_session()
        sess_data["category"] = "Potholes & Road Damage"
        sess_data["description"] = "Test asphalt damage"
        save_session(chat_redis, sess_data)

        loaded_sess = load_session(chat_redis)
        if loaded_sess != sess_data:
            print("FAIL: Check 6: loaded session did not match saved session")
            sys.exit(1)

        ttl = r.ttl(r_key)
        if not (1 <= ttl <= settings.telegram_session_ttl_seconds):
            print(f"FAIL: Check 6: session TTL {ttl} not in expected range")
            sys.exit(1)

        delete_session(chat_redis)
        if load_session(chat_redis) is not None:
            print("FAIL: Check 6: load_session returned data after delete_session")
            sys.exit(1)

        r.set(r_key, "not json")
        if load_session(chat_redis) is not None:
            print("FAIL: Check 6: load_session did not return None on invalid json")
            sys.exit(1)
        if r.get(r_key) is not None:
            print("FAIL: Check 6: invalid json key was not deleted by load_session")
            sys.exit(1)
        print("PASS: Check 6: real Redis session lifecycle, TTL, and corruption cleanup")

        # (7) classification sanity
        pred_text = classify_text("Hawkers blocking the footpath")
        if pred_text.category != "Illegal Encroachment":
            print(f"FAIL: Check 7: classify_text gave {pred_text.category}")
            sys.exit(1)

        pred_img = classify_image(b"x", hint="garbage dump")
        if pred_img.category != "Solid Waste & Garbage":
            print(f"FAIL: Check 7: classify_image gave {pred_img.category}")
            sys.exit(1)
        print("PASS: Check 7: classification sanity checks")

        # (8) rollback and verify counts equal starting counts and Redis keys gone
        db.rollback()

        after_counts = get_table_counts(db)
        for tbl, expected_cnt in start_counts.items():
            if after_counts[tbl] != expected_cnt:
                print(
                    f"FAIL: Check 8: {tbl} count mismatch after rollback: "
                    f"start={expected_cnt}, after={after_counts[tbl]}"
                )
                sys.exit(1)

        for k in list(created_redis_keys):
            if r.get(k) is not None:
                print(f"FAIL: Check 8: Redis key {k} still present after cleanup")
                sys.exit(1)
        print("PASS: Check 8: database rollback integrity and Redis key cleanup verified")

    finally:
        db.rollback()
        for k in created_redis_keys:
            try:
                r.delete(k)
            except Exception:
                pass
        db.close()

    print("ALL BOT FOUNDATION CHECKS PASSED.")


if __name__ == "__main__":
    run_checks()
