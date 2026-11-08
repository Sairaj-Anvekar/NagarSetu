from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from app.services.image_service import ImageRejected, validate_image
from app.services.nsfw_check_service import check_image, set_classifier
from app.services.storage_service import Storage


def _create_image(fmt: str, size: tuple[int, int] = (64, 48)) -> bytes:
    buffer = BytesIO()
    image = Image.new("RGB", size, color="blue")
    image.save(buffer, format=fmt)
    return buffer.getvalue()


@pytest.fixture(autouse=True)
def reset_classifier_after_test():
    yield
    set_classifier(None)


def test_image_formats_accepted():
    for fmt, expected_type, expected_ext in [
        ("JPEG", "image/jpeg", "jpg"),
        ("PNG", "image/png", "png"),
        ("WEBP", "image/webp", "webp"),
    ]:
        data = _create_image(fmt, (64, 48))
        result = validate_image(data)
        assert result.content_type == expected_type
        assert result.extension == expected_ext
        assert result.width == 64
        assert result.height == 48


def test_gif_and_plain_text_rejected():
    gif_buf = BytesIO()
    Image.new("RGB", (64, 48), color="red").save(gif_buf, format="GIF")
    gif_bytes = gif_buf.getvalue()

    with pytest.raises(ImageRejected, match="Photo must be a JPG, PNG or WebP image"):
        validate_image(gif_bytes)

    with pytest.raises(ImageRejected, match="Photo must be a JPG, PNG or WebP image"):
        validate_image(b"not an image at all, plain text content")


def test_empty_bytes_rejected():
    with pytest.raises(ImageRejected, match="Photo is required"):
        validate_image(b"")


def test_corrupt_jpeg_rejected():
    corrupt_data = b"\xff\xd8\xff" + b"garbage byte stream simulating corruption"
    with pytest.raises(ImageRejected, match="Photo could not be read as an image"):
        validate_image(corrupt_data)


def test_max_bytes_exceeded():
    data = _create_image("JPEG", (64, 48))
    with pytest.raises(ImageRejected) as exc_info:
        validate_image(data, max_bytes=100)
    assert exc_info.value.args[0].endswith("or smaller")


def test_image_too_small():
    tiny_data = _create_image("JPEG", (8, 8))
    with pytest.raises(ImageRejected, match="Photo is too small"):
        validate_image(tiny_data)


def test_nsfw_scenarios():
    default_verdict = check_image(b"any image data")
    assert default_verdict.allowed is True
    assert default_verdict.score is None

    set_classifier(lambda b: 0.95)
    high_verdict = check_image(b"any image data")
    assert high_verdict.allowed is False
    assert high_verdict.reason == "explicit content suspected"

    set_classifier(lambda b: 0.2)
    low_verdict = check_image(b"any image data")
    assert low_verdict.allowed is True

    def _raising_classifier(_: bytes) -> float:
        raise RuntimeError("Model inference failed")

    set_classifier(_raising_classifier)
    error_verdict = check_image(b"any image data")
    assert error_verdict.allowed is True


def test_storage_presigned_url_and_key_validation():
    settings = SimpleNamespace(
        endpoint="http://floci:4566",
        public_endpoint="http://localhost:4566",
        bucket="nagarsetu-media",
        region="us-east-1",
        keys=("test", "test"),
        expiry=3600,
    )
    storage = Storage(settings)

    url = storage.presigned_url("complaints/abc/photo.jpg")
    assert url.startswith("http://localhost:4566")
    assert "nagarsetu-media" in url
    assert "complaints/abc/photo.jpg" in url
    assert "X-Amz-Signature" in url

    settings_no_pub = SimpleNamespace(
        endpoint="http://floci:4566",
        public_endpoint="",
        bucket="nagarsetu-media",
        region="us-east-1",
        keys=("test", "test"),
        expiry=3600,
    )
    storage_no_pub = Storage(settings_no_pub)
    url_internal = storage_no_pub.presigned_url("complaints/abc/photo.jpg")
    assert url_internal.startswith("http://floci:4566")

    with pytest.raises(ValueError):
        storage.presigned_url("/x")

    with pytest.raises(ValueError):
        storage.presigned_url("../x")
