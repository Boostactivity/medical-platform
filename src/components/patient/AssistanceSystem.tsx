/**
 * SYSTEME D'ASSISTANCE PATIENT
 * Arbre de decision pour les problemes PPC
 * Suivi de tickets (ouvert / en cours / resolu)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LifeBuoy,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Phone,
  Video,
  Send,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Wrench,
  Volume2,
  Wind,
  HelpCircle,
  X,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type ProblemType = 'mask_discomfort' | 'suffocation' | 'noise' | 'breakdown' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'resolved';

interface Ticket {
  id: string;
  problem_type: ProblemType;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface DecisionStep {
  title: string;
  description: string;
  options: {
    label: string;
    action: 'video' | 'contact_tech' | 'contact_urgence' | 'form' | 'resolved';
    videoId?: string;
  }[];
}

// ============================================
// DONNEES
// ============================================

const PROBLEMS: {
  type: ProblemType;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}[] = [
  {
    type: 'mask_discomfort',
    icon: <Wind className="w-6 h-6" />,
    label: 'Gene avec le masque',
    description: 'Inconfort, marques, fuites',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  },
  {
    type: 'suffocation',
    icon: <AlertTriangle className="w-6 h-6" />,
    label: 'Sensation d\'etouffement',
    description: 'Difficulte a respirer, oppression',
    color: 'text-red-500',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-400',
  },
  {
    type: 'noise',
    icon: <Volume2 className="w-6 h-6" />,
    label: 'Bruit de la machine',
    description: 'Bruit anormal, vibrations',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  },
  {
    type: 'breakdown',
    icon: <Wrench className="w-6 h-6" />,
    label: 'Panne ou dysfonctionnement',
    description: 'La machine ne demarre pas, erreur',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-400',
  },
  {
    type: 'other',
    icon: <HelpCircle className="w-6 h-6" />,
    label: 'Autre probleme',
    description: 'Question ou probleme non liste',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  },
];

const DECISION_TREES: Record<ProblemType, DecisionStep[]> = {
  mask_discomfort: [
    {
      title: 'Gene avec le masque',
      description:
        'Un mauvais positionnement est la cause la plus frequente. Visionnez ce tutoriel de 2 minutes.',
      options: [
        {
          label: 'Voir le tutoriel video',
          action: 'video',
          videoId: 'mask-positioning',
        },
        { label: 'J\'ai toujours un probleme', action: 'contact_tech' },
      ],
    },
  ],
  suffocation: [
    {
      title: 'Sensation d\'etouffement',
      description:
        'Cette sensation est frequente au debut du traitement. Essayez d\'abord la rampe de pression progressive.',
      options: [
        {
          label: 'Voir les astuces video',
          action: 'video',
          videoId: 'breathing-tips',
        },
        { label: 'Contacter mon technicien', action: 'contact_tech' },
        { label: 'C\'est urgent', action: 'contact_urgence' },
      ],
    },
  ],
  noise: [
    {
      title: 'Bruit de la machine',
      description:
        'Un bruit anormal peut venir du filtre, du tuyau ou du masque. Verifiez ces elements.',
      options: [
        {
          label: 'Voir le tutoriel nettoyage',
          action: 'video',
          videoId: 'cleaning',
        },
        { label: 'Le bruit persiste', action: 'contact_tech' },
      ],
    },
  ],
  breakdown: [
    {
      title: 'Panne de la machine',
      description:
        'Si votre machine ne fonctionne plus, un technicien peut intervenir rapidement.',
      options: [
        { label: 'Contacter le technicien en urgence', action: 'contact_urgence' },
      ],
    },
  ],
  other: [
    {
      title: 'Autre probleme',
      description:
        'Decrivez votre probleme et nous vous recontacterons dans les meilleurs delais.',
      options: [{ label: 'Remplir le formulaire', action: 'form' }],
    },
  ],
};

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'ticket-1',
    problem_type: 'mask_discomfort',
    description: 'Fuites importantes malgre ajustement du masque',
    status: 'in_progress',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    assigned_to: 'Jean Dupont - Technicien',
  },
  {
    id: 'ticket-2',
    problem_type: 'noise',
    description: 'Bruit de sifflement au niveau du tuyau',
    status: 'resolved',
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    assigned_to: 'Jean Dupont - Technicien',
  },
];

// ============================================
// SOUS-COMPOSANTS
// ============================================

function TicketTracker({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) return null;

  const getStatusInfo = (status: TicketStatus) => {
    const map: Record<
      TicketStatus,
      { icon: React.ReactNode; label: string; color: string }
    > = {
      open: {
        icon: <Circle className="w-4 h-4" />,
        label: 'Ouvert',
        color: 'text-orange-500',
      },
      in_progress: {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: 'En cours',
        color: 'text-blue-500',
      },
      resolved: {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: 'Resolu',
        color: 'text-green-500',
      },
    };
    return map[status];
  };

  const getProblemLabel = (type: ProblemType) => {
    const problem = PROBLEMS.find((p) => p.type === type);
    return problem?.label || type;
  };

  return (
    <div className="mt-8">
      <h4 className="text-[15px] font-semibold text-[#1a2b3c] mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#3b82f6]" />
        Suivi de vos demandes
      </h4>
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const statusInfo = getStatusInfo(ticket.status);
          return (
            <div
              key={ticket.id}
              className="bg-white border border-[#e2e8f0] rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-[#1a2b3c]">
                  {getProblemLabel(ticket.problem_type)}
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium ${statusInfo.color}`}
                >
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-[#86868B] mb-2">
                {ticket.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-[#86868B]">
                <span>
                  Cree le{' '}
                  {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                </span>
                {ticket.assigned_to && (
                  <span>Assigne a {ticket.assigned_to}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideoPlayer({ videoId }: { videoId: string }) {
  const videoMap: Record<string, { title: string; description: string }> = {
    'mask-positioning': {
      title: 'Bien positionner son masque',
      description:
        'Apprenez les gestes essentiels pour ajuster votre masque et eviter les fuites.',
    },
    'breathing-tips': {
      title: 'Respirer naturellement avec la PPC',
      description:
        'Techniques de relaxation et de respiration pour s\'adapter a la pression.',
    },
    cleaning: {
      title: 'Nettoyer sa machine PPC',
      description:
        'Guide complet pour l\'entretien quotidien et hebdomadaire de votre equipement.',
    },
  };

  const video = videoMap[videoId] || {
    title: 'Tutoriel',
    description: 'Visionnez ce tutoriel pour resoudre votre probleme.',
  };

  return (
    <div className="bg-[#f5f5f7] rounded-2xl overflow-hidden">
      {/* Placeholder video embed */}
      <div className="relative bg-gradient-to-br from-[#1a2b3c] to-[#334155] aspect-video flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Video className="w-8 h-8 text-white" />
          </div>
          <p className="text-white text-sm font-medium">{video.title}</p>
          <p className="text-white/60 text-xs mt-1">
            Cliquez pour lire la video
          </p>
        </div>
      </div>
      <div className="p-4">
        <h5 className="text-sm font-semibold text-[#1a2b3c] mb-1">
          {video.title}
        </h5>
        <p className="text-xs text-[#86868B]">{video.description}</p>
      </div>
    </div>
  );
}

