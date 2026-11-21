import os
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import uuid4

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select, update

from app.db.session import SessionLocal, get_engine
from app.models import (
    Citizen,
    Complaint,
    ComplaintAssignment,
    ComplaintLog,
    Resolution,
    TriageQueue,
    Worker,
    Zone,
)
from app.models.constants import (
    ActorType,
    AssignmentEndReason,
    ComplaintStatus,
    LogEvent,
)
from app.services import (
    assignment_service,
    complaint_log_service,
    complaint_service,
    storage_service,
)

DEMO_PHONES = [
    "+919000000001",
    "+919000000002",
    "+919000000003",
    "+919000000004",
    "+919000000005",
    "+919000000006",
    "+919000000007",
    "+919000000008",
]

CATEGORY_COLORS = {
    "Solid Waste & Garbage": "#3f6e49",
    "Waterlogging & Drainage": "#2c5d88",
    "Potholes & Road Damage": "#8a4b38",
    "Streetlight": "#b8860b",
}

RESOLUTION_NOTES = [
    "Waste cleared and the spot sanitised",
    "Garbage collected and the area swept",
    "Drain unblocked and standing water pumped out",
    "Blockage removed and the road cleaned",
    "Bins emptied and the pavement washed",
]


@dataclass(frozen=True)
class ComplaintSpec:
    code: str
    category: str
    zone_name: str
    lat: float
    lon: float
    age_hours: int
    status: str
    worker_phone: str | None = None
    priority_override: str | None = None
    resolved_hours_ago: int | None = None
    description: str = ""
    source: str = "image"
    confidence: float = 0.90
    deadline_override_hours_ago: int | None = None


