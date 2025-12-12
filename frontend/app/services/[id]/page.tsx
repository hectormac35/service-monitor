"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  getService,
  getServiceHistory,
  getServiceStatus,
  CheckResultRead,
  ServiceRead,
  ServiceStatus,
} from "@/lib/api";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ServiceDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  const serviceQuery = useQuery<ServiceRead, Error>({
    queryKey: ["service", id],
    queryFn: () => getService(id),
    enabled: Number.isFinite(id),
  });

  const statusQuery = useQuery<ServiceStatus, Error>({
    queryKey: ["service-status", id],
    queryFn: () => getServiceStatus(id),
    enabled: Number.isFinite(id),
    refetchInterval: 15000,
  });

  const historyQuery = useQuery<CheckResultRead[], Error>({
    queryKey: ["service-history", id],
    queryFn: () => getServiceHistory(id, 60),
    enabled: Number.isFinite(id),
    refetchInterval: 15000,
  });

  const chartData = useMemo(() => {
    const h = historyQuery.data ?? [];
    return h.map((c) => ({
      t: formatTime(c.timestamp),
      ms: c.response_time_ms ?? null,
      up: c.is_up ? 1 : 0,
      code: c.status_code ?? null,
    }));
  }, [historyQuery.data]);

  if (serviceQuery.isLoading) return <p>Cargando...</p>;
  if (serviceQuery.isError) return <p className="text-red-400">{serviceQuery.error.message}</p>;

  const service = serviceQuery.data;
  const status = statusQuery.data;

  const badge =
    status?.is_up === undefined
      ? { text: "Desconocido", cls: "bg-slate-600 text-slate-100" }
      : status.is_up
      ? { text: "UP", cls: "bg-emerald-600 text-emerald-50" }
      : { text: "DOWN", cls: "bg-red-600 text-red-50" };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <a href="/" className="text-sky-400 hover:underline text-sm">
          ← Volver al dashboard
        </a>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {service.name}
        </h1>

        <a
          href={service.url}
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 hover:underline break-all text-sm"
        >
          {service.url}
        </a>

        <div className="flex items-center gap-3 mt-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
            {badge.text}
          </span>

          {statusQuery.isLoading && (
            <span className="text-xs text-slate-400">Cargando estado...</span>
          )}

          {statusQuery.isError && (
            <span className="text-xs text-red-400">{statusQuery.error.message}</span>
          )}

          {status && (
            <span className="text-xs text-slate-300">
              {status.status_code ? `HTTP ${status.status_code}` : "Sin respuesta"}
              {status.response_time_ms != null ? ` · ${status.response_time_ms.toFixed(1)} ms` : ""}
            </span>
          )}
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40">
          <h2 className="text-sm font-semibold mb-3">Latencia (ms)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="ms" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Últimos {chartData.length} checks.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40">
          <h2 className="text-sm font-semibold mb-3">Uptime (UP/DOWN)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="stepAfter" dataKey="up" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-3">1 = UP · 0 = DOWN</p>
        </div>
      </section>

      <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Últimos checks</h2>
          {historyQuery.isFetching && (
            <span className="text-xs text-slate-400">Actualizando...</span>
          )}
        </div>

        {historyQuery.isError && (
          <p className="text-sm text-red-400">{historyQuery.error.message}</p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="min-w-full text-sm bg-slate-950/40">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 bg-slate-950/60">
                <th className="text-left py-2 px-4">Hora</th>
                <th className="text-left py-2 px-4">UP</th>
                <th className="text-left py-2 px-4">HTTP</th>
                <th className="text-left py-2 px-4">ms</th>
                <th className="text-left py-2 px-4">Error</th>
              </tr>
            </thead>
            <tbody>
              {(historyQuery.data ?? []).slice().reverse().map((c, idx) => (
                <tr key={idx} className="border-b border-slate-800/80 last:border-0">
                  <td className="py-2 px-4 text-slate-200">{formatTime(c.timestamp)}</td>
                  <td className="py-2 px-4">
                    <span className={`text-xs font-semibold ${c.is_up ? "text-emerald-400" : "text-red-400"}`}>
                      {c.is_up ? "UP" : "DOWN"}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-300">{c.status_code ?? "-"}</td>
                  <td className="py-2 px-4 text-slate-300">
                    {c.response_time_ms != null ? c.response_time_ms.toFixed(1) : "-"}
                  </td>
                  <td className="py-2 px-4 text-slate-400 break-all">
                    {c.error_message ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
