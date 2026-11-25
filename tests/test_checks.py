import asyncio
from datetime import UTC, datetime, timedelta

import httpx

from app import checks, database, models


def _servicio(intervalo=30, activo=True, url="https://ok.test/"):
    db = database.SessionLocal()
    s = models.Service(name="svc", url=url, check_interval_seconds=intervalo, is_active=activo)
    db.add(s)
    db.commit()
    db.refresh(s)
    db.close()
    return s


def _cliente(codigos):
    """Cliente HTTP falso que devuelve los códigos indicados en orden."""
    it = iter(codigos)

    def responder(request):
        codigo = next(it)
        if codigo is None:
            raise httpx.ConnectError("conexión rechazada", request=request)
        return httpx.Response(codigo)

    return httpx.AsyncClient(transport=httpx.MockTransport(responder))


def test_toca_comprobar_respeta_intervalo():
    s = models.Service(check_interval_seconds=60)
    ahora = datetime.now(UTC)
    assert checks.toca_comprobar(s, None, ahora)
    reciente = models.CheckResult(timestamp=ahora - timedelta(seconds=30))
    antiguo = models.CheckResult(timestamp=(ahora - timedelta(seconds=61)).replace(tzinfo=None))
    assert not checks.toca_comprobar(s, reciente, ahora)
    assert checks.toca_comprobar(s, antiguo, ahora)  # también con fechas sin zona (SQLite)


def test_alertas_solo_en_transiciones():
    s = models.Service(name="API", url="https://x")
    caido = models.CheckResult(is_up=False, status_code=500)
    arriba = models.CheckResult(is_up=True, status_code=200, response_time_ms=42.0)
    assert "caído" in checks.mensaje_alerta(s, None, caido)  # primer check ya caído
    assert "caído" in checks.mensaje_alerta(s, True, caido)
    assert checks.mensaje_alerta(s, False, caido) is None  # sigue caído: sin spam
    assert "recuperado" in checks.mensaje_alerta(s, False, arriba)
    assert checks.mensaje_alerta(s, True, arriba) is None
    assert checks.mensaje_alerta(s, None, arriba) is None


def test_run_due_checks_envia_una_alerta_por_caida(monkeypatch):
    enviados = []

    async def falso(texto):
        enviados.append(texto)
        return True

    monkeypatch.setattr(checks, "send_telegram_message", falso)
    s = _servicio(intervalo=10)

    async def escenario():
        cliente = _cliente([None, 500, 200])
        for _ in range(3):
            # Simulamos que ha pasado el intervalo moviendo hacia atrás los checks existentes
            db = database.SessionLocal()
            for c in db.query(models.CheckResult).all():
                c.timestamp = datetime.now(UTC) - timedelta(seconds=11)
            db.commit()
            db.close()
            assert await checks.run_due_checks(cliente) == 1
        await cliente.aclose()

    asyncio.run(escenario())

    db = database.SessionLocal()
    historial = db.query(models.CheckResult).filter_by(service_id=s.id).order_by(models.CheckResult.id).all()
    db.close()
    assert [c.is_up for c in historial] == [False, False, True]
    assert historial[0].error_message and historial[0].response_time_ms is None
    assert len(enviados) == 2  # una de caída y una de recuperación, no tres
    assert "caído" in enviados[0] and "recuperado" in enviados[1]


def test_no_comprueba_pausados_ni_recientes():
    _servicio(activo=False)
    _servicio(intervalo=300)

    async def escenario():
        cliente = _cliente([200])
        primera = await checks.run_due_checks(cliente)
        segunda = await checks.run_due_checks(cliente)
        await cliente.aclose()
        return primera, segunda

    assert asyncio.run(escenario()) == (1, 0)


def test_purga_historial_antiguo():
    s = _servicio()
    db = database.SessionLocal()
    db.add(models.CheckResult(service_id=s.id, is_up=True, timestamp=datetime.now(UTC) - timedelta(days=10)))
    db.add(models.CheckResult(service_id=s.id, is_up=True))
    db.commit()
    db.close()
    assert checks.purge_old_checks(7) == 1
    assert checks.purge_old_checks(0) == 0