DATASET: list[ComplaintSpec] = [
    # SANITATION (19 complaints: 10 Submitted, 4 In-Progress, 5 Completed)
    ComplaintSpec(
        code="S01",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6752,
        lon=75.8652,
        age_hours=40,
        status="Submitted",
        worker_phone="+919000000001",
        priority_override="high",
        description="Garbage dumped near vegetable market",
    ),
    ComplaintSpec(
        code="S02",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6748,
        lon=75.8648,
        age_hours=3,
        status="Submitted",
        worker_phone="+919000000001",
        description="Overflowing municipal bin near crossroad",
    ),
    ComplaintSpec(
        code="S03",
        category="Waterlogging & Drainage",
        zone_name="Zone A",
        lat=17.6755,
        lon=75.8660,
        age_hours=14,
        status="In-Progress",
        worker_phone="+919000000001",
        description="Blocked stormwater drain causing waterlogging",
    ),
    ComplaintSpec(
        code="S04",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6900,
        lon=75.8950,
        age_hours=30,
        status="In-Progress",
        worker_phone="+919000000007",
        priority_override="critical",
        description="Commercial garbage accumulation near school entrance",
    ),
    ComplaintSpec(
        code="S05",
        category="Waterlogging & Drainage",
        zone_name="Zone A",
        lat=17.6850,
        lon=75.8880,
        age_hours=2,
        status="Submitted",
        worker_phone="+919000000007",
        description="Rainwater accumulating on residential street",
    ),
    ComplaintSpec(
        code="S06",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6880,
        lon=75.8900,
        age_hours=6,
        status="Submitted",
        worker_phone="+919000000007",
        priority_override="low",
        description="Scattered dry leaf litter along pedestrian pathway",
    ),
    ComplaintSpec(
        code="S07",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6750,
        lon=75.8655,
        age_hours=72,
        status="Completed",
        worker_phone="+919000000001",
        resolved_hours_ago=24,
        description="Illegal dumping spot behind bus shelter",
    ),
    ComplaintSpec(
        code="S08",
        category="Solid Waste & Garbage",
        zone_name="Zone A",
        lat=17.6745,
        lon=75.8662,
        age_hours=144,
        status="Completed",
        worker_phone="+919000000001",
        resolved_hours_ago=96,
        description="Old waste pile cleared from alleyway",
    ),
    ComplaintSpec(
        code="S09",
        category="Waterlogging & Drainage",
        zone_name="Zone A",
        lat=17.6870,
        lon=75.8920,
        age_hours=96,
        status="Completed",
        worker_phone="+919000000007",
        resolved_hours_ago=48,
        description="Clogged roadside ditch cleaned and drained",
    ),
    ComplaintSpec(
        code="S10",
        category="Solid Waste & Garbage",
        zone_name="Zone B",
        lat=17.6850,
        lon=75.9350,
        age_hours=5,
        status="Submitted",
        worker_phone="+919000000003",
        priority_override="low",
        description="Discarded cardboard boxes behind shopping arcade",
    ),
    ComplaintSpec(
        code="S11",
        category="Solid Waste & Garbage",
        zone_name="Zone B",
        lat=17.6820,
        lon=75.9400,
        age_hours=20,
        status="In-Progress",
        worker_phone="+919000000003",
        description="Heavy waste dump near community hall",
    ),
    ComplaintSpec(
        code="S12",
        category="Waterlogging & Drainage",
        zone_name="Zone B",
        lat=17.6880,
        lon=75.9300,
        age_hours=120,
        status="Completed",
        worker_phone="+919000000003",
        resolved_hours_ago=72,
        description="Overflowing drain near market square",
    ),
    ComplaintSpec(
        code="S13",
        category="Solid Waste & Garbage",
        zone_name="Zone B",
        lat=17.6780,
        lon=75.9500,
        age_hours=52,
        status="Submitted",
        worker_phone="+919000000003",
        priority_override="high",
        description="Stagnant food waste heap attracting stray animals",
    ),
    ComplaintSpec(
        code="S14",
        category="Waterlogging & Drainage",
        zone_name="Zone C",
        lat=17.6400,
        lon=75.8800,
        age_hours=36,
        status="Submitted",
        worker_phone="+919000000004",
        description="Open drain choked with silt and debris",
    ),
    ComplaintSpec(
        code="S15",
        category="Solid Waste & Garbage",
        zone_name="Zone C",
        lat=17.6350,
        lon=75.8700,
        age_hours=18,
        status="In-Progress",
        worker_phone="+919000000004",
        description="Uncollected household garbage along main road",
    ),
    ComplaintSpec(
        code="S16",
        category="Solid Waste & Garbage",
        zone_name="Zone C",
        lat=17.6450,
        lon=75.8900,
        age_hours=150,
        status="Completed",
        worker_phone="+919000000004",
        resolved_hours_ago=120,
        description="Cleared dump site near residential colony",
    ),
    ComplaintSpec(
        code="S17",
        category="Solid Waste & Garbage",
        zone_name="Zone D",
        lat=17.6400,
        lon=75.9400,
        age_hours=20,
        status="Submitted",
        worker_phone=None,
        description="Construction waste and garbage dumped by roadside",
    ),
    ComplaintSpec(
        code="S18",
        category="Waterlogging & Drainage",
        zone_name="Zone D",
        lat=17.6350,
        lon=75.9500,
        age_hours=36,
        status="Submitted",
        worker_phone=None,
        description="Severe drain backup flooding the lane",
    ),
    ComplaintSpec(
        code="S19",
        category="Solid Waste & Garbage",
        zone_name="Zone D",
        lat=17.6500,
        lon=75.9300,
        age_hours=1,
        status="Submitted",
        worker_phone=None,
        priority_override="low",
        description="Litter scattered near neighborhood park entrance",
    ),
    # OTHER DEPARTMENTS (Public Works & Electricity)
    ComplaintSpec(
        code="P1",
        category="Potholes & Road Damage",
        zone_name="Zone A",
        lat=17.6820,
        lon=75.8720,
        age_hours=51,
        status="Submitted",
        worker_phone="+919000000002",
        description="Deep pothole on main transit corridor",
        deadline_override_hours_ago=30,
    ),
    ComplaintSpec(
        code="P2",
        category="Potholes & Road Damage",
        zone_name="Zone A",
        lat=17.6950,
        lon=75.9050,
        age_hours=20,
        status="In-Progress",
        worker_phone="+919000000002",
        priority_override="critical",
        description="Broken road asphalt near bus stop junction",
    ),
    ComplaintSpec(
        code="E1",
        category="Streetlight",
        zone_name="Zone A",
        lat=17.6840,
        lon=75.8800,
        age_hours=0,
        status="Submitted",
        worker_phone=None,
        description="Three streetlights not working on the main road",
        source="text",
        confidence=0.85,
    ),
]


