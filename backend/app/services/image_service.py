from dataclasses import dataclass
from io import BytesIO

from PIL import Image

from app.core.config import get_settings


class ImageRejected(ValueError):
    pass


@dataclass(frozen=True)
class ValidatedImage:
    content_type: str
    extension: str
    width: int
    height: int
    size: int


def detect_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def validate_image(data: bytes, max_bytes: int | None = None) -> ValidatedImage:
    if max_bytes is None:
        max_bytes = get_settings().max_upload_bytes

    if not data:
        raise ImageRejected("Photo is required")

    if len(data) > max_bytes:
        if max_bytes >= 1024 * 1024:
            size_text = f"{max_bytes // (1024 * 1024)} MB"
        else:
            size_text = f"{max_bytes} bytes"
        raise ImageRejected(f"Photo must be {size_text} or smaller")

    detected = detect_type(data)
    if detected is None:
        raise ImageRejected("Photo must be a JPG, PNG or WebP image")

    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
        with Image.open(BytesIO(data)) as img:
            width, height = img.size
    except Exception as exc:
        raise ImageRejected("Photo could not be read as an image") from exc

    if width * height > 50_000_000:
        raise ImageRejected("Photo dimensions are too large")

    if width < 16 or height < 16:
        raise ImageRejected("Photo is too small")

    type_map = {
        "jpeg": ("image/jpeg", "jpg"),
        "png": ("image/png", "png"),
        "webp": ("image/webp", "webp"),
    }
    content_type, extension = type_map[detected]

    return ValidatedImage(
        content_type=content_type,
        extension=extension,
        width=width,
        height=height,
        size=len(data),
    )

