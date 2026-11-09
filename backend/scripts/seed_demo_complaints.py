import os
import sys
from datetime import UTC, datetime, timedelta
from io import BytesIO

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
from app.services import (
    assignment_service,
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
    "Streetlight & Power Outage": "#b8860b",
}


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

        specs = [
            {
                "category": "Solid Waste & Garbage",
                "lat": 17.675,
                "lon": 75.865,
                "description": "Garbage dump near the market entrance",
                "source": "image",
                "created_at": fixed_now - timedelta(hours=51),
                "sla_deadline": fixed_now - timedelta(hours=3),
                "priority": "high",
            },
            {
                "category": "Solid Waste & Garbage",
                "lat": 17.690,
                "lon": 75.895,
                "description": "Overflowing bins outside the school gate",
                "source": "image",
            },
            {
                "category": "Waterlogging & Drainage",
                "lat": 17.668,
                "lon": 75.858,
                "description": "Water standing on the road after rain",
                "source": "image",
                "sla_deadline": fixed_now + timedelta(hours=6),
            },
            {
                "category": "Potholes & Road Damage",
                "lat": 17.682,
                "lon": 75.872,
                "description": "Large pothole on the main road",
                "source": "image",
                "priority": "critical",
                "set_status": "In-Progress",
            },
            {
                "category": "Potholes & Road Damage",
                "lat": 17.695,
                "lon": 75.905,
                "description": "Broken road edge near the bus stop",
                "source": "image",
                "created_at": fixed_now - timedelta(hours=102),
                "sla_deadline": fixed_now - timedelta(hours=30),
            },
            {
                "category": "Solid Waste & Garbage",
                "lat": 17.682,
                "lon": 75.938,
                "description": "Garbage pile near the Zone B market",
                "source": "image",
            },
            {
                "category": "Solid Waste & Garbage",
                "lat": 17.640,
                "lon": 75.940,
                "description": "Dumped waste near the Zone D crossing",
                "source": "image",
            },
            {
                "category": "Streetlight & Power Outage",
                "lat": 17.684,
                "lon": 75.880,
                "description": "Three streetlights not working on the main road",
                "source": "text",
            },
        ]

        results = []
        storage_available = True

        for spec in specs:
            c = complaint_service.create_complaint(
                db,
                citizen_id=citizen.id,
                category=spec["category"],
                description=spec["description"],
                latitude=spec["lat"],
                longitude=spec["lon"],
                ai_confidence=0.9,
                ai_classification_source=spec.get("source", "image"),
                now=fixed_now,
            )
            if "created_at" in spec:
                c.created_at = spec["created_at"]
            if "sla_deadline" in spec:
                c.sla_deadline = spec["sla_deadline"]
            if "priority" in spec:
                c.priority = spec["priority"]
            db.flush()

            if storage_available:
                try:
                    jpeg_bytes = _generate_placeholder_image(
                        c.category, c.tracking_code
                    )
                    key = f"complaints/{c.id}/photo.jpg"
                    storage_service.get_storage().put_object(
                        key, jpeg_bytes, "image/jpeg"
                    )
                    c.image_object_key = key
                    db.flush()
                except Exception:
                    print(
                        "WARNING: photo storage unavailable, complaints seeded without images"
                    )
                    storage_available = False

            assignment = assignment_service.assign_complaint(
                db, c.id, now=fixed_now
            )

            if spec.get("set_status"):
                c.status = spec["set_status"]
                db.flush()

            worker_name = "unassigned"
            if assignment is not None:
                worker = db.get(Worker, assignment.worker_id)
                if worker:
                    worker_name = worker.name

            zone = db.get(Zone, c.zone_id) if c.zone_id else None
            zone_name = zone.name if zone else "None"

            results.append((c.tracking_code, c.category, zone_name, worker_name))

        db.commit()

        for key in old_keys_to_delete:
            try:
                storage_service.get_storage().delete_object(key)
            except Exception:
                pass

        for tracking_code, category, zone_name, worker_name in results:
            print(
                f"{tracking_code} | {category} | {zone_name} | {worker_name}"
            )
        print(f"Total demo complaints: {len(results)}")


if __name__ == "__main__":
    seed_demo_complaints()