def _generate_placeholder_image(category: str, tracking_code: str) -> bytes:
    color = CATEGORY_COLORS.get(category, "#4a5568")
    img = Image.new("RGB", (640, 400), color=color)
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    draw.text((30, 170), f"Category: {category}", fill="white", font=font)
    draw.text((30, 210), f"Tracking: {tracking_code}", fill="white", font=font)
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_resolution_photo(tracking_code: str) -> bytes:
    img = Image.new("RGB", (640, 400), color="#1e5631")
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    draw.text((30, 170), "Status: RESOLVED", fill="white", font=font)
    draw.text((30, 210), f"Tracking: {tracking_code}", fill="white", font=font)
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _assign_direct(
    db, complaint: Complaint, worker: Worker, when: datetime
) -> ComplaintAssignment:
    assignment = ComplaintAssignment(
        complaint_id=complaint.id,
        worker_id=worker.id,
        is_active=True,
    )
    assignment.created_at = when
    db.add(assignment)
    worker.last_assigned_at = when
    db.flush()

    log_entry = complaint_log_service.add_log(
        db,
        complaint_id=complaint.id,
        event=LogEvent.ASSIGNED,
        actor_type=ActorType.SYSTEM,
        actor_id=None,
        details={
            "worker_id": str(worker.id),
            "zone_id": complaint.zone_id,
        },
    )
    log_entry.created_at = when
    db.flush()
    return assignment


def _make_log_times(db, complaint_id, created_at: datetime) -> None:
    logs = list(
        db.scalars(
            select(ComplaintLog)
            .where(ComplaintLog.complaint_id == complaint_id)
            .order_by(ComplaintLog.id)
        ).all()
    )
    for log in logs:
        if log.event_type == LogEvent.CREATED.value:
            log.created_at = created_at
        elif log.event_type == LogEvent.CLASSIFIED.value:
            log.created_at = created_at + timedelta(seconds=5)
        elif log.event_type == LogEvent.CONFIRMED.value:
            log.created_at = created_at + timedelta(seconds=30)
    db.flush()


def check_dataset_consistency(db) -> None:
    sanitation_specs = [
        s
        for s in DATASET
        if s.category in ("Solid Waste & Garbage", "Waterlogging & Drainage")
    ]
    assert (
        len(sanitation_specs) == 19
    ), f"Expected 19 sanitation complaints, got {len(sanitation_specs)}"

    sub_count = sum(1 for s in sanitation_specs if s.status == "Submitted")
    ip_count = sum(1 for s in sanitation_specs if s.status == "In-Progress")
    comp_count = sum(1 for s in sanitation_specs if s.status == "Completed")

    assert (
        sub_count == 10
    ), f"Expected 10 Submitted sanitation complaints, got {sub_count}"
    assert (
        ip_count == 4
    ), f"Expected 4 In-Progress sanitation complaints, got {ip_count}"
    assert (
        comp_count == 5
    ), f"Expected 5 Completed sanitation complaints, got {comp_count}"

    zones = {z.name: z.id for z in db.scalars(select(Zone)).all()}
    for spec in DATASET:
        zone_id = complaint_service.find_zone_id(db, spec.lat, spec.lon)
        expected_zone_id = zones.get(spec.zone_name)
        assert (
            zone_id is not None
        ), f"Point {spec.lat}, {spec.lon} ({spec.code}) has no zone"
        assert zone_id == expected_zone_id, (
            f"Point {spec.lat}, {spec.lon} ({spec.code}) zone mismatch: "
            f"found {zone_id}, expected {expected_zone_id} ({spec.zone_name})"
        )

    for spec in DATASET:
        if spec.status == "Completed":
            assert (
                spec.resolved_hours_ago is not None
            ), f"{spec.code} is Completed but has no resolved_hours_ago"
            assert spec.resolved_hours_ago < spec.age_hours, (
                f"{spec.code}: resolved_hours_ago ({spec.resolved_hours_ago}) "
                f"must be smaller than age_hours ({spec.age_hours})"
            )