function ContactForm({
  problemType,
  onSubmit,
}: {
  problemType: ProblemType;
  onSubmit: (description: string) => void;
}) {
  const [description, setDescription] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1a2b3c] mb-2">
          Decrivez votre probleme
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Expliquez en detail ce qui ne va pas..."
          rows={4}
          className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
        />
      </div>
      <button
        onClick={() => {
          if (description.trim()) onSubmit(description.trim());
        }}
        disabled={!description.trim()}
        className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          description.trim()
            ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb] shadow-md'
            : 'bg-[#e5e5ea] text-[#86868B]'
        }`}
      >
        <Send className="w-4 h-4" />
        Envoyer au prestataire
      </button>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function AssistanceSystem() {
  const [selectedProblem, setSelectedProblem] = useState<ProblemType | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [showVideo, setShowVideo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showContactUrgence, setShowContactUrgence] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [submitted, setSubmitted] = useState(false);

  const resetFlow = () => {
    setSelectedProblem(null);
    setCurrentStep(0);
    setShowVideo(null);
    setShowForm(false);
    setShowContactUrgence(false);
    setSubmitted(false);
  };

  const handleAction = (
    action: string,
    videoId?: string
  ) => {
    switch (action) {
      case 'video':
        setShowVideo(videoId || null);
        break;
      case 'contact_tech':
        setShowForm(true);
        break;
      case 'contact_urgence':
        setShowContactUrgence(true);
        break;
      case 'form':
        setShowForm(true);
        break;
      case 'resolved':
        resetFlow();
        break;
    }
  };

  const handleFormSubmit = (description: string) => {
    const newTicket: Ticket = {
      id: `ticket-${Date.now()}`,
      problem_type: selectedProblem || 'other',
      description,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTickets((prev) => [newTicket, ...prev]);
    setSubmitted(true);
  };

  const currentTree =
    selectedProblem && DECISION_TREES[selectedProblem]
      ? DECISION_TREES[selectedProblem][currentStep]
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#ef4444] to-[#f87171] rounded-xl flex items-center justify-center">
          <LifeBuoy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-[21px] font-semibold text-[#1a2b3c]">
            Assistance
          </h3>
          <p className="text-[13px] text-[#64748b]">
            Un probleme ? Nous vous guidons pas a pas
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ETAPE 1 : Selection du probleme */}
        {!selectedProblem && (
          <motion.div
            key="problem-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Bouton principal */}
            <div className="bg-gradient-to-r from-[#ef4444] to-[#f87171] text-white rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  🆘
                </div>
                <div>
                  <div className="text-[17px] font-semibold mb-1">
                    J'ai un probleme
                  </div>
                  <div className="text-[13px] text-white/80">
                    Choisissez votre situation ci-dessous
                  </div>
                </div>
              </div>
            </div>

            {/* Liste des problemes */}
            <div className="space-y-3">
              {PROBLEMS.map((problem, index) => (
                <motion.button
                  key={problem.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => setSelectedProblem(problem.type)}
                  className={`w-full border rounded-xl p-4 transition-all text-left group ${problem.bgColor}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={problem.color}>{problem.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#1a2b3c] mb-0.5">
                        {problem.label}
                      </div>
                      <div className="text-xs text-[#64748b]">
                        {problem.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#86868B] group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ETAPE 2 : Arbre de decision */}
        {selectedProblem && !showVideo && !showForm && !showContactUrgence && !submitted && currentTree && (
          <motion.div
            key="decision-tree"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <button
              onClick={resetFlow}
              className="flex items-center gap-2 text-sm text-[#3b82f6] mb-4 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <div className="bg-[#f5f5f7] rounded-2xl p-6 mb-6">
              <h4 className="text-[17px] font-semibold text-[#1a2b3c] mb-2">
                {currentTree.title}
              </h4>
              <p className="text-sm text-[#64748b] leading-relaxed">
                {currentTree.description}
              </p>
            </div>

            <div className="space-y-3">
              {currentTree.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handleAction(option.action, option.videoId)
                  }
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    option.action === 'contact_urgence'
                      ? 'bg-red-50 border-red-200 hover:border-red-400'
                      : option.action === 'video'
                      ? 'bg-purple-50 border-purple-200 hover:border-purple-400'
                      : 'bg-blue-50 border-blue-200 hover:border-blue-400'
                  }`}
                >
                  <span className="text-sm font-medium text-[#1a2b3c]">
                    {option.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#86868B]" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Video */}
        {showVideo && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setShowVideo(null)}
              className="flex items-center gap-2 text-sm text-[#3b82f6] mb-4 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <VideoPlayer videoId={showVideo} />

            <div className="mt-6 space-y-3">
              <button
                onClick={resetFlow}
                className="w-full py-3 bg-[#34C759] text-white rounded-xl text-sm font-medium hover:bg-[#28a745] transition-colors"
              >
                Probleme resolu !
              </button>
              <button
                onClick={() => {
                  setShowVideo(null);
                  setShowForm(true);
                }}
                className="w-full py-3 bg-[#f5f5f7] text-[#1a2b3c] rounded-xl text-sm font-medium hover:bg-[#e5e5ea] transition-colors"
              >
                J'ai toujours un probleme - Contacter un technicien
              </button>
            </div>
          </motion.div>
        )}

        {/* Formulaire de contact */}
        {showForm && !submitted && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-sm text-[#3b82f6] mb-4 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                <Phone className="w-4 h-4" />
                Contacter un technicien
              </div>
              <p className="text-xs text-blue-600">
                Votre demande sera traitee dans les 24h ouvrables.
              </p>
            </div>

            <ContactForm
              problemType={selectedProblem || 'other'}
              onSubmit={handleFormSubmit}
            />
          </motion.div>
        )}

        {/* Contact urgence */}
        {showContactUrgence && (
          <motion.div
            key="urgence"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setShowContactUrgence(false)}
              className="flex items-center gap-2 text-sm text-[#3b82f6] mb-4 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-lg font-semibold text-red-900 mb-2">
                Contact urgence technicien
              </h4>
              <p className="text-sm text-red-700 mb-4">
                Un technicien est disponible pour une intervention rapide.
              </p>
              <a
                href="tel:+33800123456"
                className="inline-flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Appeler : 0 800 123 456
              </a>
              <p className="text-xs text-red-600 mt-3">
                Disponible 7j/7 de 8h a 20h
              </p>
            </div>
          </motion.div>
        )}

        {/* Confirmation */}
        {submitted && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h4 className="text-lg font-semibold text-[#1a2b3c] mb-2">
              Demande envoyee !
            </h4>
            <p className="text-sm text-[#86868B] mb-6">
              Votre technicien vous recontactera dans les meilleurs delais.
            </p>
            <button
              onClick={resetFlow}
              className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-xl text-sm font-medium hover:bg-[#2563eb] transition-colors"
            >
              Retour a l'accueil
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suivi des tickets */}
      <TicketTracker tickets={tickets} />
    </motion.div>
  );
}

export default AssistanceSystem;
