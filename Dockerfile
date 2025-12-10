# Etapa 1: build (opcional pero útil si más adelante compilas cosas)
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# Etapa 2: runtime
FROM python:3.12-slim

WORKDIR /app

# Crear usuario no-root
RUN useradd -m appuser

# Copiamos las dependencias desde la etapa builder
COPY --from=builder /install /usr/local

# Copiamos el código
COPY . .

# Variables útiles por defecto
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
