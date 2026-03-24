import { motion } from 'motion/react';
import { Sparkles, TrendingUp, Heart, Award } from 'lucide-react';

interface MotivationalMessageProps {
  score: number;
  streak?: number;
  improvement?: number;
}

export function MotivationalMessage({ score, streak = 0, improvement = 0 }: MotivationalMessageProps) {
  const getMessage = () => {
    if (score >= 90) {
      return {
        icon: <Award className="w-6 h-6" />,
        title: 'Performance exceptionnelle !',
        message: 'Vous êtes sur la bonne voie. Continuez ainsi, votre corps vous en remercie.',
        gradient: 'from-[#34C759] to-[#30D158]',
      };
    }
    if (score >= 80) {
      return {
        icon: <Sparkles className="w-6 h-6" />,
        title: 'Excellente nuit !',
        message: 'Votre traitement est bien suivi. Vous progressez de jour en jour.',
        gradient: 'from-[#007AFF] to-[#5AC8FA]',
      };
    }
    if (score >= 60) {
      return {
        icon: <TrendingUp className="w-6 h-6" />,
        title: 'Bon travail !',
        message: 'Vous êtes dans la bonne direction. Quelques ajustements peuvent encore améliorer votre sommeil.',
        gradient: 'from-[#FF9500] to-[#FFD60A]',
      };
    }
    return {
      icon: <Heart className="w-6 h-6" />,
      title: 'Ensemble, on progresse',
      message: "Ne vous découragez pas. Chaque nuit compte. Contactez-nous si vous avez besoin d'aide.",
      gradient: 'from-[#AF52DE] to-[#FF2D55]',
    };
  };

  const data = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`bg-gradient-to-r ${data.gradient} rounded-3xl p-6 text-white shadow-lg`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          {data.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl mb-2">{data.title}</h3>
          <p className="text-sm opacity-90 leading-relaxed mb-4">{data.message}</p>
          
          {/* Stats badges */}
          <div className="flex flex-wrap gap-2">
            {streak > 0 && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm">
                🔥 {streak} jours consécutifs
              </div>
            )}
            {improvement > 0 && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm">
                📈 +{improvement}% vs semaine dernière
              </div>
            )}
            {score >= 90 && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm">
                ⭐ Performance optimale
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
