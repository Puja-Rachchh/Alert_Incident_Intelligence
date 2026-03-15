interface InsightCardProps {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "neutral" | "warning" | "critical" | "good";
}

export function InsightCard({ label, value, delta, tone = "neutral" }: InsightCardProps) {
  return (
    <article className={`insight-card tone-${tone}`}>
      <p className="insight-label">{label}</p>
      <p className="insight-value">{value}</p>
      {delta ? <p className="insight-delta">{delta}</p> : null}
    </article>
  );
}
