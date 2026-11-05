import os
import sys

from sqlalchemy import select

from app.core.phone import normalize_phone
from app.core.security import hash_secret
from app.db.session import SessionLocal, get_engine
from app.models import Admin, Department, Worker, Zone


def main() -> None:
    app_env = os.environ.get("APP_ENV", "")
    if app_env != "development":
        print(
            "Error: seed_dev_users can only be run in development environment "
            f"(current APP_ENV='{app_env}')"
        )
        sys.exit(1)

    admin_password = os.environ.get("DEV_ADMIN_PASSWORD", "").strip()
    worker_pin = os.environ.get("DEV_WORKER_PIN", "").strip()

    if not admin_password:
        print("Error: DEV_ADMIN_PASSWORD environment variable is empty or missing.")
        sys.exit(1)

    if not worker_pin:
        print("Error: DEV_WORKER_PIN environment variable is empty or missing.")
        sys.exit(1)

    if len(worker_pin) != 4 or not worker_pin.isdigit():
        print("Error: DEV_WORKER_PIN must be exactly 4 digits.")
        sys.exit(1)

    admin_username = os.environ.get("DEV_ADMIN_USERNAME", "admin").strip() or "admin"
    raw_worker_phone = (
        os.environ.get("DEV_WORKER_PHONE", "+919000000001").strip() or "+919000000001"
    )

    try:
        worker_phone = normalize_phone(raw_worker_phone)
    except ValueError as e:
        print(f"Error: Invalid DEV_WORKER_PHONE: {e}")
        sys.exit(1)

    get_engine()
    with SessionLocal() as db:
        dept = db.scalars(
            select(Department).where(Department.name == "Sanitation")
        ).first()
        zone = db.scalars(select(Zone).where(Zone.name == "Zone A")).first()

        if not dept or not zone:
            print(
                "Error: Department 'Sanitation' or Zone 'Zone A' not found. "
                "Please run the seed script first and exit."
            )
            sys.exit(1)

        admin = db.scalars(
            select(Admin).where(Admin.username == admin_username)
        ).first()
        if admin is None:
            admin = Admin(
                username=admin_username,
                password_hash=hash_secret(admin_password),
                full_name="Dev Admin",
                is_active=True,
            )
            db.add(admin)
        else:
            admin.password_hash = hash_secret(admin_password)
            admin.full_name = "Dev Admin"
            admin.is_active = True

        worker = db.scalars(
            select(Worker).where(Worker.phone == worker_phone)
        ).first()
        if worker is None:
            worker = Worker(
                name="Dev Worker",
                phone=worker_phone,
                pin_hash=hash_secret(worker_pin),
                department_id=dept.id,
                zone_id=zone.id,
                is_active=True,
            )
            db.add(worker)
        else:
            worker.name = "Dev Worker"
            worker.pin_hash = hash_secret(worker_pin)
            worker.department_id = dept.id
            worker.zone_id = zone.id
            worker.is_active = True

        db.commit()

    print(f"Dev accounts ready: admin '{admin_username}', worker '{worker_phone}'")


if __name__ == "__main__":
    main()

