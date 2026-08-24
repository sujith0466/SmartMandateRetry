"""Redis connection client factory."""

import redis
from app.core.config import get_settings

settings = get_settings()

redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)


def get_redis() -> redis.Redis:
    """Return active Redis client."""
    return redis_client
