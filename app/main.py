# app/main.py
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from . import checks, config, database
from .routers import services as services_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("service_monitor")

VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    app.state.http_client = checks.crear_cliente()
    stop = asyncio.Event()
    tarea = None
    if config.SCHEDULER_ENABLED:
        tarea = asyncio.create_task(checks.scheduler_loop(stop))
    try:
        yield
    finally:
        stop.set()
        if tarea:
            await tarea
        await app.state.http_client.aclose()


def create_app() -> FastAPI:
    app = FastAPI(title="Service Monitor API", version=VERSION, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )

    app.include_router(services_router.router)

    @app.get("/healthz", tags=["meta"])
    async def healthz():
        return {"status": "ok"}

    @app.get("/", tags=["meta"])
    async def root():
        return {
            "message": "Service Monitor API is running",
            "version": VERSION,
            "docs": "/docs",
            "healthcheck": "/healthz",
            "metrics": "/metrics",
        }

    # /metrics: métricas HTTP de la API + métricas de negocio (app/metrics.py)
    Instrumentator(excluded_handlers=["/metrics", "/healthz"]).instrument(app).expose(
        app, endpoint="/metrics", include_in_schema=False
    )

    return app


app = create_app()
