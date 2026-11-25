# app/config.py
"""Configuración leída de variables de entorno (con valores por defecto para desarrollo)."""

import os

from dotenv import load_dotenv

load_dotenv()


def _bool(nombre: str, defecto: bool) -> bool:
    valor = os.getenv(nombre)
    if valor is None:
        return defecto
    return valor.strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


def _int(nombre: str, defecto: int) -> int:
    try:
        return int(os.getenv(nombre, defecto))
    except ValueError:
        return defecto


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/service_monitor.db")

# Orígenes permitidos para el frontend (separados por comas)
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000").split(",") if o.strip()
]

# El planificador revisa cada TICK segundos qué servicios "tocan" según su intervalo
SCHEDULER_ENABLED = _bool("SCHEDULER_ENABLED", True)
SCHEDULER_TICK_SECONDS = _int("SCHEDULER_TICK_SECONDS", 5)
MAX_CONCURRENT_CHECKS = _int("MAX_CONCURRENT_CHECKS", 10)
CHECK_TIMEOUT_SECONDS = _int("CHECK_TIMEOUT_SECONDS", 10)

# Días de histórico que se conservan (0 = sin límite)
HISTORY_RETENTION_DAYS = _int("HISTORY_RETENTION_DAYS", 7)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

MIN_INTERVAL_SECONDS = 10
MAX_INTERVAL_SECONDS = 86_400
