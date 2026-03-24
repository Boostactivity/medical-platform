import { motion } from 'motion/react';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'blue' | 'green' | 'purple' | 'cyan';
  label: string;
  subtitle?: string;
  showValue?: boolean;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'blue',
  label,
  subtitle,
  showValue = true,
}: CircularProgressProps) {
  const percentage = (value / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    blue: {
      from: '#2563eb',
      to: '#3b82f6',
      bg: 'bg-blue-50',
    },
    green: {
      from: '#059669',
      to: '#10b981',
      bg: 'bg-emerald-50',
    },
    purple: {
      from: '#7c3aed',
      to: '#8b5cf6',
      bg: 'bg-purple-50',
    },
    cyan: {
      from: '#0891b2',
      to: '#06b6d4',
      bg: 'bg-cyan-50',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gradient-${color})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        {/* Center value */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={`text-[28px] font-semibold bg-gradient-to-br from-[${colors.from}] to-[${colors.to}] bg-clip-text text-transparent`}
            >
              {Math.round(percentage)}%
            </motion.span>
          </div>
        )}
      </div>
      <div className="text-center mt-4">
        <p className="text-[14px] font-medium text-[#1a2b3c]">{label}</p>
        {subtitle && <p className="text-[12px] text-[#64748b] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
