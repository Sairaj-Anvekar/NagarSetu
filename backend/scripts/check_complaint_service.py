import os
import re
import secrets
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.db.session import Session, get_engine
from app.models.citizen import Citizen
from app.models.complaint import Complaint
from app.models.complaint_log import ComplaintLog
from app.models.department import Department
from app.models.zone import Zone
from app.services.complaint_service import create_complaint, queue_order_by


def main() -> None:
    if os.getenv("APP_ENV") != "development":
        print("Refusing to run: APP_ENV is not 'development'", file=sys.stderr)
        sys.exit(1)

    engine = get_engine()
    session = Session(engine)

    passed_all = True

    def report(name: str, passed: bool) -> None:
        nonlocal passed_all
        status = "PASS" if passed else "FAIL"
        print(f"{name}: {status}")
        if not passed:
            passed_all = False

    try:
        initial_count = session.scalar(select(func.count(Complaint.id)))

        random_chat_id = secrets.randbelow(8_000_000_000) + 1_000_000_000
        citizen = Citizen(telegram_chat_id=random_chat_id)
        session.add(citizen)
        session.flush()

        now = datetime.now(UTC)

        c1 = create_complaint(
            session,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            latitude=17.68,
            longitude=75.88,
            ai_classification_source="image",
            ai_confidence=0.91,
            now=now,
        )
        c2 = create_complaint(
            session,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            latitude=17.68,
            longitude=75.94,
            ai_classification_source="image",
            now=now,
        )
        c3 = create_complaint(
            session,
            citizen_id=citizen.id,
            category="Streetlight & Power Outage",
            latitude=17.64,
            longitude=75.88,
            ai_classification_source="text",
            now=now,
        )
        c4 = create_complaint(
            session,
            citizen_id=citizen.id,
            category="Illegal Encroachment",
            latitude=17.00,
            longitude=75.50,
            ai_classification_source="text",
            now=now,
        )

        # Check 1: zone resolution
        z1 = session.get(Zone, c1.zone_id).name if c1.zone_id else None
        z2 = session.get(Zone, c2.zone_id).name if c2.zone_id else None
        z3 = session.get(Zone, c3.zone_id).name if c3.zone_id else None
        check_1 = (
            z1 == "Zone A"
            and z2 == "Zone B"
            and z3 == "Zone C"
            and c4.zone_id is None
        )
        report("Zone resolution check", check_1)

        # Check 2: tracking code pattern
        pattern = re.compile(r"^GRV-\d{4}-[A-HJ-NP-Z2-9]{4}$")
        codes = [c1.tracking_code, c2.tracking_code, c3.tracking_code, c4.tracking_code]
        check_2 = all(
            len(code) == 13 and pattern.match(code) is not None for code in codes
        )
        report("Tracking code format check", check_2)

        # Check 3: departments
        d1 = session.get(Department, c1.department_id).name
        d2 = session.get(Department, c2.department_id).name
        d3 = session.get(Department, c3.department_id).name
        d4 = session.get(Department, c4.department_id).name
        check_3 = [d1, d2, d3, d4] == [
            "Sanitation",
            "Public Works Department",
            "MSEB",
            "Encroachments Department",
        ]
        report("Department assignment check", check_3)

        # Check 4: priorities
        check_4 = [c1.priority, c2.priority, c3.priority, c4.priority] == [
            "medium",
            "high",
            "medium",
            "low",
        ]
        report("Priority assignment check", check_4)

        # Check 5: SLA deadlines
        durations = [
            (c1.sla_deadline - now).total_seconds() / 3600,
            (c2.sla_deadline - now).total_seconds() / 3600,
            (c3.sla_deadline - now).total_seconds() / 3600,
            (c4.sla_deadline - now).total_seconds() / 3600,
        ]
        check_5 = durations == [48.0, 72.0, 48.0, 168.0]
        report("SLA deadline calculation check", check_5)

        # Check 6: 3 log rows per complaint ordered CREATED, CLASSIFIED, CONFIRMED
        check_6 = True
        for c in [c1, c2, c3, c4]:
            logs = session.scalars(
                select(ComplaintLog)
                .where(ComplaintLog.complaint_id == c.id)
                .order_by(ComplaintLog.id)
            ).all()
            if len(logs) != 3:
                check_6 = False
                break
            if [log.event_type for log in logs] != ["CREATED", "CLASSIFIED", "CONFIRMED"]:
                check_6 = False
                break
        report("Audit log entries check", check_6)

        # Check 7: queue test
        c4.sla_deadline = now - timedelta(hours=1)
        session.flush()

        ordered_ids = session.scalars(
            select(Complaint.id)
            .where(Complaint.id.in_([c1.id, c2.id, c3.id, c4.id]))
            .order_by(*queue_order_by(now))
        ).all()
        check_7 = (
            len(ordered_ids) == 4
            and ordered_ids[0] == c4.id
            and ordered_ids.index(c2.id) < ordered_ids.index(c1.id)
            and ordered_ids.index(c2.id) < ordered_ids.index(c3.id)
        )
        report("Queue prioritization check", check_7)

        # Check 8: rollback isolation
        session.rollback()
        final_count = session.scalar(select(func.count(Complaint.id)))
        check_8 = final_count == initial_count
        report("Rollback isolation check", check_8)

    finally:
        session.rollback()
        session.close()

    if not passed_all:
        sys.exit(1)


if __name__ == "__main__":
    main()

