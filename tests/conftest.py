import os
import sys
from pathlib import Path

import pytest

# Configuración antes de importar la app: BBDD temporal y sin planificador en segundo plano
_DB = Path(__file__).parent / "_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["SCHEDULER_ENABLED"] = "false"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["TELEGRAM_CHAT_ID"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app import database  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def bbdd_limpia():
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def pytest_sessionfinish(session, exitstatus):
    database.engine.dispose()
    _DB.unlink(missing_ok=True)
