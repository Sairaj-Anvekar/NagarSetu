import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_CACHE_MAX_SIZE = 256
_cache: dict[tuple[float, float], str] = {}


def reverse_geocode(
    latitude: float,
    longitude: float,
    client: httpx.Client | None = None,
) -> str | None:
    settings = get_settings()
    if not settings.geocode_enabled:
        return None

    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        return None

    cache_key = (round(latitude, 4), round(longitude, 4))
    if cache_key in _cache:
        return _cache[cache_key]

    params: dict[str, Any] = {
        "format": "jsonv2",
        "lat": latitude,
        "lon": longitude,
        "zoom": 16,
        "addressdetails": 1,
    }
    headers = {
        "User-Agent": "NagarSetu-college-project/1.0",
        "Accept-Language": "en",
    }

    try:
        if client is not None:
            response = client.get(
                settings.geocode_url,
                params=params,
                headers=headers,
                timeout=settings.geocode_timeout,
            )
        else:
            with httpx.Client(timeout=settings.geocode_timeout) as default_client:
                response = default_client.get(
                    settings.geocode_url,
                    params=params,
                    headers=headers,
                )

        if response.status_code != 200:
            return None

        data = response.json()
        if not isinstance(data, dict):
            return None

        address = data.get("address")
        if not isinstance(address, dict):
            return None

        def _first_non_empty(addr: dict[str, Any], keys: tuple[str, ...]) -> str | None:
            for k in keys:
                v = addr.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()
            return None

        p1 = _first_non_empty(
            address,
            ("suburb", "neighbourhood", "village", "hamlet", "quarter"),
        )
        p2 = _first_non_empty(
            address,
            ("city_district", "county", "state_district"),
        )
        p3 = _first_non_empty(
            address,
            ("city", "town", "municipality"),
        )

        raw_parts = [p for p in (p1, p2, p3) if p]
        if not raw_parts:
            return None

        seen: set[str] = set()
        unique_parts: list[str] = []
        for p in raw_parts:
            p_lower = p.lower()
            if p_lower not in seen:
                seen.add(p_lower)
                unique_parts.append(p)

        label = ", ".join(unique_parts)[:120]
        if not label:
            return None

        if len(_cache) >= _CACHE_MAX_SIZE:
            _cache.clear()
        _cache[cache_key] = label
        return label

    except Exception as exc:
        logger.warning("Reverse geocode failed: %s", type(exc).__name__)
        return None
