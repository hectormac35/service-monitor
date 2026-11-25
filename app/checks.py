# app/checks.py
"""Comprobación de servicios, alertas por cambio de estado y limpieza del histórico."""

import asyncio
import logging
import time
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from . import config, database, metrics, models
from .notifications import send_telegram_message

logger = logging.getLogger("service_monitor.checks")

USER_AGENT = "ServiceMonitor/1.0 (+https://github.com/hectormac35/service-monitor)"


def _utc(fecha: datetime | None) -> datetime | None:
    if fecha is not None and fecha.tzinfo is None:
        return fecha.replace(tzinfo=UTC)
    return fecha


def ultimo_resultado(db: Session, service_id: int) -> models.CheckResult | None:
    return (
        db.query(models.CheckResult)
        .filter(models.CheckResult.service_id == service_id)
        .order_by(models.CheckResult.timestamp.desc(), models.CheckResult.id.desc())
        .first()
    )


def toca_comprobar(service: models.Service, ultimo: models.CheckResult | None, ahora: datetime) -> bool:
    """True si nunca se ha comprobado o si ya ha pasado su intervalo."""
    if ultimo is None:
        return True
    transcurrido = (ahora - _utc(ultimo.timestamp)).total_seconds()
    return transcurrido >= service.check_interval_seconds


def mensaje_alerta(service: models.Service, anterior: bool | None, resultado: models.CheckResult) -> str | None:
    """Solo alertamos en las transiciones: UP→DOWN (o primer check caído) y DOWN→UP."""
    if not resultado.is_up and anterior is not False:
        detalle = (
            f"HTTP {resultado.status_code}" if resultado.status_code else (resultado.error_message or "sin respuesta")
        )
        return f"🚨 Servicio caído\n{service.name}\n{service.url}\nMotivo: {detalle}"
    if resultado.is_up and anterior is False:
        latencia = f"{resultado.response_time_ms:.0f} ms" if resultado.response_time_ms is not None else "-"
        return f"✅ Servicio recuperado\n{service.name}\n{service.url}\nLatencia: {latencia}"
    return None


async def sondear(url: str, client: httpx.AsyncClient) -> dict:
    """Hace la petición HTTP y devuelve los datos del resultado (sin tocar la BBDD)."""
    inicio = time.perf_counter()
    try:
        response = await client.get(url)
        return {
            "status_code": response.status_code,
            "is_up": 200 <= response.status_code < 400,
            "response_time_ms": (time.perf_counter() - inicio) * 1000,
            "error_message": None,
        }
    except httpx.HTTPError as exc:
        mensaje = str(exc) or type(exc).__name__
        return {
            "status_code": None,
            "is_up": False,
            "response_time_ms": None,
            "error_message": mensaje[:200],
        }


async def check_service(service: models.Service, db: Session, client: httpx.AsyncClient) -> models.CheckResult:
    """Comprueba un servicio, guarda el resultado, actualiza métricas y alerta si cambia de estado."""
    anterior = ultimo_resultado(db, service.id)
    estado_anterior = anterior.is_up if anterior else None

    datos = await sondear(service.url, client)
    resultado = models.CheckResult(service_id=service.id, **datos)
    db.add(resultado)
    db.commit()
    db.refresh(resultado)

    metrics.registrar_check(service.id, service.name, resultado.is_up, resultado.response_time_ms)

    texto = mensaje_alerta(service, estado_anterior, resultado)
    if texto:
        tipo = "down" if not resultado.is_up else "recovered"
        logger.info("Alerta %s para %s", tipo, service.name)
        metrics.ALERTS_TOTAL.labels(tipo).inc()
        await send_telegram_message(texto)

    return resultado


def crear_cliente() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=config.CHECK_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    )


async def run_due_checks(client: httpx.AsyncClient | None = None) -> int:
    """Comprueba los servicios activos a los que les toca. Devuelve cuántos se han comprobado."""
    db = database.SessionLocal()
    propio = client is None
    client = client or crear_cliente()
    try:
        ahora = datetime.now(UTC)
        activos = db.query(models.Service).filter(models.Service.is_active.is_(True)).all()
        pendientes = [s.id for s in activos if toca_comprobar(s, ultimo_resultado(db, s.id), ahora)]
    finally:
        db.close()

    semaforo = asyncio.Semaphore(max(1, config.MAX_CONCURRENT_CHECKS))

    async def uno(service_id: int) -> None:
        async with semaforo:
            # Cada comprobación usa su propia sesión: las sesiones no se comparten entre tareas
            sesion = database.SessionLocal()
            try:
                service = sesion.get(models.Service, service_id)
                if service is not None and service.is_active:
                    await check_service(service, sesion, client)
            except Exception:  # un servicio que falla no debe parar al resto
                logger.exception("Error comprobando el servicio %s", service_id)
                sesion.rollback()
            finally:
                sesion.close()

    try:
        await asyncio.gather(*(uno(i) for i in pendientes))
    finally:
        if propio:
            await client.aclose()
    return len(pendientes)


def purge_old_checks(dias: int = config.HISTORY_RETENTION_DAYS) -> int:
    """Borra el histórico más antiguo que la retención configurada."""
    if dias <= 0:
        return 0
    limite = datetime.now(UTC) - timedelta(days=dias)
    db = database.SessionLocal()
    try:
        borrados = (
            db.query(models.CheckResult).filter(models.CheckResult.timestamp < limite).delete(synchronize_session=False)
        )
        db.commit()
        return borrados
    finally:
        db.close()


async def scheduler_loop(stop: asyncio.Event) -> None:
    """Bucle de fondo resistente a errores: una excepción se registra y el bucle sigue vivo."""
    logger.info("Planificador iniciado (tick %ss)", config.SCHEDULER_TICK_SECONDS)
    ultima_purga = 0.0
    while not stop.is_set():
        try:
            await run_due_checks()
            if time.monotonic() - ultima_purga > 3600:
                borrados = purge_old_checks()
                ultima_purga = time.monotonic()
                if borrados:
                    logger.info("Histórico: %s checks antiguos eliminados", borrados)
        except Exception:
            logger.exception("Error en el ciclo del planificador")
        try:
            await asyncio.wait_for(stop.wait(), timeout=config.SCHEDULER_TICK_SECONDS)
        except TimeoutError:
            pass
    logger.info("Planificador detenido")
