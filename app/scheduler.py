# app/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .checks import run_checks_for_all_services

scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> None:
    """Arranca el scheduler que ejecuta los checks cada 60 segundos."""
    global scheduler
    if scheduler is not None:
        return

    scheduler = AsyncIOScheduler()
    # Cada 60 segundos lanzamos comprobación de todos los servicios
    scheduler.add_job(run_checks_for_all_services, "interval", seconds=60)
    scheduler.start()


def stop_scheduler() -> None:
    global scheduler
    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
