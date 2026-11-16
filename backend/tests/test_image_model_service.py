import io

import pytest
from PIL import Image

from app.core.config import get_settings
from app.services import image_model_service
from app.services.image_model_service import (
    CLASS_NAMES,
    ImageModelUnavailable,
    interpret,
)


def _make_jpeg_bytes(width: int, height: int, color=(200, 200, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_interpret_category_mapping_order():
    # Index 0 -> Solid Waste & Garbage
    v0 = interpret([0.8, 0.1, 0.1], 0.9)
    assert v0.accepted is True
    assert v0.category == CLASS_NAMES[0]
    assert v0.category == "Solid Waste & Garbage"

    # Index 1 -> Potholes & Road Damage
    v1 = interpret([0.1, 0.8, 0.1], 0.9)
    assert v1.accepted is True
    assert v1.category == CLASS_NAMES[1]
    assert v1.category == "Potholes & Road Damage"

    # Index 2 -> Waterlogging & Drainage
    v2 = interpret([0.1, 0.1, 0.8], 0.9)
    assert v2.accepted is True
    assert v2.category == CLASS_NAMES[2]
    assert v2.category == "Waterlogging & Drainage"


def test_interpret_rejection_thresholds():
    # accept 0.5 and 0.2 must both be rejected
    v_half = interpret([0.8, 0.1, 0.1], 0.5)
    assert v_half.accepted is False
    assert v_half.category is None
    assert v_half.confidence is None
    assert v_half.reason == "not accepted by the model"

    v_low = interpret([0.8, 0.1, 0.1], 0.2)
    assert v_low.accepted is False
    assert v_low.category is None
    assert v_low.confidence is None
    assert v_low.reason == "not accepted by the model"


def test_interpret_review_margin_and_confidence():
    # Clear winner (0.90, 0.07, 0.03) -> diff 0.83 >= 0.4 -> needs_review False
    v_clear = interpret([0.90, 0.07, 0.03], 0.95, margin=0.4)
    assert v_clear.accepted is True
    assert v_clear.confidence == pytest.approx(0.90)
    assert v_clear.needs_review is False
    assert v_clear.reason == "accepted"

    # Close contest (0.50, 0.40, 0.10) -> diff 0.10 < 0.4 -> needs_review True
    v_close = interpret([0.50, 0.40, 0.10], 0.95, margin=0.4)
    assert v_close.accepted is True
    assert v_close.confidence == pytest.approx(0.50)
    assert v_close.needs_review is True
    assert v_close.reason == "accepted"


def test_predict_rejects_small_image_without_loading_model(monkeypatch):
    def fake_load():
        raise AssertionError("_load_model must not be called for small images")

    monkeypatch.setattr(image_model_service, "_load_model", fake_load)

    small_jpeg = _make_jpeg_bytes(90, 300)
    verdict = image_model_service.predict(small_jpeg)
    assert verdict.accepted is False
    assert verdict.category is None
    assert verdict.confidence is None
    assert verdict.needs_review is False
    assert verdict.reason == "image too small"


def test_predict_undecodable_bytes_raises():
    with pytest.raises(ImageModelUnavailable):
        image_model_service.predict(b"not-a-valid-image-bytes")


def test_predict_with_fake_model_accepted(monkeypatch):
    import numpy as np

    def fake_model(x, **kw):
        return {
            "probs": np.array([[0.1, 0.8, 0.1]]),
            "accept": np.array([[0.9]]),
        }
    monkeypatch.setattr(image_model_service, "_load_model", lambda: fake_model)
    monkeypatch.setattr(
        image_model_service,
        "_preprocess",
        lambda img: np.zeros((1, 224, 224, 3), dtype=np.float32),
    )

    jpeg_bytes = _make_jpeg_bytes(300, 300)
    verdict = image_model_service.predict(jpeg_bytes)
    assert verdict.accepted is True
    assert verdict.category == "Potholes & Road Damage"
    assert verdict.confidence == pytest.approx(0.8)
    assert verdict.needs_review is False
    assert verdict.reason == "accepted"


def test_predict_with_fake_model_rejected(monkeypatch):
    import numpy as np

    def fake_model(x, **kw):
        return {
            "probs": np.array([[0.1, 0.8, 0.1]]),
            "accept": np.array([[0.2]]),
        }
    monkeypatch.setattr(image_model_service, "_load_model", lambda: fake_model)
    monkeypatch.setattr(
        image_model_service,
        "_preprocess",
        lambda img: np.zeros((1, 224, 224, 3), dtype=np.float32),
    )

    jpeg_bytes = _make_jpeg_bytes(300, 300)
    verdict = image_model_service.predict(jpeg_bytes)
    assert verdict.accepted is False
    assert verdict.category is None
    assert verdict.confidence is None
    assert verdict.reason == "not accepted by the model"


def test_is_available_checks(monkeypatch):
    # False because IMAGE_MODEL_ENABLED="false" in conftest
    assert image_model_service.is_available() is False

    # False when enabled but path does not exist
    settings = get_settings()
    monkeypatch.setattr(settings, "image_model_enabled", True)
    monkeypatch.setattr(
        settings, "image_model_path", "/app/non_existent_model_file.keras"
    )
    assert image_model_service.is_available() is False


def test_preprocess_contract():
    pytest.importorskip("tensorflow")
    white_img = Image.new("RGB", (300, 300), (255, 255, 255))
    x = image_model_service._preprocess(white_img)
    assert x.shape == (1, 224, 224, 3)
    assert str(x.dtype) == "float32"
    assert x.min() >= 0.0 and x.max() <= 255.0
    assert x.max() > 250.0


def test_warm_up_when_unavailable():
    assert image_model_service.warm_up() is False
