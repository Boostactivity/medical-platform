/**
 * COMPOSANT STATCARD - KPI Card
 * 
 * Carte de statistique pour afficher les KPIs principaux
 * Style Apple-inspired avec icônes et variations de couleur
 */

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  delay?: number;
}

const colorVariants = {
  blue: {
    bg: 'from-blue-500/10 to-blue-600/5',
    icon: 'text-blue-600',
    text: 'text-blue-600',
  },
  green: {
    bg: 'from-green-500/10 to-green-600/5',
    icon: 'text-green-600',
    text: 'text-green-600',
  },
  orange: {
    bg: 'from-orange-500/10 to-orange-600/5',
    icon: 'text-orange-600',
    text: 'text-orange-600',
  },
  red: {
    bg: 'from-red-500/10 to-red-600/5',
    icon: 'text-red-600',
    text: 'text-red-600',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/5',
    icon: 'text-purple-600',
    text: 'text-purple-600',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  delay = 0,
}: StatCardProps) {
  const colors = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden bg-gradient-to-br ${colors.bg} backdrop-blur-sm rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow`}
    >
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${colors.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
        <div className="flex items-baseline gap-2">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900"
          >
            {value}
          </motion.p>
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-full -mr-16 -mt-16 blur-2xl" />
    </motion.div>
  );
}
