"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";

import LatencySparkline from "@/app/components/LatencySparkline";
import StatusBadge from "@/app/components/StatusBadge";
import {
  checkServiceNow,
  createService,
  deleteService,
  getOverview,
  ServiceOverview,
  updateService,
} from "@/lib/api";
import { formatIntervalo, formatMs, haceCuanto } from "@/lib/format";

const FORM_INICIAL = { name: "", url: "", check_interval_seconds: 30 };

const inputCls =
  "px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/70";
const panelCls =
  "bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/40 backdrop-blur";
const botonFila =
  "px-2.5 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

function useAhora(intervaloMs = 5000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}

function Kpi({ titulo, valor, detalle }: { titulo: string; valor: React.ReactNode; detalle?: string }) {
  return (
    <div className="rounded-xl bg-slate-950/40 border border-slate-800/60 p-3">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{valor}</p>
      {detalle && <p className="text-[11px] text-slate-500 mt-0.5">{detalle}</p>}
    </div>
  );
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const ahora = useAhora();
  const [form, setForm] = useState(FORM_INICIAL);

  const { data: services, isLoading, isError, error, dataUpdatedAt } = useQuery<ServiceOverview[], Error>({
    queryKey: ["overview"],
    queryFn: getOverview,
    refetchInterval: 10_000,
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["overview"] });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: async (nuevo) => {
      setForm(FORM_INICIAL);
      // Primera comprobación inmediata para no esperar al planificador
      await checkServiceNow(nuevo.id).catch(() => undefined);
      refrescar();
    },
  });

  const checkMutation = useMutation({ mutationFn: checkServiceNow, onSettled: refrescar });

  const toggleMutation = useMutation({
    mutationFn: (s: ServiceOverview) => updateService(s.id, { is_active: !s.is_active }),
    onSettled: refrescar,
  });

  const deleteMutation = useMutation({ mutationFn: deleteService, onSettled: refrescar });

  // === KPIs (solo servicios activos con al menos un check) ===
  const lista = services ?? [];
  const activos = lista.filter((s) => s.is_active);
  const comprobados = activos.filter((s) => s.last_check);
  const upCount = comprobados.filter((s) => s.last_check?.is_up).length;
  const downCount = comprobados.length - upCount;

  const latencias = activos
    .map((s) => s.avg_latency_ms_24h)
    .filter((v): v is number => v != null);
  const avgLatency = latencias.length ? latencias.reduce((a, b) => a + b, 0) / latencias.length : null;

  // Uptime global ponderado por número de checks
  const totalChecks = activos.reduce((acc, s) => acc + s.checks_24h, 0);
  const uptimeGlobal = totalChecks
    ? activos.reduce((acc, s) => acc + (s.uptime_24h ?? 0) * s.checks_24h, 0) / totalChecks
    : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name.trim(),
      url: form.url.trim(),
      check_interval_seconds: Number(form.check_interval_seconds) || 30,
    });
  };

  const borrar = (s: ServiceOverview) => {
    if (window.confirm(`¿Eliminar "${s.name}" y todo su historial?`)) {
      deleteMutation.mutate(s.id);
    }
  };

  const errorAccion = checkMutation.error ?? toggleMutation.error ?? deleteMutation.error;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Panel de monitorización</h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
          Añade endpoints HTTP y sigue su estado en tiempo real. El backend (FastAPI) los comprueba según su
          intervalo, avisa por Telegram cuando caen o se recuperan y expone métricas para Prometheus y Grafana.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start">
        {/* Alta de servicio */}
        <div className={`${panelCls} p-6`}>
          <h2 className="text-lg font-semibold mb-1">Añadir servicio</h2>
          <p className="text-xs text-slate-400 mb-4">
            Nombre, URL a comprobar y cada cuántos segundos (mínimo 10).
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1.4fr_0.7fr]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">Nombre</span>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="API producción"
                maxLength={100}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">URL</span>
              <input
                type="url"
                className={inputCls}
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://midominio.com/health"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-300">Intervalo (s)</span>
              <input
                type="number"
                min={10}
                max={86400}
                className={inputCls}
                value={form.check_interval_seconds}
                onChange={(e) => setForm((f) => ({ ...f, check_interval_seconds: Number(e.target.value) }))}
              />
            </label>

            <div className="md:col-span-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-400 min-h-4">
                {createMutation.isError ? createMutation.error.message : ""}
              </p>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-sm font-medium shadow-md shadow-sky-700/40 transition"
              >
                {createMutation.isPending ? "Creando..." : "Crear servicio"}
              </button>
            </div>
          </form>
        </div>

        {/* Resumen */}
        <div className={`${panelCls} p-5`}>
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">Resumen</h3>
            <span className="text-[11px] text-slate-500">
              {dataUpdatedAt ? `actualizado ${haceCuanto(new Date(dataUpdatedAt).toISOString(), ahora)}` : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Kpi titulo="Servicios" valor={lista.length} detalle={`${activos.length} activos`} />
            <Kpi
              titulo="Estado actual"
              valor={
                <span className="text-xl">
                  <span className="text-emerald-400">{upCount} UP</span>
                  <span className="text-slate-600"> · </span>
                  <span className={downCount ? "text-red-400" : "text-slate-500"}>{downCount} DOWN</span>
                </span>
              }
            />
            <Kpi titulo="Latencia media" valor={formatMs(avgLatency)} detalle="últimas 24 h" />
            <Kpi
              titulo="Uptime"
              valor={uptimeGlobal != null ? `${uptimeGlobal.toFixed(1)}%` : "—"}
              detalle={`${totalChecks} checks en 24 h`}
            />
          </div>
        </div>
      </section>

      {/* Tabla de servicios */}
      <section className={`${panelCls} p-6 space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Servicios</h2>
            <p className="text-xs text-slate-400">Se actualiza solo cada 10 segundos.</p>
          </div>
          {errorAccion && <p className="text-xs text-red-400">{errorAccion.message}</p>}
        </div>

        {isLoading && <p className="text-sm text-slate-300">Cargando servicios...</p>}

        {isError && <p className="text-sm text-red-400">Error al cargar servicios: {error.message}</p>}

        {!isLoading && !isError && lista.length === 0 && (
          <p className="text-sm text-slate-400">No hay servicios aún. Crea el primero con el formulario de arriba.</p>
        )}

        {lista.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="min-w-full text-sm bg-slate-950/40">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide bg-slate-950/60">
                  <th className="text-left py-2.5 px-4 font-medium">Servicio</th>
                  <th className="text-left py-2.5 px-4 font-medium">Estado</th>
                  <th className="text-left py-2.5 px-4 font-medium">Latencia</th>
                  <th className="text-left py-2.5 px-4 font-medium">Uptime 24 h</th>
                  <th className="text-left py-2.5 px-4 font-medium">Intervalo</th>
                  <th className="text-right py-2.5 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => {
                  const ultimo = s.last_check;
                  const comprobando = checkMutation.isPending && checkMutation.variables === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-800/80 last:border-0 hover:bg-slate-900/60 transition-colors ${
                        s.is_active ? "" : "opacity-60"
                      }`}
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <Link href={`/services/${s.id}`} className="font-medium text-slate-100 hover:text-sky-300">
                          {s.name}
                        </Link>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-slate-500 hover:text-sky-400 truncate"
                          title={s.url}
                        >
                          {s.url}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge isUp={ultimo?.is_up} paused={!s.is_active} />
                        <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">
                          {ultimo
                            ? `${ultimo.status_code ? `HTTP ${ultimo.status_code}` : "Sin respuesta"} · ${haceCuanto(
                                ultimo.timestamp,
                                ahora
                              )}`
                            : "aún sin comprobar"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <LatencySparkline latencies={s.recent_latencies} ups={s.recent_up} />
                          <span className="text-xs text-slate-300 tabular-nums w-14">
                            {formatMs(ultimo?.response_time_ms)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {s.uptime_24h != null ? (
                          <span
                            className={
                              s.uptime_24h >= 99
                                ? "text-emerald-300"
                                : s.uptime_24h >= 90
                                  ? "text-amber-300"
                                  : "text-red-300"
                            }
                          >
                            {s.uptime_24h.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{formatIntervalo(s.check_interval_seconds)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => checkMutation.mutate(s.id)}
                            disabled={comprobando}
                            className={`${botonFila} bg-sky-600/20 text-sky-200 hover:bg-sky-600/40`}
                          >
                            {comprobando ? "Comprobando..." : "Comprobar"}
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(s)}
                            disabled={toggleMutation.isPending}
                            className={`${botonFila} bg-slate-800 text-slate-200 hover:bg-slate-700`}
                          >
                            {s.is_active ? "Pausar" : "Reanudar"}
                          </button>
                          <button
                            onClick={() => borrar(s)}
                            disabled={deleteMutation.isPending}
                            className={`${botonFila} bg-red-600/15 text-red-300 hover:bg-red-600/35`}
                          >
                            Eliminar
                          </button>
                        </div>
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
