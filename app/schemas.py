# app/schemas.py
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from .config import MAX_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS


def _con_zona(valor: datetime | None) -> datetime | None:
    # SQLite devuelve fechas sin zona horaria: las marcamos como UTC
    if valor is not None and valor.tzinfo is None:
        return valor.replace(tzinfo=UTC)
    return valor


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: HttpUrl
    check_interval_seconds: int = Field(default=60, ge=MIN_INTERVAL_SECONDS, le=MAX_INTERVAL_SECONDS)

    @field_validator("name")
    @classmethod
    def nombre_sin_espacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    url: HttpUrl | None = None
    check_interval_seconds: int | None = Field(default=None, ge=MIN_INTERVAL_SECONDS, le=MAX_INTERVAL_SECONDS)
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    check_interval_seconds: int
    is_active: bool


class ServiceStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_up: bool
    status_code: int | None = None
    response_time_ms: float | None = None
    error_message: str | None = None
    timestamp: datetime | None = None

    @field_validator("timestamp")
    @classmethod
    def utc(cls, v):
        return _con_zona(v)


class CheckResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    status_code: int | None = None
    is_up: bool
    response_time_ms: float | None = None
    error_message: str | None = None

    @field_validator("timestamp")
    @classmethod
    def utc(cls, v):
        return _con_zona(v)


class ServiceOverview(ServiceRead):
    """Servicio con su último estado y estadísticas: lo que necesita el dashboard en una sola llamada."""

    last_check: ServiceStatus | None = None
    uptime_24h: float | None = None
    avg_latency_ms_24h: float | None = None
    checks_24h: int = 0
    recent_latencies: list[float | None] = []
    recent_up: list[bool] = []
