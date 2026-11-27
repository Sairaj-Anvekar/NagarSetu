from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

from app.core.config import get_settings
from app.schemas.admin import (
    HotspotCell,
    StatsOut,
    StatsTotals,
    TriageItemOut,
)
from app.schemas.auth import UserOut
from app.schemas.common import RefOut
from app.schemas.workers import WorkerOut
from app.services import admin_stats_service, auth_service, geocode_service, worker_service


def test_schema_defaults_accept_missing_fields() -> None:
    # StatsOut accepts missing unassigned_by_zone
    stats = StatsOut(
        department=RefOut(id="1", name="Sanitation"),
        totals=StatsTotals(
            total=10,
            submitted=4,
            in_progress=3,
            completed=3,
            overdue=1,
            unassigned=2,
        ),
        by_category=[],
        by_zone=[],
        pending_triage=0,
    )
    assert stats.unassigned_by_zone == []

    # HotspotCell accepts missing id, zone, area_label
    cell = HotspotCell(latitude=17.67, longitude=75.86, count=5)
    assert cell.id == ""
    assert cell.zone is None
    assert cell.area_label == ""

    # TriageItemOut accepts missing zone, classifier_source, reviewed_at
    triage = TriageItemOut(
        id="1",
        complaint_id="10",
        tracking_code="SAN-1234",
        predicted_category="Solid Waste & Garbage",
        ai_confidence=0.85,
        status="pending",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    assert triage.zone is None
    assert triage.classifier_source is None
    assert triage.reviewed_at is None

    # UserOut accepts missing zone
    user = UserOut(id="1", name="Admin", role="admin")
    assert user.zone is None

    # WorkerOut accepts missing active_tasks
    worker = WorkerOut(
        id="101",
        name="Worker",
        phone="+919000000001",
        department=RefOut(id="1", name="Sanitation"),
        zone=RefOut(id="1", name="Zone A"),
        is_active=True,
    )
    assert worker.active_tasks == 0


def test_triage_item_out_round_trip() -> None:
    now = datetime(2026, 1, 15, 10, 30, tzinfo=UTC)
    triage = TriageItemOut(
        id="1",
        complaint_id="10",
        tracking_code="SAN-1234",
        predicted_category="Solid Waste & Garbage",
        ai_confidence=0.92,
        status="reviewed",
        final_category="Solid Waste & Garbage",
        description="Pothole near market",
        created_at=now,
        zone=RefOut(id="2", name="Zone B"),
        classifier_source="image",
        reviewed_at=now,
    )
    dumped = triage.model_dump()
    assert dumped["zone"] == {"id": "2", "name": "Zone B"}
    assert dumped["classifier_source"] == "image"
    assert dumped["reviewed_at"] == now


def test_hotspot_cell_explicit_fields() -> None:
    cell = HotspotCell(
        latitude=17.675123,
        longitude=75.865456,
        count=8,
        id="17.675,75.865",
        zone="Zone A",
        area_label="Budhwar Peth area",
    )
    assert cell.id == "17.675,75.865"
    assert cell.zone == "Zone A"
    assert cell.area_label == "Budhwar Peth area"


def test_build_token_response_worker_and_admin() -> None:
    # Fake worker with department and zone
    fake_worker = SimpleNamespace(
        id=101,
        name="Worker 1",
        department=SimpleNamespace(id=1, name="Sanitation"),
        zone=SimpleNamespace(id=2, name="Zone A"),
    )
    resp = auth_service.build_token_response(fake_worker, role="worker")
    assert resp.user.department == RefOut(id="1", name="Sanitation")
    assert resp.user.zone == RefOut(id="2", name="Zone A")

    # Fake worker without department and zone
    fake_worker_bare = SimpleNamespace(id=102, name="Worker Bare")
    resp_bare = auth_service.build_token_response(fake_worker_bare, role="worker")
    assert resp_bare.user.department is None
    assert resp_bare.user.zone is None

    # Fake admin with department
    fake_admin = SimpleNamespace(
        id=1,
        username="admin",
        full_name="Admin Name",
        department=SimpleNamespace(id=1, name="Sanitation"),
    )
    resp_admin = auth_service.build_token_response(fake_admin, role="admin")
    assert resp_admin.user.department == RefOut(id="1", name="Sanitation")
    assert resp_admin.user.zone is None


def test_hotspot_labelling_logic(monkeypatch: Any) -> None:
    cells = [
        {"latitude": 17.1, "longitude": 75.1, "zone": "Zone A"},
        {"latitude": 17.2, "longitude": 75.2, "zone": "Zone B"},
        {"latitude": 17.3, "longitude": 75.3, "zone": "Zone C"},
        {"latitude": 17.4, "longitude": 75.4, "zone": "Zone D"},
        {"latitude": 17.5, "longitude": 75.5, "zone": "Zone A"},
        {"latitude": 17.6, "longitude": 75.6, "zone": "Zone B"},
        {"latitude": 17.7, "longitude": 75.7, "zone": None},
    ]

    call_count = 0

    def fake_reverse(lat: float, lon: float, client: Any = None) -> str | None:
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            return None  # Test geocoder returning None
        return f"Geocoded {call_count}"

    monkeypatch.setattr(geocode_service, "reverse_geocode", fake_reverse)

    labeled = admin_stats_service.label_hotspots(
        cells, label_limit=5, budget_seconds=10.0
    )
    assert call_count == 5
    assert labeled[0]["area_label"] == "Geocoded 1"
    # Call 2 returned None, so it falls back to "<zone> area"
    assert labeled[1]["area_label"] == "Zone B area"
    assert labeled[2]["area_label"] == "Geocoded 3"
    assert labeled[3]["area_label"] == "Geocoded 4"
    assert labeled[4]["area_label"] == "Geocoded 5"
    # Cells after limit get "<zone> area"
    assert labeled[5]["area_label"] == "Zone B area"
    # Cell without zone gets "Unnamed area"
    assert labeled[6]["area_label"] == "Unnamed area"

    # Test budget exceeded stops further lookups
    clock = 0.0

    def fake_monotonic() -> float:
        return clock

    monkeypatch.setattr("time.monotonic", fake_monotonic)
    budget_cells = [
        {"latitude": 17.1, "longitude": 75.1, "zone": "Zone A"},
        {"latitude": 17.2, "longitude": 75.2, "zone": "Zone B"},
    ]
    lookup_calls = 0

    def counting_reverse(lat: float, lon: float, client: Any = None) -> str:
        nonlocal lookup_calls, clock
        lookup_calls += 1
        clock += 10.0  # Exceeds 6.0 second budget
        return "Area Name"

    monkeypatch.setattr(geocode_service, "reverse_geocode", counting_reverse)
    res = admin_stats_service.label_hotspots(
        budget_cells, label_limit=5, budget_seconds=6.0
    )
    assert lookup_calls == 1
    assert res[0]["area_label"] == "Area Name"
    assert res[1]["area_label"] == "Zone B area"


def test_geocode_throttle(monkeypatch: Any) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "geocode_enabled", True)
    monkeypatch.setattr(settings, "geocode_min_interval", 1.0)
    monkeypatch.setattr(geocode_service, "_last_request_time", None)
    geocode_service._cache.clear()

    current_time = 100.0
    slept_durations: list[float] = []

    def fake_monotonic() -> float:
        return current_time

    def fake_sleep(duration: float) -> None:
        nonlocal current_time
        slept_durations.append(duration)
        current_time += duration

    monkeypatch.setattr("time.monotonic", fake_monotonic)
    monkeypatch.setattr("time.sleep", fake_sleep)

    fake_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "address": {"suburb": "Market Area", "city": "Solapur"}
    }
    fake_client.get.return_value = mock_resp

    # First uncached lookup
    res1 = geocode_service.reverse_geocode(17.51, 75.51, client=fake_client)
    assert res1 == "Market Area, Solapur"
    assert len(slept_durations) == 0

    # Second uncached lookup right after (time hasn't advanced enough)
    current_time += 0.2
    res2 = geocode_service.reverse_geocode(17.52, 75.52, client=fake_client)
    assert res2 == "Market Area, Solapur"
    assert len(slept_durations) == 1
    assert abs(slept_durations[0] - 0.8) < 1e-4

    # Cache hit never sleeps
    before_count = len(slept_durations)
    res_hit = geocode_service.reverse_geocode(17.51, 75.51, client=fake_client)
    assert res_hit == "Market Area, Solapur"
    assert len(slept_durations) == before_count

    # Disabled lookup never sleeps
    monkeypatch.setattr(settings, "geocode_enabled", False)
    res_disabled = geocode_service.reverse_geocode(17.53, 75.53, client=fake_client)
    assert res_disabled is None
    assert len(slept_durations) == before_count


def test_active_task_counts_empty_id_list() -> None:
    # active_task_counts([]) returns {} without touching the session
    result = worker_service.active_task_counts(db=None, worker_ids=[])  # type: ignore[arg-type]
    assert result == {}
