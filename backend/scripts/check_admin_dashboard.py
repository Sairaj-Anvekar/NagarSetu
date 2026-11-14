import csv
import io
import sys
from datetime import UTC, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.categories import UnknownCategory
from app.core.config import get_settings
from app.db.session import get_engine
from app.models import (
    Admin,
    Citizen,
    Complaint,
    ComplaintAssignment,
    ComplaintLog,
    Department,
    TriageQueue,
    Zone,
)
from app.schemas.admin import ComplaintFilters
from app.services import (
    admin_complaint_service,
    admin_stats_service,
    admin_triage_service,
    assignment_service,
    complaint_service,
)
from app.services.admin_complaint_service import ComplaintNotFound
from app.services.triage_service import create_triage_entry

IST = timezone(timedelta(hours=5, minutes=30))
FORBIDDEN_KEYS = {"citizen", "citizen_id", "telegram", "chat_id"}


def assert_no_forbidden_keys(data: Any) -> None:
    if isinstance(data, dict):
        for k, v in data.items():
            if k in FORBIDDEN_KEYS:
                raise AssertionError(f"Found forbidden key '{k}' in response")
            assert_no_forbidden_keys(v)
    elif isinstance(data, list):
        for item in data:
            assert_no_forbidden_keys(item)


def find_cell(cells: list[Any], lat: float, lon: float, tol: float = 1e-6) -> Any:
    for c in cells:
        if abs(c.latitude - lat) < tol and abs(c.longitude - lon) < tol:
            return c
    return None


