"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import { SOURCE_COLORS } from "@/features/dashboard/types";

interface DataPoint {
  day: string;
  Auvik: number;
  Meraki: number;
  "N-Central": number;
  Ctgan: number;
}

interface Props {
  data: DataPoint[];
}

export default function StackedAreaChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          {Object.entries(SOURCE_COLORS).map(([key, color]) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8 }}
          labelStyle={{ color: "var(--text-primary)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {(["Auvik", "Meraki", "N-Central", "Ctgan"] as const).map((src) => (
          <Area
            key={src}
            type="monotone"
            dataKey={src}
            stackId="1"
            stroke={SOURCE_COLORS[src]}
            fill={`url(#grad-${src})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
