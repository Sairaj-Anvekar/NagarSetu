import re
from datetime import UTC, datetime

import pytest

from app.core.categories import (
    CATEGORIES,
    UnknownCategory,
    category_names,
    get_category,
)
from app.core.tracking import generate_tracking_code
from app.models.constants import Priority


def test_categories_count_and_input_types():
    assert len(CATEGORIES) == 6
    names = category_names()
    assert len(names) == 6

    image_cats = [cat for cat in CATEGORIES.values() if cat.input_type == "image"]
    text_cats = [cat for cat in CATEGORIES.values() if cat.input_type == "text"]

    assert len(image_cats) == 3
    assert len(text_cats) == 3


def test_categories_departments_and_mapping():
    expected_departments = {
        "Sanitation",
        "Public Works Department",
        "MSEB",
        "Encroachments Department",
        "Public Health & Veterinary",
    }
    actual_departments = {cat.department_name for cat in CATEGORIES.values()}
    assert actual_departments == expected_departments

    sanitation_categories = {
        cat.name for cat in CATEGORIES.values() if cat.department_name == "Sanitation"
    }
    assert sanitation_categories == {
        "Solid Waste & Garbage",
        "Waterlogging & Drainage",
    }


def test_categories_sla_and_priority_values():
    expected_values = {
        "Solid Waste & Garbage": (48, "medium"),
        "Potholes & Road Damage": (72, "high"),
        "Waterlogging & Drainage": (24, "high"),
        "Streetlight & Power Outage": (48, "medium"),
        "Illegal Encroachment": (168, "low"),
        "Stray Animals & Pest Control": (48, "high"),
    }

    valid_priorities = {p.value for p in Priority}

    for name, (expected_sla, expected_priority) in expected_values.items():
        cat = CATEGORIES[name]
        assert cat.sla_hours == expected_sla
        assert cat.priority == expected_priority
        assert cat.priority in valid_priorities


def test_get_category_and_unknown_category():
    potholes = get_category("Potholes & Road Damage")
    assert potholes.department_name == "Public Works Department"

    with pytest.raises(UnknownCategory, match="Unknown category: Nonsense"):
        get_category("Nonsense")


def test_generate_tracking_code_fixed_date():
    fixed_date = datetime(2026, 11, 8, tzinfo=UTC)
    code = generate_tracking_code(fixed_date)
    assert re.match(r"^GRV-2026-[A-HJ-NP-Z2-9]{4}$", code) is not None
    assert len(code) == 13


def test_generate_tracking_code_batch():
    pattern = re.compile(r"^GRV-\d{4}-[A-HJ-NP-Z2-9]{4}$")
    for _ in range(200):
        code = generate_tracking_code()
        assert len(code) == 13
        assert pattern.match(code) is not None
