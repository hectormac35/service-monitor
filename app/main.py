# app/main.py
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .routers import services as services_router
from .checks import run_checks_for_all_services
from prometheus_fastapi_instrumentator import Instrumentator


def create_app() -> FastAPI:
    # Inicializar la base de datos (crear tablas si no existen)
    database.init_db()

    app = FastAPI(title="Service Monitor API", version="0.1.0")

    # --- CORS (para el futuro frontend) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # en producción, restringe esto
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Rutas de servicios ---
    # OJO: si en routers/services.py ya tienes:
    # router = APIRouter(prefix="/services", tags=["services"])
    # entonces aquí debe ser SIN prefix ni tags:
    app.include_router(services_router.router)

    # --- Endpoints básicos ---
    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    @app.get("/")
    async def root():
        return {
            "message": "Service Monitor API is running",
            "version": "0.1.0",
            "docs": "/docs",
            "healthcheck": "/healthz",
        }

    # --- Métricas para Prometheus ---
    instrumentator = Instrumentator().instrument(app)

    # --- Scheduler que comprueba servicios periódicamente ---
    async def scheduler():
        while True:
            print("🔍 Ejecutando comprobaciones de servicios...")
            await run_checks_for_all_services()
            await asyncio.sleep(30)  # cada 30s

    @app.on_event("startup")
    async def startup_event():
        # Exponer /metrics al arrancar la app
        instrumentator.expose(
            app,
            endpoint="/metrics",
            include_in_schema=False,
        )
        # Lanzar el scheduler en segundo plano
        asyncio.create_task(scheduler())

    return app


app = create_app()
