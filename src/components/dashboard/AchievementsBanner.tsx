import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Trophy, Flame, Star, Award, Zap, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface PatientStats {
  current_streak_days: number;
  longest_streak_days: number;
  total_nights_tracked: number;
  perfect_nights_count: number;
  level: number;
  xp_points: number;
}

export function AchievementsBanner({ userId }: { userId: string }) {
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('patient_stats')
          .select('*')
          .eq('patient_id', userId)
          .single();

        if (error) {
          console.log('No stats found, initializing...', error);
          // Initialiser si pas de stats
          const { data: newStats } = await supabase
            .from('patient_stats')
            .insert({ patient_id: userId })
            .select()
            .single();
          setStats(newStats);
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-32"></div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calcul du XP nécessaire pour le prochain niveau
  const xpForNextLevel = stats.level * 200;
  const xpProgress = (stats.xp_points % 200) / 2; // Pourcentage

  const achievements = [
    {
      icon: <Flame className="w-6 h-6" />,
      title: 'Série en cours',
      value: `${stats.current_streak_days}`,
      unit: stats.current_streak_days > 1 ? 'jours' : 'jour',
      color: 'from-[#FF9500] to-[#FF3B30]',
      unlocked: stats.current_streak_days >= 1,
      nextMilestone: stats.current_streak_days < 7 ? 7 : stats.current_streak_days < 30 ? 30 : 90,
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Record personnel',
      value: `${stats.longest_streak_days}`,
      unit: stats.longest_streak_days > 1 ? 'jours' : 'jour',
      color: 'from-[#34C759] to-[#30D158]',
      unlocked: stats.longest_streak_days >= 7,
      badge: stats.longest_streak_days >= 30 ? '🏆' : stats.longest_streak_days >= 14 ? '🥈' : stats.longest_streak_days >= 7 ? '🥉' : null,
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: 'Nuits parfaites',
      value: `${stats.perfect_nights_count}`,
      unit: 'nuits',
      color: 'from-[#007AFF] to-[#5AC8FA]',
      unlocked: stats.perfect_nights_count >= 1,
      description: 'IAH < 5, Fuites < 10L/min, Usage > 6h',
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Niveau',
      value: `${stats.level}`,
      unit: '',
      color: 'from-[#AF52DE] to-[#BF5AF2]',
      unlocked: stats.level >= 1,
      progress: xpProgress,
      progressLabel: `${stats.xp_points % 200}/${xpForNextLevel} XP`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Achievement Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br ${achievement.color} rounded-2xl p-6 text-white relative overflow-hidden ${
              !achievement.unlocked && 'opacity-40 grayscale'
            }`}
          >
            {/* Unlock Indicator */}
            {achievement.unlocked && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs">
                  ✓
                </div>
              </div>
            )}

            {/* Badge (if any) */}
            {achievement.badge && (
              <div className="absolute top-2 left-2 text-2xl">
                {achievement.badge}
              </div>
            )}

            {/* Icon */}
            <div className="mb-3">{achievement.icon}</div>

            {/* Value */}
            <div className="flex items-baseline gap-1 mb-1">
              <div className="text-3xl font-bold">{achievement.value}</div>
              {achievement.unit && (
                <div className="text-sm opacity-90">{achievement.unit}</div>
              )}
            </div>

            {/* Title */}
            <div className="text-sm opacity-90 mb-2">{achievement.title}</div>

            {/* Progress Bar (for Level) */}
            {achievement.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${achievement.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <div className="text-xs opacity-75 mt-1">{achievement.progressLabel}</div>
              </div>
            )}

            {/* Next Milestone */}
            {achievement.nextMilestone && (
              <div className="mt-2 text-xs opacity-75">
                Prochain objectif : {achievement.nextMilestone} jours
              </div>
            )}

            {/* Description */}
            {achievement.description && (
              <div className="mt-2 text-xs opacity-75">
                {achievement.description}
              </div>
            )}

            {/* Lock Overlay */}
            {!achievement.unlocked && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                <div className="text-4xl">🔒</div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Total Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-[#F5F5F7] to-white rounded-2xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-[#86868B]">Progression globale</div>
              <div className="text-2xl text-[#1D1D1F] font-bold">
                {stats.total_nights_tracked} nuits suivies
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#007AFF]">{stats.xp_points}</div>
              <div className="text-xs text-[#86868B]">XP Total</div>
            </div>
            <div className="w-px h-12 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#34C759]">
                {stats.perfect_nights_count > 0
                  ? Math.round((stats.perfect_nights_count / stats.total_nights_tracked) * 100)
                  : 0}
                %
              </div>
              <div className="text-xs text-[#86868B]">Taux de réussite</div>
            </div>
          </div>
        </div>

        {/* Mini Progress to Next Achievement */}
        {stats.current_streak_days > 0 && stats.current_streak_days < 30 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#86868B]">
                Prochain badge : Série de {stats.current_streak_days < 7 ? '7' : '30'} jours
              </span>
              <span className="text-[#007AFF] font-semibold">
                {stats.current_streak_days < 7
                  ? `${7 - stats.current_streak_days} jours restants`
                  : `${30 - stats.current_streak_days} jours restants`}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    stats.current_streak_days < 7
                      ? (stats.current_streak_days / 7) * 100
                      : ((stats.current_streak_days - 7) / 23) * 100
                  }%`,
                }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-[#007AFF] to-[#5AC8FA]"
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
