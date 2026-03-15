"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DistributionPoint } from "@/features/dashboard/types";

const COLORS = ["#00a8ff", "#f9a826", "#18dcb1"];

interface SourceDistributionChartProps {
  data: DistributionPoint[];
}

export function SourceDistributionChart({ data }: SourceDistributionChartProps) {
  return (
    <div className="chart-wrap">
      <h3>Source Distribution</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0b1c2f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10
            }}
          />
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
