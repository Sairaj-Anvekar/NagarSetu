from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryInfo:
    name: str
    input_type: str
    department_name: str
    sla_hours: int
    priority: str


class UnknownCategory(ValueError):
    pass


CATEGORIES: dict[str, CategoryInfo] = {
    "Solid Waste & Garbage": CategoryInfo(
        name="Solid Waste & Garbage",
        input_type="image",
        department_name="Sanitation",
        sla_hours=48,
        priority="medium",
    ),
    "Potholes & Road Damage": CategoryInfo(
        name="Potholes & Road Damage",
        input_type="image",
        department_name="Public Works Department",
        sla_hours=72,
        priority="high",
    ),
    "Waterlogging & Drainage": CategoryInfo(
        name="Waterlogging & Drainage",
        input_type="image",
        department_name="Sanitation",
        sla_hours=24,
        priority="high",
    ),
    "Streetlight & Power Outage": CategoryInfo(
        name="Streetlight & Power Outage",
        input_type="text",
        department_name="MSEB",
        sla_hours=48,
        priority="medium",
    ),
    "Illegal Encroachment": CategoryInfo(
        name="Illegal Encroachment",
        input_type="text",
        department_name="Encroachments Department",
        sla_hours=168,
        priority="low",
    ),
    "Stray Animals & Pest Control": CategoryInfo(
        name="Stray Animals & Pest Control",
        input_type="text",
        department_name="Public Health & Veterinary",
        sla_hours=48,
        priority="high",
    ),
}


def get_category(name: str) -> CategoryInfo:
    try:
        return CATEGORIES[name]
    except KeyError:
        raise UnknownCategory(f"Unknown category: {name}") from None


def category_names() -> list[str]:
    return list(CATEGORIES.keys())

