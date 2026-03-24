import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'cyan';
  delay?: number;
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  color = 'blue',
  delay = 0 
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'from-[#3b82f6] to-[#60a5fa]',
      icon: 'bg-blue-100 text-[#3b82f6]',
      trend: trend && trend.value > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
    },
    green: {
      bg: 'from-[#10b981] to-[#34d399]',
      icon: 'bg-emerald-100 text-[#10b981]',
      trend: trend && trend.value > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
    },
    purple: {
      bg: 'from-[#8b5cf6] to-[#a78bfa]',
      icon: 'bg-purple-100 text-[#8b5cf6]',
      trend: trend && trend.value > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
    },
    cyan: {
      bg: 'from-[#06b6d4] to-[#22d3ee]',
      icon: 'bg-cyan-100 text-[#06b6d4]',
      trend: trend && trend.value > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
    }
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-white rounded-2xl p-6 border border-[#e2e8f0] hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] text-[#64748b] mb-1">{title}</p>
            <h3 className={`text-[32px] font-semibold bg-gradient-to-br ${colors.bg} bg-clip-text text-transparent leading-none tracking-tight`}>
              {value}
            </h3>
          </div>
          {icon && (
            <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
              {icon}
            </div>
          )}
        </div>

        {subtitle && (
          <p className="text-[13px] text-[#64748b] mb-2">{subtitle}</p>
        )}

        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <svg 
              className={`w-4 h-4 ${colors.trend} ${trend.value > 0 ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className={`text-[13px] font-medium ${colors.trend}`}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-[13px] text-[#64748b]">{trend.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
