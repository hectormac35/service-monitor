"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import ServiceSparkline from "@/app/components/ServiceSparkline";

import {
  createService,
  getServiceStatus,
  getServices,
  deleteService,
  ServiceRead,
  ServiceStatus,
} from "@/lib/api";



type ServiceWithStatus = ServiceRead & {
  status?: ServiceStatus;
  statusLoading?: boolean;
  statusError?: string | null;
};

export default function HomePage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    url: "",
    check_interval_seconds: 30,
  });

  const {
    data: services,
    isLoading,
    isError,
    error,
  } = useQuery<ServiceRead[], Error>({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setForm({ name: "", url: "", check_interval_seconds: 30 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const [statusMap, setStatusMap] = useState<
    Record<number, ServiceWithStatus["status"] | undefined>
  >({});
  const [statusLoadingMap, setStatusLoadingMap] = useState<
    Record<number, boolean>
  >({});
  const [statusErrorMap, setStatusErrorMap] = useState<
    Record<number, string | null>
  >({});

  // === KPIs para Resumen rápido ===
  const totalServices = services?.length ?? 0;

  const statusValues = Object.values(statusMap).filter(
    (s): s is ServiceStatus => Boolean(s)
  );

  const upCount = statusValues.filter((s) => s.is_up).length;
  const downCount = statusValues.filter((s) => !s.is_up).length;

  const latencies = statusValues
    .map((s) => s.response_time_ms)
    .filter((v): v is number => v !== null && v !== undefined);

  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;
  
  const uptimePercent =
  statusValues.length > 0
    ? Math.round((upCount / statusValues.length) * 100)
    : null;


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;

    createMutation.mutate({
      name: form.name,
      url: form.url,
      check_interval_seconds: Number(form.check_interval_seconds) || 30,
    });
  };

  const refreshStatus = async (service: ServiceRead) => {
    setStatusLoadingMap((prev) => ({ ...prev, [service.id]: true }));
    setStatusErrorMap((prev) => ({ ...prev, [service.id]: null }));

    try {
      const status = await getServiceStatus(service.id);
      setStatusMap((prev) => ({ ...prev, [service.id]: status }));
    } catch (err: any) {
      setStatusErrorMap((prev) => ({
        ...prev,
        [service.id]: err?.message ?? "Error al obtener estado",
      }));
    } finally {
      setStatusLoadingMap((prev) => ({ ...prev, [service.id]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera de página */}
      <section className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Panel de monitorización
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
          Añade endpoints HTTP y controla su estado en tiempo real usando el
          backend en FastAPI con Prometheus y Grafana por detrás.
        </p>
      </section>

      {/* Zona superior: formulario + resumen */}
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr] items-start">
        {/* Formulario creación servicio */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-slate-950/40 backdrop-blur">
          <h2 className="text-lg font-semibold mb-1">Añadir servicio</h2>
          <p className="text-xs text-slate-400 mb-4">
            Define el nombre, la URL a monitorizar y cada cuánto tiempo quieres
            que se compruebe.
          </p>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">
                Nombre
              </label>
              <input
                className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/70"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="API producción, Google, etc."
                required
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1 xl:col-span-1">
              <label className="text-xs font-medium text-slate-300">
                URL
              </label>
              <input
                className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/70"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://midominio.com/health"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-300">
                Intervalo (segundos)
              </label>
              <input
                type="number"
                min={10}
                className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/70"
                value={form.check_interval_seconds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    check_interval_seconds: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex justify-end items-end">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-sm font-medium shadow-md shadow-sky-700/40 transition"
              >
                {createMutation.isPending ? "Creando..." : "Crear servicio"}
              </button>
            </div>
          </form>

          {createMutation.isError && (
            <p className="mt-3 text-xs text-red-400">
              Error al crear servicio: {(createMutation.error as any)?.message}
            </p>
          )}
        </div>

        {/* Tarjeta de resumen rápida */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/50 backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-100 mb-4">
            Resumen rápido
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            {/* Servicios */}
            <div>
              <p className="text-slate-400">Servicios monitorizados</p>
              <p className="text-2xl font-semibold text-slate-100">
                {totalServices}
              </p>
            </div>

            {/* Estado */}
            <div>
              <p className="text-slate-400">Estado actual</p>
              <p className="mt-1">
                <span className="text-emerald-400 font-semibold">
                  {upCount} UP
                </span>
                {" · "}
                <span className="text-red-400 font-semibold">
                  {downCount} DOWN
                </span>
              </p>
            </div>

            {/* Latencia */}
            <div>
              <p className="text-slate-400">Latencia media</p>
              <p className="text-2xl font-semibold text-slate-100">
                {avgLatency !== null ? `${avgLatency} ms` : "—"}
              </p>
            </div>

            {/* Uptime */}
            <div>
              <p className="text-slate-400">Uptime</p>
              <p className="text-2xl font-semibold text-slate-100">
                {uptimePercent !== null ? `${uptimePercent}%` : "—"}
              </p>
            </div>

          </div>
        </div>

      </section>

      {/* Tabla de servicios */}
      <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-slate-950/40 backdrop-blur space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Servicios</h2>
            <p className="text-xs text-slate-400">
              Lista de endpoints que se están monitorizando.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {services?.length ?? 0} servicios
          </span>
        </div>

        {isLoading && <p className="text-sm text-slate-300">Cargando servicios...</p>}

        {isError && (
          <p className="text-sm text-red-400">
            Error al cargar servicios: {error?.message}
          </p>
        )}

        {!isLoading && !isError && (services?.length ?? 0) === 0 && (
          <p className="text-sm text-slate-400">
            No hay servicios aún. Crea el primero con el formulario de arriba.
          </p>
        )}

        {!isLoading && !isError && services && services.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="min-w-full text-sm bg-slate-950/40">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 bg-slate-950/60">
                  <th className="text-left py-2 px-4">Nombre</th>
                  <th className="text-left py-2 px-4">URL</th>
                  <th className="text-left py-2 px-4">Intervalo</th>
                  <th className="text-left py-2 px-4">Estado</th>
                  <th className="text-left py-2 px-4">Latencia</th>
                  <th className="text-left py-2 px-4">Acciones</th>
                  
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const status = statusMap[service.id];
                  const statusLoading = statusLoadingMap[service.id];
                  const statusError = statusErrorMap[service.id];

                  const badgeClass =
                    status?.is_up == null
                      ? "bg-slate-600 text-slate-100"
                      : status.is_up
                      ? "bg-emerald-600 text-emerald-50"
                      : "bg-red-600 text-red-50";

                  const badgeText =
                    status?.is_up == null
                      ? "Desconocido"
                      : status.is_up
                      ? "UP"
                      : "DOWN";

                  return (
                    <tr
                      key={service.id}
                      className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="py-2 px-4 font-medium">
                        <a
                          href={`/services/${service.id}`}
                          className="text-sky-400 hover:underline"
                        >
                          {service.name}
                        </a>
                      </td>

                      <td className="py-2 px-4">
                        <ServiceSparkline serviceId={service.id} />
                      </td>


                      <td className="py-2 px-4">
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline break-all"
                        >
                          {service.url}
                        </a>
                      </td>
                      <td className="py-2 px-4 text-slate-300">
                        {service.check_interval_seconds}s
                      </td>
                      <td className="py-2 px-4">
                        {statusLoading ? (
                          <span className="text-slate-400 text-xs">
                            Consultando...
                          </span>
                        ) : statusError ? (
                          <span className="text-xs text-red-400">
                            {statusError}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                            >
                              {badgeText}
                            </span>
                            {status && (
                              <span className="text-xs text-slate-400">
                                {status.status_code
                                  ? `HTTP ${status.status_code}`
                                  : "Sin respuesta"}{" "}
                                {status.response_time_ms &&
                                  `· ${status.response_time_ms.toFixed(
                                    1
                                  )} ms`}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => refreshStatus(service)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100"
                        >
                          Ver estado ahora
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
