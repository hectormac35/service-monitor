// lib/api.ts
const API_BASE_URL =
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

export type ServiceStatus = {
  is_up: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
};

async function handleResponse(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

export async function getServices(): Promise<ServiceRead[]> {
  const res = await fetch(`${API_BASE_URL}/services/`, {
    cache: "no-store",
  });
  return handleResponse(res);
}

export async function createService(
  data: ServiceCreate
): Promise<ServiceRead> {
  const res = await fetch(`${API_BASE_URL}/services/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getServiceStatus(
  id: number
): Promise<ServiceStatus> {
  const res = await fetch(`${API_BASE_URL}/services/${id}/status`, {
    cache: "no-store",
  });
  return handleResponse(res);
}

// 🆕 NUEVO: borrar servicio
export async function deleteService(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
}

export type CheckResultRead = {
  timestamp: string;
  status_code: number | null;
  is_up: boolean;
  response_time_ms: number | null;
  error_message: string | null;
};

export async function getService(id: number): Promise<ServiceRead> {
  const res = await fetch(`${API_BASE_URL}/services/${id}`, { cache: "no-store" });
  return handleResponse(res);
}


export async function getServiceHistory(serviceId: number, limit = 20) {
  const res = await fetch(
    `${API_BASE_URL}/services/${serviceId}/history?limit=${limit}`
  );

  if (!res.ok) {
    throw new Error("Error al obtener historial");
  }

  return res.json();
}

