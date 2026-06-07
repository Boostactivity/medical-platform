import { motion } from 'motion/react';

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreCircle({ score, maxScore = 100, size = 'lg', showLabel = true }: ScoreCircleProps) {
  const percentage = (score / maxScore) * 100;
  
  const sizes = {
    sm: { circle: 80, stroke: 6, text: 'text-2xl' },
    md: { circle: 120, stroke: 8, text: 'text-3xl' },
    lg: { circle: 180, stroke: 10, text: 'text-5xl' },
  };
  
  const config = sizes[size];
  const radius = (config.circle - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 80) return '#18753C'; // Vert
    if (percentage >= 60) return '#B34000'; // Orange
    return '#CE0500'; // Rouge
  };
  
  const getMessage = () => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Très bien';
    if (percentage >= 60) return 'Bien';
    if (percentage >= 40) return 'À améliorer';
    return 'Attention';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: config.circle, height: config.circle }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={config.circle} height={config.circle}>
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
            stroke={getColor()}
            strokeWidth={config.stroke}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className={`${config.text} text-[#1A1A1A]`}
            style={{ fontWeight: 300 }}
          >
            {Math.round(score)}
          </motion.div>
          <div className="text-sm text-[#5C5C5C]">/{maxScore}</div>
        </div>
      </div>
      
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="text-lg text-[#1A1A1A] mb-1">Score sommeil</div>
          <div
            className="text-sm px-4 py-1 rounded-full inline-block"
            style={{ 
              backgroundColor: `${getColor()}15`,
              color: getColor(),
            }}
          >
            {getMessage()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
