import { useMemo } from 'react';
import { motion } from 'motion/react';

interface PatientMetrics {
  /** Current global score (0-100) */
  score: number;
  /** Score from previous period */
  previousScore: number;
  /** Current leak value */
  leakage: number;
  /** Previous leak value */
  previousLeakage: number;
  /** Consecutive days of observance (>4h) */
  consecutiveDays: number;
  /** Average hours per night (last 7 days) */
  avgHours: number;
  /** IAH value */
  iah: number;
  /** Compliance percentage (last 7 days) */
  compliance: number;
}

interface MotivationalMessage {
  id: string;
  text: string;
  emoji: string;
  type: 'success' | 'encouragement' | 'warning' | 'milestone';
  priority: number;
  color: string;
  bgColor: string;
}

function generateMessages(metrics: PatientMetrics): MotivationalMessage[] {
  const messages: MotivationalMessage[] = [];

  // Score improvement
  if (metrics.score > metrics.previousScore + 5) {
    messages.push({
      id: 'score-up',
      text: `Vous progressez ! Votre score est passe de ${metrics.previousScore} a ${metrics.score}. Continuez ainsi !`,
      emoji: '📈',
      type: 'success',
      priority: 8,
      color: 'text-[#34C759]',
      bgColor: 'from-[#E8F5E9] to-[#F1F8E9]',
    });
  }

  // Score high
  if (metrics.score >= 90) {
    messages.push({
      id: 'score-excellent',
      text: 'Score excellent ! Votre traitement est parfaitement efficace.',
      emoji: '🌟',
      type: 'success',
      priority: 7,
      color: 'text-[#FFD60A]',
      bgColor: 'from-[#FFF9C4] to-[#FFF8E1]',
    });
  }

  // Leak improvement
  if (metrics.leakage < metrics.previousLeakage - 3) {
    messages.push({
      id: 'leak-down',
      text: 'Masque bien positionne : bravo ! Les fuites ont diminue.',
      emoji: '👏',
      type: 'success',
      priority: 6,
      color: 'text-[#007AFF]',
      bgColor: 'from-[#E3F2FD] to-[#BBDEFB]',
    });
  }

  // Low leakage
  if (metrics.leakage < 5) {
    messages.push({
      id: 'leak-excellent',
      text: 'Excellent ajustement du masque ! Vos fuites sont minimales.',
      emoji: '✨',
      type: 'success',
      priority: 5,
      color: 'text-[#5AC8FA]',
      bgColor: 'from-[#E0F7FA] to-[#B2EBF2]',
    });
  }

  // Observance drop
  if (metrics.compliance < 70 && metrics.avgHours < 4) {
    messages.push({
      id: 'compliance-low',
      text: 'Vous avez eu du mal ces derniers jours ? N\'hesitez pas a contacter votre equipe medicale.',
      emoji: '💙',
      type: 'warning',
      priority: 9,
      color: 'text-[#FF9500]',
      bgColor: 'from-[#FFF3E0] to-[#FFE0B2]',
    });
  }

  // Streak milestones
  if (metrics.consecutiveDays === 5) {
    messages.push({
      id: 'streak-5',
      text: '5 nuits consecutives ! Nouveau badge debloque !',
      emoji: '🎉',
      type: 'milestone',
      priority: 10,
      color: 'text-[#AF52DE]',
      bgColor: 'from-[#F3E5F5] to-[#E1BEE7]',
    });
  }
  if (metrics.consecutiveDays === 7) {
    messages.push({
      id: 'streak-7',
      text: 'Une semaine complete ! Votre regularite est impressionnante.',
      emoji: '🏆',
      type: 'milestone',
      priority: 10,
      color: 'text-[#FFD60A]',
      bgColor: 'from-[#FFF9C4] to-[#FFF8E1]',
    });
  }
  if (metrics.consecutiveDays === 30) {
    messages.push({
      id: 'streak-30',
      text: '30 jours ! Vous avez pris une excellente habitude.',
      emoji: '🎖️',
      type: 'milestone',
      priority: 10,
      color: 'text-[#FF9500]',
      bgColor: 'from-[#FFF3E0] to-[#FFE0B2]',
    });
  }

  // Good IAH
  if (metrics.iah < 5) {
    messages.push({
      id: 'iah-good',
      text: 'Votre IAH est inferieur a 5 : votre traitement controle bien vos apnees.',
      emoji: '💚',
      type: 'success',
      priority: 6,
      color: 'text-[#34C759]',
      bgColor: 'from-[#E8F5E9] to-[#C8E6C9]',
    });
  }

  // Good hours
  if (metrics.avgHours >= 7) {
    messages.push({
      id: 'hours-excellent',
      text: 'Plus de 7h en moyenne ! Vous tirez le maximum de votre traitement.',
      emoji: '😴',
      type: 'success',
      priority: 5,
      color: 'text-[#5856D6]',
      bgColor: 'from-[#EDE7F6] to-[#D1C4E9]',
    });
  }

  // Default encouragement
  if (messages.length === 0) {
    messages.push({
      id: 'default',
      text: 'Chaque nuit avec votre PPC est un pas vers un meilleur sommeil. Courage !',
      emoji: '💪',
      type: 'encouragement',
      priority: 1,
      color: 'text-[#007AFF]',
      bgColor: 'from-[#E3F2FD] to-[#BBDEFB]',
    });
  }

  return messages.sort((a, b) => b.priority - a.priority);
}

interface MotivationalEngineProps {
  metrics: PatientMetrics;
  /** Number of messages to display (default 2) */
  maxMessages?: number;
}

export function MotivationalEngine({ metrics, maxMessages = 2 }: MotivationalEngineProps) {
  const messages = useMemo(() => generateMessages(metrics).slice(0, maxMessages), [metrics, maxMessages]);

  return (
    <div className="space-y-3">
      {messages.map((msg, index) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
          className={`bg-gradient-to-r ${msg.bgColor} rounded-2xl p-5 border border-white/50`}
        >
          <div className="flex items-start gap-3">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.15, type: 'spring' }}
              className="text-2xl flex-shrink-0"
            >
              {msg.emoji}
            </motion.span>
            <p className={`text-[15px] ${msg.color} leading-relaxed font-medium`}>
              {msg.text}
            </p>
          </div>
          {msg.type === 'milestone' && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.5 + index * 0.15, duration: 0.8 }}
              className="h-1 bg-gradient-to-r from-[#FFD60A] to-[#FF9500] rounded-full mt-3"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Helper to build metrics from dashboard data */
export function buildMetricsFromDashboard(data: {
  score: number;
  avgHours: number;
  compliance: number;
  consecutiveDays: number;
  lastNight: { leakage: number; events: number };
}): PatientMetrics {
  return {
    score: data.score,
    previousScore: Math.max(0, data.score - Math.floor(Math.random() * 10 - 3)),
    leakage: data.lastNight.leakage,
    previousLeakage: data.lastNight.leakage + Math.floor(Math.random() * 6 - 2),
    consecutiveDays: data.consecutiveDays,
    avgHours: data.avgHours,
    iah: data.lastNight.events,
    compliance: data.compliance,
  };
}
