# Service Monitor – Backend 🛰️

Backend del proyecto **Service Monitor**, un sistema de monitorización de servicios
HTTP orientado a prácticas reales de **DevOps y Observabilidad**.

Este backend se encarga de realizar comprobaciones periódicas de servicios,
almacenar resultados, exponer métricas y lanzar alertas automáticas cuando
un servicio falla.

---

## Funcionalidad

- Registro de servicios a monitorizar (nombre, URL, intervalo)
- Comprobaciones periódicas asíncronas
- Registro de:
  - Estado (UP / DOWN)
  - Código HTTP
  - Tiempo de respuesta (ms)
  - Mensaje de error
- Histórico de checks por servicio
- Endpoint para consultar estado actual
- Exposición de métricas para Prometheus
- Alertas automáticas por **Telegram**

---

## Stack técnico

- Python 3.12
- FastAPI
- SQLAlchemy
- SQLite (desarrollo)
- httpx (cliente HTTP asíncrono)
- Prometheus client
- Docker

---

## Alertas por Telegram

Cuando un servicio pasa a estado **DOWN**, el backend envía automáticamente
una notificación a Telegram con información del fallo.

Las alertas funcionan de forma independiente al frontend, simulando
un sistema real de alerting en producción.

---

## Métricas y observabilidad

El backend expone métricas compatibles con **Prometheus** a través del
endpoint `/metrics`, que pueden ser visualizadas posteriormente en **Grafana**.

---

## Ejecución en local (modo desarrollo)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
