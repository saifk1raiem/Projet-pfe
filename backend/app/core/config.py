from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import field_validator

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
LOCAL_DEV_ORIGIN_REGEX = (
    r"https?://("
    r"localhost|127\.0\.0\.1|0\.0\.0\.0|"
    r"10(?:\.\d{1,3}){3}|"
    r"192\.168(?:\.\d{1,3}){2}|"
    r"172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|"
    r"[a-zA-Z0-9-]+(?:\.local)?"
    r")(?::\d+)?$"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Gestion des formations API"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/postgres"
    JWT_SECRET_KEY: str = "change-this-access-secret"
    JWT_REFRESH_SECRET_KEY: str = "change-this-refresh-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    CORS_ORIGIN_REGEX: str = LOCAL_DEV_ORIGIN_REGEX
    SEED_ADMIN_EMAIL: str = "saif.kraiem@leoni.com"
    SEED_DEFAULT_PASSWORD: str = "ChangeMe123!"
    SEED_EMAIL_DOMAIN: str = "leoni.com"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg2://", 1)
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg2://", 1)
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_host(self) -> str:
        return urlsplit(self.DATABASE_URL).hostname or ""

    @property
    def database_target(self) -> str:
        host = self.database_host.lower()
        if host in {"localhost", "127.0.0.1"}:
            return "local"
        if "supabase" in host:
            return "supabase"
        return "custom"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
