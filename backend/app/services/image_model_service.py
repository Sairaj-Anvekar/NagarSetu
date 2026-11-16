import io
import logging
import threading
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ImageModelUnavailable(Exception):
    """Raised when the image model cannot be loaded, executed, or processed."""


@dataclass(frozen=True)
class ImageVerdict:
    accepted: bool
    category: str | None
    confidence: float | None
    needs_review: bool
    reason: str


CLASS_NAMES: list[str] = [
    "Solid Waste & Garbage",
    "Potholes & Road Damage",
    "Waterlogging & Drainage",
]

_model_lock = threading.Lock()


def is_available() -> bool:
    """Check if the image model is enabled and its weights file exists."""
    settings = get_settings()
    if not settings.image_model_enabled:
        return False
    return Path(settings.image_model_path).is_file()


@lru_cache(maxsize=1)
def _load_model() -> Any:
    """Load the Keras model with caching and thread-safety."""
    with _model_lock:
        settings = get_settings()
        path = settings.image_model_path
        file_name = Path(path).name
        try:
            if not Path(path).is_file():
                raise FileNotFoundError(f"Model file '{file_name}' not found")
            import keras

            try:
                return keras.models.load_model(path, compile=False)
            except TypeError:
                return keras.models.load_model(path)
        except ImageModelUnavailable:
            raise
        except Exception as exc:
            raise ImageModelUnavailable(
                f"Model file '{file_name}' unavailable: {type(exc).__name__}"
            ) from exc


def warm_up() -> bool:
    """Run an initial inference pass to warm up model runtime."""
    if not is_available():
        return False
    try:
        model = _load_model()
        import numpy as np

        zero_img = np.zeros((1, 224, 224, 3), dtype=np.float32)
        try:
            model(zero_img, training=False)
        except Exception:
            model.predict(zero_img, verbose=0)
        return True
    except ImageModelUnavailable as exc:
        logger.warning("Image model warm up failed: %s", type(exc).__name__)
        return False
    except Exception as exc:
        logger.warning("Image model warm up failed: %s", type(exc).__name__)
        return False


def _preprocess(pil_rgb_image: Image.Image) -> Any:
    """Resize image to (224, 224) float32 raw 0-255 pixels shape (1, 224, 224, 3)."""
    import numpy as np
    import tensorflow as tf

    return tf.image.resize(
        np.array(pil_rgb_image, dtype="float32"),
        (224, 224),
    ).numpy()[None]


def interpret(
    probs: list[float],
    accept: float,
    margin: float | None = None,
) -> ImageVerdict:
    """Interpret classification output and acceptance score into an ImageVerdict."""
    if accept <= 0.5:
        return ImageVerdict(
            accepted=False,
            category=None,
            confidence=None,
            needs_review=False,
            reason="not accepted by the model",
        )

    settings = get_settings()
    review_margin = (
        margin if margin is not None else settings.image_review_margin
    )

    top_idx = max(range(len(probs)), key=lambda i: probs[i])
    category = CLASS_NAMES[top_idx]
    confidence = float(probs[top_idx])

    sorted_probs = sorted(probs, reverse=True)
    top1 = float(sorted_probs[0])
    top2 = float(sorted_probs[1]) if len(sorted_probs) > 1 else 0.0

    needs_review = (top1 - top2) < review_margin

    return ImageVerdict(
        accepted=True,
        category=category,
        confidence=confidence,
        needs_review=needs_review,
        reason="accepted",
    )


def predict(data: bytes) -> ImageVerdict:
    """Run end-to-end inference on raw image bytes."""
    try:
        pil_image = Image.open(io.BytesIO(data))
        pil_image.load()
        pil_rgb = pil_image.convert("RGB")
    except Exception as exc:
        logger.warning("Image decode failed: %s", type(exc).__name__)
        raise ImageModelUnavailable(
            f"Image decode failed: {type(exc).__name__}"
        ) from exc

    settings = get_settings()
    width, height = pil_rgb.size
    if min(width, height) < settings.image_min_side_px:
        return ImageVerdict(
            accepted=False,
            category=None,
            confidence=None,
            needs_review=False,
            reason="image too small",
        )

    try:
        x = _preprocess(pil_rgb)
        model = _load_model()
        try:
            out = model(x, training=False)
        except Exception:
            out = model.predict(x, verbose=0)

        import numpy as np

        probs_arr = np.array(out["probs"]).reshape(-1)
        probs = [float(p) for p in probs_arr]
        accept_arr = np.array(out["accept"]).reshape(-1)
        accept = float(accept_arr[0])

        return interpret(probs, accept)
    except ImageModelUnavailable:
        raise
    except Exception as exc:
        logger.warning("Image prediction failed: %s", type(exc).__name__)
        raise ImageModelUnavailable(
            f"Image prediction failed: {type(exc).__name__}"
        ) from exc
