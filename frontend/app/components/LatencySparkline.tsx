"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";


type Props = {
  data: { response_time_ms: number | null; is_up?: boolean }[];
};

export default function LatencySparkline({ data }: Props) {
  const cleanData = data
    .filter((d) => d.response_time_ms !== null)
    .map((d, i) => ({
      index: i,
      value: d.response_time_ms,
    }));

  if (cleanData.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const hasDown = data.some((d) => d.is_up === false);

  const strokeColor = hasDown ? "#ef4444" : "#38bdf8";


  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cleanData}>
            <Tooltip
                contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                borderRadius: "8px",
                fontSize: "12px",
                }}
                labelFormatter={() => ""}
                formatter={(value: number) => [`${value.toFixed(1)} ms`, "Latencia"]}
                cursor={false}
            />

            <Line
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                dot={false}
            />
        </LineChart>

      </ResponsiveContainer>
    </div>
  );
}
