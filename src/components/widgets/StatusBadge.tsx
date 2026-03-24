interface StatusBadgeProps {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function StatusBadge({ status, label, size = 'md', showDot = true }: StatusBadgeProps) {
  const statusConfig = {
    excellent: {
      bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: label || 'Excellent',
    },
    good: {
      bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      label: label || 'Bon',
    },
    fair: {
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: label || 'Moyen',
    },
    poor: {
      bg: 'bg-gradient-to-r from-orange-50 to-red-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      dot: 'bg-orange-500',
      label: label || 'Faible',
    },
    critical: {
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: label || 'Critique',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-[12px]',
    lg: 'px-4 py-2 text-[13px]',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-2 ${config.bg} ${config.text} border ${config.border} rounded-full ${sizeClasses[size]} font-medium`}
    >
      {showDot && <span className={`${config.dot} ${dotSizes[size]} rounded-full animate-pulse`}></span>}
      {config.label}
    </span>
  );
}
