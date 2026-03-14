"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TrendPoint } from "@/features/dashboard/types";

interface IncidentTrendChartProps {
  data: TrendPoint[];
}

export function IncidentTrendChart({ data }: IncidentTrendChartProps) {
  return (
    <div className="chart-wrap">
      <h3>Incident Trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
          <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.7)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1c2f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10
            }}
          />
          <Line type="monotone" dataKey="incidents" stroke="#ffb200" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="resolved" stroke="#12d3a2" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
