import { motion } from 'motion/react';

interface ScoreGlobalProps {
  score: number;
  criteres: {
    heures: { value: number; max: number; status: 'good' | 'warning' | 'bad' };
    fuites: { value: number; max: number; status: 'good' | 'warning' | 'bad' };
    iah: { value: number; max: number; status: 'good' | 'warning' | 'bad' };
    confort: { value: number; max: number; status: 'good' | 'warning' | 'bad' };
  };
  message: string;
}

export function ScoreGlobal({ score, criteres, message }: ScoreGlobalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-[#10b981] to-[#34d399]';
    if (score >= 60) return 'from-[#f59e0b] to-[#fbbf24]';
    return 'from-[#ef4444] to-[#f87171]';
  };

  const getStatusColor = (status: string) => {
    if (status === 'good') return 'bg-[#10b981]';
    if (status === 'warning') return 'bg-[#f59e0b]';
    return 'bg-[#ef4444]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-2xl"
    >
      {/* Score Principal */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[14px] text-[#64748b] mb-2">Score de la nuit</div>
          <div className="flex items-baseline gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className={`text-[72px] font-semibold bg-gradient-to-br ${getScoreColor(score)} bg-clip-text text-transparent leading-none`}
            >
              {score}
            </motion.div>
            <div className="text-[32px] text-[#cbd5e1]">/100</div>
          </div>
        </div>
        
        {/* Thermomètre visuel */}
        <div className="relative w-24 h-48 bg-[#f1f5f9] rounded-full overflow-hidden">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${score}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`absolute bottom-0 w-full bg-gradient-to-t ${getScoreColor(score)} rounded-full`}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[20px] font-semibold text-[#1a2b3c] z-10">
              {score >= 80 ? '😊' : score >= 60 ? '😐' : '😔'}
            </div>
          </div>
        </div>
      </div>

      {/* Message Dynamique */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-[#dbeafe] to-[#e0e7ff] rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-[#3b82f6] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[15px] text-[#1a2b3c] leading-relaxed">{message}</p>
        </div>
      </motion.div>

      {/* 4 Critères */}
      <div className="grid grid-cols-2 gap-4">
        {/* Heures de port */}
        <div className="bg-[#f8fafc] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] text-[#64748b]">Heures de port</div>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(criteres.heures.status)}`} />
          </div>
          <div className="text-[24px] font-semibold text-[#1a2b3c]">
            {criteres.heures.value}h <span className="text-[14px] text-[#94a3b8]">/ {criteres.heures.max}h</span>
          </div>
        </div>

        {/* Fuites */}
        <div className="bg-[#f8fafc] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] text-[#64748b]">Fuites</div>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(criteres.fuites.status)}`} />
          </div>
          <div className="text-[24px] font-semibold text-[#1a2b3c]">
            {criteres.fuites.value} <span className="text-[14px] text-[#94a3b8]">L/min</span>
          </div>
        </div>

        {/* IAH résiduel */}
        <div className="bg-[#f8fafc] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] text-[#64748b]">IAH résiduel</div>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(criteres.iah.status)}`} />
          </div>
          <div className="text-[24px] font-semibold text-[#1a2b3c]">
            {criteres.iah.value} <span className="text-[14px] text-[#94a3b8]">événements/h</span>
          </div>
        </div>

        {/* Confort */}
        <div className="bg-[#f8fafc] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] text-[#64748b]">Confort</div>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(criteres.confort.status)}`} />
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-5 h-5 ${star <= criteres.confort.value ? 'text-[#fbbf24]' : 'text-[#e2e8f0]'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
