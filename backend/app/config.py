from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _as_bool(raw_value: str | None, default: bool = False) -> bool:
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    USE_DATABASE: bool
    DATABASE_URL: str
    DATABASE_ECHO: bool
    DATABASE_POOL_SIZE: int
    DATABASE_MAX_OVERFLOW: int
    DATABASE_POOL_RECYCLE: int
    OPENAI_EMBEDDING_MODEL: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        USE_DATABASE=_as_bool(os.getenv("USE_DATABASE"), default=False),
        DATABASE_URL=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/kutane",
        ),
        DATABASE_ECHO=_as_bool(os.getenv("DATABASE_ECHO"), default=False),
        DATABASE_POOL_SIZE=int(os.getenv("DATABASE_POOL_SIZE", "5")),
        DATABASE_MAX_OVERFLOW=int(os.getenv("DATABASE_MAX_OVERFLOW", "10")),
        DATABASE_POOL_RECYCLE=int(os.getenv("DATABASE_POOL_RECYCLE", "1800")),
        OPENAI_EMBEDDING_MODEL=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    )
