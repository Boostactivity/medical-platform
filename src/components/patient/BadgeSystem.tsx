import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabase/client';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  category: 'observance' | 'score' | 'iah' | 'streak';
}

export interface BadgeProgress {
  badgeId: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

const BADGES: BadgeDef[] = [
  {
    id: '7-nuits',
    name: '7 nuits consecutives',
    description: '7 nuits de suite avec le masque',
    icon: '🌟',
    requirement: '7 nuits consecutives > 4h',
    category: 'streak',
  },
  {
    id: '30-nuits-4h',
    name: '30 nuits > 4h',
    description: '30 nuits avec plus de 4h de traitement',
    icon: '🏆',
    requirement: '30 nuits cumulees > 4h',
    category: 'observance',
  },
  {
    id: 'score-90-x5',
    name: 'Score > 90 x5',
    description: 'Score superieur a 90 pendant 5 jours',
    icon: '⭐',
    requirement: 'Score > 90 sur 5 jours',
    category: 'score',
  },
  {
    id: 'iah-5-15j',
    name: 'IAH < 5 pendant 15j',
    description: 'Index d\'apnee controle pendant 15 jours',
    icon: '💚',
    requirement: 'IAH < 5 pendant 15 jours consecutifs',
    category: 'iah',
  },
  {
    id: '60-sans-oubli',
    name: '60 jours sans oubli',
    description: '60 jours consecutifs de traitement',
    icon: '🔥',
    requirement: '60 jours consecutifs > 4h',
    category: 'streak',
  },
];

const BADGE_STORAGE_KEY = 'medconnect_badges';

function getStoredProgress(): BadgeProgress[] {
  try {
    return JSON.parse(localStorage.getItem(BADGE_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function getDefaultProgress(): BadgeProgress[] {
  // Demo progress
  return [
    { badgeId: '7-nuits', current: 7, target: 7, unlocked: true, unlockedAt: '2024-01-22' },
    { badgeId: '30-nuits-4h', current: 30, target: 30, unlocked: true, unlockedAt: '2024-02-14' },
    { badgeId: 'score-90-x5', current: 3, target: 5, unlocked: false },
    { badgeId: 'iah-5-15j', current: 11, target: 15, unlocked: false },
    { badgeId: '60-sans-oubli', current: 22, target: 60, unlocked: false },
  ];
}

// Confetti particle
function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ['#FFD60A', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 4 + Math.random() * 6;

  return (
    <motion.div
      initial={{ y: 0, x, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, -120, 200],
        x: [x, x + (Math.random() - 0.5) * 150],
        opacity: [1, 1, 0],
        rotate: [0, 360 + Math.random() * 360],
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
      style={{ width: size, height: size, backgroundColor: color }}
      className="absolute top-1/2 left-1/2 rounded-sm"
    />
  );
}

interface BadgeUnlockModalProps {
  badge: BadgeDef;
  onClose: () => void;
}

function BadgeUnlockModal({ badge, onClose }: BadgeUnlockModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.05}
              x={(Math.random() - 0.5) * 40}
            />
          ))}
        </div>

        {/* Star burst background */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.15 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-gradient-to-br from-[#FFD60A] to-[#FF9500] rounded-full m-auto w-48 h-48"
        />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-7xl mb-4"
          >
            {badge.icon}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">
              Nouveau badge !
            </h3>
            <h4 className="text-lg font-semibold text-[#007AFF] mb-2">{badge.name}</h4>
            <p className="text-[#86868B] mb-6">{badge.description}</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white rounded-full font-semibold shadow-lg"
          >
            Genial !
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface BadgeSystemProps {
  /** Override progress data (otherwise uses localStorage/demo) */
  progressData?: BadgeProgress[];
  /** Compact mode for dashboard widget */
  compact?: boolean;
}

export function BadgeSystem({ progressData, compact = false }: BadgeSystemProps) {
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [celebratingBadge, setCelebratingBadge] = useState<BadgeDef | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (progressData) {
      setProgress(progressData);
      return;
    }
    const fetchBadges = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: realData, error } = await supabase
            .from('badges')
            .select('*')
            .eq('patient_id', user.id);
          if (!error && realData?.length) {
            const mapped: BadgeProgress[] = realData.map((b: any) => ({
              badgeId: b.badge_id || b.id,
              current: b.current ?? 0,
              target: b.target ?? 1,
              unlocked: b.unlocked ?? false,
              unlockedAt: b.unlocked_at,
            }));
            setProgress(mapped);
            return;
          }
        }
      } catch (e) {
        console.warn('Using mock badge data:', e);
      }
      // Fallback to localStorage/demo
      const stored = getStoredProgress();
      setProgress(stored.length > 0 ? stored : getDefaultProgress());
    };
    fetchBadges();
  }, [progressData]);

  const getBadgeProgress = (badgeId: string): BadgeProgress => {
    return progress.find((p) => p.badgeId === badgeId) || {
      badgeId,
      current: 0,
      target: 1,
      unlocked: false,
    };
  };

  const filteredBadges = BADGES.filter((badge) => {
    const p = getBadgeProgress(badge.id);
    if (filter === 'unlocked') return p.unlocked;
    if (filter === 'locked') return !p.unlocked;
    return true;
  });

  const unlockedCount = progress.filter((p) => p.unlocked).length;
  const totalHours = Math.round(progress.reduce((acc, p) => acc + (p.unlocked ? p.target * 4.5 : 0), 0));

  if (compact) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1D1D1F]">Mes Badges</h3>
          <span className="text-sm text-[#86868B]">{unlockedCount}/{BADGES.length}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {BADGES.map((badge) => {
            const p = getBadgeProgress(badge.id);
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.1 }}
                className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 ${
                  p.unlocked
                    ? 'bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2] border-[#FFD60A] shadow-sm'
                    : 'bg-[#F5F5F7] border-[#E5E5EA] opacity-40 grayscale'
                }`}
              >
                {badge.icon}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm">
      <AnimatePresence>
        {celebratingBadge && (
          <BadgeUnlockModal
            badge={celebratingBadge}
            onClose={() => setCelebratingBadge(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F]">Mes Recompenses</h2>
          <p className="text-[#86868B]">{unlockedCount} badge{unlockedCount > 1 ? 's' : ''} obtenu{unlockedCount > 1 ? 's' : ''} sur {BADGES.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FFD60A] to-[#FF9500] rounded-xl flex items-center justify-center text-2xl">
            🏆
          </div>
        </div>
      </div>

      {/* Cumulative stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#F5F5F7] rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-[#007AFF]">{totalHours}h</div>
          <div className="text-xs text-[#86868B]">Heures traitees</div>
        </div>
        <div className="bg-[#F5F5F7] rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-[#FF9500]">
            {getBadgeProgress('60-sans-oubli').current}
          </div>
          <div className="text-xs text-[#86868B]">Jours consecutifs</div>
        </div>
        <div className="bg-[#F5F5F7] rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-[#34C759]">+{Math.round(totalHours * 0.6)}h</div>
          <div className="text-xs text-[#86868B]">Repos regagne</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'unlocked', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f
                ? 'bg-[#007AFF] text-white'
                : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'unlocked' ? 'Obtenus' : 'A obtenir'}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredBadges.map((badge, index) => {
          const p = getBadgeProgress(badge.id);
          const percentage = Math.min(Math.round((p.current / p.target) * 100), 100);

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => p.unlocked && setCelebratingBadge(badge)}
              className={`rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                p.unlocked
                  ? 'bg-gradient-to-br from-[#FFFDE7] to-[#FFF9C4] border-[#FFD60A] shadow-md hover:shadow-lg'
                  : 'bg-[#F5F5F7] border-[#E5E5EA]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`text-4xl flex-shrink-0 ${!p.unlocked ? 'grayscale opacity-40' : ''}`}
                >
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-[#1D1D1F]">{badge.name}</span>
                    {p.unlocked && (
                      <svg className="w-5 h-5 text-[#34C759] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-[#86868B] mb-2">{badge.description}</p>

                  {!p.unlocked && (
                    <>
                      <div className="h-2 bg-white rounded-full overflow-hidden mb-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] rounded-full"
                        />
                      </div>
                      <span className="text-xs text-[#86868B]">
                        {p.current}/{p.target} — {percentage}%
                      </span>
                    </>
                  )}

                  {p.unlocked && p.unlockedAt && (
                    <span className="text-xs text-[#FF9500] font-medium">
                      Obtenu le {new Date(p.unlockedAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
