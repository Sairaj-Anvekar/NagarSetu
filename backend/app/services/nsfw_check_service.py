"""Plug-in point for an explicit-content classifier.

Until a classifier is registered, every image is allowed.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NsfwVerdict:
    allowed: bool
    score: float | None
    reason: str


_classifier: Callable[[bytes], float | None] | None = None


def set_classifier(fn_or_none: Callable[[bytes], float | None] | None) -> None:
    global _classifier
    _classifier = fn_or_none


def check_image(data: bytes) -> NsfwVerdict:
    if _classifier is None:
        return NsfwVerdict(allowed=True, score=None, reason="no classifier configured")

    try:
        score = _classifier(data)
    except Exception as exc:
        logger.warning("NSFW classifier raised an error, failing open: %s", exc)
        return NsfwVerdict(allowed=True, score=None, reason="classifier error, allowed")

    threshold = get_settings().nsfw_threshold
    if score is not None and score >= threshold:
        return NsfwVerdict(allowed=False, score=score, reason="explicit content suspected")

    return NsfwVerdict(allowed=True, score=score, reason="allowed")
