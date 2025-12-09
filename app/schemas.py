from typing import Optional, List
from pydantic import BaseModel, HttpUrl


class ServiceCreate(BaseModel):
    name: str
    url: HttpUrl
    check_interval_seconds: int = 60


class ServiceRead(BaseModel):
    id: int
    name: str
    url: HttpUrl
    check_interval_seconds: int
    is_active: bool

    class Config:
        orm_mode = True


class ServiceStatus(BaseModel):
    is_up: bool
    status_code: Optional[int]
    response_time_ms: Optional[float]
    error_message: Optional[str] = None


class CheckResultRead(BaseModel):
    timestamp: str
    status_code: Optional[int]
    is_up: bool
    response_time_ms: Optional[float]
    error_message: Optional[str] = None

    class Config:
        orm_mode = True


class ServiceWithHistory(ServiceRead):
    checks: List[CheckResultRead] = []
