from datetime import UTC, datetime, timedelta

from app.services.complaint_service import (
    compute_sla_deadline,
    is_overdue,
    queue_sort_key,
)


def test_compute_sla_deadline():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    deadline = compute_sla_deadline(48, now)
    assert deadline == now + timedelta(hours=48)
    assert deadline == datetime(2026, 11, 10, 12, 0, 0, tzinfo=UTC)


def test_is_overdue():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    future_deadline = now + timedelta(hours=10)
    past_deadline = now - timedelta(hours=1)

    assert not is_overdue(future_deadline, "Submitted", now)
    assert not is_overdue(future_deadline, "In-Progress", now)
    assert not is_overdue(past_deadline, "Completed", now)
    assert is_overdue(past_deadline, "Submitted", now)
    assert is_overdue(past_deadline, "In-Progress", now)


def test_overdue_low_sorts_before_non_overdue_critical():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    overdue_low = queue_sort_key(
        priority="low",
        sla_deadline=now - timedelta(hours=2),
        carry_forward_count=0,
        created_at=now - timedelta(days=5),
        status="Submitted",
        now=now,
    )
    non_overdue_critical = queue_sort_key(
        priority="critical",
        sla_deadline=now + timedelta(hours=2),
        carry_forward_count=0,
        created_at=now - timedelta(hours=1),
        status="Submitted",
        now=now,
    )
    assert overdue_low < non_overdue_critical


def test_overdue_priorities_sort_order():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    deadline = now - timedelta(hours=1)
    created = now - timedelta(days=1)

    k_crit = queue_sort_key("critical", deadline, 0, created, "Submitted", now)
    k_high = queue_sort_key("high", deadline, 0, created, "Submitted", now)
    k_med = queue_sort_key("medium", deadline, 0, created, "Submitted", now)
    k_low = queue_sort_key("low", deadline, 0, created, "Submitted", now)

    assert k_crit < k_high < k_med < k_low


def test_equal_priority_earlier_deadline_sorts_first():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    created = now - timedelta(hours=5)

    earlier_deadline = queue_sort_key(
        "high", now + timedelta(hours=5), 0, created, "Submitted", now
    )
    later_deadline = queue_sort_key(
        "high", now + timedelta(hours=10), 0, created, "Submitted", now
    )

    assert earlier_deadline < later_deadline


def test_equal_priority_and_deadline_higher_carry_forward_sorts_first():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)
    deadline = now + timedelta(hours=10)
    created = now - timedelta(hours=5)

    higher_cf = queue_sort_key("medium", deadline, 3, created, "Submitted", now)
    lower_cf = queue_sort_key("medium", deadline, 1, created, "Submitted", now)

    assert higher_cf < lower_cf


def test_sorted_mixed_list():
    now = datetime(2026, 11, 8, 12, 0, 0, tzinfo=UTC)

    item_overdue_crit = {
        "id": 1,
        "priority": "critical",
        "sla_deadline": now - timedelta(hours=5),
        "carry_forward_count": 0,
        "created_at": now - timedelta(hours=20),
        "status": "Submitted",
    }
    item_overdue_low = {
        "id": 2,
        "priority": "low",
        "sla_deadline": now - timedelta(hours=1),
        "carry_forward_count": 0,
        "created_at": now - timedelta(hours=10),
        "status": "Submitted",
    }
    item_high_cf2 = {
        "id": 3,
        "priority": "high",
        "sla_deadline": now + timedelta(hours=5),
        "carry_forward_count": 2,
        "created_at": now - timedelta(hours=5),
        "status": "Submitted",
    }
    item_high_cf0 = {
        "id": 4,
        "priority": "high",
        "sla_deadline": now + timedelta(hours=5),
        "carry_forward_count": 0,
        "created_at": now - timedelta(hours=5),
        "status": "Submitted",
    }
    item_completed = {
        "id": 5,
        "priority": "low",
        "sla_deadline": now - timedelta(hours=10),
        "carry_forward_count": 0,
        "created_at": now - timedelta(hours=30),
        "status": "Completed",
    }
    item_low = {
        "id": 6,
        "priority": "low",
        "sla_deadline": now + timedelta(hours=20),
        "carry_forward_count": 0,
        "created_at": now - timedelta(hours=2),
        "status": "Submitted",
    }

    mixed_list = [
        item_completed,
        item_low,
        item_high_cf0,
        item_overdue_low,
        item_high_cf2,
        item_overdue_crit,
    ]

    sorted_items = sorted(
        mixed_list,
        key=lambda x: queue_sort_key(
            priority=x["priority"],
            sla_deadline=x["sla_deadline"],
            carry_forward_count=x["carry_forward_count"],
            created_at=x["created_at"],
            status=x["status"],
            now=now,
        ),
    )

    sorted_ids = [x["id"] for x in sorted_items]
    assert sorted_ids == [1, 2, 3, 4, 5, 6]

