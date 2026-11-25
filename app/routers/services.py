# app/routers/services.py
import time
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from .. import checks, metrics, models, schemas
from ..database import get_db
from ..notifications import send_telegram_message, telegram_configurado

router = APIRouter(prefix="/services", tags=["services"])

DB = Annotated[Session, Depends(get_db)]

RECIENTES = 20
_ultimo_test_notificacion = 0.0


def _obtener(db: Session, service_id: int) -> models.Service:
    service = db.get(models.Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return service


def _a_estado(check: models.CheckResult) -> schemas.ServiceStatus:
    return schemas.ServiceStatus.model_validate(check)


@router.post("/", response_model=schemas.ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(service: schemas.ServiceCreate, db: DB):
    db_service = models.Service(
        name=service.name,
        url=str(service.url),
        check_interval_seconds=service.check_interval_seconds,
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    # No hace falta lanzar nada: al no tener checks, el planificador lo comprueba en el siguiente tick
    return db_service


@router.get("/", response_model=list[schemas.ServiceRead])
def list_services(db: DB):
    return db.query(models.Service).order_by(models.Service.id).all()


@router.get("/overview", response_model=list[schemas.ServiceOverview])
def services_overview(db: DB):
    """Todos los servicios con su último estado, uptime y latencia de 24 h, en una sola llamada."""
    desde = datetime.now(UTC) - timedelta(hours=24)

    # Agregados de 24 h de todos los servicios en una sola consulta
    agregados = {
        fila.service_id: fila
        for fila in db.query(
            models.CheckResult.service_id,
            func.count(models.CheckResult.id).label("total"),
            func.sum(case((models.CheckResult.is_up.is_(True), 1), else_=0)).label("ups"),
            func.avg(models.CheckResult.response_time_ms).label("latencia"),
        )
        .filter(models.CheckResult.timestamp >= desde)
        .group_by(models.CheckResult.service_id)
        .all()
    }

    resultado = []
    for service in db.query(models.Service).order_by(models.Service.id).all():
        recientes = (
            db.query(models.CheckResult)
            .filter(models.CheckResult.service_id == service.id)
            .order_by(models.CheckResult.timestamp.desc(), models.CheckResult.id.desc())
            .limit(RECIENTES)
            .all()
        )
        recientes.reverse()
        agg = agregados.get(service.id)
        total = agg.total if agg else 0
        resultado.append(
            schemas.ServiceOverview(
                **schemas.ServiceRead.model_validate(service).model_dump(),
                last_check=_a_estado(recientes[-1]) if recientes else None,
                uptime_24h=round(100 * (agg.ups or 0) / total, 2) if total else None,
                avg_latency_ms_24h=round(agg.latencia, 1) if agg and agg.latencia is not None else None,
                checks_24h=total,
                recent_latencies=[c.response_time_ms for c in recientes],
                recent_up=[c.is_up for c in recientes],
            )
        )
    return resultado


@router.post("/test-notification")
async def test_notification():
    """Envía un mensaje de prueba a Telegram (como mucho uno por minuto)."""
    global _ultimo_test_notificacion
    if not telegram_configurado():
        raise HTTPException(status_code=503, detail="Telegram no está configurado")
    if time.monotonic() - _ultimo_test_notificacion < 60:
        raise HTTPException(status_code=429, detail="Espera un minuto entre pruebas")
    _ultimo_test_notificacion = time.monotonic()
    enviado = await send_telegram_message("🔔 Test de notificación desde Service Monitor")
    if not enviado:
        raise HTTPException(status_code=502, detail="Telegram rechazó el mensaje")
    return {"detail": "Notificación enviada"}


@router.get("/{service_id}", response_model=schemas.ServiceRead)
def get_service(service_id: int, db: DB):
    return _obtener(db, service_id)


@router.patch("/{service_id}", response_model=schemas.ServiceRead)
def update_service(service_id: int, cambios: schemas.ServiceUpdate, db: DB):
    service = _obtener(db, service_id)
    nombre_anterior = service.name
    datos = cambios.model_dump(exclude_unset=True)
    if "url" in datos and datos["url"] is not None:
        datos["url"] = str(datos["url"])
    for campo, valor in datos.items():
        if valor is not None:
            setattr(service, campo, valor)
    db.commit()
    db.refresh(service)
    if service.name != nombre_anterior or not service.is_active:
        metrics.olvidar_servicio(service.id, nombre_anterior)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, db: DB):
    service = _obtener(db, service_id)
    metrics.olvidar_servicio(service.id, service.name)
    db.delete(service)
    db.commit()


@router.post("/{service_id}/check", response_model=schemas.ServiceStatus)
async def check_now(service_id: int, request: Request, db: DB):
    """Lanza una comprobación inmediata, sin esperar al planificador."""
    service = _obtener(db, service_id)
    resultado = await checks.check_service(service, db, request.app.state.http_client)
    return _a_estado(resultado)


@router.get("/{service_id}/status", response_model=schemas.ServiceStatus)
def get_service_status(service_id: int, db: DB):
    _obtener(db, service_id)
    ultimo = checks.ultimo_resultado(db, service_id)
    if not ultimo:
        raise HTTPException(status_code=404, detail="Este servicio aún no se ha comprobado")
    return _a_estado(ultimo)


@router.get("/{service_id}/history", response_model=list[schemas.CheckResultRead])
def get_service_history(
    service_id: int,
    db: DB,
    limit: Annotated[int, Query(ge=1, le=1000)] = 50,
):
    _obtener(db, service_id)
    historial = (
        db.query(models.CheckResult)
        .filter(models.CheckResult.service_id == service_id)
        .order_by(models.CheckResult.timestamp.desc(), models.CheckResult.id.desc())
        .limit(limit)
        .all()
    )
    # Orden cronológico para las gráficas
    return list(reversed(historial))
