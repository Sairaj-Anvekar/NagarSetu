import os
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import Citizen, Complaint, ComplaintAssignment, ComplaintLog, Worker
from app.models.constants import (
    AssignmentEndReason,
    ComplaintStatus,
    LogEvent,
)
from app.services import assignment_service, complaint_service, task_service


def main() -> None:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(f"Refusing to run: APP_ENV must be 'development', got '{app_env}'")
        sys.exit(1)

    engine = get_engine()
    session = Session(engine)

    all_passed = True

    try:
        start_complaint_count = (
            session.scalar(select(func.count(Complaint.id))) or 0
        )
        start_assignment_count = (
            session.scalar(select(func.count(ComplaintAssignment.id))) or 0
        )
        start_log_count = (
            session.scalar(select(func.count(ComplaintLog.id))) or 0
        )

        # Retrieve workers
        worker_pw = session.scalars(
            select(Worker).where(Worker.phone == "+919000000002")
        ).first()
        worker_san = session.scalars(
            select(Worker).where(Worker.phone == "+919000000003")
        ).first()

        if not worker_pw or not worker_san:
            print("FAIL: Seed workers not found")
            sys.exit(1)

        # Create throwaway citizen
        citizen = Citizen(
            telegram_chat_id=987654321,
            telegram_username="check_worker_tasks_citizen",
            full_name="Check Worker Tasks Citizen",
        )
        session.add(citizen)
        session.flush()

        # Three "Potholes & Road Damage" complaints in Zone A (17.68, 75.875)
        # P1 normal
        p1 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Pothole P1 normal",
            latitude=17.68,
            longitude=75.875,
        )
        assignment_service.assign_complaint(session, p1.id)

        # P2 with sla_deadline set to one hour in the past
        p2 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Pothole P2 overdue",
            latitude=17.68,
            longitude=75.875,
        )
        p2.sla_deadline = datetime.now(UTC) - timedelta(hours=1)
        session.flush()
        assignment_service.assign_complaint(session, p2.id)

        # P3 with priority "critical" (set by attribute and flush)
        p3 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            description="Pothole P3 critical",
            latitude=17.68,
            longitude=75.875,
        )
        p3.priority = "critical"
        session.flush()
        assignment_service.assign_complaint(session, p3.id)

        # One "Solid Waste & Garbage" complaint G in Zone B (17.682, 75.938)
        g = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            description="Garbage G in Zone B",
            latitude=17.682,
            longitude=75.938,
        )
        assignment_service.assign_complaint(session, g.id)

        # Check (1): list_active_tasks for PW worker contains P1, P2 and P3 and only potholes
        active_tasks, _ = task_service.list_active_tasks(
            session, worker_pw, page=1, page_size=50
        )
        active_ids = {t.id for t in active_tasks}
        c1_has_all = {str(p1.id), str(p2.id), str(p3.id)}.issubset(active_ids)
        c1_only_potholes = all(
            t.category == "Potholes & Road Damage" for t in active_tasks
        )
        c1_pass = c1_has_all and c1_only_potholes
        status_msg = "PASS" if c1_pass else "FAIL"
        print(f"Check 1 (active tasks contain P1, P2, P3 and only potholes): {status_msg}")
        if not c1_pass:
            all_passed = False

        # Check (2): among P1, P2, P3 the order is P2 (overdue) first, then P3 (critical), then P1
        filtered_order = [
            t.id
            for t in active_tasks
            if t.id in {str(p1.id), str(p2.id), str(p3.id)}
        ]
        expected_order = [str(p2.id), str(p3.id), str(p1.id)]
        c2_pass = filtered_order == expected_order
        status_msg = "PASS" if c2_pass else "FAIL"
        print(f"Check 2 (queue ordering P2 overdue > P3 critical > P1 normal): {status_msg}")
        if not c2_pass:
            all_passed = False

        # Check (3): get_task for PW worker raises TaskNotFound for G (assigned to Zone B worker)
        try:
            task_service.get_task(session, worker_pw, g.id)
            c3_pass = False
        except task_service.TaskNotFound:
            c3_pass = True
        status_msg = "PASS" if c3_pass else "FAIL"
        print(f"Check 3 (get_task for G raises TaskNotFound for PW worker): {status_msg}")
        if not c3_pass:
            all_passed = False

        # Check (4): start_task(P1) returns status "In-Progress" and STARTED log row exists
        t1 = task_service.start_task(session, worker_pw, p1.id)
        log_started = session.scalars(
            select(ComplaintLog).where(
                ComplaintLog.complaint_id == p1.id,
                ComplaintLog.event_type == LogEvent.STARTED.value,
            )
        ).first()
        c4_pass = (t1.status == "In-Progress") and (log_started is not None)
        status_msg = "PASS" if c4_pass else "FAIL"
        print(f"Check 4 (start_task(P1) sets In-Progress and logs STARTED): {status_msg}")
        if not c4_pass:
            all_passed = False

        # Check (5): start_task(P1) a second time raises TaskConflict
        try:
            task_service.start_task(session, worker_pw, p1.id)
            c5_pass = False
        except task_service.TaskConflict:
            c5_pass = True
        status_msg = "PASS" if c5_pass else "FAIL"
        print(f"Check 5 (start_task(P1) second time raises TaskConflict): {status_msg}")
        if not c5_pass:
            all_passed = False

        # Check (6): defer_task on In-Progress P1
        d1 = task_service.defer_task(
            session,
            worker_pw,
            p1.id,
            reason="Equipment breakdown requires specialized assistance",
        )
        old_assign = session.scalars(
            select(ComplaintAssignment).where(
                ComplaintAssignment.complaint_id == p1.id,
                ComplaintAssignment.worker_id == worker_pw.id,
            )
        ).first()
        log_deferred = session.scalars(
            select(ComplaintLog).where(
                ComplaintLog.complaint_id == p1.id,
                ComplaintLog.event_type == LogEvent.DEFERRED.value,
            )
        ).first()
        active_assign_p1 = assignment_service.get_active_assignment(
            session, p1.id
        )
        unassigned_list = assignment_service.list_unassigned(session)
        unassigned_ids = {c.id for c in unassigned_list}

        c6_pass = (
            d1.status == "Submitted"
            and d1.carry_forward_count == 1
            and p1.carry_forward_count == 1
            and p1.status == "Submitted"
            and old_assign is not None
            and not old_assign.is_active
            and old_assign.end_reason == AssignmentEndReason.DEFERRED.value
            and log_deferred is not None
            and active_assign_p1 is None
            and p1.id in unassigned_ids
        )
        status_msg = "PASS" if c6_pass else "FAIL"
        print(f"Check 6 (defer_task P1 transitions to Submitted, carry_forward=1): {status_msg}")
        if not c6_pass:
            all_passed = False

        # Check (7): defer_task on P3 (never started): status stays "Submitted", carry_forward=1
        d3 = task_service.defer_task(
            session,
            worker_pw,
            p3.id,
            reason="Blocked access road cannot be cleared today",
        )
        c7_pass = (
            d3.status == "Submitted"
            and d3.carry_forward_count == 1
            and p3.status == "Submitted"
            and p3.carry_forward_count == 1
        )
        status_msg = "PASS" if c7_pass else "FAIL"
        print(f"Check 7 (defer_task P3 stays Submitted, carry_forward=1): {status_msg}")
        if not c7_pass:
            all_passed = False

        # Check (8): Zone B worker calling defer_task on P2 raises TaskNotFound
        try:
            task_service.defer_task(
                session, worker_san, p2.id, reason="Not my assigned ticket"
            )
            c8_pass = False
        except task_service.TaskNotFound:
            c8_pass = True
        status_msg = "PASS" if c8_pass else "FAIL"
        print(f"Check 8 (Zone B worker calling defer_task on P2 raises TaskNotFound): {status_msg}")
        if not c8_pass:
            all_passed = False

        # Check (9): simulate a completion of P2 inside the transaction
        now_completion = datetime.now(UTC)
        p2.status = ComplaintStatus.COMPLETED.value
        p2.resolved_at = now_completion
        p2_assign = assignment_service.get_active_assignment(session, p2.id)
        if p2_assign:
            p2_assign.is_active = False
            p2_assign.ended_at = now_completion
            p2_assign.end_reason = AssignmentEndReason.COMPLETED.value
        session.flush()

        active_after, _ = task_service.list_active_tasks(
            session, worker_pw, page=1, page_size=50
        )
        p2_in_active = str(p2.id) in {t.id for t in active_after}

        history_list, _ = task_service.list_history(
            session, worker_pw, page=1, page_size=50
        )
        p2_first_in_history = (
            len(history_list) > 0
            and history_list[0].id == str(p2.id)
            and history_list[0].resolved_at is not None
        )

        try:
            task_service.get_task(session, worker_pw, p2.id)
            get_task_not_found = False
        except task_service.TaskNotFound:
            get_task_not_found = True

        try:
            task_service.start_task(session, worker_pw, p2.id)
            start_task_conflict = False
        except task_service.TaskConflict:
            start_task_conflict = True

        c9_pass = (
            not p2_in_active
            and p2_first_in_history
            and get_task_not_found
            and start_task_conflict
        )
        status_msg = "PASS" if c9_pass else "FAIL"
        print(f"Check 9 (completed P2 leaves active queue, leads history): {status_msg}")
        if not c9_pass:
            all_passed = False

        # Rollback and Check (10): counts after rollback equal starting counts
        session.rollback()

        after_complaint_count = (
            session.scalar(select(func.count(Complaint.id))) or 0
        )
        after_assignment_count = (
            session.scalar(select(func.count(ComplaintAssignment.id))) or 0
        )
        after_log_count = (
            session.scalar(select(func.count(ComplaintLog.id))) or 0
        )

        c10_pass = (
            after_complaint_count == start_complaint_count
            and after_assignment_count == start_assignment_count
            and after_log_count == start_log_count
        )
        status_msg = "PASS" if c10_pass else "FAIL"
        print(f"Check 10 (database rows cleanly rolled back to starting counts): {status_msg}")
        if not c10_pass:
            all_passed = False

    finally:
        session.rollback()
        session.close()

    if not all_passed:
        print("FAIL: One or more checks failed.")
        sys.exit(1)

    print("PASS: All 10 worker task workflow checks passed!")


if __name__ == "__main__":
    main()
