# app/models.py
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


def ahora_utc() -> datetime:
    return datetime.now(UTC)


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    check_interval_seconds = Column(Integer, nullable=False, default=60)
    is_active = Column(Boolean, nullable=False, default=True)

    checks = relationship(
        "CheckResult",
        back_populates="service",
        cascade="all, delete-orphan",
    )


class CheckResult(Base):
    __tablename__ = "check_results"
    __table_args__ = (Index("ix_check_results_service_timestamp", "service_id", "timestamp"),)

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)

    timestamp = Column(DateTime(timezone=True), default=ahora_utc, nullable=False)
    status_code = Column(Integer, nullable=True)
    is_up = Column(Boolean, nullable=False)
    response_time_ms = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)

    service = relationship("Service", back_populates="checks")
