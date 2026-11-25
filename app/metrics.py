# app/metrics.py
"""Métricas de negocio para Prometheus: estado y latencia de cada servicio monitorizado."""

from prometheus_client import Counter, Gauge

SERVICE_UP = Gauge(
    "service_monitor_service_up",
    "1 si el último check del servicio fue correcto, 0 si falló",
    ["service_id", "service_name"],
)
SERVICE_LATENCY = Gauge(
    "service_monitor_response_time_ms",
    "Latencia del último check en milisegundos",
    ["service_id", "service_name"],
)
CHECKS_TOTAL = Counter(
    "service_monitor_checks_total",
    "Número de comprobaciones realizadas",
    ["service_id", "service_name", "result"],
)
ALERTS_TOTAL = Counter(
    "service_monitor_alerts_total",
    "Alertas enviadas por tipo",
    ["kind"],
)


def registrar_check(service_id: int, name: str, is_up: bool, latency_ms: float | None) -> None:
    etiquetas = (str(service_id), name)
    SERVICE_UP.labels(*etiquetas).set(1 if is_up else 0)
    if latency_ms is not None:
        SERVICE_LATENCY.labels(*etiquetas).set(latency_ms)
    CHECKS_TOTAL.labels(*etiquetas, "up" if is_up else "down").inc()


def olvidar_servicio(service_id: int, name: str) -> None:
    """Quita las series de un servicio borrado o renombrado para que no queden 'fantasmas'."""
    etiquetas = (str(service_id), name)
    for gauge in (SERVICE_UP, SERVICE_LATENCY):
        try:
            gauge.remove(*etiquetas)
        except KeyError:
            pass
    for result in ("up", "down"):
        try:
            CHECKS_TOTAL.remove(*etiquetas, result)
        except KeyError:
            pass
