"use client";

interface Props {
  value: number; // 0–100
  label: string;
  color?: string;
  size?: number;
}

export default function HealthGauge({ value, label, color = "#22c55e", size = 100 }: Props) {
  const radius = (size - 12) / 2;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const strokeWidth = 8;

  // Semicircle arc from 180° (left) to 0° (right)
  const startAngle = 180;
  const endAngle = 0;
  const sweep = startAngle - endAngle; // 180 degrees
  const valueAngle = (value / 100) * sweep;

  // Convert polar to cartesian
  const toXY = (angle: number) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy - radius * Math.sin((angle * Math.PI) / 180),
  });

  // Background arc (full semicircle)
  const bgStart = toXY(startAngle);
  const bgEnd = toXY(endAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;

  // Value arc
  const valEnd = toXY(startAngle - valueAngle);
  const largeArc = valueAngle > 180 ? 1 : 0;
  const valPath = value > 0
    ? `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`
    : "";

  return (
    <div style={{ textAlign: "center", width: size, margin: "0 auto" }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value > 0 && (
          <path
            d={valPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        )}
        {/* Center value */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill={color}
          fontSize={size > 80 ? 24 : 18}
          fontWeight="800"
          fontFamily="inherit"
        >
          {value}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          fontFamily="inherit"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
