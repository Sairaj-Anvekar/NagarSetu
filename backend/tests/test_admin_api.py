import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_admin
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.schemas.admin import (
    AdminComplaintDetail,
    AdminComplaintItem,
    CategoryCount,
    HotspotCell,
    LogEntry,
    ResolutionOut,
    StatsOut,
    StatsTotals,
    TrendPoint,
    TriageItemOut,
    TriageReviewOut,
    ZoneCount,
)
from app.schemas.common import RefOut
from app.services import (
    admin_complaint_service,
    admin_stats_service,
    admin_triage_service,
)

FORBIDDEN_KEYS = {"citizen", "citizen_id", "telegram", "chat_id"}


def assert_no_forbidden_keys(data: Any) -> None:
    if isinstance(data, dict):
        for k, v in data.items():
            assert k not in FORBIDDEN_KEYS, f"Found forbidden key {k} in response"
            assert_no_forbidden_keys(v)
    elif isinstance(data, list):
        for item in data:
            assert_no_forbidden_keys(item)


class FakeSession:
    def __init__(self, raise_on_commit: bool = False):
        self.commit_count = 0
        self.rollback_count = 0
        self.raise_on_commit = raise_on_commit

    def get(self, model: Any, id: Any) -> Any:
        return None

    def commit(self) -> None:
        self.commit_count += 1
        if self.raise_on_commit:
            raise RuntimeError("Database commit error")

    def rollback(self) -> None:
        self.rollback_count += 1

    def close(self) -> None:
        pass


@pytest.fixture(autouse=True)
def clean_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def fake_admin():
    return SimpleNamespace(id=1, department_id=7, is_active=True)


@pytest.fixture
def fake_session():
    return FakeSession()


def test_routes_require_authentication(client: TestClient) -> None:
    routes = [
        ("GET", "/api/v1/admin/stats", None),
        ("GET", "/api/v1/admin/trends", None),
        ("GET", "/api/v1/admin/hotspots", None),
        ("GET", "/api/v1/admin/complaints", None),
        ("GET", "/api/v1/admin/complaints/export", None),
        ("GET", f"/api/v1/admin/complaints/{uuid.uuid4()}", None),
        ("GET", "/api/v1/admin/triage", None),
        (
            "PATCH",
            "/api/v1/admin/triage/1",
            {"category": "Solid Waste & Garbage"},
        ),
    ]
    for method, path, json_data in routes:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.patch(path, json=json_data)
        assert (
            res.status_code == 401
        ), f"{method} {path} returned {res.status_code} without auth"


def test_routes_reject_worker_token(client: TestClient) -> None:
    worker_token = create_access_token("2", "worker")
    headers = {"Authorization": f"Bearer {worker_token}"}
    routes = [
        ("GET", "/api/v1/admin/stats", None),
        ("GET", "/api/v1/admin/trends", None),
        ("GET", "/api/v1/admin/hotspots", None),
        ("GET", "/api/v1/admin/complaints", None),
        ("GET", "/api/v1/admin/complaints/export", None),
        ("GET", f"/api/v1/admin/complaints/{uuid.uuid4()}", None),
        ("GET", "/api/v1/admin/triage", None),
        (
            "PATCH",
            "/api/v1/admin/triage/1",
            {"category": "Solid Waste & Garbage"},
        ),
    ]
    for method, path, json_data in routes:
        if method == "GET":
            res = client.get(path, headers=headers)
        else:
            res = client.patch(path, headers=headers, json=json_data)
        assert (
            res.status_code == 403
        ), f"{method} {path} returned {res.status_code} with worker token"
        assert res.json()["detail"] == "Admin access required"


