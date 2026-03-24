import { useMemo } from 'react';
import { motion } from 'motion/react';

type GrowthStage = 'seed' | 'sprout' | 'flower' | 'tree';

interface GrowthVisualizationProps {
  /** Number of consecutive days of observance (>4h) */
  consecutiveDays: number;
  /** Compact mode for inline display */
  compact?: boolean;
}

function getStage(days: number): { stage: GrowthStage; label: string; progress: number; next: string } {
  if (days < 7) {
    return { stage: 'seed', label: 'Graine', progress: (days / 7) * 100, next: 'Pousse a 7 jours' };
  }
  if (days < 21) {
    return { stage: 'sprout', label: 'Pousse', progress: ((days - 7) / 14) * 100, next: 'Fleur a 21 jours' };
  }
  if (days < 60) {
    return { stage: 'flower', label: 'Fleur', progress: ((days - 21) / 39) * 100, next: 'Arbre a 60 jours' };
  }
  return { stage: 'tree', label: 'Arbre de vie', progress: 100, next: 'Maximum atteint !' };
}

function Seed() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="60" ry="12" fill="#C8B88A" opacity="0.3" />
      {/* Seed body */}
      <motion.g
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <ellipse cx="100" cy="145" rx="18" ry="22" fill="url(#seedGradient)" />
        <ellipse cx="100" cy="145" rx="12" ry="16" fill="url(#seedInner)" opacity="0.5" />
      </motion.g>
      {/* Tiny green tip */}
      <motion.path
        d="M100 125 Q97 120 100 115 Q103 120 100 125"
        fill="#81C784"
        initial={{ scaleY: 0, originY: '100%' }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      />
      <defs>
        <radialGradient id="seedGradient"><stop offset="0%" stopColor="#A1887F" /><stop offset="100%" stopColor="#795548" /></radialGradient>
        <radialGradient id="seedInner"><stop offset="0%" stopColor="#BCAAA4" /><stop offset="100%" stopColor="#8D6E63" /></radialGradient>
      </defs>
    </svg>
  );
}

function Sprout() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Ground */}
      <ellipse cx="100" cy="175" rx="65" ry="14" fill="#A5D6A7" opacity="0.3" />
      {/* Stem */}
      <motion.path
        d="M100 175 Q98 140 100 105"
        stroke="#66BB6A"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      {/* Left leaf */}
      <motion.path
        d="M98 135 Q80 125 75 110 Q90 118 98 135"
        fill="#81C784"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      />
      {/* Right leaf */}
      <motion.path
        d="M102 120 Q120 108 128 95 Q112 105 102 120"
        fill="#66BB6A"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      />
      {/* Top bud */}
      <motion.circle
        cx="100"
        cy="102"
        r="8"
        fill="#A5D6A7"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
      />
    </svg>
  );
}

function Flower() {
  const petalColors = ['#F48FB1', '#CE93D8', '#90CAF9', '#80DEEA', '#A5D6A7'];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Ground */}
      <ellipse cx="100" cy="180" rx="70" ry="14" fill="#A5D6A7" opacity="0.3" />
      {/* Stem */}
      <motion.path
        d="M100 180 Q97 140 100 80"
        stroke="#66BB6A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Leaves */}
      <motion.path d="M98 150 Q70 140 60 120 Q80 132 98 150" fill="#81C784" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
      <motion.path d="M102 130 Q130 118 140 100 Q120 115 102 130" fill="#66BB6A" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
      {/* Petals */}
      {petalColors.map((color, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        const px = 100 + Math.cos(angle) * 22;
        const py = 68 + Math.sin(angle) * 22;
        return (
          <motion.ellipse
            key={i}
            cx={px}
            cy={py}
            rx="14"
            ry="10"
            fill={color}
            opacity="0.85"
            transform={`rotate(${i * 72} ${px} ${py})`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.1, type: 'spring' }}
          />
        );
      })}
      {/* Center */}
      <motion.circle cx="100" cy="68" r="10" fill="#FFD54F" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: 'spring' }} />
    </svg>
  );
}

