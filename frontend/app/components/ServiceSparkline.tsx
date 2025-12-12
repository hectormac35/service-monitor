"use client";

import { useQuery } from "@tanstack/react-query";
import { getServiceHistory } from "@/lib/api";
import LatencySparkline from "./LatencySparkline";

export default function ServiceSparkline({
  serviceId,
}: {
  serviceId: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["service-history", serviceId],
    queryFn: () => getServiceHistory(serviceId, 20),
    refetchInterval: 30000,
  });


  if (isLoading) {
    return <span className="text-xs text-slate-400">…</span>;
  }

  return <LatencySparkline data={data ?? []} />;
}
