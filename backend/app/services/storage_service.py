import functools
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import get_settings


class StorageError(Exception):
    pass


def _validate_key(key: str) -> None:
    if not key or key.startswith("/") or ".." in key:
        raise ValueError(f"Invalid object key: {key}")


def _resolve_setting(settings: Any, *attr_names: str, default: Any = None) -> Any:
    for name in attr_names:
        if hasattr(settings, name):
            val = getattr(settings, name)
            if val is not None:
                return val
    return default


class Storage:
    def __init__(self, settings: Any = None) -> None:
        if settings is None:
            settings = get_settings()

        endpoint_url = _resolve_setting(settings, "s3_endpoint_url", "endpoint_url", "endpoint")
        public_endpoint_url = _resolve_setting(
            settings, "s3_public_endpoint_url", "public_endpoint_url", "public_endpoint"
        )
        self._bucket = _resolve_setting(settings, "s3_bucket", "bucket", default="nagarsetu-media")
        self._region = _resolve_setting(settings, "s3_region", "region", default="us-east-1")
        self._expire_seconds = int(
            _resolve_setting(
                settings,
                "signed_url_expire_seconds",
                "expiry_seconds",
                "expiry",
                default=3600,
            )
        )
        self._bucket_ensured = False

        access_key = _resolve_setting(settings, "s3_access_key_id", "access_key_id", "access_key")
        secret_key = _resolve_setting(
            settings, "s3_secret_access_key", "secret_access_key", "secret_key"
        )
        if access_key is None or secret_key is None:
            keys_attr = getattr(settings, "keys", None)
            if isinstance(keys_attr, (list, tuple)) and len(keys_attr) == 2:
                access_key = keys_attr[0]
                secret_key = keys_attr[1]

        internal_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if endpoint_url else "auto"},
            connect_timeout=3,
            read_timeout=10,
            retries={"max_attempts": 1},
        )

        internal_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": self._region,
            "config": internal_config,
        }
        if endpoint_url:
            internal_kwargs["endpoint_url"] = endpoint_url
        if access_key and secret_key:
            internal_kwargs["aws_access_key_id"] = access_key
            internal_kwargs["aws_secret_access_key"] = secret_key

        self._client = boto3.client(**internal_kwargs)

        signing_endpoint = public_endpoint_url or endpoint_url
        signing_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if signing_endpoint else "auto"},
            connect_timeout=3,
            read_timeout=10,
            retries={"max_attempts": 1},
        )

        signing_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "region_name": self._region,
            "config": signing_config,
        }
        if signing_endpoint:
            signing_kwargs["endpoint_url"] = signing_endpoint
        if access_key and secret_key:
            signing_kwargs["aws_access_key_id"] = access_key
            signing_kwargs["aws_secret_access_key"] = secret_key

        self._signing_client = boto3.client(**signing_kwargs)

    def ensure_bucket(self) -> None:
        if self._bucket_ensured:
            return
        try:
            try:
                self._client.head_bucket(Bucket=self._bucket)
                self._bucket_ensured = True
                return
            except ClientError as e:
                code = str(e.response.get("Error", {}).get("Code", ""))
                status_code = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
                if code in ("404", "NoSuchBucket", "NotFound") or status_code == 404:
                    create_kwargs: dict[str, Any] = {"Bucket": self._bucket}
                    if self._region and self._region != "us-east-1":
                        create_kwargs["CreateBucketConfiguration"] = {
                            "LocationConstraint": self._region
                        }
                    self._client.create_bucket(**create_kwargs)
                    self._bucket_ensured = True
                    return
                raise
        except (ClientError, BotoCoreError) as e:
            raise StorageError("Storage operation failed") from e

    def put_object(self, key: str, data: bytes, content_type: str) -> None:
        _validate_key(key)
        self.ensure_bucket()
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except ClientError as e:
            code = str(e.response.get("Error", {}).get("Code", ""))
            if code == "NoSuchBucket":
                self._bucket_ensured = False
                self.ensure_bucket()
                try:
                    self._client.put_object(
                        Bucket=self._bucket,
                        Key=key,
                        Body=data,
                        ContentType=content_type,
                    )
                    return
                except (ClientError, BotoCoreError) as retry_exc:
                    raise StorageError("Storage operation failed") from retry_exc
            raise StorageError("Storage operation failed") from e
        except BotoCoreError as e:
            raise StorageError("Storage operation failed") from e

    def delete_object(self, key: str) -> None:
        _validate_key(key)
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except (ClientError, BotoCoreError) as e:
            raise StorageError("Storage operation failed") from e

    def object_exists(self, key: str) -> bool:
        _validate_key(key)
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError as e:
            code = str(e.response.get("Error", {}).get("Code", ""))
            status_code = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if code in ("404", "NoSuchKey", "NotFound") or status_code == 404:
                return False
            raise StorageError("Storage operation failed") from e
        except BotoCoreError as e:
            raise StorageError("Storage operation failed") from e

    def presigned_url(self, key: str, expires: int | None = None) -> str:
        _validate_key(key)
        expiry = expires if expires is not None else self._expire_seconds
        try:
            return str(
                self._signing_client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": self._bucket, "Key": key},
                    ExpiresIn=expiry,
                )
            )
        except (ClientError, BotoCoreError) as e:
            raise StorageError("Storage operation failed") from e


@functools.lru_cache(maxsize=1)
def get_storage() -> Storage:
    return Storage()