def test_admin_stats(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    recorded: list[Any] = []

    def fake_get_stats(db: Any, department_id: int) -> StatsOut:
        recorded.append(department_id)
        return StatsOut(
            department=RefOut(id="7", name="Sanitation"),
            totals=StatsTotals(
                total=10,
                submitted=4,
                in_progress=3,
                completed=3,
                overdue=1,
                unassigned=2,
            ),
            by_category=[CategoryCount(category="Solid Waste & Garbage", count=10)],
            by_zone=[ZoneCount(zone="Zone A", count=10)],
            pending_triage=2,
        )

    monkeypatch.setattr(admin_stats_service, "get_stats", fake_get_stats)

    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 200
    assert recorded == [7]
    body = res.json()
    assert body["totals"]["total"] == 10
    assert body["pending_triage"] == 2
    assert_no_forbidden_keys(body)


def test_admin_trends(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    res_zero = client.get("/api/v1/admin/trends?days=0")
    assert res_zero.status_code == 422

    res_large = client.get("/api/v1/admin/trends?days=91")
    assert res_large.status_code == 422

    recorded: list[Any] = []

    def fake_get_trends(db: Any, department_id: int, days: int) -> list[TrendPoint]:
        recorded.append((department_id, days))
        return [TrendPoint(date="2026-11-11", created=4, completed=2)]

    monkeypatch.setattr(admin_stats_service, "get_trends", fake_get_trends)

    res = client.get("/api/v1/admin/trends?days=14")
    assert res.status_code == 200
    assert recorded == [(7, 14)]
    body = res.json()
    assert len(body) == 1
    assert body[0]["created"] == 4
    assert_no_forbidden_keys(body)


def test_admin_hotspots(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    res_bogus = client.get("/api/v1/admin/hotspots?category=Bogus")
    assert res_bogus.status_code == 422
    errs = res_bogus.json()["detail"]
    assert errs[0]["loc"][-1] == "category"

    recorded: list[Any] = []

    def fake_get_hotspots(
        db: Any,
        department_id: int,
        days: int = 30,
        category: str | None = None,
    ) -> list[HotspotCell]:
        recorded.append((department_id, days, category))
        return [HotspotCell(latitude=17.67, longitude=75.86, count=5)]

    monkeypatch.setattr(admin_stats_service, "get_hotspots", fake_get_hotspots)

    res = client.get(
        "/api/v1/admin/hotspots?days=45&category=Solid%20Waste%20%26%20Garbage"
    )
    assert res.status_code == 200
    assert recorded == [(7, 45, "Solid Waste & Garbage")]
    body = res.json()
    assert body[0]["count"] == 5
    assert_no_forbidden_keys(body)


def test_admin_complaints_list_and_filters(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    res_bogus_status = client.get("/api/v1/admin/complaints?status=Bogus")
    assert res_bogus_status.status_code == 422

    res_bogus_category = client.get("/api/v1/admin/complaints?category=Bogus")
    assert res_bogus_category.status_code == 422
    assert res_bogus_category.json()["detail"][0]["loc"][-1] == "category"

    long_q = "a" * 101
    res_long_q = client.get(f"/api/v1/admin/complaints?q={long_q}")
    assert res_long_q.status_code == 422

    recorded: list[Any] = []

    def fake_list_complaints(
        db: Any,
        department_id: int,
        filters: Any,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AdminComplaintItem], int]:
        recorded.append((department_id, filters, page, page_size))
        item = AdminComplaintItem(
            id=str(uuid.uuid4()),
            tracking_code="NAGAR-1",
            category="Solid Waste & Garbage",
            status="Submitted",
            priority="high",
            zone=RefOut(id="1", name="Zone A"),
            assigned_worker=None,
            description="Dustbin overflowing",
            sla_deadline=datetime.now(UTC),
            is_overdue=False,
            created_at=datetime.now(UTC),
            resolved_at=None,
        )
        return [item], 1

    monkeypatch.setattr(admin_complaint_service, "list_complaints", fake_list_complaints)

    url = (
        "/api/v1/admin/complaints"
        "?status=Submitted&category=Solid%20Waste%20%26%20Garbage"
        "&zone_id=1&overdue=true&unassigned=true&q=market&page=2&page_size=15"
    )
    res = client.get(url)
    assert res.status_code == 200
    dept_id, filters, page, page_size = recorded[0]
    assert dept_id == 7
    assert filters.status == "Submitted"
    assert filters.category == "Solid Waste & Garbage"
    assert filters.zone_id == 1
    assert filters.overdue is True
    assert filters.unassigned is True
    assert filters.q == "market"
    assert page == 2
    assert page_size == 15

    body = res.json()
    assert set(body.keys()) == {"items", "total", "page", "page_size"}
    assert body["total"] == 1
    assert_no_forbidden_keys(body)


def test_admin_complaints_export(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    def fake_export_rows(db: Any, department_id: int, filters: Any) -> list[list[str]]:
        return [["tracking_code", "status"], ["NAGAR-1", "Submitted"]]

    monkeypatch.setattr(admin_complaint_service, "export_rows", fake_export_rows)

    res = client.get("/api/v1/admin/complaints/export")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    disp = res.headers.get("content-disposition", "")
    assert "attachment" in disp and "complaints-" in disp
    assert res.content.startswith(b"\xef\xbb\xbf")


def test_admin_complaint_detail(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    res_bad_id = client.get("/api/v1/admin/complaints/not-a-uuid")
    assert res_bad_id.status_code == 422

    cid = uuid.uuid4()

    def fake_get_detail_404(db: Any, department_id: int, complaint_id: Any) -> Any:
        raise admin_complaint_service.ComplaintNotFound("Complaint not found")

    monkeypatch.setattr(
        admin_complaint_service, "get_complaint_detail", fake_get_detail_404
    )
    res_404 = client.get(f"/api/v1/admin/complaints/{cid}")
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Complaint not found"

    def fake_get_detail_ok(db: Any, department_id: int, complaint_id: Any) -> Any:
        return AdminComplaintDetail(
            id=str(cid),
            tracking_code="NAGAR-100",
            category="Solid Waste & Garbage",
            status="Completed",
            priority="medium",
            zone=RefOut(id="1", name="Zone A"),
            assigned_worker=RefOut(id="2", name="Ramesh"),
            description="Clear dump",
            sla_deadline=datetime.now(UTC),
            is_overdue=False,
            created_at=datetime.now(UTC),
            resolved_at=datetime.now(UTC),
            image_url=None,
            latitude=17.67,
            longitude=75.86,
            carry_forward_count=0,
            logs=[
                LogEntry(
                    event_type="CREATED",
                    actor_type="CITIZEN",
                    created_at=datetime.now(UTC),
                    details=None,
                )
            ],
            resolution=ResolutionOut(
                note="Cleaned",
                photo_url=None,
                completed_at=datetime.now(UTC),
                worker=RefOut(id="2", name="Ramesh"),
            ),
        )

    monkeypatch.setattr(
        admin_complaint_service, "get_complaint_detail", fake_get_detail_ok
    )
    res_ok = client.get(f"/api/v1/admin/complaints/{cid}")
    assert res_ok.status_code == 200
    body = res_ok.json()
    assert body["tracking_code"] == "NAGAR-100"
    assert_no_forbidden_keys(body)


def test_admin_triage_list(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    res_bogus = client.get("/api/v1/admin/triage?status=bogus")
    assert res_bogus.status_code == 422

    recorded: list[Any] = []

    def fake_list_triage(
        db: Any,
        department_id: int,
        status: str = "pending",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[TriageItemOut], int]:
        recorded.append((department_id, status, page, page_size))
        item = TriageItemOut(
            id="1",
            complaint_id=str(uuid.uuid4()),
            tracking_code="NAGAR-TRIAGE-1",
            predicted_category="Solid Waste & Garbage",
            ai_confidence=0.45,
            status="pending",
            final_category=None,
            description="Needs review",
            image_url=None,
            created_at=datetime.now(UTC),
        )
        return [item], 1

    monkeypatch.setattr(admin_triage_service, "list_triage", fake_list_triage)

    res = client.get("/api/v1/admin/triage")
    assert res.status_code == 200
    assert recorded == [(7, "pending", 1, 20)]
    body = res.json()
    assert body["total"] == 1
    assert_no_forbidden_keys(body)


def test_admin_triage_review_patch(
    client: TestClient,
    fake_admin: SimpleNamespace,
    fake_session: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_current_admin] = lambda: fake_admin
    app.dependency_overrides[get_db] = lambda: fake_session

    called = False

    def fake_review(
        db: Any, admin: Any, triage_id: int, category: str
    ) -> TriageReviewOut:
        nonlocal called
        called = True
        return TriageReviewOut(
            id="1",
            tracking_code="NAGAR-1",
            status="reviewed",
            final_category=category,
            moved_to_department=None,
        )

    monkeypatch.setattr(admin_triage_service, "review_triage", fake_review)

    res_bogus = client.patch(
        "/api/v1/admin/triage/1", json={"category": "Bogus Category"}
    )
    assert res_bogus.status_code == 422
    assert res_bogus.json()["detail"][0]["loc"][-1] == "category"
    assert not called

    res_ok = client.patch(
        "/api/v1/admin/triage/1", json={"category": "Solid Waste & Garbage"}
    )
    assert res_ok.status_code == 200
    assert called
    assert fake_session.commit_count == 1
    body = res_ok.json()
    assert body["status"] == "reviewed"
    assert_no_forbidden_keys(body)

    def fake_not_found(*args: Any, **kwargs: Any) -> Any:
        raise admin_triage_service.TriageNotFound("Triage case not found")

    monkeypatch.setattr(admin_triage_service, "review_triage", fake_not_found)
    res_404 = client.patch(
        "/api/v1/admin/triage/99", json={"category": "Solid Waste & Garbage"}
    )
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Triage case not found"
    assert fake_session.rollback_count == 1

    def fake_conflict(*args: Any, **kwargs: Any) -> Any:
        raise admin_triage_service.TriageConflict("Case already reviewed")

    monkeypatch.setattr(admin_triage_service, "review_triage", fake_conflict)
    res_409 = client.patch(
        "/api/v1/admin/triage/1", json={"category": "Solid Waste & Garbage"}
    )
    assert res_409.status_code == 409
    assert res_409.json()["detail"] == "Case already reviewed"
    assert fake_session.rollback_count == 2

    fake_session.raise_on_commit = True
    monkeypatch.setattr(admin_triage_service, "review_triage", fake_review)
    with pytest.raises(RuntimeError):
        client.patch(
            "/api/v1/admin/triage/1", json={"category": "Solid Waste & Garbage"}
        )
    assert fake_session.rollback_count == 3
