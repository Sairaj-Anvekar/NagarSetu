import os
import sys
from datetime import UTC, datetime

from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import (
    Citizen,
    Complaint,
    ComplaintAssignment,
    Department,
    Worker,
    Zone,
)
from app.services import assignment_service, complaint_service


def run_checks() -> bool:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            "Error: check_assignment can only be run in development environment "
            f"(APP_ENV='{app_env}')",
            file=sys.stderr,
        )
        sys.exit(1)

    engine = get_engine()
    db = Session(engine)
    all_passed = True

    initial_complaints = db.scalar(select(func.count(Complaint.id))) or 0
    initial_assignments = db.scalar(select(func.count(ComplaintAssignment.id))) or 0

    try:
        citizen = db.scalars(
            select(Citizen).where(Citizen.telegram_chat_id == 999999999)
        ).first()
        if not citizen:
            citizen = Citizen(
                telegram_chat_id=999999999,
                full_name="Check Assignment Citizen",
            )
            db.add(citizen)
            db.flush()

        # Check 1
        try:
            c1 = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Potholes & Road Damage",
                latitude=17.68,
                longitude=75.875,
            )
            a1 = assignment_service.assign_complaint(db, c1.id)
            assert a1 is not None, "Assignment 1 was None"
            w1 = db.get(Worker, a1.worker_id)
            assert w1 is not None and w1.phone == "+919000000002", (
                f"Expected worker +919000000002, got {w1.phone if w1 else None}"
            )
            print("PASS: Check 1 - Potholes complaint assigned to +919000000002")
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 1 - {e}")

        # Check 2
        try:
            c2 = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.675,
                longitude=75.865,
            )
            a2 = assignment_service.assign_complaint(db, c2.id)
            assert a2 is not None, "Assignment 2 was None"
            w2 = db.get(Worker, a2.worker_id)
            assert w2 is not None, "Worker 2 not found"
            assert w2.is_active is True, "Worker is not active"
            assert w2.phone != "+919000000008", (
                "Assigned to inactive worker +919000000008"
            )
            print(
                "PASS: Check 2 - Zone A garbage assigned to active Sanitation worker"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 2 - {e}")

        # Check 3
        try:
            c3 = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.640,
                longitude=75.940,
            )
            a3 = assignment_service.assign_complaint(db, c3.id)
            assert a3 is None, (
                "Expected None assignment for Zone D garbage complaint"
            )
            unassigned_list = assignment_service.list_unassigned(db)
            assert any(u.id == c3.id for u in unassigned_list), (
                "Complaint not found in list_unassigned"
            )
            print("PASS: Check 3 - Zone D garbage unassigned and in list_unassigned")
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 3 - {e}")

        # Check 4
        try:
            c4 = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Streetlight & Power Outage",
                latitude=17.684,
                longitude=75.880,
            )
            a4 = assignment_service.assign_complaint(db, c4.id)
            assert a4 is None, (
                "Expected None assignment for Streetlight complaint"
            )
            print("PASS: Check 4 - Streetlight complaint has no assignment")
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 4 - {e}")

        # Check 5
        try:
            c5 = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.00,
                longitude=75.50,
            )
            assert c5.zone_id is None, "Expected zone_id None outside all zones"
            a5 = assignment_service.assign_complaint(db, c5.id)
            assert a5 is None, (
                "Expected None assignment for out-of-bounds complaint"
            )
            print(
                "PASS: Check 5 - Complaint outside zones has no zone and no assignment"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 5 - {e}")

        # Check 6
        try:
            a6 = assignment_service.assign_complaint(db, c1.id)
            assert a6 is not None and a6.id == a1.id, (
                "Idempotent assign returned different assignment"
            )
            active_count = db.scalar(
                select(func.count(ComplaintAssignment.id)).where(
                    ComplaintAssignment.complaint_id == c1.id,
                    ComplaintAssignment.is_active.is_(True),
                )
            )
            assert active_count == 1, (
                f"Expected exactly 1 active assignment row, found {active_count}"
            )
            print("PASS: Check 6 - Idempotent assign returns same assignment")
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 6 - {e}")

        # Check 7
        try:
            sanitation_dept = db.scalars(
                select(Department).where(Department.name == "Sanitation")
            ).first()
            zone_a = db.scalars(
                select(Zone).where(Zone.name == "Zone A")
            ).first()
            assert sanitation_dept is not None and zone_a is not None

            for i in range(4):
                c_wl = complaint_service.create_complaint(
                    db,
                    citizen_id=citizen.id,
                    category="Solid Waste & Garbage",
                    latitude=17.675,
                    longitude=75.865,
                )
                raw_counts = db.execute(
                    text(
                        """
                        SELECT w.id, COUNT(ca.id) AS wl
                        FROM worker w
                        LEFT JOIN (
                            complaint_assignment ca
                            JOIN complaint c ON c.id = ca.complaint_id
                            AND ca.is_active = true
                            AND c.status != 'Completed'
                        ) ON ca.worker_id = w.id
                        WHERE w.department_id = :dept_id
                        AND w.zone_id = :zone_id
                        AND w.is_active = true
                        GROUP BY w.id
                        """
                    ),
                    {"dept_id": sanitation_dept.id, "zone_id": zone_a.id},
                ).all()
                min_wl = min(row.wl for row in raw_counts)
                assigned = assignment_service.assign_complaint(db, c_wl.id)
                assert assigned is not None, f"Assignment {i} was None"
                chosen_prior_wl = next(
                    row.wl for row in raw_counts if row.id == assigned.worker_id
                )
                assert chosen_prior_wl == min_wl, (
                    f"Chosen worker prior workload {chosen_prior_wl} != min workload {min_wl}"
                )
            print(
                "PASS: Check 7 - Workload rule verified over 4 consecutive complaints"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 7 - {e}")

        # Check 8
        try:
            w01 = db.scalars(
                select(Worker).where(Worker.phone == "+919000000001")
            ).first()
            w07 = db.scalars(
                select(Worker).where(Worker.phone == "+919000000007")
            ).first()
            assert w01 and w07

            # Equalize workload by ending active assignments of w01 and w07
            now_dt = datetime.now(UTC)
            db.execute(
                text(
                    """
                    UPDATE complaint_assignment
                    SET is_active = false, ended_at = :now, end_reason = 'completed'
                    WHERE worker_id IN (:w1_id, :w7_id) AND is_active = true
                    """
                ),
                {"now": now_dt, "w1_id": w01.id, "w7_id": w07.id},
            )
            db.flush()

            c_tie = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.690,
                longitude=75.895,
            )
            a_tie = assignment_service.assign_complaint(db, c_tie.id)
            assert a_tie is not None, "Distance tie-break assignment was None"
            assert a_tie.worker_id == w07.id, (
                f"Expected w07 ({w07.id}), got worker_id {a_tie.worker_id}"
            )
            print(
                "PASS: Check 8 - Distance tie-break selected nearest worker +919000000007"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 8 - {e}")

        # Check 9
        try:
            raised = False
            try:
                with db.begin_nested():
                    dup = ComplaintAssignment(
                        complaint_id=c1.id,
                        worker_id=w07.id,
                        is_active=True,
                    )
                    db.add(dup)
                    db.flush()
            except IntegrityError:
                raised = True
            assert raised, "DB allowed second active assignment"
            print("PASS: Check 9 - DB partial unique index blocks second active assignment")
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 9 - {e}")

        # Check 10
        try:
            w07.is_active = False
            db.flush()
            assignment_service.release_worker_tasks(db, w07.id)

            active_w07_tasks = db.scalar(
                select(func.count(ComplaintAssignment.id)).where(
                    ComplaintAssignment.worker_id == w07.id,
                    ComplaintAssignment.is_active.is_(True),
                )
            )
            assert active_w07_tasks == 0, (
                f"Deactivated worker still has {active_w07_tasks} active tasks"
            )

            old_assign = db.scalars(
                select(ComplaintAssignment).where(
                    ComplaintAssignment.complaint_id == c_tie.id,
                    ComplaintAssignment.worker_id == w07.id,
                )
            ).first()
            reason = old_assign.end_reason if old_assign else None
            assert old_assign is not None and reason == "worker_deactivated", (
                f"Expected end_reason 'worker_deactivated', got {reason}"
            )

            curr_assign = assignment_service.get_active_assignment(db, c_tie.id)
            if curr_assign is not None:
                new_worker = db.get(Worker, curr_assign.worker_id)
                assert new_worker and new_worker.is_active and new_worker.id != w07.id
            print(
                "PASS: Check 10 - Worker deactivation releases tasks and logs end_reason"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 10 - {e}")

        # Check 11
        try:
            w08 = db.scalars(
                select(Worker).where(Worker.phone == "+919000000008")
            ).first()
            assert w08 is not None
            w08.is_active = True
            db.flush()
            assignment_service.assign_pending(
                db, department_id=sanitation_dept.id, zone_id=zone_a.id
            )

            c_avail = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.675,
                longitude=75.865,
            )
            cands = assignment_service.get_candidates(db, c_avail)
            assert any(cand.worker_id == w08.id for cand in cands), (
                "Activated worker +919000000008 not found in candidates"
            )
            print(
                "PASS: Check 11 - Worker activation assigns pending and candidate verified"
            )
        except Exception as e:
            all_passed = False
            print(f"FAIL: Check 11 - {e}")

    finally:
        db.rollback()
        after_complaints = db.scalar(select(func.count(Complaint.id))) or 0
        after_assignments = (
            db.scalar(select(func.count(ComplaintAssignment.id))) or 0
        )

        with Session(engine) as cleanup_db:
            c_throwaway = cleanup_db.scalars(
                select(Citizen).where(Citizen.telegram_chat_id == 999999999)
            ).first()
            if c_throwaway:
                cleanup_db.execute(
                    delete(Citizen).where(Citizen.id == c_throwaway.id)
                )
                cleanup_db.commit()

        db.close()

        # Check 12
        if (
            after_complaints == initial_complaints
            and after_assignments == initial_assignments
        ):
            print(
                f"PASS: Check 12 - Rollback verified: complaints ({after_complaints} == "
                f"{initial_complaints}), assignments ({after_assignments} == {initial_assignments})"
            )
        else:
            all_passed = False
            print(
                f"FAIL: Check 12 - Rollback mismatch: complaints {after_complaints} vs "
                f"{initial_complaints}, assignments {after_assignments} vs {initial_assignments}"
            )

    return all_passed


if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