function Tree() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Ground */}
      <ellipse cx="100" cy="185" rx="80" ry="15" fill="#A5D6A7" opacity="0.25" />
      {/* Trunk */}
      <motion.path
        d="M95 185 Q93 150 95 110 M105 185 Q107 150 105 110"
        stroke="#8D6E63"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Canopy layers */}
      <motion.ellipse cx="100" cy="85" rx="55" ry="40" fill="#66BB6A" opacity="0.7" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} />
      <motion.ellipse cx="85" cy="75" rx="35" ry="30" fill="#81C784" opacity="0.8" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} />
      <motion.ellipse cx="115" cy="75" rx="35" ry="30" fill="#A5D6A7" opacity="0.7" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: 'spring' }} />
      <motion.ellipse cx="100" cy="65" rx="30" ry="25" fill="#C8E6C9" opacity="0.6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} />
      {/* Small fruits/flowers */}
      {[
        { x: 75, y: 70, color: '#F48FB1' },
        { x: 120, y: 65, color: '#FFD54F' },
        { x: 95, y: 55, color: '#CE93D8' },
        { x: 110, y: 85, color: '#FF8A65' },
      ].map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r="4"
          fill={dot.color}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 1.4 + i * 0.15 }}
        />
      ))}
    </svg>
  );
}

const stageComponents: Record<GrowthStage, React.FC> = {
  seed: Seed,
  sprout: Sprout,
  flower: Flower,
  tree: Tree,
};

const stageGradients: Record<GrowthStage, string> = {
  seed: 'from-[#EFEBE9] to-[#D7CCC8]',
  sprout: 'from-[#E8F5E9] to-[#C8E6C9]',
  flower: 'from-[#FCE4EC] to-[#F3E5F5]',
  tree: 'from-[#E8F5E9] to-[#B9F6CA]',
};

export function GrowthVisualization({ consecutiveDays, compact = false }: GrowthVisualizationProps) {
  const { stage, label, progress, next } = useMemo(() => getStage(consecutiveDays), [consecutiveDays]);
  const StageComponent = stageComponents[stage];

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${stageGradients[stage]} rounded-2xl p-4 flex items-center gap-4`}
      >
        <div className="w-16 h-16 flex-shrink-0">
          <StageComponent />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1D1D1F]">{label}</div>
          <div className="text-xs text-[#86868B]">{consecutiveDays} jours consecutifs</div>
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden mt-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-[#34C759] to-[#30D158] rounded-full"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-[#66BB6A] to-[#43A047] rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#1D1D1F]">Mon Arbre de Vie</h3>
          <p className="text-sm text-[#86868B]">Il grandit avec votre observance</p>
        </div>
      </div>

      {/* Visualization area */}
      <div className={`bg-gradient-to-b ${stageGradients[stage]} rounded-2xl p-6 mb-6 flex flex-col items-center`}>
        <div className="w-48 h-48">
          <StageComponent />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mt-4"
        >
          <h4 className="text-lg font-semibold text-[#1D1D1F]">{label}</h4>
          <p className="text-sm text-[#86868B]">{consecutiveDays} jours consecutifs d'observance</p>
        </motion.div>
      </div>

      {/* Progress bar to next stage */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[#86868B]">Progression</span>
          <span className="text-[#34C759] font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-[#F5F5F7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="h-full bg-gradient-to-r from-[#34C759] to-[#30D158] rounded-full"
          />
        </div>
        <p className="text-xs text-[#86868B] mt-2">Prochain niveau : {next}</p>
      </div>

      {/* Stages legend */}
      <div className="flex justify-between mt-6 px-2">
        {(['seed', 'sprout', 'flower', 'tree'] as GrowthStage[]).map((s) => {
          const icons: Record<GrowthStage, string> = { seed: '🌱', sprout: '🌿', flower: '🌸', tree: '🌳' };
          const labels: Record<GrowthStage, string> = { seed: 'Graine', sprout: 'Pousse', flower: 'Fleur', tree: 'Arbre' };
          const isActive = s === stage;
          const isPast = ['seed', 'sprout', 'flower', 'tree'].indexOf(s) < ['seed', 'sprout', 'flower', 'tree'].indexOf(stage);

          return (
            <div key={s} className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  isActive
                    ? 'bg-[#34C759]/20 ring-2 ring-[#34C759]'
                    : isPast
                    ? 'bg-[#34C759]/10'
                    : 'bg-[#F5F5F7]'
                }`}
              >
                {icons[s]}
              </div>
              <span className={`text-xs ${isActive ? 'text-[#34C759] font-semibold' : 'text-[#86868B]'}`}>
                {labels[s]}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
