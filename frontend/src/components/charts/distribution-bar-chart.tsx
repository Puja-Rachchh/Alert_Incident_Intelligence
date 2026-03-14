"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DistributionBarChartProps {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  barColor?: string;
}

export function DistributionBarChart({ title, data, xKey, yKey, barColor = "#18dcb1" }: DistributionBarChartProps) {
  return (
    <div className="chart-wrap">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey={xKey} stroke="rgba(255,255,255,0.7)" />
          <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.7)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1c2f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10
            }}
          />
          <Bar dataKey={yKey} fill={barColor} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
