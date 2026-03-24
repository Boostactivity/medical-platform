import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const DAILY_RATING_KEY = 'medconnect_daily_rating';

interface RatingEntry {
  date: string;
  stars: number;
  feeling: string;
}

const feelings = [
  { id: 'bien-repose', label: 'Bien repose', emoji: '😊', color: 'from-[#34C759] to-[#30D158]' },
  { id: 'fatigue', label: 'Fatigue', emoji: '😴', color: 'from-[#FF9500] to-[#FFD60A]' },
  { id: 'masque-genant', label: 'Masque genant', emoji: '😣', color: 'from-[#FF3B30] to-[#FF6961]' },
  { id: 'bien-sans-masque', label: 'Bien dormi sans masque', emoji: '😌', color: 'from-[#5AC8FA] to-[#007AFF]' },
];

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getRatings(): RatingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(DAILY_RATING_KEY) || '[]');
  } catch {
    return [];
  }
}

function hasRatedToday(): boolean {
  const today = getTodayKey();
  return getRatings().some((r) => r.date === today);
}

function saveRating(entry: RatingEntry): void {
  const ratings = getRatings().filter((r) => r.date !== entry.date);
  ratings.push(entry);
  // Keep last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = ratings.filter((r) => new Date(r.date) >= cutoff);
  localStorage.setItem(DAILY_RATING_KEY, JSON.stringify(filtered));
}

interface DailyRatingProps {
  onSubmit?: (entry: RatingEntry) => void;
}

export function DailyRating({ onSubmit }: DailyRatingProps) {
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!hasRatedToday()) {
      // Show after a short delay for smooth entrance
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (stars === 0 || !selectedFeeling) return;
    const entry: RatingEntry = {
      date: getTodayKey(),
      stars,
      feeling: selectedFeeling,
    };
    saveRating(entry);
    setSubmitted(true);
    onSubmit?.(entry);
    setTimeout(() => setVisible(false), 2000);
  }, [stars, selectedFeeling, onSubmit]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
          >
            {submitted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="text-center py-6"
              >
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">Merci !</h3>
                <p className="text-[#86868B]">Votre ressenti a ete enregistre.</p>
              </motion.div>
            ) : (
              <>
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Title */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">🌅</div>
                  <h3 className="text-xl font-semibold text-[#1D1D1F] mb-1">
                    Bonjour !
                  </h3>
                  <p className="text-[#86868B]">
                    Comment vous êtes-vous senti ce matin ?
                  </p>
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setStars(star)}
                      className="focus:outline-none"
                    >
                      <svg
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredStar || stars)
                            ? 'text-[#FFD60A]'
                            : 'text-[#E5E5EA]'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </motion.button>
                  ))}
                </div>

                {/* Feelings */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {feelings.map((feeling) => (
                    <motion.button
                      key={feeling.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedFeeling(feeling.id)}
                      className={`p-3 rounded-2xl border-2 transition-all text-left ${
                        selectedFeeling === feeling.id
                          ? 'border-[#007AFF] bg-[#007AFF]/5 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">{feeling.emoji}</div>
                      <div className="text-sm font-medium text-[#1D1D1F]">{feeling.label}</div>
                    </motion.button>
                  ))}
                </div>

                {/* Submit */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={stars === 0 || !selectedFeeling}
                  className={`w-full py-4 rounded-2xl font-semibold text-white transition-all ${
                    stars > 0 && selectedFeeling
                      ? 'bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] shadow-lg shadow-[#007AFF]/20'
                      : 'bg-[#D1D1D6] cursor-not-allowed'
                  }`}
                >
                  Enregistrer
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Export utility to get all stored ratings */
export function getDailyRatings(): RatingEntry[] {
  return getRatings();
}