def seed_demo_complaints() -> None:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            "Error: seed_demo_complaints can only be run in development environment "
            f"(APP_ENV='{app_env}')",
            file=sys.stderr,
        )
        sys.exit(1)

    get_engine()
    with SessionLocal() as db:
        # Check dataset consistency
        check_dataset_consistency(db)

        # Find or create Demo Citizen
        citizen = db.scalars(
            select(Citizen).where(Citizen.telegram_chat_id == 900000001)
        ).first()
        if not citizen:
            citizen = Citizen(
                telegram_chat_id=900000001,
                full_name="Demo Citizen",
            )
            db.add(citizen)
            db.flush()

        old_complaints = list(
            db.scalars(
                select(Complaint).where(Complaint.citizen_id == citizen.id)
            ).all()
        )
        old_keys_to_delete: list[str] = [
            c.image_object_key for c in old_complaints if c.image_object_key
        ]

        c_ids = [c.id for c in old_complaints]
        if c_ids:
            old_res_keys = list(
                db.scalars(
                    select(Resolution.photo_object_key).where(
                        Resolution.complaint_id.in_(c_ids),
                        Resolution.photo_object_key.is_not(None),
                    )
                ).all()
            )
            old_keys_to_delete.extend(k for k in old_res_keys if k)

            db.execute(
                delete(ComplaintLog).where(ComplaintLog.complaint_id.in_(c_ids))
            )
            db.execute(
                delete(ComplaintAssignment).where(
                    ComplaintAssignment.complaint_id.in_(c_ids)
                )
            )
            db.execute(
                delete(Resolution).where(Resolution.complaint_id.in_(c_ids))
            )
            db.execute(
                delete(TriageQueue).where(TriageQueue.complaint_id.in_(c_ids))
            )
            db.execute(delete(Complaint).where(Complaint.id.in_(c_ids)))
            db.flush()

        # Reset last_assigned_at to NULL for the 8 demo workers
        db.execute(
            update(Worker)
            .where(Worker.phone.in_(DEMO_PHONES))
            .values(last_assigned_at=None)
        )
        db.flush()

        fixed_now = datetime.now(UTC)

        created_records: list[tuple[Complaint, ComplaintSpec, str]] = []
        res_idx = 0

        for spec in DATASET:
            created_time = fixed_now - timedelta(hours=spec.age_hours)
            c = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category=spec.category,
                description=spec.description,
                latitude=spec.lat,
                longitude=spec.lon,
                ai_confidence=spec.confidence,
                ai_classification_source=spec.source,
                now=created_time,
            )
            c.created_at = created_time
            if spec.priority_override:
                c.priority = spec.priority_override
            if spec.deadline_override_hours_ago is not None:
                c.sla_deadline = fixed_now - timedelta(
                    hours=spec.deadline_override_hours_ago
                )
            db.flush()

            _make_log_times(db, c.id, created_time)

            worker_name = "unassigned"
            if spec.worker_phone:
                worker = db.scalars(
                    select(Worker).where(Worker.phone == spec.worker_phone)
                ).first()
                if worker is None:
                    raise ValueError(
                        f"Worker with phone {spec.worker_phone} not found"
                    )
                worker_name = worker.name
                assign_time = created_time + timedelta(minutes=1)
                assignment = _assign_direct(db, c, worker, assign_time)

                if spec.status == "In-Progress":
                    c.status = ComplaintStatus.IN_PROGRESS.value
                    started_log = complaint_log_service.add_log(
                        db,
                        complaint_id=c.id,
                        event=LogEvent.STARTED,
                        actor_type=ActorType.WORKER,
                        actor_id=str(worker.id),
                        details={"worker_id": str(worker.id)},
                    )
                    started_log.created_at = created_time + timedelta(hours=2)
                    db.flush()
                elif spec.status == "Completed":
                    c.status = ComplaintStatus.COMPLETED.value
                    assert spec.resolved_hours_ago is not None
                    resolved_at = fixed_now - timedelta(
                        hours=spec.resolved_hours_ago
                    )
                    c.resolved_at = resolved_at
                    assignment.is_active = False
                    assignment.ended_at = resolved_at
                    assignment.end_reason = (
                        AssignmentEndReason.COMPLETED.value
                    )

                    started_log = complaint_log_service.add_log(
                        db,
                        complaint_id=c.id,
                        event=LogEvent.STARTED,
                        actor_type=ActorType.WORKER,
                        actor_id=str(worker.id),
                        details={"worker_id": str(worker.id)},
                    )
                    started_log.created_at = created_time + timedelta(hours=2)

                    completed_log = complaint_log_service.add_log(
                        db,
                        complaint_id=c.id,
                        event=LogEvent.COMPLETED,
                        actor_type=ActorType.WORKER,
                        actor_id=str(worker.id),
                        details={"worker_id": str(worker.id)},
                    )
                    completed_log.created_at = resolved_at

                    res_key = f"resolutions/{c.id}/{uuid4().hex}.jpg"
                    note = RESOLUTION_NOTES[res_idx % len(RESOLUTION_NOTES)]
                    res_idx += 1
                    resolution = Resolution(
                        complaint_id=c.id,
                        worker_id=worker.id,
                        note=note,
                        photo_object_key=res_key,
                        completed_at=resolved_at,
                    )
                    db.add(resolution)
                    db.flush()
            else:
                # Real assignment engine must return None for unassigned complaints
                real_assign = assignment_service.assign_complaint(
                    db, c.id, now=created_time
                )
                assert (
                    real_assign is None
                ), f"Expected real engine to return None for {spec.code}, got {real_assign}"

            db.flush()
            created_records.append((c, spec, worker_name))

        # Upload photos
        newly_uploaded_keys: list[str] = []
        try:
            storage = storage_service.get_storage()
            for c, spec, _ in created_records:
                photo_bytes = _generate_placeholder_image(
                    c.category, c.tracking_code
                )
                photo_key = f"complaints/{c.id}/photo.jpg"
                storage.put_object(photo_key, photo_bytes, "image/jpeg")
                newly_uploaded_keys.append(photo_key)
                c.image_object_key = photo_key

                if spec.status == "Completed":
                    res = db.scalars(
                        select(Resolution).where(
                            Resolution.complaint_id == c.id
                        )
                    ).first()
                    if res and res.photo_object_key:
                        res_photo_bytes = _make_resolution_photo(
                            c.tracking_code
                        )
                        storage.put_object(
                            res.photo_object_key,
                            res_photo_bytes,
                            "image/jpeg",
                        )
                        newly_uploaded_keys.append(res.photo_object_key)
            db.flush()
        except Exception:
            db.rollback()
            for k in newly_uploaded_keys:
                try:
                    storage_service.get_storage().delete_object(k)
                except Exception:
                    pass
            print(
                "Photo storage is unavailable: start the floci container and run this again",
                file=sys.stderr,
            )
            sys.exit(1)

        db.commit()

        # Delete old storage objects best-effort after successful commit
        for key in old_keys_to_delete:
            try:
                storage_service.get_storage().delete_object(key)
            except Exception:
                pass

        # Print output and summary
        results_output = []
        for c, spec, worker_name in created_records:
            zone = db.get(Zone, c.zone_id) if c.zone_id else None
            zone_name = zone.name if zone else "None"
            is_overdue = (
                "yes"
                if (
                    c.status != ComplaintStatus.COMPLETED.value
                    and c.sla_deadline
                    and c.sla_deadline < fixed_now
                )
                else "no"
            )
            is_sanitation = spec.category in (
                "Solid Waste & Garbage",
                "Waterlogging & Drainage",
            )
            results_output.append(
                {
                    "tracking_code": c.tracking_code,
                    "category": c.category,
                    "zone": zone_name,
                    "status": c.status,
                    "priority": c.priority,
                    "is_overdue": is_overdue,
                    "worker_name": worker_name,
                    "is_sanitation": is_sanitation,
                }
            )

        for r in results_output:
            print(
                f"{r['tracking_code']} | {r['category']} | {r['zone']} | "
                f"{r['status']} | {r['priority']} | overdue: {r['is_overdue']} | {r['worker_name']}"
            )

        status_counts = Counter(r["status"] for r in results_output)
        zone_counts = Counter(r["zone"] for r in results_output)
        sanitation_overdue = sum(
            1
            for r in results_output
            if r["is_sanitation"] and r["is_overdue"] == "yes"
        )

        print("\n--- Summary ---")
        print(
            f"Counts by status: Submitted={status_counts['Submitted']}, "
            f"In-Progress={status_counts['In-Progress']}, Completed={status_counts['Completed']}"
        )
        print(
            f"Counts by zone: Zone A={zone_counts['Zone A']}, Zone B={zone_counts['Zone B']}, "
            f"Zone C={zone_counts['Zone C']}, Zone D={zone_counts['Zone D']}"
        )
        print(f"Sanitation overdue count: {sanitation_overdue}")
        print(f"Total demo complaints: {len(results_output)}")


if __name__ == "__main__":
    seed_demo_complaints()
