# Frontend · Service Monitor

Panel en Next.js (App Router) + React Query + Recharts + Tailwind 4.

```bash
npm ci
npm run dev        # http://localhost:3000 (con la API en http://localhost:8002)
npm run lint
npm run build
```

Variables (se incrustan al compilar):

| Variable | Por defecto |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8002` |
| `NEXT_PUBLIC_GRAFANA_URL` | `http://localhost:3000` |

Con Docker Compose el panel queda en **http://localhost:3001**. Más detalles en el [README principal](../README.md).
