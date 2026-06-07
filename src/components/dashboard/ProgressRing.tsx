import { motion } from 'motion/react';

interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export function ProgressRing({
  value,
  max,
  label,
  color = '#007AFF',
  size = 'md',
  showPercentage = true,
}: ProgressRingProps) {
  const percentage = (value / max) * 100;

  const sizes = {
    sm: { circle: 60, stroke: 5, text: 'text-sm' },
    md: { circle: 80, stroke: 6, text: 'text-base' },
    lg: { circle: 100, stroke: 8, text: 'text-lg' },
  };

  const config = sizes[size];
  const radius = (config.circle - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: config.circle, height: config.circle }}>
        <svg className="transform -rotate-90" width={config.circle} height={config.circle}>
          {/* Background circle */}
          <circle
            cx={config.circle / 2}
            cy={config.circle / 2}
            r={radius}
            stroke="#D9D5CC"
            strokeWidth={config.stroke}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={config.circle / 2}
            cy={config.circle / 2}
            r={radius}
            stroke={color}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`${config.text} text-[#1A1A1A]`}
            style={{ fontWeight: 400 }}
          >
            {showPercentage ? `${Math.round(percentage)}%` : value}
          </motion.div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm text-[#5C5C5C]">{label}</div>
      </div>
    </div>
  );
}

// Multi-ring component (Apple Activity style)
interface ActivityRingsProps {
  rings: {
    value: number;
    max: number;
    label: string;
    color: string;
  }[];
}

export function ActivityRings({ rings }: ActivityRingsProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <h3 className="text-2xl text-[#1A1A1A] mb-6">Mes objectifs</h3>

      <div className="flex items-center justify-around">
        {rings.map((ring, index) => (
          <ProgressRing
            key={index}
            value={ring.value}
            max={ring.max}
            label={ring.label}
            color={ring.color}
            size="lg"
          />
        ))}
      </div>
    </div>
  );
}
