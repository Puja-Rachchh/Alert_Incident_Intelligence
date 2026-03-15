"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface SlaMetrics {
  kpis: {
    total_incidents: number;
    predicted_breaches: number;
    average_risk: number;
  };
  graphs: {
    breaches_by_client: { name: string; value: number }[];
    alert_distribution: { name: string; value: number }[];
    probability_by_severity: { name: string; value: number }[];
    all_client_sla_scores: { name: string; value: number }[];
  };
  clients: string[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function SlaDashboard() {
  const [data, setData] = useState<SlaMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("All Clients");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${baseUrl}/api/sla-metrics?client=${encodeURIComponent(selectedClient)}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to load SLA metrics", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedClient]);

  if (loading && !data) return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading Analytics...</div>;
  if (!data) return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--critical)' }}>Error loading analytics.</div>;

  return (
    <div className="dashboard-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Header & Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Structural SLA Performance</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Filtering by:</span>
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{
              background: "#0b1c2f",
              border: "1px solid var(--glass-border)",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: '0.9rem',
              outline: "none",
              cursor: 'pointer'
            }}
          >
            {data.clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
        <div className="kpi-card-premium">
          <p className="label">Total Incidents Analyzed</p>
          <h3 className="value" style={{ color: "#fff" }}>{data.kpis.total_incidents.toLocaleString()}</h3>
        </div>
        <div className="kpi-card-premium">
          <p className="label">Predicted Breaches</p>
          <h3 className="value" style={{ color: "var(--critical)" }}>{data.kpis.predicted_breaches.toLocaleString()}</h3>
        </div>
        <div className="kpi-card-premium">
          <p className="label">Average Breach Risk</p>
          <h3 className="value" style={{ color: "var(--accent)" }}>{data.kpis.average_risk}%</h3>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        
        {/* Breaches by Client (Only show if viewing All Clients) */}
        {selectedClient === "All Clients" && (
          <div className="chart-card">
            <h3>Top 5 Clients by Predicted Breaches</h3>
            <div style={{ width: "100%", height: 250, marginTop: "1rem" }}>
              <ResponsiveContainer>
                <BarChart data={data.graphs.breaches_by_client} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="var(--muted)" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={120} stroke="var(--muted)" fontSize={11} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + "..." : val} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid var(--glass-border)", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="var(--critical)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Alert Distribution */}
        <div className="chart-card">
          <h3>Alert Category Distribution</h3>
          <div style={{ width: "100%", height: 250, marginTop: "1rem" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={data.graphs.alert_distribution} 
                  cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={80} 
                  paddingAngle={5} dataKey="value"
                >
                  {data.graphs.alert_distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid var(--glass-border)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Probability by Severity */}
        <div className="chart-card">
          <h3>Avg Breach Probability by Severity</h3>
          <div style={{ width: "100%", height: 250, marginTop: "1rem" }}>
            <ResponsiveContainer>
              <BarChart data={data.graphs.probability_by_severity}>
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(val) => `${val}%`} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid var(--glass-border)", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>

      {/* All Client SLA Scores (Full Width) */}
      <div className="chart-card" style={{ width: "100%" }}>
        <h3>All Clients SLA Score (Health %)</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Calculated as 100% minus the average likelihood of SLA breach.
        </p>
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={data.graphs.all_client_sla_scores} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="name" 
                stroke="var(--muted)" 
                fontSize={11} 
                angle={-45} 
                textAnchor="end"
                interval={0}
                tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + "..." : val}
              />
              <YAxis stroke="var(--muted)" fontSize={12} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                cursor={{ fill: "rgba(255,255,255,0.05)" }} 
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid var(--glass-border)", borderRadius: "8px" }} 
                formatter={(value: number) => [`${value}%`, "SLA Score"]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.graphs.all_client_sla_scores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value > 80 ? 'var(--accent)' : entry.value > 50 ? 'var(--warning)' : 'var(--critical)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
