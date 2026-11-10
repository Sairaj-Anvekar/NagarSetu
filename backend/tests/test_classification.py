from __future__ import annotations

import pytest

from app.services.classification_service import (
    Prediction,
    categories_for,
    classify_image,
    classify_text,
    is_confident,
    set_image_classifier,
    set_text_classifier,
)


@pytest.fixture(autouse=True)
def reset_classifiers():
    yield
    set_image_classifier(None)
    set_text_classifier(None)


def test_image_hint_solid_waste():
    pred = classify_image(b"fake-bytes", hint="big garbage dump near the market")
    assert pred.category == "Solid Waste & Garbage"
    assert pred.confidence >= 0.80
    assert pred.source == "image"
    assert pred.model == "stub-keywords-v1"


def test_image_hint_pothole_exact_confidence():
    pred = classify_image(b"fake-bytes", hint="huge pothole on the road")
    assert pred.category == "Potholes & Road Damage"
    assert pred.confidence == 0.85
    assert pred.source == "image"
    assert pred.model == "stub-keywords-v1"


def test_image_hint_waterlogging():
    pred = classify_image(b"fake-bytes", hint="water flooding the drain")
    assert pred.category == "Waterlogging & Drainage"
    assert pred.source == "image"
    assert pred.model == "stub-keywords-v1"


def test_image_no_hint_unconfident():
    pred = classify_image(b"fake-bytes", hint=None)
    assert pred.confidence == 0.30
    assert pred.category == "Solid Waste & Garbage"
    assert not is_confident(pred)


def test_text_illegal_encroachment():
    pred = classify_text("Hawkers blocking the footpath")
    assert pred.category == "Illegal Encroachment"
    assert pred.source == "text"
    assert pred.model == "stub-keywords-v1"


def test_text_streetlight_power_outage():
    pred = classify_text("Streetlight not working")
    assert pred.category == "Streetlight & Power Outage"
    assert pred.source == "text"
    assert pred.model == "stub-keywords-v1"


def test_text_stray_animals_pest_control():
    pred = classify_text("Aggressive stray dogs near the school")
    assert pred.category == "Stray Animals & Pest Control"
    assert pred.source == "text"
    assert pred.model == "stub-keywords-v1"


def test_text_gibberish_low_confidence():
    pred = classify_text("qqzz xx")
    assert pred.confidence == 0.30
    assert not is_confident(pred)


def test_input_type_category_isolation():
    image_cats = set(categories_for("image"))
    text_cats = set(categories_for("text"))
    assert image_cats.isdisjoint(text_cats)

    # Image classifications only return image categories
    for hint in [
        "big garbage dump",
        "huge pothole",
        "water flooding",
        "completely unrelated words",
        None,
    ]:
        pred = classify_image(b"dummy", hint=hint)
        assert pred.category in image_cats
        assert pred.category not in text_cats

    # Text classifications only return text categories
    for text in [
        "Streetlight out",
        "Hawkers on footpath",
        "Stray dog menace",
        "garbage on road",  # text with words from image keywords should stay in text categories
        "random gibberish",
    ]:
        pred = classify_text(text)
        assert pred.category in text_cats
        assert pred.category not in image_cats


def test_is_confident_threshold():
    pred_high = Prediction(
        category="Solid Waste & Garbage",
        confidence=0.80,
        source="image",
        model="test",
    )
    assert is_confident(pred_high) is True

    pred_low = Prediction(
        category="Solid Waste & Garbage",
        confidence=0.30,
        source="image",
        model="test",
    )
    assert is_confident(pred_low) is False


def test_registered_text_classifier_custom():
    set_text_classifier(lambda text: ("Illegal Encroachment", 0.9))
    pred = classify_text("any random message")
    assert pred.category == "Illegal Encroachment"
    assert pred.confidence == 0.9
    assert pred.source == "text"
    assert pred.model == "custom"


def test_registered_text_classifier_unknown_category_fallback():
    set_text_classifier(lambda text: ("Unknown UFO Landing", 0.95))
    pred = classify_text("Hawkers blocking the footpath")
    assert pred.category == "Illegal Encroachment"
    assert pred.model == "stub-keywords-v1"


def test_registered_text_classifier_out_of_range_confidence_fallback():
    set_text_classifier(lambda text: ("Illegal Encroachment", 1.5))
    pred = classify_text("Hawkers blocking the footpath")
    assert pred.category == "Illegal Encroachment"
    assert pred.model == "stub-keywords-v1"


def test_registered_text_classifier_raises_fallback():
    def exploding_classifier(text: str) -> tuple[str, float]:
        raise RuntimeError("Classifier crashed")

    set_text_classifier(exploding_classifier)
    pred = classify_text("Hawkers blocking the footpath")
    assert pred.category == "Illegal Encroachment"
    assert pred.model == "stub-keywords-v1"


def test_registered_image_classifier_returning_text_category_falls_back():
    set_image_classifier(lambda *a, **kw: ("Streetlight & Power Outage", 0.99))
    pred = classify_image(b"fake-bytes", hint="big garbage dump near the market")
    assert pred.category == "Solid Waste & Garbage"
    assert pred.model == "stub-keywords-v1"

