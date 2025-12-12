🛰️ Service Monitor
Service Monitor es un proyecto DevOps / Observabilidad / Full‑Stack que simula un sistema tipo UptimeRobot o Better Stack para monitorizar servicios HTTP.
El objetivo del proyecto es demostrar arquitectura real, separación de responsabilidades y prácticas habituales en entornos de producción.

🎯 ¿Qué problema resuelve?
    • Saber si un servicio HTTP está disponible (UP) o caído (DOWN)
    • Medir latencia, códigos HTTP y errores
    • Mantener un histórico de comprobaciones
    • Recibir alertas automáticas cuando un servicio falla
    • Visualizar el estado desde una interfaz clara tipo SaaS

🧱 Arquitectura del sistema
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│   Frontend   │◀────▶│    FastAPI    │◀────▶│   Database   │
│   Next.js    │      │    Backend    │      │   (SQLite)  │
└──────────────┘      └───────┬───────┘      └──────────────┘
                                │
                ┌───────────────┼───────────────┐
                │                               │
        ┌──────────────┐               ┌──────────────┐
        │  Prometheus  │               │   Telegram   │
        │   Métricas   │               │   Alertas    │
        └──────┬───────┘               └──────────────┘
               │
         ┌──────────┐
         │ Grafana  │
         │Dashboard │
         └──────────┘
Separación de responsabilidades
    • Backend (FastAPI): lógica de negocio, checks, persistencia y alertas
    • Prometheus + Grafana: observabilidad técnica y métricas
    • Frontend (Next.js): experiencia de usuario y visualización
    • Telegram: sistema de alerting independiente

⚙️ Stack tecnológico
Backend
    • Python 3.12
    • FastAPI
    • SQLAlchemy
    • SQLite (desarrollo)
    • httpx (cliente HTTP asíncrono)
    • Prometheus client
Frontend
    • Next.js (App Router)
    • TypeScript
    • React Query
    • Tailwind CSS
    • Recharts
Observabilidad y alertas
    • Prometheus
    • Grafana
    • Telegram Bot API
Infraestructura
    • Docker
    • Docker Compose

✅ Funcionalidades principales
🔍 Monitorización
    • Alta de servicios (nombre, URL, intervalo)
    • Comprobaciones periódicas asíncronas
    • Registro de estado, latencia y errores
📊 Visualización
    • Dashboard con resumen rápido
    • Tabla de servicios monitorizados
    • Estado UP / DOWN
    • Mini gráficas de latencia
    • Vista de detalle con histórico
🔔 Alertas
    • Notificaciones automáticas por Telegram cuando un servicio cae
    • Alertas independientes del frontend
📈 Observabilidad
    • Endpoint /metrics para Prometheus
    • Dashboards técnicos en Grafana

▶️ Ejecución del proyecto
Requisitos
    • Docker
    • Docker Compose
Variables de entorno
Crear un archivo .env en la raíz:
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
Levantar el stack completo
docker compose up -d
Servicios disponibles
    • Frontend → http://localhost:3001
    • Backend API → http://localhost:8002
    • Prometheus → http://localhost:9090
    • Grafana → http://localhost:3000

🧠 Decisiones técnicas
    • FastAPI por su rendimiento y soporte async
    • Prometheus + Grafana para métricas reales de producción
    • Frontend separado para experiencia tipo SaaS
    • Alertas por Telegram desacopladas de la UI
    • Docker Compose para reproducibilidad del entorno

🎓 Objetivo del proyecto
Este proyecto está orientado a:
    • Portfolio DevOps / Full‑Stack
    • Práctica real de observabilidad
    • Demostrar diseño y arquitectura
    • Simular un producto tipo SaaS

🚀 Posibles mejoras futuras
    • Autenticación y multi‑usuario
    • SLA y uptime por periodos (24h / 7d)
    • Configuración avanzada de alertas
    • Persistencia en PostgreSQL
    • Despliegue en cloud (Fly.io / Railway / AWS)

👤 Autor
Proyecto desarrollado como ejercicio avanzado de DevOps + Full‑Stack, priorizando claridad, arquitectura y buenas prácticas.

🟢 Este proyecto no busca ser una demo, sino un ejemplo realista de sistema de monitorización.

