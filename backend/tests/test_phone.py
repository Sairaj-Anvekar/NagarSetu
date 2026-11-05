import pytest

from app.core.phone import normalize_phone


def test_normalize_phone_valid() -> None:
    assert normalize_phone("98765 43210") == "+919876543210"
    assert normalize_phone("+91 98765-43210") == "+919876543210"
    assert normalize_phone("919876543210") == "+919876543210"
    assert normalize_phone("09876543210") == "+919876543210"
    assert normalize_phone("+14155550123") == "+14155550123"


def test_normalize_phone_invalid() -> None:
    with pytest.raises(ValueError, match="Enter a valid phone number"):
        normalize_phone("12345")

    with pytest.raises(ValueError, match="Enter a valid phone number"):
        normalize_phone("abcdefghij")

