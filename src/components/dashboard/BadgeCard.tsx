import { motion } from 'motion/react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  requirement?: string;
}

interface BadgeCardProps {
  badge: Badge;
  index?: number;
}

export function BadgeCard({ badge, index = 0 }: BadgeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-3xl p-6 ${
        badge.unlocked
          ? 'bg-gradient-to-br from-[#B34000]/20 to-[#B34000]/20 border-2 border-[#B34000]/50'
          : 'bg-[#F2F0EB] border-2 border-transparent'
      }`}
    >
      {/* Unlocked badge indicator */}
      {badge.unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 200 }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-[#B34000] rounded-full flex items-center justify-center shadow-lg"
        >
          <span className="text-sm">✓</span>
        </motion.div>
      )}

      {/* Icon */}
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 ${
          badge.unlocked
            ? 'bg-gradient-to-br from-[#B34000] to-[#B34000] shadow-lg'
            : 'bg-[#D9D5CC]'
        }`}
      >
        <span className={badge.unlocked ? '' : 'opacity-30'}>{badge.icon}</span>
      </div>

      {/* Content */}
      <div>
        <h4 className={`text-lg mb-1 ${badge.unlocked ? 'text-[#1A1A1A]' : 'text-[#5C5C5C]'}`}>
          {badge.name}
        </h4>
        <p className="text-sm text-[#5C5C5C] mb-3 line-clamp-2">{badge.description}</p>

        {/* Progress or unlocked date */}
        {badge.unlocked ? (
          badge.unlockedAt && (
            <div className="text-xs text-[#5C5C5C]">
              Débloqué le {new Date(badge.unlockedAt).toLocaleDateString('fr-FR')}
            </div>
          )
        ) : (
          <>
            {badge.progress !== undefined && (
              <div className="mb-2">
                <div className="h-2 bg-[#D9D5CC] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${badge.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[#007AFF] to-[#5AC8FA]"
                  />
                </div>
                <div className="text-xs text-[#5C5C5C] mt-1">{badge.progress}% complété</div>
              </div>
            )}
            {badge.requirement && (
              <div className="text-xs text-[#5C5C5C] italic">{badge.requirement}</div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// List component
interface BadgeListProps {
  badges: Badge[];
}

export function BadgeList({ badges }: BadgeListProps) {
  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl text-[#1A1A1A] mb-1">Mes récompenses</h3>
          <p className="text-sm text-[#5C5C5C]">
            {unlockedCount} sur {badges.length} badges débloqués
          </p>
        </div>
        <div className="text-4xl">🏆</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {badges.map((badge, index) => (
          <BadgeCard key={badge.id} badge={badge} index={index} />
        ))}
      </div>
    </div>
  );
}
