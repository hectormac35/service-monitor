# app/routers/services.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, database
from ..notifications import send_telegram_message

router = APIRouter()


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ServiceRead)
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = models.Service(
        name=service.name,
        url=str(service.url),
        check_interval_seconds=service.check_interval_seconds,
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.get("/", response_model=List[schemas.ServiceRead])
def list_services(db: Session = Depends(get_db)):
    services = db.query(models.Service).all()
    return services


@router.get("/{service_id}", response_model=schemas.ServiceRead)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.get("/{service_id}/status", response_model=schemas.ServiceStatus)
def get_service_status(service_id: int, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    last_check = (
        db.query(models.CheckResult)
        .filter(models.CheckResult.service_id == service_id)
        .order_by(models.CheckResult.timestamp.desc())
        .first()
    )

    if not last_check:
        raise HTTPException(
            status_code=404,
            detail="No checks performed yet for this service",
        )

    return schemas.ServiceStatus(
        is_up=last_check.is_up,
        status_code=last_check.status_code,
        response_time_ms=last_check.response_time_ms,
        error_message=last_check.error_message,
    )


@router.post("/test-notification")
async def test_notification():
    await send_telegram_message("🔔 Test de notificación desde Service Monitor")
    return {"detail": "Notification sent (if Telegram is configured correctly)."}
