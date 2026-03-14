"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface Props {
  value: number;       // 0–100
  label: string;
  color?: string;
}

export default function HealthGauge({ value, label, color = "#22c55e" }: Props) {
  const data = [{ value }];

  return (
    <div style={{ textAlign: "center" }}>
      <ResponsiveContainer width="100%" height={110}>
        <RadialBarChart
          innerRadius="60%"
          outerRadius="90%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: "rgba(255,255,255,0.07)" }}
            fill={color}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -28, fontSize: 22, fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
