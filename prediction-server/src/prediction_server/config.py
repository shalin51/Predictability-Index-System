from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 4100
    model_dir: Path = Path(".models")
    cors_origins: str = "http://localhost:3000"
    database_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="PREDICTION_",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
