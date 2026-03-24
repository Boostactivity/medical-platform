import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface AlertBannerProps {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AlertBanner({ type, title, message, icon, action }: AlertBannerProps) {
  const styles = {
    success: {
      bg: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      subtext: 'text-emerald-700',
      icon: 'bg-emerald-100 text-emerald-600',
      button: 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100',
    },
    warning: {
      bg: 'from-amber-50 to-orange-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      subtext: 'text-amber-700',
      icon: 'bg-amber-100 text-amber-600',
      button: 'text-amber-700 hover:text-amber-900 hover:bg-amber-100',
    },
    info: {
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      icon: 'bg-blue-100 text-blue-600',
      button: 'text-blue-700 hover:text-blue-900 hover:bg-blue-100',
    },
    error: {
      bg: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700',
      icon: 'bg-red-100 text-red-600',
      button: 'text-red-700 hover:text-red-900 hover:bg-red-100',
    },
  };

  const style = styles[type];

  const defaultIcons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-r ${style.bg} border ${style.border} rounded-2xl p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center flex-shrink-0`}>
          {icon || defaultIcons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-[14px] font-semibold ${style.text} mb-1`}>{title}</h4>
          <p className={`text-[13px] ${style.subtext}`}>{message}</p>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={`text-[13px] font-medium px-4 py-2 rounded-lg transition-colors ${style.button}`}
          >
            {action.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}
