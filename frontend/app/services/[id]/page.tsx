"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import StatusBadge from "@/app/components/StatusBadge";
import { checkServiceNow, CheckResultRead, getService, getServiceHistory, ServiceRead, updateService } from "@/lib/api";
import { formatHora, formatIntervalo, formatMs } from "@/lib/format";

const panelCls =
  "bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40 backdrop-blur";

const tooltipStyle = {
  backgroundColor: "#020617",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
};

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const valido = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();

  const serviceQuery = useQuery<ServiceRead, Error>({
    queryKey: ["service", id],
    queryFn: () => getService(id),
    enabled: valido,
  });

  const historyQuery = useQuery<CheckResultRead[], Error>({
    queryKey: ["service-history", id],
    queryFn: () => getServiceHistory(id, 120),
    enabled: valido,
    refetchInterval: 10_000,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["service", id] });
    queryClient.invalidateQueries({ queryKey: ["service-history", id] });
  };

  const checkMutation = useMutation({ mutationFn: () => checkServiceNow(id), onSettled: refrescar });
  const toggleMutation = useMutation({
    mutationFn: (activo: boolean) => updateService(id, { is_active: activo }),
    onSettled: refrescar,
  });

  const historial = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  const chartData = useMemo(
    () =>
      historial.map((c) => ({
        t: formatHora(c.timestamp),
        ms: c.response_time_ms != null ? Math.round(c.response_time_ms) : null,
        up: c.is_up ? 1 : 0,
      })),
    [historial]
  );

  const stats = useMemo(() => {
    const total = historial.length;
    const ups = historial.filter((c) => c.is_up).length;
    const lat = historial.map((c) => c.response_time_ms).filter((v): v is number => v != null);
    const ordenadas = [...lat].sort((a, b) => a - b);
    return {
      total,
      uptime: total ? (100 * ups) / total : null,
      media: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
      p95: ordenadas.length ? ordenadas[Math.min(ordenadas.length - 1, Math.floor(ordenadas.length * 0.95))] : null,
      caidas: total - ups,
    };
  }, [historial]);

  if (!valido) return <p className="text-red-400">Identificador de servicio no válido.</p>;
  if (serviceQuery.isLoading) return <p className="text-slate-300">Cargando...</p>;
  if (serviceQuery.isError || !serviceQuery.data) {
    return (
      <div className="space-y-3">
        <Link href="/" className="text-sky-400 hover:underline text-sm">
          ← Volver al dashboard
        </Link>
        <p className="text-red-400">{serviceQuery.error?.message ?? "Servicio no encontrado"}</p>
      </div>
    );
  }

  const service = serviceQuery.data;
  const ultimo = historial.length ? historial[historial.length - 1] : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/" className="text-sky-400 hover:underline text-sm">
          ← Volver al dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{service.name}</h1>
            <a
              href={service.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline break-all text-sm"
            >
              {service.url}
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => checkMutation.mutate()}
              disabled={checkMutation.isPending}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-sm font-medium transition"
            >
              {checkMutation.isPending ? "Comprobando..." : "Comprobar ahora"}
            </button>
            <button
              onClick={() => toggleMutation.mutate(!service.is_active)}
              disabled={toggleMutation.isPending}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
            >
              {service.is_active ? "Pausar" : "Reanudar"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
          <StatusBadge isUp={ultimo?.is_up} paused={!service.is_active} />
          {ultimo && (
            <span>
              {ultimo.status_code ? `HTTP ${ultimo.status_code}` : "Sin respuesta"} · {formatMs(ultimo.response_time_ms)}
            </span>
          )}
          <span className="text-slate-500">Cada {formatIntervalo(service.check_interval_seconds)}</span>
          {(checkMutation.error || toggleMutation.error) && (
            <span className="text-red-400">{(checkMutation.error ?? toggleMutation.error)?.message}</span>
          )}
        </div>
      </div>

      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          ["Uptime", stats.uptime != null ? `${stats.uptime.toFixed(1)}%` : "—"],
          ["Latencia media", formatMs(stats.media)],
          ["Latencia p95", formatMs(stats.p95)],
          ["Checks caídos", `${stats.caidas} de ${stats.total}`],
        ].map(([titulo, valor]) => (
          <div key={titulo} className={panelCls}>
            <p className="text-xs text-slate-400">{titulo}</p>
            <p className="mt-1 text-2xl font-semibold">{valor}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={panelCls}>
          <h2 className="text-sm font-semibold mb-3">Latencia (ms)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ms`, "Latencia"]} />
                <Line type="monotone" dataKey="ms" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-3">Últimos {chartData.length} checks. Los huecos son checks sin respuesta.</p>
        </div>

        <div className={panelCls}>
          <h2 className="text-sm font-semibold mb-3">Disponibilidad</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={30} />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 1]}
                  tickFormatter={(v) => (v === 1 ? "UP" : "DOWN")}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [Number(v) === 1 ? "UP" : "DOWN", "Estado"]}
                />
                <Area type="stepAfter" dataKey="up" stroke="#34d399" fill="#34d399" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-3">Cada escalón es un check.</p>
        </div>
      </section>

      <section className={panelCls}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Últimos checks</h2>
          {historyQuery.isFetching && <span className="text-xs text-slate-400">Actualizando...</span>}
        </div>

        {historyQuery.isError && <p className="text-sm text-red-400">{historyQuery.error.message}</p>}
        {!historyQuery.isLoading && historial.length === 0 && (
          <p className="text-sm text-slate-400">Este servicio aún no se ha comprobado.</p>
        )}

        {historial.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 max-h-96">
            <table className="min-w-full text-sm bg-slate-950/40">
              <thead className="sticky top-0">
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide bg-slate-950">
                  <th className="text-left py-2 px-4 font-medium">Hora</th>
                  <th className="text-left py-2 px-4 font-medium">Estado</th>
                  <th className="text-left py-2 px-4 font-medium">HTTP</th>
                  <th className="text-left py-2 px-4 font-medium">Latencia</th>
                  <th className="text-left py-2 px-4 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {historial
                  .slice()
                  .reverse()
                  .map((c) => (
                    <tr key={c.timestamp} className="border-b border-slate-800/80 last:border-0">
                      <td className="py-2 px-4 text-slate-200 tabular-nums">{formatHora(c.timestamp)}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs font-semibold ${c.is_up ? "text-emerald-400" : "text-red-400"}`}>
                          {c.is_up ? "UP" : "DOWN"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-300">{c.status_code ?? "—"}</td>
                      <td className="py-2 px-4 text-slate-300 tabular-nums">{formatMs(c.response_time_ms)}</td>
                      <td className="py-2 px-4 text-slate-400 break-all">{c.error_message ?? ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
