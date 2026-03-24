import { motion } from 'motion/react';

interface NuitEvent {
  heure: number; // 0-12 (21h = 0, 9h = 12)
  type: 'masque_off' | 'alarme' | 'fuite' | 'endormissement';
  label: string;
}

interface MaNuitProps {
  dureeTotale: number; // en heures
  heuresSommeil: number;
  efficacite: number; // pourcentage
  evenements: NuitEvent[];
}

export function MaNuit({ dureeTotale, heuresSommeil, efficacite, evenements }: MaNuitProps) {
  const heures = ['21h', '22h', '23h', '0h', '1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h'];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'masque_off':
        return '🎭';
      case 'alarme':
        return '⚠️';
      case 'fuite':
        return '💨';
      case 'endormissement':
        return '😴';
      default:
        return '•';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'masque_off':
        return 'bg-[#f59e0b]';
      case 'alarme':
        return 'bg-[#ef4444]';
      case 'fuite':
        return 'bg-[#06b6d4]';
      case 'endormissement':
        return 'bg-[#8b5cf6]';
      default:
        return 'bg-[#64748b]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </div>
        <div>
          <h3 className="text-[21px] font-semibold text-[#1a2b3c]">Ma Nuit</h3>
          <p className="text-[13px] text-[#64748b]">Analyse détaillée de votre dernière nuit</p>
        </div>
      </div>

      {/* Timeline 21h - 9h */}
      <div className="mb-8">
        <div className="relative">
          {/* Barre de progression */}
          <div className="h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(dureeTotale / 12) * 100}%` }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] rounded-full"
            />
          </div>

          {/* Événements sur la timeline */}
          <div className="relative h-16 mt-2">
            {evenements.map((event, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="absolute"
                style={{ left: `${(event.heure / 12) * 100}%` }}
              >
                <div className="relative -translate-x-1/2 group cursor-pointer">
                  <div className={`w-8 h-8 ${getEventColor(event.type)} rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}>
                    <span className="text-[14px]">{getEventIcon(event.type)}</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a2b3c] text-white text-[12px] px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {event.label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a2b3c]" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Marqueurs heures */}
          <div className="flex justify-between mt-2">
            {heures.map((h, i) => (
              <div key={i} className="text-[11px] text-[#94a3b8] text-center" style={{ width: `${100 / 12}%` }}>
                {i % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#f8fafc] rounded-xl p-4 text-center">
          <div className="text-[13px] text-[#64748b] mb-1">Durée de port</div>
          <div className="text-[28px] font-semibold text-[#1a2b3c]">{dureeTotale}h</div>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-4 text-center">
          <div className="text-[13px] text-[#64748b] mb-1">Sommeil estimé</div>
          <div className="text-[28px] font-semibold text-[#1a2b3c]">{heuresSommeil}h</div>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-4 text-center">
          <div className="text-[13px] text-[#64748b] mb-1">Efficacité</div>
          <div className="text-[28px] font-semibold text-[#10b981]">{efficacite}%</div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-6 pt-6 border-t border-[#e2e8f0]">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">🎭</span>
            <span className="text-[#64748b]">Masque retiré</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px]">⚠️</span>
            <span className="text-[#64748b]">Alarme machine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px]">💨</span>
            <span className="text-[#64748b]">Fuite détectée</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px]">😴</span>
            <span className="text-[#64748b]">Endormissement</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
