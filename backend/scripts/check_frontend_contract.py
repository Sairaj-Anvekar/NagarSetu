import sys
from typing import Any

from sqlalchemy import func, select, text

from app.core.config import get_settings
from app.db.session import get_db
from app.models import Admin, Citizen, Complaint, ComplaintLog, TriageQueue, Worker
from app.services import (
    admin_stats_service,
    admin_triage_service,
    auth_service,
    complaint_service,
    geocode_service,
    triage_service,
    worker_service,
)


def run_checks() -> bool:
    settings = get_settings()
    if settings.app_env != "development":
        print(f"FAIL: Refusing to run in environment '{settings.app_env}' (must be 'development')")
        return False

    db = next(get_db())
    all_passed = True

    admin = db.scalar(select(Admin).where(Admin.username == "admin"))
    if not admin:
        print("FAIL: Check: 'admin' user not found")
        return False

    # Check 1: get_stats unassigned_by_zone
    try:
        stats = admin_stats_service.get_stats(db, admin.department_id)
        zone_entries = [(z.zone, z.count) for z in stats.unassigned_by_zone]
        expected_zones = [
            ("Zone A", 0),
            ("Zone B", 0),
            ("Zone C", 0),
            ("Zone D", 3),
        ]
        if zone_entries == expected_zones:
            print("PASS: Check 1: unassigned_by_zone has Zone A-D with Zone D=3 and others 0")
        else:
            print(f"FAIL: Check 1: unexpected unassigned_by_zone: {zone_entries}")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 1: {type(e).__name__}: {e}")
        all_passed = False

    # Check 2: get_hotspots with monkeypatched geocoder
    orig_reverse = geocode_service.reverse_geocode
    try:
        call_count = 0

        def fake_geo(lat: float, lon: float, client: Any = None) -> str:
            nonlocal call_count
            call_count += 1
            return f"Label {call_count}"

        geocode_service.reverse_geocode = fake_geo
        cells = admin_stats_service.get_hotspots(db, admin.department_id, days=30)

        valid_zone_names = {"Zone A", "Zone B", "Zone C", "Zone D"}
        ids = [c.id for c in cells]
        unique_ids = len(ids) == len(set(ids))
        all_have_id = all(bool(c.id) for c in cells)
        all_have_label = all(bool(c.area_label) for c in cells)
        valid_zones = all(c.zone is None or c.zone in valid_zone_names for c in cells)

        # First 5 cells carry "Label <n>"
        first_5_labeled = all(
            c.area_label == f"Label {i + 1}" for i, c in enumerate(cells[:5])
        )
        # Later cells end with " area" or equal "Unnamed area"
        rest_labeled = all(
            c.area_label.endswith(" area") or c.area_label == "Unnamed area"
            for c in cells[5:]
        )

        if (
            unique_ids
            and all_have_id
            and all_have_label
            and valid_zones
            and first_5_labeled
            and rest_labeled
        ):
            print("PASS: Check 2: get_hotspots ids unique, top 5 labelled, rest fallback")
        else:
            print("FAIL: Check 2: hotspot cell attributes or labels failed validation")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 2: {type(e).__name__}: {e}")
        all_passed = False
    finally:
        geocode_service.reverse_geocode = orig_reverse

    # Initial row counts for rollback validation
    start_complaint = db.scalar(select(func.count(Complaint.id)))
    start_triage = db.scalar(select(func.count(TriageQueue.id)))
    start_log = db.scalar(select(func.count(ComplaintLog.id)))

    # Check 3: write inside transaction and roll back
    savepoint = db.begin_nested()
    try:
        citizen = db.scalar(select(Citizen))
        if not citizen:
            raise RuntimeError("No citizen found in database")

        complaint = complaint_service.create_complaint(
            db,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            latitude=17.6752,
            longitude=75.8652,
            ai_classification_source="image",
            ai_confidence=0.45,
        )
        triage = triage_service.create_triage_entry(
            db, complaint, "Solid Waste & Garbage", 0.45
        )

        # list_triage pending
        items, _ = admin_triage_service.list_triage(
            db, admin.department_id, status="pending"
        )
        pending_item = next(
            (it for it in items if it.complaint_id == str(complaint.id)), None
        )
        pending_ok = (
            pending_item is not None
            and pending_item.zone is not None
            and pending_item.zone.name == "Zone A"
            and pending_item.classifier_source is not None
            and pending_item.reviewed_at is None
        )

        # review_triage and list_triage reviewed
        admin_triage_service.review_triage(
            db, admin, triage.id, "Solid Waste & Garbage"
        )
        items_rev, _ = admin_triage_service.list_triage(
            db, admin.department_id, status="reviewed"
        )
        reviewed_item = next(
            (it for it in items_rev if it.complaint_id == str(complaint.id)), None
        )
        reviewed_ok = (
            reviewed_item is not None and reviewed_item.reviewed_at is not None
        )

        if pending_ok and reviewed_ok:
            print("PASS: Check 3: list_triage returns enriched pending and reviewed items")
        else:
            print("FAIL: Check 3: pending or reviewed triage item attributes mismatch")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 3: {type(e).__name__}: {e}")
        all_passed = False
    finally:
        savepoint.rollback()

    # Check 4: auth_service.build_token_response for worker and admin
    try:
        worker = db.scalar(
            select(Worker).where(Worker.phone == "+919000000001")
        )
        if not worker:
            raise RuntimeError("Worker +919000000001 not found")

        resp_worker = auth_service.build_token_response(worker, role="worker")
        resp_admin = auth_service.build_token_response(admin, role="admin")

        worker_ok = (
            resp_worker.user.department is not None
            and resp_worker.user.department.name == "Sanitation"
            and resp_worker.user.zone is not None
            and resp_worker.user.zone.name == "Zone A"
        )
        admin_ok = (
            resp_admin.user.department is not None
            and resp_admin.user.department.name == "Sanitation"
            and resp_admin.user.zone is None
        )

        if worker_ok and admin_ok:
            print("PASS: Check 4: worker has Sanitation/Zone A, admin has Sanitation/None")
        else:
            print("FAIL: Check 4: token response department/zone mismatch")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 4: {type(e).__name__}: {e}")
        all_passed = False

    # Check 5: worker_service.active_task_counts for 8 demo workers
    try:
        demo_workers = db.scalars(
            select(Worker)
            .where(Worker.phone.like("+9190000000%"))
            .order_by(Worker.id)
        ).all()
        worker_ids = [w.id for w in demo_workers]

        counts = worker_service.active_task_counts(db, worker_ids)
        raw_rows = db.execute(
            text(
                "SELECT ca.worker_id, count(ca.id) "
                "FROM complaint_assignment ca "
                "JOIN complaint c ON ca.complaint_id = c.id "
                "WHERE ca.is_active = true AND c.status != 'Completed' "
                "AND ca.worker_id = ANY(:wids) "
                "GROUP BY ca.worker_id"
            ),
            {"wids": worker_ids},
        ).all()
        raw_counts = {int(r[0]): int(r[1]) for r in raw_rows}

        worker_a1 = next((w for w in demo_workers if w.phone == "+919000000001"), None)
        worker_a2 = next((w for w in demo_workers if w.phone == "+919000000007"), None)

        counts_match = counts == raw_counts
        a1_ok = worker_a1 is not None and counts.get(worker_a1.id) == 3
        a2_ok = worker_a2 is not None and counts.get(worker_a2.id) == 3

        if len(demo_workers) == 8 and counts_match and a1_ok and a2_ok:
            print("PASS: Check 5: active_task_counts matches raw SQL, A1=3 and A2=3")
        else:
            print("FAIL: Check 5: active_task_counts mismatch with raw SQL or target workers")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 5: {type(e).__name__}: {e}")
        all_passed = False

    # Check 6: Row counts after rollback
    try:
        end_complaint = db.scalar(select(func.count(Complaint.id)))
        end_triage = db.scalar(select(func.count(TriageQueue.id)))
        end_log = db.scalar(select(func.count(ComplaintLog.id)))

        counts_identical = (
            start_complaint == end_complaint
            and start_triage == end_triage
            and start_log == end_log
        )
        if counts_identical:
            print("PASS: Check 6: row counts match starting counts after rollback")
        else:
            print("FAIL: Check 6: database row counts changed despite rollback")
            all_passed = False
    except Exception as e:
        print(f"FAIL: Check 6: {type(e).__name__}: {e}")
        all_passed = False

    return all_passed


if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
