# app/main.py
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .routers import services as services_router
from .checks import run_checks_for_all_services


def create_app() -> FastAPI:
    database.init_db()

    app = FastAPI(title="Service Monitor API", version="0.1.0")

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
        asyncio.create_task(scheduler())

    return app


app = create_app()
