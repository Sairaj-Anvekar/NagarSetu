import jwt
import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_secret,
    verify_secret,
)


def test_hash_secret_differs_from_plain_and_verifies() -> None:
    plain = "secret-pin-1234"
    hashed = hash_secret(plain)
    assert hashed != plain
    assert verify_secret(plain, hashed) is True


def test_verify_secret_fails_with_wrong_secret() -> None:
    plain = "secret-pin-1234"
    hashed = hash_secret(plain)
    assert verify_secret("wrong-pin-9999", hashed) is False


def test_two_hashes_of_same_secret_differ() -> None:
    plain = "my-admin-password"
    hash1 = hash_secret(plain)
    hash2 = hash_secret(plain)
    assert hash1 != hash2
    assert verify_secret(plain, hash1) is True
    assert verify_secret(plain, hash2) is True


def test_verify_secret_returns_false_on_malformed_hash() -> None:
    assert verify_secret("secret-pin-1234", "not-a-valid-bcrypt-hash") is False
    assert verify_secret("secret-pin-1234", "") is False


def test_token_round_trip() -> None:
    token = create_access_token(subject="user-42", role="admin", name="Officer Priya")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-42"
    assert payload["role"] == "admin"
    assert payload["name"] == "Officer Priya"
    assert "iat" in payload
    assert "exp" in payload


def test_invalid_role_raises_value_error() -> None:
    with pytest.raises(ValueError, match="Allowed roles are 'admin' and 'worker'"):
        create_access_token(subject="user-1", role="superuser")


def test_expired_token_raises_expired_signature_error() -> None:
    token = create_access_token(subject="worker-9", role="worker", expires_minutes=-1)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_tampered_token_raises_invalid_token_error() -> None:
    token = create_access_token(subject="user-42", role="admin")
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(tampered)

