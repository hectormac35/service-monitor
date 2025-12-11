# app/main.py
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .routers import services as services_router
from .checks import run_checks_for_all_services
from prometheus_fastapi_instrumentator import Instrumentator  # 👈 ya correcto


def create_app() -> FastAPI:
    database.init_db()

    app = FastAPI(title="Service Monitor API", version="0.1.0")

    # --- ENDPOINT DE HEALTHCHECK PARA KUBERNETES ---
    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    # --- MÉTRICAS PARA PROMETHEUS ---
    # Creamos el instrumentator y enganchamos la app
    instrumentator = Instrumentator().instrument(app)

    # CORS por si luego montamos frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(services_router.router, prefix="/services", tags=["services"])

    # Scheduler que comprueba servicios periódicamente
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
        asyncio.create_task(scheduler())

    return app

    # app/main.py – dentro de create_app()

    @app.get("/")
    async def root():
        return {
            "message": "Service Monitor API is running",
            "version": "0.1.0",
            "docs": "/docs",
            "healthcheck": "/healthz"
        }



app = create_app()
