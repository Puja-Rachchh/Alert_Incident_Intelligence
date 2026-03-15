"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeeklyBarChartProps {
  title: string;
  data: Array<{ week: string; volume: number }>;
  barColor?: string;
}

export function WeeklyBarChart({ title, data, barColor = "#00a8ff" }: WeeklyBarChartProps) {
  return (
    <div className="chart-wrap">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="week" stroke="rgba(255,255,255,0.7)" />
          <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.7)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1c2f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10
            }}
          />
          <Bar dataKey="volume" fill={barColor} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
