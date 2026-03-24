import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Que signifie IAH ?',
    options: [
      "Index d'Apnee-Hypopnee",
      "Indicateur d'Aide Hospitaliere",
      "Index d'Analyse Hemodynamique",
      "Indicateur d'Apnee Horaire",
    ],
    correctIndex: 0,
    explanation:
      "L'IAH (Index d'Apnee-Hypopnee) mesure le nombre d'apnees et d'hypopnees par heure de sommeil. Un IAH normal est inferieur a 5.",
  },
  {
    id: 2,
    question: 'Pourquoi faut-il porter le masque au moins 4 heures par nuit ?',
    options: [
      'Pour eviter de casser la machine',
      "C'est le seuil de remboursement par la securite sociale",
      'Le traitement ne fonctionne pas en dessous',
      'Pour habituer le visage au masque',
    ],
    correctIndex: 1,
    explanation:
      "4 heures par nuit est le seuil minimum exige par l'assurance maladie pour maintenir le remboursement de votre traitement PPC. Cependant, porter le masque plus longtemps ameliore l'efficacite du traitement.",
  },
  {
    id: 3,
    question: 'Que faire si le masque vous gene ?',
    options: [
      'Arreter le traitement',
      'Serrer davantage les sangles',
      'Contacter votre prestataire pour un ajustement',
      'Dormir sans masque quelques jours',
    ],
    correctIndex: 2,
    explanation:
      "Si le masque est inconfortable, contactez votre prestataire. Il pourra ajuster le masque, en essayer un autre modele ou regler la pression. N'arretez jamais le traitement sans avis medical.",
  },
  {
    id: 4,
    question: "Qu'est-ce que la PPC ?",
    options: [
      'Pression Pulmonaire Continue',
      'Pression Positive Continue',
      'Pompe a Pression Cardiaque',
      'Protection Pneumologique Complete',
    ],
    correctIndex: 1,
    explanation:
      'La PPC (Pression Positive Continue) envoie un flux d\'air continu dans vos voies aeriennes pour les maintenir ouvertes pendant le sommeil, empechant ainsi les apnees.',
  },
  {
    id: 5,
    question: "Quel est l'effet principal de l'apnee du sommeil non traitee ?",
    options: [
      'Perte de poids',
      'Amelioration de la memoire',
      'Somnolence diurne et fatigue chronique',
      'Amelioration du sommeil',
    ],
    correctIndex: 2,
    explanation:
      "L'apnee du sommeil non traitee provoque une somnolence diurne excessive, de la fatigue chronique, et augmente les risques cardiovasculaires, d'AVC et d'accidents de la route.",
  },
  {
    id: 6,
    question: "A quelle frequence faut-il nettoyer le masque ?",
    options: [
      'Une fois par mois',
      'Tous les jours',
      'Une fois par semaine',
      'Jamais',
    ],
    correctIndex: 1,
    explanation:
      "Le masque doit etre nettoye quotidiennement a l'eau tiede savonneuse pour eviter les irritations cutanees et l'accumulation de bacteries. Le circuit et l'humidificateur doivent etre nettoyes chaque semaine.",
  },
  {
    id: 7,
    question: 'Que mesure le taux de fuite de votre machine ?',
    options: [
      "La quantite d'air qui s'echappe du masque",
      "La pression de l'air dans vos poumons",
      "Le nombre d'apnees par heure",
      "Le taux d'oxygene dans le sang",
    ],
    correctIndex: 0,
    explanation:
      "Le taux de fuite mesure la quantite d'air qui s'echappe entre le masque et votre visage. Des fuites excessives reduisent l'efficacite du traitement. Un bon ajustement du masque est essentiel.",
  },
  {
    id: 8,
    question: "Quel est le seuil d'IAH pour diagnostiquer une apnee du sommeil ?",
    options: [
      'IAH > 1',
      'IAH > 5',
      'IAH > 15',
      'IAH > 30',
    ],
    correctIndex: 1,
    explanation:
      "Un IAH superieur a 5 par heure est generalement considere comme anormal. L'apnee est legere entre 5 et 15, moderee entre 15 et 30, et severe au-dessus de 30.",
  },
];

interface HealthQuizProps {
  /** Callback when quiz is completed */
  onComplete?: (score: number, total: number) => void;
}

