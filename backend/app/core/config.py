from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    app_env: str = "development"
    database_url: str
    redis_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173"
    rate_limit_enabled: bool = True

    s3_endpoint_url: str | None = None
    s3_public_endpoint_url: str | None = None
    s3_bucket: str = "nagarsetu-media"
    s3_region: str = "ap-south-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    signed_url_expire_seconds: int = 3600
    max_upload_bytes: int = 8388608
    nsfw_threshold: float = 0.8

    telegram_bot_token: str | None = None
    telegram_api_base: str = "https://api.telegram.org"
    telegram_poll_timeout: int = 30
    telegram_session_ttl_seconds: int = 1200
    ai_confidence_threshold: float = 0.70

    geocode_enabled: bool = True
    geocode_url: str = "https://nominatim.openstreetmap.org/reverse"
    geocode_timeout: float = 3.0
    geocode_min_interval: float = 1.0

    hotspot_label_limit: int = 5
    hotspot_label_budget_seconds: float = 6.0

    image_model_enabled: bool = True
    image_model_path: str = "/app/app/ml/models/smart_grievance_mobilenetv2_v2_with_rejection.keras"
    image_min_side_px: int = 100
    image_review_margin: float = 0.4


@lru_cache
def get_settings() -> Settings:
    return Settings()
