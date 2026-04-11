from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import field_validator

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_LOCAL_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
)
DEFAULT_LOCAL_CORS_REGEX = r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"


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
    CORS_ORIGINS: str = ",".join(DEFAULT_LOCAL_CORS_ORIGINS)
    CORS_ORIGIN_REGEX: str = DEFAULT_LOCAL_CORS_REGEX
    SUPER_ADMIN_EMAIL: str = "aymen.horchani@leoni.com"
    SEED_DEFAULT_PASSWORD: str = "ChangeMe123!"
    SEED_EMAIL_DOMAIN: str = "leoni.com"
    PASSWORD_RESET_CODE_EXPIRE_MINUTES: int = 10
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Gestion des formations"
    SMTP_TIMEOUT_SECONDS: int = 15

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
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        for local_origin in DEFAULT_LOCAL_CORS_ORIGINS:
            if local_origin not in origins:
                origins.append(local_origin)
        return origins

    @property
    def cors_origin_regex_pattern(self) -> str:
        pattern = self.CORS_ORIGIN_REGEX.strip()
        if not pattern:
            return DEFAULT_LOCAL_CORS_REGEX
        if "::1" in pattern:
            return pattern
        if pattern == r"https?://(localhost|127\.0\.0\.1)(:\d+)?$":
            return DEFAULT_LOCAL_CORS_REGEX
        return pattern

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

    @property
    def smtp_is_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_FROM_EMAIL)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
