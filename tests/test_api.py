import httpx

from app import database, models


def crear(client, **extra):
    datos = {"name": "Mi API", "url": "https://ejemplo.com/health", "check_interval_seconds": 30}
    datos.update(extra)
    return client.post("/services/", json=datos)


def test_health_y_raiz(client):
    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/").json()["docs"] == "/docs"


def test_crear_y_listar(client):
    r = crear(client)
    assert r.status_code == 201
    servicio = r.json()
    assert servicio["is_active"] is True
    assert [s["id"] for s in client.get("/services/").json()] == [servicio["id"]]


def test_valida_intervalo_minimo_y_url(client):
    assert crear(client, check_interval_seconds=2).status_code == 422
    assert crear(client, url="no-es-una-url").status_code == 422
    assert crear(client, name="   ").status_code == 422


def test_estado_sin_checks_da_404(client):
    sid = crear(client).json()["id"]
    assert client.get(f"/services/{sid}/status").status_code == 404
    assert client.get("/services/999/status").status_code == 404


def test_pausar_y_editar(client):
    sid = crear(client).json()["id"]
    r = client.patch(f"/services/{sid}", json={"is_active": False, "check_interval_seconds": 120})
    assert r.status_code == 200
    assert r.json()["is_active"] is False
    assert r.json()["check_interval_seconds"] == 120
    assert client.patch(f"/services/{sid}", json={"check_interval_seconds": 1}).status_code == 422


def test_borrar_elimina_tambien_historial(client):
    sid = crear(client).json()["id"]
    db = database.SessionLocal()
    db.add(models.CheckResult(service_id=sid, is_up=True, status_code=200, response_time_ms=12.0))
    db.commit()
    db.close()

    assert client.delete(f"/services/{sid}").status_code == 204
    assert client.get(f"/services/{sid}").status_code == 404
    db = database.SessionLocal()
    assert db.query(models.CheckResult).count() == 0
    db.close()


def test_overview_calcula_uptime_y_latencia(client):
    sid = crear(client).json()["id"]
    crear(client, name="Sin checks")
    db = database.SessionLocal()
    for up, ms in [(True, 100.0), (True, 200.0), (False, None), (True, 300.0)]:
        db.add(models.CheckResult(service_id=sid, is_up=up, status_code=200 if up else None, response_time_ms=ms))
    db.commit()
    db.close()

    datos = client.get("/services/overview").json()
    assert len(datos) == 2
    primero, segundo = datos
    assert primero["uptime_24h"] == 75.0
    assert primero["avg_latency_ms_24h"] == 200.0
    assert primero["checks_24h"] == 4
    assert primero["recent_up"] == [True, True, False, True]
    assert primero["last_check"]["is_up"] is True
    assert primero["last_check"]["timestamp"].endswith(("Z", "+00:00"))
    assert segundo["last_check"] is None and segundo["uptime_24h"] is None


def test_check_manual_usa_el_cliente_http(client):
    sid = crear(client).json()["id"]

    def responder(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    original = client.app.state.http_client
    client.app.state.http_client = httpx.AsyncClient(transport=httpx.MockTransport(responder))
    try:
        r = client.post(f"/services/{sid}/check")
    finally:
        client.app.state.http_client = original
    assert r.status_code == 200
    assert r.json()["is_up"] is False and r.json()["status_code"] == 503
    assert client.get(f"/services/{sid}/status").json()["status_code"] == 503


def test_test_notification_sin_telegram(client):
    assert client.post("/services/test-notification").status_code == 503


def test_metricas_expuestas(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "service_monitor_checks_total" in r.text
