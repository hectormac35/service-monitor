# app/checks.py
import time
from typing import List

import httpx
from sqlalchemy.orm import Session

from . import models, database
from .notifications import send_telegram_message


async def check_service(service: models.Service, db: Session) -> None:
    """Comprueba una URL y guarda el resultado en la BBDD."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        start = time.perf_counter()
        try:
            response = await client.get(service.url)
            elapsed_ms = (time.perf_counter() - start) * 1000

            result = models.CheckResult(
                service_id=service.id,
                status_code=response.status_code,
                is_up=200 <= response.status_code < 400,
                response_time_ms=elapsed_ms,
                error_message=None,
            )
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            result = models.CheckResult(
                service_id=service.id,
                status_code=None,
                is_up=False,
                response_time_ms=elapsed_ms,
                error_message=str(exc)[:200],
            )

    db.add(result)
    db.commit()

    # Si el servicio está caído, enviamos alerta por Telegram
    if not result.is_up:
        await send_telegram_message(
            f"🚨 Servicio caído:\n"
            f"{service.name}\n"
            f"{service.url}\n"
            f"Error: {result.error_message}"
        )


async def run_checks_for_all_services() -> None:
    """Recorre todos los servicios activos y los comprueba."""
    db: Session = database.SessionLocal()
    try:
        services: List[models.Service] = (
            db.query(models.Service)
            .filter(models.Service.is_active == True)  # noqa: E712
            .all()
        )
        for service in services:
            await check_service(service, db)
    finally:
        db.close()
