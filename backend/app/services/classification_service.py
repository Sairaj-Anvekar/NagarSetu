"""Classification service for citizen grievances.

This module provides grievance classification with a keyword-based heuristic stub
(model name: 'stub-keywords-v1') that does NOT inspect image pixels; the image stub
only reads the optional hint (photo caption). Real ML/vision models can be registered
at runtime via set_image_classifier and set_text_classifier.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass

from app.core.categories import CATEGORIES
from app.core.config import get_settings

logger = logging.getLogger(__name__)

ClassifierCallable = Callable[..., tuple[str, float]]

_image_classifier: ClassifierCallable | None = None
_text_classifier: ClassifierCallable | None = None

IMAGE_KEYWORDS: dict[str, list[str]] = {
    "Solid Waste & Garbage": ["garbage", "waste", "trash", "dump", "litter", "bin"],
    "Potholes & Road Damage": ["pothole", "road", "crack", "damage", "asphalt"],
    "Waterlogging & Drainage": ["water", "flood", "drain", "sewage", "overflow", "waterlog"],
}

TEXT_KEYWORDS: dict[str, list[str]] = {
    "Streetlight & Power Outage": [
        "streetlight",
        "street light",
        "lamp",
        "light",
        "power",
        "electric",
        "transformer",
        "wire",
    ],
    "Illegal Encroachment": ["encroach", "hawker", "footpath", "stall", "vendor", "illegal"],
    "Stray Animals & Pest Control": [
        "stray",
        "dog",
        "cattle",
        "cow",
        "monkey",
        "pest",
        "mosquito",
        "rat",
        "snake",
    ],
}


@dataclass(frozen=True)
class Prediction:
    category: str
    confidence: float
    source: str
    model: str


def set_image_classifier(fn_or_none: ClassifierCallable | None) -> None:
    global _image_classifier
    _image_classifier = fn_or_none


def set_text_classifier(fn_or_none: ClassifierCallable | None) -> None:
    global _text_classifier
    _text_classifier = fn_or_none


def categories_for(input_type: str) -> list[str]:
    return [name for name, info in CATEGORIES.items() if info.input_type == input_type]


def is_confident(pred: Prediction) -> bool:
    settings = get_settings()
    return pred.confidence >= settings.ai_confidence_threshold


def _stub_classify(raw_text: str | None, input_type: str) -> Prediction:
    allowed_cats = categories_for(input_type)
    default_cat = allowed_cats[0]

    if not raw_text or not raw_text.strip():
        return Prediction(
            category=default_cat,
            confidence=0.30,
            source=input_type,
            model="stub-keywords-v1",
        )

    text_lower = raw_text.lower()
    keyword_map = IMAGE_KEYWORDS if input_type == "image" else TEXT_KEYWORDS

    best_cat = default_cat
    max_hits = 0

    for cat in allowed_cats:
        kws = keyword_map.get(cat, [])
        hits = sum(1 for kw in kws if kw in text_lower)
        if hits > max_hits:
            max_hits = hits
            best_cat = cat

    if max_hits == 0:
        return Prediction(
            category=default_cat,
            confidence=0.30,
            source=input_type,
            model="stub-keywords-v1",
        )

    conf = min(0.95, 0.80 + 0.05 * (max_hits - 1))
    return Prediction(
        category=best_cat,
        confidence=round(conf, 4),
        source=input_type,
        model="stub-keywords-v1",
    )


def classify_image(data: bytes, hint: str | None = None) -> Prediction:
    if _image_classifier is not None:
        try:
            try:
                res = _image_classifier(data, hint)
            except TypeError:
                res = _image_classifier(data)

            if (
                isinstance(res, tuple)
                and len(res) == 2
                and isinstance(res[0], str)
                and isinstance(res[1], (int, float))
            ):
                cat, conf = res[0], float(res[1])
                if cat in categories_for("image") and 0.0 <= conf <= 1.0:
                    return Prediction(
                        category=cat,
                        confidence=conf,
                        source="image",
                        model="custom",
                    )
            logger.warning("Custom image classifier returned invalid output: %r", res)
        except Exception as exc:
            logger.warning("Custom image classifier raised exception: %s", exc)

    return _stub_classify(hint, "image")


def classify_text(text: str) -> Prediction:
    if _text_classifier is not None:
        try:
            res = _text_classifier(text)
            if (
                isinstance(res, tuple)
                and len(res) == 2
                and isinstance(res[0], str)
                and isinstance(res[1], (int, float))
            ):
                cat, conf = res[0], float(res[1])
                if cat in categories_for("text") and 0.0 <= conf <= 1.0:
                    return Prediction(
                        category=cat,
                        confidence=conf,
                        source="text",
                        model="custom",
                    )
            logger.warning("Custom text classifier returned invalid output: %r", res)
        except Exception as exc:
            logger.warning("Custom text classifier raised exception: %s", exc)

    return _stub_classify(text, "text")
