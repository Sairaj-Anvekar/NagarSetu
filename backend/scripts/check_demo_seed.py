import os
import sys

from sqlalchemy import func, select

from app.db.session import SessionLocal, get_engine
from app.models import (
    Citizen,
    Complaint,
    ComplaintAssignment,
    ComplaintLog,
    Department,
    Resolution,
    Worker,
)
from app.services import (
    admin_complaint_service,
    admin_stats_service,
    assignment_service,
    complaint_service,
    storage_service,
)
from app.services.admin_complaint_service import ComplaintNotFound


def run_checks() -> int:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            "Error: check_demo_seed can only be run in development environment "
            f"(APP_ENV='{app_env}')",
            file=sys.stderr,
        )
        return 1

    get_engine()
    storage = storage_service.get_storage()

    passed = 0
    failed = 0

    def record_result(
        check_num: int, description: str, ok: bool, error: str = ""
    ) -> None:
        nonlocal passed, failed
        if ok:
            passed += 1
            print(f"[PASS] Check {check_num}: {description}")
        else:
            failed += 1
            msg = f" - {error}" if error else ""
            print(f"[FAIL] Check {check_num}: {description}{msg}")

    with SessionLocal() as db:
        dept = db.scalars(
            select(Department).where(Department.name == "Sanitation")
        ).first()
        if dept is None:
            print("Sanitation department not found in database", file=sys.stderr)
            return 1

        san_complaints = list(
            db.scalars(
                select(Complaint).where(Complaint.department_id == dept.id)
            ).all()
        )

        # Check 1: admin_stats_service.get_stats shows total >= 19 and submitted >= 10,
        # in_progress >= 4, completed >= 5 and overdue >= 5
        try:
            stats = admin_stats_service.get_stats(db, dept.id)
            totals = stats.totals
            ok_1 = (
                totals.total >= 19
                and totals.submitted >= 10
                and totals.in_progress >= 4
                and totals.completed >= 5
                and totals.overdue >= 5
            )
            record_result(
                1,
                "admin_stats_service.get_stats satisfies thresholds "
                "(total>=19, submitted>=10, in_progress>=4, completed>=5, overdue>=5)",
                ok_1,
                f"totals: {totals}",
            )
        except Exception as e:
            record_result(1, "admin_stats_service.get_stats check", False, str(e))

        # Check 2: all four priorities appear among Sanitation complaints
        try:
            priorities = {c.priority for c in san_complaints}
            ok_2 = {"critical", "high", "medium", "low"}.issubset(priorities)
            record_result(
                2,
                "All four priorities (critical, high, medium, low) present in Sanitation",
                ok_2,
                f"found: {priorities}",
            )
        except Exception as e:
            record_result(2, "Priorities check", False, str(e))

        # Check 3: by_zone counts for Zone A, B, C and D are each at least 3
        try:
            zc = {z.zone: z.count for z in stats.by_zone}
            ok_3 = all(
                zc.get(zn, 0) >= 3
                for zn in ["Zone A", "Zone B", "Zone C", "Zone D"]
            )
            record_result(
                3,
                "by_zone counts for Zone A, B, C, and D are each >= 3",
                ok_3,
                f"by_zone: {zc}",
            )
        except Exception as e:
            record_result(3, "By-zone counts check", False, str(e))

        # Check 4: Zone D has at least 3 unassigned Sanitation complaints and
        # Zones A, B and C have none unassigned except complaints in Completed status
        try:
            def has_active_assignment(cid) -> bool:
                return bool(
                    db.scalar(
                        select(
                            select(ComplaintAssignment.id)
                            .where(
                                ComplaintAssignment.complaint_id == cid,
                                ComplaintAssignment.is_active.is_(True),
                            )
                            .exists()
                        )
                    )
                )

            zone_d_san = [c for c in san_complaints if c.zone_id == 4]
            d_unassigned = [
                c for c in zone_d_san if not has_active_assignment(c.id)
            ]

            abc_san = [c for c in san_complaints if c.zone_id in (1, 2, 3)]
            abc_unassigned_active = [
                c
                for c in abc_san
                if c.status != "Completed" and not has_active_assignment(c.id)
            ]

            ok_4 = len(d_unassigned) >= 3 and len(abc_unassigned_active) == 0
            err_msg_4 = (
                f"Zone D unassigned: {len(d_unassigned)}, "
                f"ABC unassigned active: {len(abc_unassigned_active)}"
            )
            record_result(
                4,
                "Zone D has >= 3 unassigned; Zones A, B, C have 0 unassigned active",
                ok_4,
                err_msg_4,
            )
        except Exception as e:
            record_result(
                4, "Unassigned complaints distribution check", False, str(e)
            )

        # Check 5: every Completed Sanitation complaint has 1 valid Resolution
        # with photo in storage and note >= 10 chars
        try:
            completed_san = [
                c for c in san_complaints if c.status == "Completed"
            ]
            ok_5 = len(completed_san) >= 5
            for c in completed_san:
                res_list = list(
                    db.scalars(
                        select(Resolution).where(Resolution.complaint_id == c.id)
                    ).all()
                )
                if len(res_list) != 1:
                    ok_5 = False
                    break
                res = res_list[0]
                if len(res.note) < 10 or not storage.object_exists(
                    res.photo_object_key
                ):
                    ok_5 = False
                    break
            record_result(
                5,
                "Every Completed Sanitation complaint has 1 Resolution with photo and note >= 10",
                ok_5,
            )
        except Exception as e:
            record_result(
                5, "Completed complaints resolution verification", False, str(e)
            )

        # Check 6: every Sanitation complaint with an image key has an existing object
        try:
            ok_6 = True
            for c in san_complaints:
                if c.image_object_key and not storage.object_exists(
                    c.image_object_key
                ):
                    ok_6 = False
                    break
            record_result(
                6,
                "Every Sanitation complaint with an image key exists in object storage",
                ok_6,
            )
        except Exception as e:
            record_result(
                6, "Complaint photo storage verification", False, str(e)
            )

        # Check 7: Sanitation Worker A1 (+919000000001) has at least 3 assignments covering
        # all 3 statuses with >= 3 active; Sanitation Worker A2 has >= 3 active
        try:
            w_a1 = db.scalars(
                select(Worker).where(Worker.phone == "+919000000001")
            ).first()
            w_a2 = db.scalars(
                select(Worker).where(Worker.phone == "+919000000007")
            ).first()

            a1_assigns = list(
                db.scalars(
                    select(ComplaintAssignment).where(
                        ComplaintAssignment.worker_id == w_a1.id
                    )
                ).all()
            )
            a2_assigns = list(
                db.scalars(
                    select(ComplaintAssignment).where(
                        ComplaintAssignment.worker_id == w_a2.id
                    )
                ).all()
            )

            a1_active = [a for a in a1_assigns if a.is_active]
            a2_active = [a for a in a2_assigns if a.is_active]

            a1_statuses = {
                db.get(Complaint, a.complaint_id).status for a in a1_assigns
            }

            ok_7 = (
                len(a1_assigns) >= 3
                and len(a1_active) >= 3
                and {"Submitted", "In-Progress", "Completed"}.issubset(a1_statuses)
                and len(a2_active) >= 3
            )
            err_msg_7 = (
                f"A1 active: {len(a1_active)}, A1 statuses: {a1_statuses}, "
                f"A2 active: {len(a2_active)}"
            )
            record_result(
                7,
                "Worker A1 has >= 3 active covering all 3 statuses; Worker A2 has >= 3 active",
                ok_7,
                err_msg_7,
            )
        except Exception as e:
            record_result(7, "Worker assignment coverage check", False, str(e))

        # Check 8: for every complaint the log events are in chronological order and a Completed
        # complaint's events contain CREATED, CLASSIFIED, CONFIRMED, ASSIGNED, STARTED and COMPLETED
        try:
            citizen = db.scalars(
                select(Citizen).where(Citizen.telegram_chat_id == 900000001)
            ).first()
            demo_complaints = list(
                db.scalars(
                    select(Complaint).where(Complaint.citizen_id == citizen.id)
                ).all()
            )
            ok_8 = True
            for c in demo_complaints:
                logs = list(
                    db.scalars(
                        select(ComplaintLog)
                        .where(ComplaintLog.complaint_id == c.id)
                        .order_by(ComplaintLog.id)
                    ).all()
                )
                for i in range(len(logs) - 1):
                    if logs[i].created_at > logs[i + 1].created_at:
                        ok_8 = False
                        break
                if c.status == "Completed":
                    events = [log_item.event_type for log_item in logs]
                    expected_order = [
                        "CREATED",
                        "CLASSIFIED",
                        "CONFIRMED",
                        "ASSIGNED",
                        "STARTED",
                        "COMPLETED",
                    ]
                    if events != expected_order:
                        ok_8 = False
                        break
            record_result(
                8,
                "Audit logs are in chronological order; Completed have full lifecycle events",
                ok_8,
            )
        except Exception as e:
            record_result(8, "Audit log timeline verification", False, str(e))

        # Check 9: admin_stats_service.get_hotspots for Sanitation returns top cell with count >= 3;
        # get_trends over 14 days shows created counts on at least 5 different days
        try:
            hotspots = admin_stats_service.get_hotspots(db, dept.id)
            top_count = hotspots[0].count if hotspots else 0
            trends = admin_stats_service.get_trends(db, dept.id, days=14)
            days_with_created = sum(1 for tp in trends if tp.created > 0)
            ok_9 = len(hotspots) > 0 and top_count >= 3 and days_with_created >= 5
            record_result(
                9,
                "Hotspots top cell has count >= 3 and 14-day trends have creation on >= 5 days",
                ok_9,
                f"top hotspot count: {top_count}, days with created: {days_with_created}",
            )
        except Exception as e:
            record_result(9, "Hotspots and trends analysis check", False, str(e))

        # Check 10: admin_complaint_service.get_complaint_detail for one Completed complaint returns
        # resolution whose photo_url and image_url start with 'http',
        # and detail of P1 raises ComplaintNotFound for Sanitation admin
        try:
            completed_c = next(
                c for c in san_complaints if c.status == "Completed"
            )
            detail = admin_complaint_service.get_complaint_detail(
                db, dept.id, completed_c.id
            )
            res_url_ok = bool(
                detail.resolution
                and detail.resolution.photo_url.startswith("http")
            )
            img_url_ok = bool(
                detail.image_url and detail.image_url.startswith("http")
            )

            p1 = db.scalars(
                select(Complaint).where(
                    Complaint.category == "Potholes & Road Damage"
                )
            ).first()
            isolation_ok = False
            try:
                admin_complaint_service.get_complaint_detail(db, dept.id, p1.id)
            except ComplaintNotFound:
                isolation_ok = True

            ok_10 = res_url_ok and img_url_ok and isolation_ok
            err_msg_10 = (
                f"res_url_ok={res_url_ok}, img_url_ok={img_url_ok}, "
                f"isolation_ok={isolation_ok}"
            )
            record_result(
                10,
                "Complaint detail returns valid HTTP signed URLs and enforces department isolation",
                ok_10,
                err_msg_10,
            )
        except Exception as e:
            record_result(
                10, "Complaint detail and department isolation check", False, str(e)
            )

        # Check 11: the demo data contains exactly 22 complaints for the demo citizen
        try:
            demo_count = db.scalar(
                select(func.count(Complaint.id)).where(
                    Complaint.citizen_id == citizen.id
                )
            )
            ok_11 = demo_count == 22
            record_result(
                11,
                "Demo data contains exactly 22 complaints for Demo Citizen",
                ok_11,
                f"found: {demo_count}",
            )
        except Exception as e:
            record_result(11, "Demo complaint total count check", False, str(e))

        # Check 12: the real engine still works for new complaints: inside a transaction that is
        # ALWAYS rolled back, create a 'Solid Waste & Garbage' complaint at (17.6752, 75.8652)
        # and assign through assignment_service.assign_complaint, check it goes to active
        # Sanitation worker of Zone A (not worker +919000000008)
        try:
            with db.begin_nested():
                test_c = complaint_service.create_complaint(
                    db,
                    citizen_id=citizen.id,
                    category="Solid Waste & Garbage",
                    description="Verification test complaint",
                    latitude=17.6752,
                    longitude=75.8652,
                )
                assign = assignment_service.assign_complaint(db, test_c.id)
                w = db.get(Worker, assign.worker_id) if assign else None
                ok_12 = (
                    assign is not None
                    and w is not None
                    and w.is_active is True
                    and w.department_id == dept.id
                    and w.zone_id == 1
                    and w.phone != "+919000000008"
                )
                db.rollback()

            record_result(
                12,
                "Real assignment engine dynamically assigns new complaint to active Zone A worker",
                ok_12,
            )
        except Exception as e:
            record_result(12, "Assignment engine test check", False, str(e))

    print(f"\nResult: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_checks())
