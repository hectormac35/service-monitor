# Backend FastAPI
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
RUN useradd --create-home --uid 1000 appuser
COPY --from=builder /install /usr/local
COPY app ./app
RUN mkdir -p /app/data && chown -R appuser:appuser /app

ENV PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////app/data/service_monitor.db

EXPOSE 8000
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
