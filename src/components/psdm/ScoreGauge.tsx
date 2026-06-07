/**
 * Jauge circulaire de conformité (SVG pur, tokens design system).
 * value = pourcentage 0-100, null = aucun critère importé/évalué.
 */

interface ScoreGaugeProps {
  value: number | null;
  size?: number;
  label?: string;
}

function gaugeColor(value: number | null): string {
  if (value === null) return 'var(--muted-foreground)';
  if (value >= 80) return '#1B873F';
  if (value >= 50) return '#B45309';
  return 'var(--destructive)';
}

export function ScoreGauge({ value, size = 132, label }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = value === null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (progress / 100) * circumference;
  const color = gaugeColor(value);

  return (
    <div className="flex flex-col items-center gap-2" role="img"
      aria-label={value === null ? 'Score de conformité indisponible' : `Score de conformité ${value} %`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {value === null ? '—' : `${value}%`}
          </span>
        </div>
      </div>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
