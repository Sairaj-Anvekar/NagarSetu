import os
import sys

from geoalchemy2 import WKTElement
from sqlalchemy import select, text

from app.core.phone import normalize_phone
from app.core.security import hash_secret
from app.db.session import SessionLocal, get_engine
from app.models import Admin, Department, Worker, Zone

DEMO_WORKERS = [
    {
        "phone": "+919000000001",
        "name": "Sanitation Worker A1",
        "department": "Sanitation",
        "zone": "Zone A",
        "is_active": True,
        "base_location": (75.865, 17.675),
    },
    {
        "phone": "+919000000002",
        "name": "Public Works Worker A1",
        "department": "Public Works Department",
        "zone": "Zone A",
        "is_active": True,
        "base_location": (75.875, 17.680),
    },
    {
        "phone": "+919000000003",
        "name": "Sanitation Worker B1",
        "department": "Sanitation",
        "zone": "Zone B",
        "is_active": True,
        "base_location": (75.940, 17.680),
    },
    {
        "phone": "+919000000004",
        "name": "Sanitation Worker C1",
        "department": "Sanitation",
        "zone": "Zone C",
        "is_active": True,
        "base_location": (75.880, 17.640),
    },
    {
        "phone": "+919000000005",
        "name": "Public Works Worker B1",
        "department": "Public Works Department",
        "zone": "Zone B",
        "is_active": True,
        "base_location": (75.935, 17.685),
    },
    {
        "phone": "+919000000006",
        "name": "Public Works Worker D1",
        "department": "Public Works Department",
        "zone": "Zone D",
        "is_active": True,
        "base_location": (75.940, 17.640),
    },
    {
        "phone": "+919000000007",
        "name": "Sanitation Worker A2",
        "department": "Sanitation",
        "zone": "Zone A",
        "is_active": True,
        "base_location": (75.895, 17.690),
    },
    {
        "phone": "+919000000008",
        "name": "Sanitation Worker A3",
        "department": "Sanitation",
        "zone": "Zone A",
        "is_active": False,
        "base_location": (75.880, 17.680),
    },
]


def main() -> None:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            "Error: seed_dev_users can only be run in development environment "
            f"(current APP_ENV='{app_env}')",
            file=sys.stderr,
        )
        sys.exit(1)

    admin_password = os.environ.get("DEV_ADMIN_PASSWORD", "").strip()
    worker_pin = os.environ.get("DEV_WORKER_PIN", "").strip()

    if not admin_password:
        print(
            "Error: DEV_ADMIN_PASSWORD environment variable is empty or missing.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not worker_pin:
        print(
            "Error: DEV_WORKER_PIN environment variable is empty or missing.",
            file=sys.stderr,
        )
        sys.exit(1)

    if len(worker_pin) != 4 or not worker_pin.isdigit():
        print("Error: DEV_WORKER_PIN must be exactly 4 digits.", file=sys.stderr)
        sys.exit(1)

    admin_username = os.environ.get("DEV_ADMIN_USERNAME", "admin").strip() or "admin"

    get_engine()
    with SessionLocal() as db:
        required_depts = {w["department"] for w in DEMO_WORKERS} | {"Sanitation"}
        departments: dict[str, Department] = {}
        for d_name in required_depts:
            dept = db.scalars(
                select(Department).where(Department.name == d_name)
            ).first()
            if not dept:
                print(
                    f"Error: Department '{d_name}' not found. Please run database seed first.",
                    file=sys.stderr,
                )
                sys.exit(1)
            departments[d_name] = dept

        required_zones = {w["zone"] for w in DEMO_WORKERS}
        zones: dict[str, Zone] = {}
        for z_name in required_zones:
            zone = db.scalars(select(Zone).where(Zone.name == z_name)).first()
            if not zone:
                print(
                    f"Error: Zone '{z_name}' not found. Please run database seed first.",
                    file=sys.stderr,
                )
                sys.exit(1)
            zones[z_name] = zone

        admin = db.scalars(
            select(Admin).where(Admin.username == admin_username)
        ).first()
        admin_pwd_hash = hash_secret(admin_password)
        sanitation_dept = departments["Sanitation"]

        if admin is None:
            admin = Admin(
                username=admin_username,
                password_hash=admin_pwd_hash,
                full_name="Sanitation Admin",
                department_id=sanitation_dept.id,
                is_active=True,
            )
            db.add(admin)
        else:
            admin.full_name = "Sanitation Admin"
            admin.department_id = sanitation_dept.id
            admin.password_hash = admin_pwd_hash
            admin.is_active = True

        worker_pin_hash = hash_secret(worker_pin)
        for w_spec in DEMO_WORKERS:
            phone = normalize_phone(w_spec["phone"])
            dept = departments[w_spec["department"]]
            zone = zones[w_spec["zone"]]
            lon, lat = w_spec["base_location"]
            point_elem = WKTElement(f"POINT({lon} {lat})", srid=4326)
            worker = db.scalars(
                select(Worker).where(Worker.phone == phone)
            ).first()
            if worker is None:
                worker = Worker(
                    name=w_spec["name"],
                    phone=phone,
                    pin_hash=worker_pin_hash,
                    department_id=dept.id,
                    zone_id=zone.id,
                    is_active=w_spec["is_active"],
                    base_location=point_elem,
                )
                db.add(worker)
            else:
                worker.name = w_spec["name"]
                worker.pin_hash = worker_pin_hash
                worker.department_id = dept.id
                worker.zone_id = zone.id
                worker.is_active = w_spec["is_active"]
                worker.base_location = point_elem

        demo_phones = {normalize_phone(w["phone"]) for w in DEMO_WORKERS}
        live_test_workers = db.scalars(
            select(Worker).where(
                Worker.name == "Live Test Worker",
                Worker.phone.not_in(demo_phones),
            )
        ).all()

        for ltw in live_test_workers:
            has_assignment = db.scalar(
                text(
                    "SELECT 1 FROM complaint_assignment WHERE worker_id = :w_id LIMIT 1"
                ),
                {"w_id": ltw.id},
            )
            has_resolution = db.scalar(
                text(
                    "SELECT 1 FROM resolution WHERE worker_id = :w_id LIMIT 1"
                ),
                {"w_id": ltw.id},
            )
            if not has_assignment and not has_resolution:
                db.delete(ltw)

        db.commit()

    print(f"Dev accounts ready: admin '{admin_username}' (Sanitation), 8 workers")


if __name__ == "__main__":
    main()
