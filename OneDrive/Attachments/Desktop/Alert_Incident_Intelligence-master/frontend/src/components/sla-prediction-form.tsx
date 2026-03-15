"use client";

import { useState } from "react";

// Feature columns required by the model
const SLA_FEATURES = [
  "severity_High",
  "severity_Low",
  "severity_Medium",
  "source_system_CTGAN_Auvik",
  "source_system_Meraki",
  "source_system_N-Central",
  "alert_type_network_down",
  "alert_type_packet_loss",
  "customer_type_Enterprise",
  "customer_type_Standard"
];

interface PredictionResult {
  predicted_breach_flag: number;
  breach_probability: number;
  risk_level: string;
}

export function SlaPredictionForm() {
  const [formData, setFormData] = useState<Record<string, number>>(
    Object.fromEntries(SLA_FEATURES.map(feat => [feat, 0]))
  );
  
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    
    try {
      const response = await fetch(`${baseUrl}/api/predict-sla`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch prediction");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      [feature]: prev[feature] === 1 ? 0 : 1
    }));
  };

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'var(--critical)';
    if (level === 'Medium') return 'var(--accent)';
    return 'var(--good)';
  };

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <article className="chart-card">
        <h3>Incident Characteristics</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Toggle the features below that match the current incident to evaluate the probability of an SLA breach.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2rem' }}>
            {SLA_FEATURES.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => handleToggle(feature)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: `1px solid ${formData[feature] === 1 ? 'var(--primary)' : 'var(--glass-border)'}`,
                  background: formData[feature] === 1 ? 'rgba(59, 130, 246, 0.2)' : 'var(--glass-bg)',
                  color: formData[feature] === 1 ? '#fff' : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {feature.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Analyzing Historical Data...' : 'Predict SLA Breach'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--critical)', borderRadius: '8px' }}>
            {error}
          </div>
        )}
      </article>

      <article className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 2rem 0' }}>Prediction Result</h3>
        
        <div style={{ 
          width: '160px', 
          height: '160px', 
          borderRadius: '50%', 
          border: `8px solid ${result ? getRiskColor(result.risk_level) : 'var(--glass-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem auto',
          background: result ? `${getRiskColor(result.risk_level)}15` : 'transparent',
          transition: 'all 0.5s ease',
          boxShadow: result && result.risk_level === 'High' ? '0 0 40px rgba(239, 68, 68, 0.3)' : 'none'
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>
            {result ? `${result.breach_probability.toFixed(1)}%` : '--%'}
          </span>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--muted)' }}>Risk Level</h4>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: result ? getRiskColor(result.risk_level) : '#fff' }}>
            {result ? result.risk_level : 'Unknown'}
          </p>
        </div>
      </article>
    </div>
  );
}
