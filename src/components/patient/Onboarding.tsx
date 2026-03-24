import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const ONBOARDING_KEY = 'medconnect_onboarding_done';

const screens = [
  {
    id: 1,
    title: "Vous n'êtes pas seul.",
    subtitle: "L'apnée du sommeil touche 3 millions de Français.",
    description:
      "Le traitement par PPC est efficace et améliore considérablement la qualité de vie. Nous sommes là pour vous accompagner.",
    visual: (
      <div className="relative w-48 h-48 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/20 to-[#5AC8FA]/20 rounded-full animate-pulse" />
        <div className="absolute inset-4 bg-gradient-to-br from-[#007AFF]/30 to-[#5AC8FA]/30 rounded-full" />
        <div className="absolute inset-8 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1 rounded-full shadow-sm">
          <span className="text-sm font-medium text-[#007AFF]">3 000 000</span>
        </div>
      </div>
    ),
    gradient: 'from-[#E3F2FD] to-[#F5F5F7]',
  },
  {
    id: 2,
    title: 'Votre machine PPC',
    subtitle: 'Elle améliore votre respiration la nuit.',
    description:
      "La Pression Positive Continue maintient vos voies aériennes ouvertes pendant le sommeil, réduisant les apnées et améliorant votre repos.",
    visual: (
      <div className="relative w-56 h-44 mx-auto mb-8">
        {/* PPC Machine illustration */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-28 bg-gradient-to-br from-[#E8E8ED] to-[#D1D1D6] rounded-2xl shadow-lg flex items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        {/* Tube */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-4 right-4 w-24 h-2 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] rounded-full origin-left rotate-[-30deg]"
        />
        {/* Mask */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#5AC8FA] to-[#007AFF] rounded-xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        {/* Air flow animation */}
        <motion.div
          animate={{ x: [0, 60], opacity: [1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-8 left-[45%] flex gap-1"
        >
          <div className="w-2 h-2 bg-[#5AC8FA] rounded-full" />
          <div className="w-2 h-2 bg-[#5AC8FA]/70 rounded-full" />
          <div className="w-2 h-2 bg-[#5AC8FA]/40 rounded-full" />
        </motion.div>
      </div>
    ),
    gradient: 'from-[#E8F5E9] to-[#F5F5F7]',
  },
  {
    id: 3,
    title: 'Votre tableau de bord',
    subtitle: 'Score, coaching et suivi au quotidien.',
    description:
      "Visualisez vos progrès, recevez des conseils personnalisés et débloquez des badges motivants.",
    visual: (
      <div className="relative w-64 h-44 mx-auto mb-8">
        {/* Dashboard preview card */}
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          {/* Score preview */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">85</span>
            </div>
            <div>
              <div className="text-xs text-[#86868B]">Score global</div>
              <div className="text-sm font-semibold text-[#1D1D1F]">Excellent</div>
            </div>
          </div>
          {/* Mini chart */}
          <div className="flex items-end gap-1 h-12 mb-3">
            {[60, 75, 80, 70, 85, 90, 85].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-[#007AFF] to-[#5AC8FA] rounded-sm"
              />
            ))}
          </div>
          {/* Badges preview */}
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-[#FFF3E0] rounded-lg flex items-center justify-center text-sm">🌟</div>
            <div className="w-8 h-8 bg-[#E8F5E9] rounded-lg flex items-center justify-center text-sm">🏆</div>
            <div className="w-8 h-8 bg-[#F3E5F5] rounded-lg flex items-center justify-center text-sm">🎯</div>
            <div className="w-8 h-8 bg-[#E3F2FD] rounded-lg flex items-center justify-center text-sm">💪</div>
          </div>
        </div>
      </div>
    ),
    gradient: 'from-[#F3E5F5] to-[#F5F5F7]',
  },
  {
    id: 4,
    title: 'A vous de jouer !',
    subtitle: 'Chaque nuit compte.',
    description:
      "Suivez votre traitement, gagnez des badges et voyez votre fleur de bien-être s'épanouir jour après jour.",
    visual: (
      <div className="relative w-48 h-48 mx-auto mb-8">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-br from-[#FF9500]/20 to-[#FFD60A]/20 rounded-full"
        />
        <div className="absolute inset-4 bg-gradient-to-br from-[#FF9500]/30 to-[#FFD60A]/30 rounded-full" />
        <div className="absolute inset-8 bg-gradient-to-br from-[#FF9500] to-[#FFD60A] rounded-full flex items-center justify-center">
          <span className="text-5xl">🚀</span>
        </div>
      </div>
    ),
    gradient: 'from-[#FFF3E0] to-[#F5F5F7]',
    isFinal: true,
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    if (currentScreen < screens.length - 1) {
      setDirection(1);
      setCurrentScreen((s) => s + 1);
    }
  }, [currentScreen]);

  const goPrev = useCallback(() => {
    if (currentScreen > 0) {
      setDirection(-1);
      setCurrentScreen((s) => s - 1);
    }
  }, [currentScreen]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const screen = screens[currentScreen];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-b ${screen.gradient} flex flex-col`}>
      {/* Skip button */}
      {!screen.isFinal && (
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleComplete}
            className="text-sm text-[#86868B] hover:text-[#1D1D1F] transition-colors px-4 py-2"
          >
            Passer
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={screen.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="max-w-md w-full text-center"
          >
            {screen.visual}
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-3">{screen.title}</h1>
            <p className="text-lg text-[#007AFF] font-medium mb-4">{screen.subtitle}</p>
            <p className="text-[#86868B] leading-relaxed">{screen.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-12 pt-4">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {screens.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                width: index === currentScreen ? 24 : 8,
                backgroundColor: index === currentScreen ? '#007AFF' : '#D1D1D6',
              }}
              transition={{ duration: 0.3 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={goPrev}
            disabled={currentScreen === 0}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
              currentScreen === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-[#007AFF] hover:bg-[#007AFF]/10'
            }`}
          >
            Précédent
          </button>

          {screen.isFinal ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className="px-8 py-4 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white rounded-full font-semibold text-lg shadow-lg shadow-[#007AFF]/30 hover:shadow-xl transition-shadow"
            >
              Commencer mon suivi
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goNext}
              className="px-8 py-3 bg-[#007AFF] text-white rounded-full font-medium shadow-lg shadow-[#007AFF]/20 hover:shadow-xl transition-shadow"
            >
              Suivant
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Check if onboarding has been completed */
export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/** Reset onboarding (for testing) */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
