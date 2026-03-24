import { motion } from 'motion/react';

interface Badge {
  id: string;
  nom: string;
  description: string;
  icon: string;
  debloque: boolean;
  date?: string;
}

interface MesProgresProps {
  heuresTotal: number;
  joursConsecutifs: number;
  heuresRegagnees: number;
  badges: Badge[];
  niveau: number; // 1-10 pour la fleur qui pousse
}

export function MesProgres({ heuresTotal, joursConsecutifs, heuresRegagnees, badges, niveau }: MesProgresProps) {
  // Fleur qui pousse selon le niveau
  const getFleurEmoji = (level: number) => {
    if (level <= 2) return '🌱'; // Graine
    if (level <= 4) return '🌿'; // Pousse
    if (level <= 6) return '🪴'; // Plant
    if (level <= 8) return '🌺'; // Fleur
    return '🌸'; // Fleur épanouie
  };

  const getFleurLabel = (level: number) => {
    if (level <= 2) return 'Graine de bien-être';
    if (level <= 4) return 'Pousse prometteuse';
    if (level <= 6) return 'En pleine croissance';
    if (level <= 8) return 'Belle floraison';
    return 'Pleinement épanoui';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#10b981] to-[#34d399] rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-[21px] font-semibold text-[#1a2b3c]">Mes Progrès</h3>
          <p className="text-[13px] text-[#64748b]">Votre évolution et vos récompenses</p>
        </div>
      </div>

      {/* Fleur qui pousse */}
      <div className="bg-gradient-to-br from-[#d1fae5] via-[#a7f3d0] to-[#6ee7b7] rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="text-[80px] mb-4"
          >
            {getFleurEmoji(niveau)}
          </motion.div>
          <h4 className="text-[21px] font-semibold text-[#1a2b3c] mb-2">{getFleurLabel(niveau)}</h4>
          <p className="text-[14px] text-[#064e3b]">Niveau {niveau} / 10</p>
          {/* Barre de progression */}
          <div className="mt-4 max-w-[300px] mx-auto">
            <div className="h-3 bg-white/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${niveau * 10}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-[#10b981] to-[#34d399] rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats de progrès */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#dbeafe] to-white rounded-xl p-5 text-center border border-[#3b82f6]/20">
          <div className="text-[36px] font-semibold bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent mb-1">
            {heuresTotal}
          </div>
          <div className="text-[12px] text-[#64748b] mb-1">Heures traitées</div>
          <div className="text-[11px] text-[#3b82f6] font-medium">depuis le début</div>
        </div>

        <div className="bg-gradient-to-br from-[#fef3c7] to-white rounded-xl p-5 text-center border border-[#f59e0b]/20">
          <div className="text-[36px] font-semibold bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent mb-1">
            {joursConsecutifs}
          </div>
          <div className="text-[12px] text-[#64748b] mb-1">Jours consécutifs</div>
          <div className="text-[11px] text-[#f59e0b] font-medium">&gt; 4h par nuit</div>
        </div>

        <div className="bg-gradient-to-br from-[#d1fae5] to-white rounded-xl p-5 text-center border border-[#10b981]/20">
          <div className="text-[36px] font-semibold bg-gradient-to-br from-[#10b981] to-[#34d399] bg-clip-text text-transparent mb-1">
            +{heuresRegagnees}h
          </div>
          <div className="text-[12px] text-[#64748b] mb-1">Sommeil régulé</div>
          <div className="text-[11px] text-[#10b981] font-medium">ce mois-ci</div>
        </div>
      </div>

      {/* Badges débloqués */}
      <div>
        <h4 className="text-[17px] font-semibold text-[#1a2b3c] mb-4 flex items-center gap-2">
          <span>🏆</span>
          Badges débloqués ({badges.filter(b => b.debloque).length}/{badges.length})
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          {badges.map((badge) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-xl p-4 border-2 transition-all ${
                badge.debloque
                  ? 'bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border-[#f59e0b] shadow-lg'
                  : 'bg-[#f8fafc] border-[#e2e8f0] opacity-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-[32px] ${badge.debloque ? '' : 'grayscale opacity-40'}`}>
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-[#1a2b3c] mb-1">{badge.nom}</div>
                  <div className="text-[12px] text-[#64748b] leading-relaxed">{badge.description}</div>
                  {badge.debloque && badge.date && (
                    <div className="text-[11px] text-[#f59e0b] font-medium mt-2">
                      ✨ Débloqué le {badge.date}
                    </div>
                  )}
                </div>
                {badge.debloque && (
                  <svg className="w-5 h-5 text-[#10b981] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Objectif mensuel */}
      <div className="mt-8 bg-gradient-to-r from-[#ede9fe] to-[#ddd6fe] rounded-2xl p-6 border border-[#8b5cf6]/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#8b5cf6] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="flex-1">
            <h5 className="text-[15px] font-semibold text-[#1a2b3c] mb-2">🎯 Objectif de ce mois</h5>
            <p className="text-[14px] text-[#64748b] mb-3">
              Atteignez <strong className="text-[#8b5cf6]">90% d'observance</strong> ce mois pour débloquer le badge "Régularité Exemplaire" 🌟
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] rounded-full" style={{ width: '78%' }} />
              </div>
              <div className="text-[13px] font-semibold text-[#8b5cf6]">78%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message motivationnel */}
      <div className="mt-6 text-center">
        <p className="text-[14px] text-[#64748b] italic">
          "Vous n'êtes pas seul. 3 millions de Français sont traités pour l'apnée du sommeil. 
          <br />Continuez ainsi, chaque nuit compte ! 💪"
        </p>
      </div>
    </motion.div>
  );
}