from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .database import Base


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

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)

    timestamp = Column(DateTime, default=datetime.utcnow)
    status_code = Column(Integer, nullable=True)
    is_up = Column(Boolean, nullable=False)
    response_time_ms = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)

    service = relationship("Service", back_populates="checks")
