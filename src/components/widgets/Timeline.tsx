import { motion } from 'motion/react';

interface TimelineItem {
  date: string;
  title: string;
  description: string;
  type?: 'success' | 'info' | 'warning';
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  const typeStyles = {
    success: {
      dot: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      line: 'bg-gradient-to-b from-emerald-200 to-transparent',
      icon: 'text-emerald-600',
    },
    info: {
      dot: 'bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]',
      line: 'bg-gradient-to-b from-blue-200 to-transparent',
      icon: 'text-[#3b82f6]',
    },
    warning: {
      dot: 'bg-gradient-to-br from-amber-400 to-orange-500',
      line: 'bg-gradient-to-b from-amber-200 to-transparent',
      icon: 'text-amber-600',
    },
  };

  return (
    <div className="relative">
      {items.map((item, index) => {
        const style = typeStyles[item.type || 'info'];
        const isLast = index === items.length - 1;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative pb-8 last:pb-0"
          >
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-4 top-8 w-0.5 h-full -ml-px">
                <div className={`w-full h-full ${style.line}`}></div>
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Dot/Icon */}
              <div className="relative flex-shrink-0">
                <div className={`w-8 h-8 rounded-full ${style.dot} flex items-center justify-center shadow-md`}>
                  {item.icon || (
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                  <h4 className="text-[14px] font-semibold text-[#1a2b3c]">{item.title}</h4>
                  <span className="text-[12px] text-[#64748b]">{item.date}</span>
                </div>
                <p className="text-[13px] text-[#64748b] leading-relaxed">{item.description}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
