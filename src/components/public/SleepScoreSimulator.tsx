/**
 * SIMULATEUR DE SCORE SOMMEIL PUBLIC
 *
 * Accessible sans connexion. Questionnaire de risque d'apnee du sommeil.
 * Score : faible / modere / eleve. CTA vers specialiste si risque eleve.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Moon, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, Activity,
  Phone, RotateCcw, Shield, Brain, Heart, Stethoscope
} from 'lucide-react';

// ---- Types ----

interface Question {
  id: string;
  question: string;
  description: string;
  icon: typeof Moon;
  options: { label: string; value: number; description?: string }[];
}

type RiskLevel = 'faible' | 'modere' | 'eleve';

// ---- Questions ----

const QUESTIONS: Question[] = [
  {
    id: 'ronflements',
    question: 'Ronflez-vous ?',
    description: 'Les ronflements sont souvent le premier signe d\'apnee du sommeil.',
    icon: Moon,
    options: [
      { label: 'Jamais', value: 0 },
      { label: 'Parfois', value: 1, description: 'Quelques fois par semaine' },
      { label: 'Souvent', value: 2, description: 'Presque toutes les nuits' },
      { label: 'Tres fort / Mon entourage se plaint', value: 3, description: 'Ronflements sonores, audibles depuis une autre piece' },
    ],
  },
  {
    id: 'fatigue',
    question: 'Ressentez-vous de la fatigue en journee ?',
    description: 'La somnolence diurne excessive est un symptome majeur.',
    icon: Brain,
    options: [
      { label: 'Rarement', value: 0, description: 'Je me sens repose au reveil' },
      { label: 'Parfois', value: 1, description: 'De temps en temps dans la journee' },
      { label: 'Souvent', value: 2, description: 'Presque tous les jours' },
      { label: 'Tout le temps / Je m\'endors involontairement', value: 3, description: 'Somnolence au volant, au travail...' },
    ],
  },
  {
    id: 'tour_cou',
    question: 'Quel est votre tour de cou ?',
    description: 'Un tour de cou eleve est un facteur de risque important.',
    icon: Activity,
    options: [
      { label: 'Moins de 37 cm', value: 0 },
      { label: '37 - 40 cm', value: 1 },
      { label: '40 - 43 cm', value: 2 },
      { label: 'Plus de 43 cm', value: 3 },
    ],
  },
  {
    id: 'imc',
    question: 'Quel est votre IMC approximatif ?',
    description: 'IMC = Poids (kg) / Taille (m) au carre. Ex: 80kg pour 1m75 = 26.1',
    icon: Heart,
    options: [
      { label: 'Moins de 25 (poids normal)', value: 0 },
      { label: '25 - 30 (surpoids)', value: 1 },
      { label: '30 - 35 (obesite moderee)', value: 2 },
      { label: 'Plus de 35 (obesite severe)', value: 3 },
    ],
  },
  {
    id: 'age',
    question: 'Quel est votre age ?',
    description: 'Le risque d\'apnee du sommeil augmente avec l\'age.',
    icon: Shield,
    options: [
      { label: 'Moins de 30 ans', value: 0 },
      { label: '30 - 50 ans', value: 1 },
      { label: '50 - 65 ans', value: 2 },
      { label: 'Plus de 65 ans', value: 3 },
    ],
  },
  {
    id: 'pauses',
    question: 'A-t-on observe des pauses dans votre respiration la nuit ?',
    description: 'Les pauses respiratoires (apnees) sont le signe le plus specifique.',
    icon: Stethoscope,
    options: [
      { label: 'Non / Je ne sais pas', value: 0 },
      { label: 'Rarement signale', value: 1 },
      { label: 'Regulierement signale', value: 2 },
      { label: 'Tres frequemment / Avec sensation d\'etouffement', value: 3 },
    ],
  },
];

// ---- Calcul du score ----

function computeRisk(answers: Record<string, number>): { score: number; level: RiskLevel; percentage: number } {
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  const maxScore = QUESTIONS.length * 3;
  const percentage = Math.round((total / maxScore) * 100);

  let level: RiskLevel;
  if (total <= 5) level = 'faible';
  else if (total <= 11) level = 'modere';
  else level = 'eleve';

  return { score: total, level, percentage };
}

// ---- Composant Principal ----

export function SleepScoreSimulator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const progress = ((currentStep) / QUESTIONS.length) * 100;

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setShowResult(false);
  };

  const result = showResult ? computeRisk(answers) : null;

  const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string; icon: typeof CheckCircle; title: string; description: string }> = {
    faible: {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle,
      title: 'Risque faible',
      description: 'Vos reponses ne suggerent pas de risque significatif d\'apnee du sommeil. Continuez a maintenir une bonne hygiene de sommeil.',
    },
    modere: {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: AlertTriangle,
      title: 'Risque modere',
      description: 'Certains de vos symptomes meritent attention. Nous vous recommandons d\'en parler a votre medecin traitant lors de votre prochaine consultation.',
    },
    eleve: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      title: 'Risque eleve',
      description: 'Vos reponses suggerent un risque important d\'apnee du sommeil. Nous vous recommandons vivement de consulter un specialiste du sommeil rapidement.',
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-1.5 mb-4">
          <Moon className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700 font-medium">Simulateur gratuit</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Evaluez votre risque d'apnee du sommeil
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Repondez a 6 questions rapides pour obtenir une estimation de votre risque. Ce simulateur ne remplace pas un diagnostic medical.
        </p>
      </motion.div>

      {!showResult ? (
        <>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Question {currentStep + 1} sur {QUESTIONS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full h-2"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <currentQuestion.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{currentQuestion.question}</h2>
                  <p className="text-sm text-gray-500">{currentQuestion.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-blue-400 hover:bg-blue-50 ${
                      answers[currentQuestion.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Precedent
                </button>
                <span className="text-sm text-gray-400">
                  Selectionnez une reponse pour continuer
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      ) : result && (
        /* Result */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`${riskConfig[result.level].bg} border ${riskConfig[result.level].border} rounded-2xl p-6 md:p-8 mb-6`}>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                result.level === 'faible' ? 'bg-green-200' :
                result.level === 'modere' ? 'bg-orange-200' : 'bg-red-200'
              }`}>
                {(() => {
                  const Icon = riskConfig[result.level].icon;
                  return <Icon className={`w-8 h-8 ${riskConfig[result.level].color}`} />;
                })()}
              </div>
              <h2 className={`text-2xl font-bold ${riskConfig[result.level].color} mb-2`}>
                {riskConfig[result.level].title}
              </h2>
              <p className="text-gray-600 max-w-lg mx-auto">
                {riskConfig[result.level].description}
              </p>
            </div>

            {/* Score gauge */}
            <div className="max-w-md mx-auto mb-6">
              <div className="flex items-center justify-between text-xs font-medium mb-1">
                <span className="text-green-600">Faible</span>
                <span className="text-orange-600">Modere</span>
                <span className="text-red-600">Eleve</span>
              </div>
              <div className="w-full bg-gradient-to-r from-green-300 via-orange-300 to-red-400 rounded-full h-4 relative">
                <motion.div
                  initial={{ left: '0%' }}
                  animate={{ left: `${result.percentage}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-gray-800 rounded-full shadow-lg"
                />
              </div>
              <p className="text-center mt-2 text-sm text-gray-500">
                Score : {result.score} / {QUESTIONS.length * 3}
              </p>
            </div>

            {/* Recap answers */}
            <div className="bg-white/70 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Recapitulatif de vos reponses</h3>
              <div className="space-y-2">
                {QUESTIONS.map(q => {
                  const answerValue = answers[q.id];
                  const answerOption = q.options.find(o => o.value === answerValue);
                  return (
                    <div key={q.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{q.question}</span>
                      <span className={`font-medium ${
                        answerValue === 0 ? 'text-green-600' :
                        answerValue === 1 ? 'text-yellow-600' :
                        answerValue === 2 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {answerOption?.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA */}
          {result.level === 'eleve' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 text-center mb-6"
            >
              <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-80" />
              <h3 className="text-xl font-bold mb-2">Consultez un specialiste du sommeil</h3>
              <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                Votre score suggere un risque eleve d'apnee du sommeil. Un diagnostic precoce permet une prise en charge efficace et remboursee a 100%.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Phone className="w-4 h-4" /> Prendre rendez-vous
                </Link>
                <Link
                  to="/parcours-diagnostic"
                  className="inline-flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors"
                >
                  En savoir plus <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}

          {result.level === 'modere' && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center mb-6">
              <p className="text-orange-800 font-medium mb-3">
                Parlez de ces symptomes a votre medecin traitant
              </p>
              <Link
                to="/apnee-sommeil"
                className="inline-flex items-center gap-2 text-orange-700 font-semibold hover:text-orange-900 transition-colors"
              >
                En savoir plus sur l'apnee du sommeil <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">
              Ce simulateur est fourni a titre informatif uniquement et ne constitue pas un diagnostic medical.
              Seul un medecin peut diagnostiquer l'apnee du sommeil a l'aide d'examens specifiques (polygraphie, polysomnographie).
            </p>
          </div>

          {/* Reset */}
          <div className="text-center mt-6">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Refaire le test
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
