"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

type Props = {
  latencies: (number | null)[];
  ups: boolean[];
};

/** Mini gráfica de latencia de los últimos checks (los checks caídos aparecen como huecos). */
export default function LatencySparkline({ latencies, ups }: Props) {
  if (latencies.every((v) => v == null)) {
    return <span className="text-xs text-slate-500">sin datos</span>;
  }

  const data = latencies.map((value, index) => ({ index, value }));
  const ultimoCaido = ups.length > 0 && ups[ups.length - 1] === false;
  const algunCaido = ups.some((u) => !u);
  const color = ultimoCaido ? "#f87171" : algunCaido ? "#fbbf24" : "#38bdf8";

  return (
    <div className="w-28 h-8" aria-label="Latencia de los últimos checks">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
