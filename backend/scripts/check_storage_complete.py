import os
import sys
import uuid
from datetime import UTC, datetime
from io import BytesIO

from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.models import (
    Citizen,
    Complaint,
    ComplaintLog,
    Resolution,
    Worker,
)
from app.models.constants import LogEvent
from app.services import (
    assignment_service,
    complaint_service,
    image_service,
    nsfw_check_service,
    storage_service,
    task_service,
)


def _make_image(fmt: str, size: tuple[int, int] = (64, 48)) -> bytes:
    buffer = BytesIO()
    img = Image.new("RGB", size, color="teal")
    img.save(buffer, format=fmt)
    return buffer.getvalue()


def main() -> None:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            f"Error: check_storage_complete can only run in development (APP_ENV='{app_env}')",
            file=sys.stderr,
        )
        sys.exit(1)

    settings = get_settings()
    engine = get_engine()
    db = Session(engine)

    uploaded_keys: list[str] = []
    checks: list[tuple[int, str, bool]] = []

    def record_check(num: int, desc: str, passed: bool) -> None:
        status_str = "PASS" if passed else "FAIL"
        print(f"Check {num}: {desc} ... {status_str}")
        checks.append((num, desc, passed))

    try:
        init_complaints = db.scalar(select(func.count(Complaint.id))) or 0
        init_resolutions = db.scalar(select(func.count(Resolution.id))) or 0
        init_logs = db.scalar(select(func.count(ComplaintLog.id))) or 0

        worker = db.scalars(
            select(Worker).where(Worker.phone == "+919000000002")
        ).first()
        worker2 = db.scalars(
            select(Worker).where(Worker.phone == "+919000000003")
        ).first()
        assert worker is not None, "Worker +919000000002 not found"
        assert worker2 is not None, "Worker +919000000003 not found"

        citizen = db.scalars(
            select(Citizen).where(Citizen.telegram_chat_id == 999000001)
        ).first()
        if citizen is None:
            citizen = Citizen(
                telegram_chat_id=999000001,
                full_name="Storage Check Citizen",
            )
            db.add(citizen)
            db.flush()

        storage = storage_service.get_storage()
        fixed_now = datetime.now(UTC)

        # ---------------------------------------------------------------------
        # Check 1: storage round trip
        # ---------------------------------------------------------------------
        c1_key = f"checks/rt_{uuid.uuid4().hex}.txt"
        storage.put_object(c1_key, b"storage round trip test", "text/plain")
        uploaded_keys.append(c1_key)
        existed_before = storage.object_exists(c1_key)
        storage.delete_object(c1_key)
        if c1_key in uploaded_keys:
            uploaded_keys.remove(c1_key)
        existed_after = storage.object_exists(c1_key)
        record_check(
            1,
            "storage round trip (put, exists true, delete, exists false)",
            existed_before is True and existed_after is False,
        )

        # ---------------------------------------------------------------------
        # Check 2: presigned_url structure
        # ---------------------------------------------------------------------
        c2_key = "complaints/test/photo.jpg"
        url = storage.presigned_url(c2_key)
        expected_base = settings.s3_public_endpoint_url or settings.s3_endpoint_url or ""
        record_check(
            2,
            "presigned_url starts with configured endpoint and contains X-Amz-Signature",
            url.startswith(expected_base) and "X-Amz-Signature" in url,
        )

        # ---------------------------------------------------------------------
        # Check 3: image_service accepts and rejects
        # ---------------------------------------------------------------------
        c3_ok = True
        try:
            v_jpg = image_service.validate_image(_make_image("JPEG"))
            v_png = image_service.validate_image(_make_image("PNG"))
            v_webp = image_service.validate_image(_make_image("WEBP"))
            if not (v_jpg and v_png and v_webp):
                c3_ok = False
        except Exception:
            c3_ok = False

        gif_buf = BytesIO()
        Image.new("RGB", (64, 48), color="red").save(gif_buf, format="GIF")
        try:
            image_service.validate_image(gif_buf.getvalue())
            c3_ok = False
        except image_service.ImageRejected:
            pass

        try:
            image_service.validate_image(b"just text bytes")
            c3_ok = False
        except image_service.ImageRejected:
            pass

        try:
            image_service.validate_image(b"")
            c3_ok = False
        except image_service.ImageRejected:
            pass

        record_check(
            3,
            "image_service accepts JPEG/PNG/WebP and rejects GIF/text/empty",
            c3_ok,
        )

        # ---------------------------------------------------------------------
        # Check 4: nsfw_check_service allows by default, rejects high score
        # ---------------------------------------------------------------------
        default_verdict = nsfw_check_service.check_image(b"safe image bytes")
        nsfw_check_service.set_classifier(lambda b: 0.95)
        blocked_verdict = nsfw_check_service.check_image(b"flagged image bytes")
        nsfw_check_service.set_classifier(None)
        record_check(
            4,
            "nsfw_check_service allows by default, rejects when classifier returns 0.95",
            default_verdict.allowed is True and blocked_verdict.allowed is False,
        )

        # ---------------------------------------------------------------------
        # Check 5: start_task then complete_task for C1
        # ---------------------------------------------------------------------
        c1 = complaint_service.create_complaint(
            db,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Deep crater on main road",
            latitude=17.68,
            longitude=75.875,
            now=fixed_now,
        )
        asgn1 = assignment_service.assign_complaint(db, c1.id, now=fixed_now)
        assert asgn1 is not None and asgn1.worker_id == worker.id
        task_service.start_task(db, worker, c1.id, now=fixed_now)

        c1_photo_bytes = _make_image("JPEG")
        c1_validated = image_service.validate_image(c1_photo_bytes)
        c1_res = task_service.complete_task(
            db,
            worker,
            c1.id,
            note="Filled pothole with bitumen compound",
            photo_bytes=c1_photo_bytes,
            image=c1_validated,
            now=fixed_now,
        )
        uploaded_keys.append(c1_res.photo_key)

        res_row = db.scalars(
            select(Resolution).where(Resolution.complaint_id == c1.id)
        ).first()
        log_row = db.scalars(
            select(ComplaintLog).where(
                ComplaintLog.complaint_id == c1.id,
                ComplaintLog.event_type == LogEvent.COMPLETED.value,
            )
        ).first()

        c5_passed = (
            c1.status == "Completed"
            and c1.resolved_at is not None
            and res_row is not None
            and res_row.photo_object_key.startswith(f"resolutions/{c1.id}/")
            and asgn1.is_active is False
            and asgn1.end_reason == "completed"
            and log_row is not None
            and storage.object_exists(c1_res.photo_key) is True
        )
        record_check(
            5,
            "complete_task updates Complaint, Resolution, Assignment, Log, and S3 object",
            c5_passed,
        )

        # ---------------------------------------------------------------------
        # Check 6: C1 is gone from active, first in history, get_task raises 404
        # ---------------------------------------------------------------------
        active_items, _ = task_service.list_active_tasks(
            db, worker, page=1, page_size=50, now=fixed_now
        )
        c1_in_active = any(t.id == str(c1.id) for t in active_items)

        history_items, _ = task_service.list_history(
            db, worker, page=1, page_size=50, now=fixed_now
        )
        c1_first_in_history = (
            len(history_items) > 0 and history_items[0].id == str(c1.id)
        )

        get_task_not_found = False
        try:
            task_service.get_task(db, worker, c1.id, now=fixed_now)
        except task_service.TaskNotFound:
            get_task_not_found = True

        record_check(
            6,
            "C1 gone from active, first in history, and get_task raises TaskNotFound",
            (not c1_in_active) and c1_first_in_history and get_task_not_found,
        )

        # ---------------------------------------------------------------------
        # Check 7: TaskConflict and TaskNotFound scenarios
        # ---------------------------------------------------------------------
        c7_pass1 = False
        try:
            task_service.complete_task(
                db,
                worker,
                c1.id,
                note="Attempting duplicate completion",
                photo_bytes=c1_photo_bytes,
                image=c1_validated,
                now=fixed_now,
            )
        except task_service.TaskConflict:
            c7_pass1 = True

        c2 = complaint_service.create_complaint(
            db,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Broken shoulder on curb",
            latitude=17.68,
            longitude=75.875,
            now=fixed_now,
        )
        assignment_service.assign_complaint(db, c2.id, now=fixed_now)

        c7_pass2 = False
        try:
            task_service.complete_task(
                db,
                worker,
                c2.id,
                note="Completing unstarted task",
                photo_bytes=c1_photo_bytes,
                image=c1_validated,
                now=fixed_now,
            )
        except task_service.TaskConflict:
            c7_pass2 = True

        c7_pass3 = False
        try:
            task_service.complete_task(
                db,
                worker2,
                c2.id,
                note="Completing another worker task",
                photo_bytes=c1_photo_bytes,
                image=c1_validated,
                now=fixed_now,
            )
        except task_service.TaskNotFound:
            c7_pass3 = True

        record_check(
            7,
            "conflict on completed C1, conflict on unstarted C2, not-found for other worker",
            c7_pass1 and c7_pass2 and c7_pass3,
        )

        # ---------------------------------------------------------------------
        # Check 8: storage failure propagation & rollback
        # ---------------------------------------------------------------------
        task_service.start_task(db, worker, c2.id, now=fixed_now)

        class FailingStorage:
            def put_object(self, *args, **kwargs):
                raise storage_service.StorageError("Simulated storage offline")

            def delete_object(self, *args, **kwargs):
                pass

        original_get_storage = storage_service.get_storage
        storage_service.get_storage = lambda: FailingStorage()
        storage_error_propagated = False
        try:
            task_service.complete_task(
                db,
                worker,
                c2.id,
                note="Attempt complete with offline storage",
                photo_bytes=c1_photo_bytes,
                image=c1_validated,
                now=fixed_now,
            )
        except storage_service.StorageError:
            storage_error_propagated = True
        finally:
            storage_service.get_storage = original_get_storage

        c2_res_row = db.scalars(
            select(Resolution).where(Resolution.complaint_id == c2.id)
        ).first()
        record_check(
            8,
            "StorageError propagates, C2 remains In-Progress, no Resolution created",
            storage_error_propagated
            and c2.status == "In-Progress"
            and c2_res_row is None,
        )

        # ---------------------------------------------------------------------
        # Check 9: signed task image link
        # ---------------------------------------------------------------------
        c3 = complaint_service.create_complaint(
            db,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Third pothole test case",
            latitude=17.68,
            longitude=75.875,
            now=fixed_now,
        )
        c3_key = f"complaints/{c3.id}/photo.jpg"
        storage.put_object(c3_key, _make_image("JPEG"), "image/jpeg")
        uploaded_keys.append(c3_key)
        c3.image_object_key = c3_key
        db.flush()

        task_c3 = task_service.to_task(c3, fixed_now)
        task_c2 = task_service.to_task(c2, fixed_now)

        record_check(
            9,
            "to_task generates signed URL for C3 with image and None for C2 without image",
            task_c3.image_url is not None
            and task_c3.image_url.startswith(expected_base)
            and "X-Amz-Signature" in task_c3.image_url
            and task_c2.image_url is None,
        )

        # ---------------------------------------------------------------------
        # Check 10: rollback and cleanup check
        # ---------------------------------------------------------------------
        db.rollback()
        for key in uploaded_keys:
            try:
                storage.delete_object(key)
            except Exception:
                pass
        uploaded_keys.clear()

        final_complaints = db.scalar(select(func.count(Complaint.id))) or 0
        final_resolutions = db.scalar(select(func.count(Resolution.id))) or 0
        final_logs = db.scalar(select(func.count(ComplaintLog.id))) or 0

        counts_match = (
            final_complaints == init_complaints
            and final_resolutions == init_resolutions
            and final_logs == init_logs
        )
        record_check(
            10,
            "counts of complaints, resolutions, and logs equal initial counts after rollback",
            counts_match,
        )

    finally:
        db.rollback()
        storage = storage_service.get_storage()
        for key in uploaded_keys:
            try:
                storage.delete_object(key)
            except Exception:
                pass
        db.close()

    failed = [num for num, _, passed in checks if not passed]
    if failed:
        print(f"\n{len(failed)} checks failed: {failed}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"\nAll {len(checks)} checks PASSED successfully.")


if __name__ == "__main__":
    main()
