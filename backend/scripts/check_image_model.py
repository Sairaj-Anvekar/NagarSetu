import sys
import time
from pathlib import Path

from app.core.config import get_settings
from app.services import image_model_service

CATEGORY_MAP = {
    "garbage": "Solid Waste & Garbage",
    "pothole": "Potholes & Road Damage",
    "waterlogging": "Waterlogging & Drainage",
}
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main() -> None:
    settings = get_settings()

    if settings.app_env != "development":
        print("FAIL: check_image_model only runs in development environment")
        sys.exit(1)

    if not settings.image_model_enabled or not Path(settings.image_model_path).is_file():
        print("FAIL: model file not found at the expected path")
        sys.exit(1)

    if not image_model_service.warm_up():
        print("FAIL: model warm up failed")
        sys.exit(1)

    samples_base = Path("/app/app/ml/samples")
    if not samples_base.exists():
        samples_base = (
            Path(__file__).resolve().parent.parent / "app" / "ml" / "samples"
        )

    folders = ["garbage", "pothole", "waterlogging", "other"]
    files_by_folder: dict[str, list[Path]] = {}
    total_files = 0

    for folder in folders:
        folder_path = samples_base / folder
        if not folder_path.is_dir():
            print(f"Note: folder '{folder}' not found, skipping")
            continue
        found = [
            p for p in sorted(folder_path.iterdir())
            if p.is_file() and p.suffix.lower() in ALLOWED_EXTS
        ]
        files_by_folder[folder] = found
        total_files += len(found)

    if total_files == 0:
        print("no sample photos found")
        sys.exit(1)

    durations: list[float] = []
    stats: dict[str, dict[str, int]] = {
        f: {"total": 0, "accepted": 0, "rejected": 0, "matching": 0}
        for f in folders
    }

    for folder in folders:
        files = files_by_folder.get(folder, [])
        for file_path in files:
            data = file_path.read_bytes()
            t0 = time.perf_counter()
            verdict = image_model_service.predict(data)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            durations.append(elapsed_ms)

            stats[folder]["total"] += 1
            if verdict.accepted:
                stats[folder]["accepted"] += 1
                if (
                    folder in CATEGORY_MAP
                    and verdict.category == CATEGORY_MAP[folder]
                ):
                    stats[folder]["matching"] += 1
            else:
                stats[folder]["rejected"] += 1

            cat_str = verdict.category if verdict.category is not None else "none"
            conf_str = (
                f"{verdict.confidence:.2f}"
                if verdict.confidence is not None
                else "none"
            )
            print(
                f"{folder}/{file_path.name} -> "
                f"accepted={verdict.accepted} "
                f"category={cat_str} "
                f"confidence={conf_str} "
                f"review={verdict.needs_review} "
                f"time={elapsed_ms:.2f}ms"
            )

    print("\n--- Per-Folder Summary ---")
    for folder in folders:
        st = stats[folder]
        tot = st["total"]
        if tot == 0:
            continue
        acc = st["accepted"]
        if folder in CATEGORY_MAP:
            matching = st["matching"]
            share = (matching / acc) if acc > 0 else 0.0
            print(
                f"Folder '{folder}': total={tot}, accepted={acc}, "
                f"matching_share={share:.1%} ({matching}/{acc})"
            )
        elif folder == "other":
            rej = st["rejected"]
            print(f"Folder 'other': total={tot}, accepted={acc}, rejected={rej}")

    first_time = durations[0]
    if len(durations) > 1:
        rest_avg = sum(durations[1:]) / (len(durations) - 1)
        print(f"\nTiming: first={first_time:.2f}ms, rest_average={rest_avg:.2f}ms")
    else:
        print(f"\nTiming: first={first_time:.2f}ms")


if __name__ == "__main__":
    main()
