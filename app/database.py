# app/database.py
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from . import config


def _crear_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        # SQLite: permitir uso desde distintos hilos y crear la carpeta si no existe
        connect_args["check_same_thread"] = False
        ruta = url.split("///", 1)[-1]
        if ruta and ruta != ":memory:":
            Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    if url.startswith("sqlite"):
        # SQLite no aplica las claves foráneas (ON DELETE CASCADE) si no se activan por conexión
        @event.listens_for(engine, "connect")
        def _activar_fk(conexion, _registro):
            cursor = conexion.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = _crear_engine(config.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    # Importamos los modelos para que SQLAlchemy los registre antes de crear las tablas
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
