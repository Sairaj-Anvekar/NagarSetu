import random
from datetime import UTC, datetime

from app.services.assignment_service import Candidate, pick_best


def test_pick_best_empty():
    assert pick_best([]) is None


def test_lowest_workload_wins():
    c1 = Candidate(worker_id=1, workload=2, distance_m=100.0, last_assigned_at=None)
    c2 = Candidate(worker_id=2, workload=1, distance_m=500.0, last_assigned_at=None)
    assert pick_best([c1, c2]) == c2


def test_equal_workload_shorter_distance_wins():
    c1 = Candidate(worker_id=1, workload=1, distance_m=200.0, last_assigned_at=None)
    c2 = Candidate(worker_id=2, workload=1, distance_m=100.0, last_assigned_at=None)
    assert pick_best([c1, c2]) == c2


def test_distance_beats_no_distance():
    c1 = Candidate(worker_id=1, workload=1, distance_m=None, last_assigned_at=None)
    c2 = Candidate(worker_id=2, workload=1, distance_m=5000.0, last_assigned_at=None)
    assert pick_best([c1, c2]) == c2


def test_equal_workload_and_distance_older_last_assigned_wins():
    t_newer = datetime(2026, 11, 8, 10, 0, tzinfo=UTC)
    t_older = datetime(2026, 11, 8, 8, 0, tzinfo=UTC)
    c1 = Candidate(worker_id=1, workload=1, distance_m=100.0, last_assigned_at=t_newer)
    c2 = Candidate(worker_id=2, workload=1, distance_m=100.0, last_assigned_at=t_older)
    assert pick_best([c1, c2]) == c2


def test_none_last_assigned_at_counts_as_oldest():
    t_assigned = datetime(2026, 11, 8, 8, 0, tzinfo=UTC)
    c1 = Candidate(worker_id=1, workload=1, distance_m=100.0, last_assigned_at=t_assigned)
    c2 = Candidate(worker_id=2, workload=1, distance_m=100.0, last_assigned_at=None)
    assert pick_best([c1, c2]) == c2


def test_final_tie_lowest_worker_id():
    c1 = Candidate(worker_id=10, workload=1, distance_m=100.0, last_assigned_at=None)
    c2 = Candidate(worker_id=5, workload=1, distance_m=100.0, last_assigned_at=None)
    assert pick_best([c1, c2]) == c2


def test_result_order_independent():
    candidates = [
        Candidate(worker_id=1, workload=3, distance_m=100.0, last_assigned_at=None),
        Candidate(worker_id=2, workload=2, distance_m=500.0, last_assigned_at=None),
        Candidate(worker_id=3, workload=2, distance_m=150.0, last_assigned_at=None),
        Candidate(
            worker_id=4,
            workload=2,
            distance_m=150.0,
            last_assigned_at=datetime(2026, 1, 1, tzinfo=UTC),
        ),
    ]
    expected = pick_best(candidates)
    assert expected is not None
    assert expected.worker_id == 3

    rng = random.Random(42)
    for _ in range(20):
        shuffled = list(candidates)
        rng.shuffle(shuffled)
        assert pick_best(shuffled) == expected