def main() -> None:
    settings = get_settings()
    if settings.app_env != "development":
        print("FAIL: APP_ENV must be 'development'")
        sys.exit(1)

    engine = get_engine()
    session = Session(engine)
    failures: list[str] = []

    def pass_check(num: int, title: str) -> None:
        print(f"PASS: ({num}) {title}")

    def fail_check(num: int, title: str, reason: str) -> None:
        print(f"FAIL: ({num}) {title} - {reason}")
        failures.append(f"({num}) {title}")

    try:
        sanitation_dept = session.execute(
            select(Department).where(Department.name == "Sanitation")
        ).scalar_one_or_none()
        pwd_dept = session.execute(
            select(Department).where(Department.name == "Public Works Department")
        ).scalar_one_or_none()

        if not sanitation_dept or not pwd_dept:
            print("FAIL: Required departments not found")
            sys.exit(1)

        admin = session.execute(
            select(Admin).where(Admin.username == "admin")
        ).scalar_one_or_none()
        if not admin or admin.department_id != sanitation_dept.id:
            print("FAIL: Admin user not found or department is not Sanitation")
            sys.exit(1)

        zones_by_name = {
            z.name: z.id
            for z in session.execute(select(Zone)).scalars().all()
        }

        fixed_now = datetime.now(UTC)

        base_counts = {
            "complaint": session.scalar(select(func.count(Complaint.id))) or 0,
            "citizen": session.scalar(select(func.count(Citizen.id))) or 0,
            "complaint_log": session.scalar(select(func.count(ComplaintLog.id))) or 0,
            "complaint_assignment": (
                session.scalar(select(func.count(ComplaintAssignment.id))) or 0
            ),
            "triage_queue": session.scalar(select(func.count(TriageQueue.id))) or 0,
        }

        before_stats = admin_stats_service.get_stats(
            session, sanitation_dept.id, now=fixed_now
        )
        before_trends = admin_stats_service.get_trends(
            session, sanitation_dept.id, 3, now=fixed_now
        )
        before_hot = admin_stats_service.get_hotspots(
            session, sanitation_dept.id, 30, now=fixed_now
        )
        before_triage = (
            session.scalar(
                select(func.count(TriageQueue.id))
                .join(Complaint, TriageQueue.complaint_id == Complaint.id)
                .where(
                    TriageQueue.status == "pending",
                    Complaint.department_id == sanitation_dept.id,
                )
            )
            or 0
        )

        citizen = Citizen(
            telegram_chat_id=987654321,
            telegram_username="throwaway_test",
            full_name="Test Citizen",
        )
        session.add(citizen)
        session.flush()

        g1 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            latitude=17.6752,
            longitude=75.8652,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=fixed_now,
        )
        assignment_service.assign_complaint(session, g1.id, now=fixed_now)

        g2 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            description="=cmd|' /C calc'!A0",
            latitude=17.6748,
            longitude=75.8648,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=fixed_now,
        )
        g2.sla_deadline = fixed_now - timedelta(hours=1)
        session.flush()
        assignment_service.assign_complaint(session, g2.id, now=fixed_now)

        w1 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Waterlogging & Drainage",
            latitude=17.668,
            longitude=75.858,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=fixed_now,
        )
        assignment_service.assign_complaint(session, w1.id, now=fixed_now)

        g3 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Solid Waste & Garbage",
            latitude=17.640,
            longitude=75.940,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=fixed_now,
        )
        assignment_service.assign_complaint(session, g3.id, now=fixed_now)

        p1 = complaint_service.create_complaint(
            session,
            citizen_id=citizen.id,
            category="Potholes & Road Damage",
            latitude=17.68,
            longitude=75.875,
            ai_confidence=0.9,
            ai_classification_source="image",
            now=fixed_now,
        )
        assignment_service.assign_complaint(session, p1.id, now=fixed_now)

        w1.status = "Completed"
        w1.resolved_at = fixed_now
        w1_assignments = (
            session.execute(
                select(ComplaintAssignment).where(
                    ComplaintAssignment.complaint_id == w1.id,
                    ComplaintAssignment.is_active.is_(True),
                )
            )
            .scalars()
            .all()
        )
        for a in w1_assignments:
            a.is_active = False
            a.ended_at = fixed_now
            a.end_reason = "completed"
        session.flush()

        after_stats = admin_stats_service.get_stats(
            session, sanitation_dept.id, now=fixed_now
        )

        try:
            assert after_stats.totals.total - before_stats.totals.total == 4
            assert after_stats.totals.submitted - before_stats.totals.submitted == 3
            assert after_stats.totals.completed - before_stats.totals.completed == 1
            assert after_stats.totals.overdue - before_stats.totals.overdue == 1
            assert after_stats.totals.unassigned - before_stats.totals.unassigned == 1

            cat_dict_before = {c.category: c.count for c in before_stats.by_category}
            cat_dict_after = {c.category: c.count for c in after_stats.by_category}
            assert (
                cat_dict_after["Solid Waste & Garbage"]
                - cat_dict_before.get("Solid Waste & Garbage", 0)
                == 3
            )
            assert (
                cat_dict_after["Waterlogging & Drainage"]
                - cat_dict_before.get("Waterlogging & Drainage", 0)
                == 1
            )
            assert "Potholes & Road Damage" not in cat_dict_after

            zone_dict_before = {z.zone: z.count for z in before_stats.by_zone}
            zone_dict_after = {z.zone: z.count for z in after_stats.by_zone}
            assert zone_dict_after["Zone A"] - zone_dict_before.get("Zone A", 0) == 3
            assert zone_dict_after["Zone D"] - zone_dict_before.get("Zone D", 0) == 1
            pass_check(1, "Stats deltas and breakdowns for Sanitation")
        except Exception as e:
            fail_check(1, "Stats deltas and breakdowns for Sanitation", str(e))

        try:
            assert after_stats.totals.total - before_stats.totals.total == 4
            pass_check(2, "Public Works complaint P1 excluded from Sanitation stats")
        except Exception as e:
            fail_check(2, "Public Works complaint P1 excluded", str(e))

        try:
            after_trends = admin_stats_service.get_trends(
                session, sanitation_dept.id, 3, now=fixed_now
            )
            assert len(after_trends) == 3
            today_str = fixed_now.astimezone(IST).date().isoformat()
            assert after_trends[-1].date == today_str
            assert (
                after_trends[-1].created - before_trends[-1].created == 4
            )
            assert (
                after_trends[-1].completed - before_trends[-1].completed == 1
            )
            try:
                admin_stats_service.get_trends(
                    session, sanitation_dept.id, 0, now=fixed_now
                )
                raise AssertionError("Should have raised ValueError for days=0")
            except ValueError:
                pass
            try:
                admin_stats_service.get_trends(
                    session, sanitation_dept.id, 91, now=fixed_now
                )
                raise AssertionError("Should have raised ValueError for days=91")
            except ValueError:
                pass
            pass_check(3, "Daily resolution trends and boundary validations")
        except Exception as e:
            fail_check(3, "Trends validation", str(e))

        try:
            after_hot = admin_stats_service.get_hotspots(
                session, sanitation_dept.id, 30, now=fixed_now
            )
            cell_before = find_cell(before_hot, 17.675, 75.865)
            cnt_before = cell_before.count if cell_before else 0
            cell_after = find_cell(after_hot, 17.675, 75.865)
            assert cell_after is not None
            assert cell_after.count - cnt_before == 2

            wl_hot = admin_stats_service.get_hotspots(
                session,
                sanitation_dept.id,
                30,
                category="Waterlogging & Drainage",
                now=fixed_now,
            )
            assert find_cell(wl_hot, 17.675, 75.865) is None

            try:
                admin_stats_service.get_hotspots(
                    session, sanitation_dept.id, 30, category="Bogus", now=fixed_now
                )
                raise AssertionError("Should have raised UnknownCategory")
            except UnknownCategory:
                pass
            pass_check(4, "Spatial hotspot clustering and category filtering")
        except Exception as e:
            fail_check(4, "Hotspots clustering", str(e))

        try:
            items_g1, total_g1 = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(q=g1.tracking_code.lower()),
                now=fixed_now,
            )
            assert total_g1 == 1 and items_g1[0].id == str(g1.id)

            items_pct, total_pct = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(q="%"),
                now=fixed_now,
            )
            assert total_pct == 0
            pass_check(5, "Tracking code search and wildcard escaping")
        except Exception as e:
            fail_check(5, "Tracking code search and escaping", str(e))

        try:
            our_ids = {str(g1.id), str(g2.id), str(w1.id), str(g3.id), str(p1.id)}

            items_c, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(status="Completed"),
                now=fixed_now,
            )
            c_ids = {it.id for it in items_c}
            assert str(w1.id) in c_ids and str(g1.id) not in c_ids

            items_od, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(overdue=True),
                now=fixed_now,
            )
            od_ids = {it.id for it in items_od}
            assert str(g2.id) in od_ids and str(g1.id) not in od_ids

            items_un, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(unassigned=True),
                now=fixed_now,
            )
            un_ids = {it.id for it in items_un}
            assert str(g3.id) in un_ids and str(g1.id) not in un_ids

            items_wl, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(category="Waterlogging & Drainage"),
                now=fixed_now,
            )
            wl_ids = {it.id for it in items_wl}
            assert str(w1.id) in wl_ids and (wl_ids & our_ids) == {str(w1.id)}

            items_zd, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(zone_id=zones_by_name["Zone D"]),
                now=fixed_now,
            )
            zd_ids = {it.id for it in items_zd}
            assert str(g3.id) in zd_ids and (zd_ids & our_ids) == {str(g3.id)}
            pass_check(6, "Complaint query filter combinations")
        except Exception as e:
            fail_check(6, "Complaint query filters", str(e))

        try:
            items_p1, total_p1 = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(q=p1.tracking_code),
                now=fixed_now,
            )
            assert total_p1 == 0

            try:
                admin_complaint_service.get_complaint_detail(
                    session, sanitation_dept.id, p1.id, now=fixed_now
                )
                raise AssertionError("Should have raised ComplaintNotFound")
            except ComplaintNotFound:
                pass
            pass_check(7, "Department isolation on queries and detail")
        except Exception as e:
            fail_check(7, "Department isolation", str(e))

        try:
            items_all, _ = admin_complaint_service.list_complaints(
                session,
                sanitation_dept.id,
                ComplaintFilters(),
                page=1,
                page_size=100,
                now=fixed_now,
            )
            g1_pos = next(i for i, it in enumerate(items_all) if it.id == str(g1.id))
            g2_pos = next(i for i, it in enumerate(items_all) if it.id == str(g2.id))
            assert g2_pos < g1_pos
            pass_check(8, "Overdue priority queue ordering")
        except Exception as e:
            fail_check(8, "Priority queue ordering", str(e))

        try:
            det_g1 = admin_complaint_service.get_complaint_detail(
                session, sanitation_dept.id, g1.id, now=fixed_now
            )
            assert len(det_g1.logs) >= 3
            assert det_g1.logs[0].event_type == "CREATED"
            assert_no_forbidden_keys(det_g1.model_dump())
            assert det_g1.latitude is not None and det_g1.longitude is not None
            assert det_g1.image_url is None
            assert det_g1.resolution is None

            det_w1 = admin_complaint_service.get_complaint_detail(
                session, sanitation_dept.id, w1.id, now=fixed_now
            )
            assert det_w1.resolution is None
            assert det_w1.status == "Completed"
            pass_check(9, "Complaint detail, audit logs, and privacy assertions")
        except Exception as e:
            fail_check(9, "Complaint detail verification", str(e))

        try:
            rows = admin_complaint_service.export_rows(
                session, sanitation_dept.id, ComplaintFilters(), now=fixed_now
            )
            expected_hdr = [
                "tracking_code",
                "category",
                "zone",
                "status",
                "priority",
                "created_at_ist",
                "sla_deadline_ist",
                "resolved_at_ist",
                "assigned_worker",
                "description",
            ]
            assert rows[0] == expected_hdr

            _, list_tot = admin_complaint_service.list_complaints(
                session, sanitation_dept.id, ComplaintFilters(), now=fixed_now
            )
            assert len(rows) == list_tot + 1

            csv_bytes = admin_complaint_service.build_csv(rows)
            assert csv_bytes.startswith(b"\xef\xbb\xbf")

            parsed = list(csv.reader(io.StringIO(csv_bytes.decode("utf-8-sig"))))
            for r in parsed:
                for cell in r:
                    assert not cell.startswith("=")

            row_g2 = next(r for r in parsed if r[0] == g2.tracking_code)
            assert row_g2[9].startswith("'")
            pass_check(10, "CSV export formatting, BOM, and formula neutralizing")
        except Exception as e:
            fail_check(10, "CSV export verification", str(e))

        try:
            t1 = create_triage_entry(session, g1, "Solid Waste & Garbage", 0.3)
            t3 = create_triage_entry(session, g3, "Solid Waste & Garbage", 0.4)
            t2 = create_triage_entry(session, g2, "Solid Waste & Garbage", 0.5)
            session.flush()

            tri_items, tri_total = admin_triage_service.list_triage(
                session, sanitation_dept.id, status="pending"
            )
            our_tri = [
                it
                for it in tri_items
                if it.complaint_id in (str(g1.id), str(g3.id), str(g2.id))
            ]
            assert [it.complaint_id for it in our_tri] == [
                str(g1.id),
                str(g3.id),
                str(g2.id),
            ]
            assert tri_total - before_triage == 3

            rev1 = admin_triage_service.review_triage(
                session, admin, t1.id, "Solid Waste & Garbage", now=fixed_now
            )
            assert rev1.status == "reviewed"
            assert rev1.final_category == "Solid Waste & Garbage"
            session.refresh(t1)
            assert t1.reviewed_by_admin_id == admin.id
            session.refresh(g1)
            assert g1.category == "Solid Waste & Garbage"

            rev3 = admin_triage_service.review_triage(
                session, admin, t3.id, "Waterlogging & Drainage", now=fixed_now
            )
            assert rev3.moved_to_department is None
            session.refresh(g3)
            assert g3.category == "Waterlogging & Drainage"
            assert g3.priority == "high"
            assert g3.sla_deadline == g3.created_at + timedelta(hours=24)
            assert g3.ai_classification_source == "manual"

            classified_log = session.execute(
                select(ComplaintLog).where(
                    ComplaintLog.complaint_id == g3.id,
                    ComplaintLog.event_type == "CLASSIFIED",
                    ComplaintLog.actor_type == "admin",
                )
            ).scalar_one_or_none()
            assert classified_log is not None

            rev2 = admin_triage_service.review_triage(
                session, admin, t2.id, "Potholes & Road Damage", now=fixed_now
            )
            assert rev2.moved_to_department == "Public Works Department"
            session.refresh(g2)
            assert g2.department_id == pwd_dept.id

            active_pwd_assignment = session.execute(
                select(ComplaintAssignment).where(
                    ComplaintAssignment.complaint_id == g2.id,
                    ComplaintAssignment.is_active.is_(True),
                )
            ).scalar_one_or_none()
            assert active_pwd_assignment is not None

            try:
                admin_complaint_service.get_complaint_detail(
                    session, sanitation_dept.id, g2.id, now=fixed_now
                )
                raise AssertionError("Should have raised ComplaintNotFound")
            except ComplaintNotFound:
                pass

            try:
                admin_triage_service.review_triage(
                    session, admin, t1.id, "Solid Waste & Garbage", now=fixed_now
                )
                raise AssertionError("Should have raised TriageConflict")
            except admin_triage_service.TriageConflict:
                pass

            try:
                admin_triage_service.review_triage(
                    session, admin, t3.id, "Bogus", now=fixed_now
                )
                raise AssertionError("Should have raised UnknownCategory")
            except UnknownCategory:
                pass
            pass_check(11, "Triage queue review, reclassification, and departmental handoff")
        except Exception as e:
            fail_check(11, "Triage operations", str(e))

        try:
            g4 = complaint_service.create_complaint(
                session,
                citizen_id=citizen.id,
                category="Solid Waste & Garbage",
                latitude=17.675,
                longitude=75.865,
                ai_confidence=0.9,
                ai_classification_source="image",
                now=fixed_now,
            )
            assignment_service.assign_complaint(session, g4.id, now=fixed_now)
            g4.status = "In-Progress"
            session.flush()

            t4 = create_triage_entry(session, g4, "Solid Waste & Garbage", 0.4)
            session.flush()

            try:
                admin_triage_service.review_triage(
                    session, admin, t4.id, "Waterlogging & Drainage", now=fixed_now
                )
                raise AssertionError("Should have raised TriageConflict")
            except admin_triage_service.TriageConflict:
                pass

            rev4 = admin_triage_service.review_triage(
                session, admin, t4.id, "Solid Waste & Garbage", now=fixed_now
            )
            assert rev4.status == "reviewed"

            tp1 = create_triage_entry(session, p1, "Potholes & Road Damage", 0.3)
            session.flush()

            try:
                admin_triage_service.review_triage(
                    session, admin, tp1.id, "Potholes & Road Damage", now=fixed_now
                )
                raise AssertionError("Should have raised TriageNotFound")
            except admin_triage_service.TriageNotFound:
                pass
            pass_check(12, "In-progress triage conflict and foreign triage isolation")
        except Exception as e:
            fail_check(12, "Conflict and foreign triage rules", str(e))

    finally:
        session.rollback()
        try:
            curr_complaints = session.scalar(select(func.count(Complaint.id)))
            curr_citizens = session.scalar(select(func.count(Citizen.id)))
            curr_logs = session.scalar(select(func.count(ComplaintLog.id)))
            curr_assignments = session.scalar(
                select(func.count(ComplaintAssignment.id))
            )
            curr_triage = session.scalar(select(func.count(TriageQueue.id)))

            assert curr_complaints == base_counts["complaint"]
            assert curr_citizens == base_counts["citizen"]
            assert curr_logs == base_counts["complaint_log"]
            assert curr_assignments == base_counts["complaint_assignment"]
            assert curr_triage == base_counts["triage_queue"]
            pass_check(13, "Session rollback and clean database state verification")
        except Exception as e:
            fail_check(13, "Rollback verification", str(e))
        finally:
            session.close()

    if failures:
        print(f"\n{len(failures)} checks failed:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print("\nAll 13 dashboard integration checks PASSED successfully!")


if __name__ == "__main__":
    main()
