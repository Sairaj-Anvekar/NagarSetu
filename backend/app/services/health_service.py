import redis
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


def _fail(exc: Exception) -> dict:
    # Only the exception class name: never connection strings or messages.
    return {"ok": False, "detail": type(exc).__name__}


def check_database() -> dict:
    engine = None
    try:
        settings = get_settings()
        engine = create_engine(
            settings.database_url,
            poolclass=NullPool,
            connect_args={"connect_timeout": 3, "options": "-c statement_timeout=3000"},
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            version = conn.execute(text("SELECT PostGIS_Version()")).scalar()
        return {"ok": True, "detail": f"postgis {version}"}
    except Exception as exc:
        return _fail(exc)
    finally:
        if engine is not None:
            engine.dispose()


def check_redis() -> dict:
    client = None
    try:
        settings = get_settings()
        client = redis.Redis.from_url(
            settings.redis_url, socket_connect_timeout=2, socket_timeout=2
        )
        client.ping()
        return {"ok": True, "detail": "pong"}
    except Exception as exc:
        return _fail(exc)
    finally:
        if client is not None:
            client.close()


def run_checks() -> dict:
    return {"database": check_database(), "redis": check_redis()}