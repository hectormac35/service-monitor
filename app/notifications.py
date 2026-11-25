# app/notifications.py
import logging

import httpx

from . import config

logger = logging.getLogger("service_monitor.notifications")


def telegram_configurado() -> bool:
    return bool(config.TELEGRAM_BOT_TOKEN and config.TELEGRAM_CHAT_ID)


async def send_telegram_message(text: str) -> bool:
    """Envía un mensaje al chat de Telegram. Devuelve True si Telegram lo aceptó."""
    if not telegram_configurado():
        logger.warning("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados: alerta no enviada")
        return False

    url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {"chat_id": config.TELEGRAM_CHAT_ID, "text": text}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, data=data)
        if resp.status_code != 200:
            # No registramos la URL: contiene el token del bot
            logger.error("Telegram respondió %s", resp.status_code)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("Error enviando mensaje a Telegram: %s", type(exc).__name__)
        return False