export function HealthQuiz({ onComplete }: HealthQuizProps) {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const question = QUESTIONS[currentQ];
  const totalQuestions = QUESTIONS.length;

  const handleAnswer = useCallback(
    (index: number) => {
      if (showExplanation) return;
      setSelectedAnswer(index);
      setShowExplanation(true);
      if (index === question.correctIndex) {
        setCorrectCount((c) => c + 1);
      }
      setAnswers((prev) => [...prev, index]);
    },
    [showExplanation, question]
  );

  const handleNext = useCallback(() => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
      const finalScore = selectedAnswer === question.correctIndex ? correctCount : correctCount;
      onComplete?.(finalScore, totalQuestions);
    }
  }, [currentQ, totalQuestions, correctCount, selectedAnswer, question, onComplete]);

  const handleRestart = useCallback(() => {
    setStarted(true);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCorrectCount(0);
    setFinished(false);
    setAnswers([]);
  }, []);

  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  // Start screen
  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#5856D6] to-[#AF52DE] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] mb-3">Quiz Sante</h2>
          <p className="text-[#86868B] mb-2">
            Testez vos connaissances sur l'apnee du sommeil et le traitement PPC
          </p>
          <p className="text-sm text-[#86868B] mb-8">
            {totalQuestions} questions — Reponses expliquees
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStarted(true)}
            className="px-8 py-4 bg-gradient-to-r from-[#5856D6] to-[#AF52DE] text-white rounded-full font-semibold text-lg shadow-lg shadow-[#5856D6]/30"
          >
            Commencer le quiz
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Results screen
  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-sm"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="text-6xl mb-4"
          >
            {scorePercent >= 80 ? '🎉' : scorePercent >= 50 ? '👏' : '💪'}
          </motion.div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] mb-2">Quiz termine !</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className={`text-5xl font-bold ${
                scorePercent >= 80
                  ? 'text-[#34C759]'
                  : scorePercent >= 50
                  ? 'text-[#FF9500]'
                  : 'text-[#FF3B30]'
              }`}
            >
              {correctCount}
            </span>
            <span className="text-2xl text-[#86868B]">/ {totalQuestions}</span>
          </div>
          <p className="text-[#86868B]">
            {scorePercent >= 80
              ? 'Excellent ! Vous maitrisez bien votre traitement.'
              : scorePercent >= 50
              ? 'Bien joue ! Revisez les explications pour progresser.'
              : 'Continuez a apprendre, chaque reponse compte !'}
          </p>
        </div>

        {/* Recap */}
        <div className="space-y-3 mb-8">
          {QUESTIONS.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.correctIndex;
            return (
              <div
                key={q.id}
                className={`rounded-xl p-4 border ${
                  isCorrect ? 'bg-[#E8F5E9] border-[#34C759]/30' : 'bg-[#FFF3E0] border-[#FF9500]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{isCorrect ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1D1D1F] mb-1">{q.question}</p>
                    {!isCorrect && (
                      <p className="text-xs text-[#86868B]">
                        Bonne reponse : {q.options[q.correctIndex]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRestart}
            className="flex-1 py-3 bg-gradient-to-r from-[#5856D6] to-[#AF52DE] text-white rounded-2xl font-semibold"
          >
            Recommencer
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Question screen
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 shadow-sm"
    >
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[#86868B]">
          Question {currentQ + 1} / {totalQuestions}
        </span>
        <span className="text-sm font-medium text-[#007AFF]">
          {correctCount} bonne{correctCount > 1 ? 's' : ''} reponse{correctCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden mb-8">
        <motion.div
          animate={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }}
          className="h-full bg-gradient-to-r from-[#5856D6] to-[#AF52DE] rounded-full"
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-[#1D1D1F] mb-6">{question.question}</h3>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              let style = 'bg-[#F5F5F7] border-transparent hover:bg-[#E5E5EA]';
              if (showExplanation) {
                if (index === question.correctIndex) {
                  style = 'bg-[#E8F5E9] border-[#34C759] text-[#1D1D1F]';
                } else if (index === selectedAnswer && index !== question.correctIndex) {
                  style = 'bg-[#FFEBEE] border-[#FF3B30] text-[#1D1D1F]';
                } else {
                  style = 'bg-[#F5F5F7] border-transparent opacity-50';
                }
              }
              return (
                <motion.button
                  key={index}
                  whileHover={!showExplanation ? { scale: 1.01 } : {}}
                  whileTap={!showExplanation ? { scale: 0.99 } : {}}
                  onClick={() => handleAnswer(index)}
                  disabled={showExplanation}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-sm font-semibold text-[#86868B] flex-shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-[15px]">{option}</span>
                    {showExplanation && index === question.correctIndex && (
                      <svg className="w-5 h-5 text-[#34C759] ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {showExplanation && index === selectedAnswer && index !== question.correctIndex && (
                      <svg className="w-5 h-5 text-[#FF3B30] ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#E3F2FD] to-[#BBDEFB] rounded-2xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-[#1D1D1F] leading-relaxed">{question.explanation}</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="w-full py-4 bg-gradient-to-r from-[#5856D6] to-[#AF52DE] text-white rounded-2xl font-semibold shadow-lg shadow-[#5856D6]/20"
                >
                  {currentQ < totalQuestions - 1 ? 'Question suivante' : 'Voir mes resultats'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
