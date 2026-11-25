// lib/api.ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8002";

export type ServiceRead = {
  id: number;
  name: string;
  url: string;
  check_interval_seconds: number;
  is_active: boolean;
};

export type ServiceCreate = {
  name: string;
  url: string;
  check_interval_seconds: number;
};

export type ServiceUpdate = Partial<ServiceCreate> & { is_active?: boolean };

export type ServiceStatus = {
  is_up: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  timestamp: string | null;
};

export type CheckResultRead = {
  timestamp: string;
  status_code: number | null;
  is_up: boolean;
  response_time_ms: number | null;
  error_message: string | null;
};

export type ServiceOverview = ServiceRead & {
  last_check: ServiceStatus | null;
  uptime_24h: number | null;
  avg_latency_ms_24h: number | null;
  checks_24h: number;
  recent_latencies: (number | null)[];
  recent_up: boolean[];
};

type ErrorDetalle = { loc?: (string | number)[]; msg?: string };

const CAMPOS: Record<string, string> = {
  name: "Nombre",
  url: "URL",
  check_interval_seconds: "Intervalo",
};

/** Convierte los errores de FastAPI (texto o lista de validaciones) en un mensaje legible. */
async function leerError(res: Response): Promise<Error> {
  try {
    const cuerpo = await res.json();
    const detalle = cuerpo?.detail;
    if (typeof detalle === "string") return new Error(detalle);
    if (Array.isArray(detalle)) {
      const partes = (detalle as ErrorDetalle[]).map((d) => {
        const campo = String(d.loc?.[d.loc.length - 1] ?? "");
        return `${CAMPOS[campo] ?? campo}: ${d.msg ?? "valor no válido"}`;
      });
      return new Error(partes.join(" · "));
    }
  } catch {
    // respuesta sin JSON
  }
  return new Error(`Error ${res.status}`);
}

async function peticion<T>(ruta: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ruta}`, { cache: "no-store", ...init });
  } catch {
    throw new Error(`No se puede conectar con la API (${API_BASE_URL})`);
  }
  if (!res.ok) throw await leerError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getServices = () => peticion<ServiceRead[]>("/services/");
export const getOverview = () => peticion<ServiceOverview[]>("/services/overview");
export const getService = (id: number) => peticion<ServiceRead>(`/services/${id}`);
export const createService = (data: ServiceCreate) =>
  peticion<ServiceRead>("/services/", json("POST", data));
export const updateService = (id: number, data: ServiceUpdate) =>
  peticion<ServiceRead>(`/services/${id}`, json("PATCH", data));
export const deleteService = (id: number) =>
  peticion<void>(`/services/${id}`, { method: "DELETE" });
export const checkServiceNow = (id: number) =>
  peticion<ServiceStatus>(`/services/${id}/check`, { method: "POST" });
export const getServiceHistory = (id: number, limit = 50) =>
  peticion<CheckResultRead[]>(`/services/${id}/history?limit=${limit}`);
