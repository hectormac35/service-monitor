# Service Monitor 🛰️

Sistema sencillo de monitorización de servicios (tipo UptimeRobot) construido con **Python + FastAPI**, orientado a prácticas de **DevOps**.

## Funcionalidad

- Registro de servicios a monitorizar (nombre + URL + intervalo)
- Comprobaciones periódicas de cada servicio
- Registro de:
  - Estado (UP / DOWN)
  - Código HTTP
  - Tiempo de respuesta (ms)
  - Mensaje de error si falla
- Endpoint para ver el último estado de cada servicio
- Alertas en **Telegram** cuando un servicio se cae
- Aplicación empaquetada en **Docker**

## Stack técnico

- Python 3.12
- FastAPI
- SQLAlchemy + SQLite
- httpx (cliente HTTP asíncrono)
- Docker
- GitHub Actions (CI, próximamente)

## Cómo ejecutar en local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
