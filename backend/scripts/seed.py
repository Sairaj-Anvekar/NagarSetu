"""Database seeding configuration and scripts for NagarSetu."""

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.department import Department
from app.models.zone import Zone

DEPARTMENTS: list[tuple[str, str]] = [
    ("Sanitation", "Solid waste, garbage, waterlogging and drainage"),
    ("Public Works Department", "Potholes and road damage"),
    ("MSEB", "Streetlights and power outage"),
    ("Encroachments Department", "Illegal encroachment"),
    ("Public Health & Veterinary", "Stray animals and pest control"),
]

ZONES: dict[str, str] = {
    "Zone A": "POLYGON((75.85 17.66, 75.91 17.66, 75.91 17.70, 75.85 17.70, 75.85 17.66))",
    "Zone B": "POLYGON((75.91 17.66, 75.97 17.66, 75.97 17.70, 75.91 17.70, 75.91 17.66))",
    "Zone C": "POLYGON((75.85 17.62, 75.91 17.62, 75.91 17.66, 75.85 17.66, 75.85 17.62))",
    "Zone D": "POLYGON((75.91 17.62, 75.97 17.62, 75.97 17.66, 75.91 17.66, 75.91 17.62))",
}


def seed_departments(session: Session) -> None:
    """Upsert departments based on name."""
    for name, description in DEPARTMENTS:
        stmt = select(Department).where(Department.name == name)
        department = session.scalar(stmt)
        if department is not None:
            department.description = description
        else:
            session.add(Department(name=name, description=description))


def seed_zones(session: Session) -> None:
    """Upsert zones based on name and WKT boundary."""
    for name, wkt in ZONES.items():
        stmt = select(Zone).where(Zone.name == name)
        zone = session.scalar(stmt)
        boundary_element = WKTElement(wkt, srid=4326)
        if zone is not None:
            zone.boundary = boundary_element
        else:
            session.add(Zone(name=name, boundary=boundary_element))


def main() -> None:
    """Seed the database with initial departments and zones."""
    with Session(get_engine()) as session:
        seed_departments(session)
        seed_zones(session)
        session.commit()

        dept_count = session.scalar(select(func.count(Department.id)))
        zone_count = session.scalar(select(func.count(Zone.id)))
        print(f"Seeded: {dept_count} departments, {zone_count} zones")


if __name__ == "__main__":
    main()
