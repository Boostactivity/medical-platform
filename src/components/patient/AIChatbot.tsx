/**
 * CHATBOT IA PATIENT
 *
 * Interface de chat avec reponses pre-programmees pour questions frequentes,
 * fallback vers creation ticket technicien, historique des conversations.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, Bot, User, X, Minimize2, Maximize2,
  ThumbsUp, ThumbsDown, RotateCcw, Ticket, ExternalLink,
  ChevronDown, Sparkles, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ---- Types ----

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  links?: { label: string; url: string }[];
  ticketCreated?: boolean;
  feedback?: 'positive' | 'negative' | null;
}

interface QuickAction {
  label: string;
  query: string;
  icon: string;
}

// ---- Knowledge Base ----

interface KBEntry {
  patterns: RegExp[];
  response: string;
  links?: { label: string; url: string }[];
  category: string;
}

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    patterns: [/masque.*g[eê]ne/i, /masque.*inconfort/i, /mal.*masque/i, /masque.*fait mal/i, /masque.*marque/i],
    response: `Je comprends que le masque puisse etre inconfortable au debut. Voici quelques astuces :

1. **Ajustez les sangles** : ni trop serre ni trop lache. Vous devez pouvoir passer un doigt entre la sangle et votre visage.
2. **Nettoyez le coussin** quotidiennement avec de l'eau tiede et du savon doux.
3. **Essayez de porter le masque** 30 min avant de dormir pour vous habituer.
4. **Verifiez la taille** : un coussin trop grand ou trop petit cause des fuites et des marques.
5. Si l'inconfort persiste apres 2 semaines, un **changement de type de masque** peut etre envisage.`,
    links: [
      { label: 'Tutoriel video : bien ajuster son masque', url: '/tutoriels/ajustement-masque' },
      { label: 'Catalogue masques disponibles', url: '/consommables' },
    ],
    category: 'masque',
  },
  {
    patterns: [/c.*est quoi.*iah/i, /iah.*signifie/i, /iah.*veut dire/i, /index.*apn/i, /qu.*est.*iah/i],
    response: `L'**IAH** (Index d'Apnees-Hypopnees) mesure le nombre d'arrets respiratoires par heure de sommeil.

- **Normal** : IAH < 5
- **Leger** : IAH entre 5 et 15
- **Modere** : IAH entre 15 et 30
- **Severe** : IAH > 30

Avec votre traitement PPC, l'objectif est de maintenir un **IAH inferieur a 5**, ce qui signifie que votre appareil corrige efficacement vos apnees. Un IAH residuel bas est un excellent signe !`,
    links: [
      { label: 'Comprendre l\'apnee du sommeil', url: '/apnee-sommeil' },
    ],
    category: 'education',
  },
  {
    patterns: [/pourquoi.*4.*heure/i, /4h.*minimum/i, /seuil.*cpam/i, /112.*heure/i, /observance.*cpam/i, /remboursement.*cpam/i],
    response: `La CPAM (Caisse Primaire d'Assurance Maladie) impose un **seuil minimum d'utilisation** pour maintenir le remboursement de votre appareil PPC :

- **112 heures sur 28 jours consecutifs**, soit environ **4 heures par nuit** en moyenne.
- Ce seuil est verifie lors du **controle trimestriel** puis annuel.

**Pourquoi 4h ?** Les etudes cliniques montrent qu'en dessous de 4h d'utilisation, les benefices du traitement sont significativement reduits. C'est un compromis entre efficacite clinique et faisabilite pour le patient.

Si vous avez du mal a atteindre ce seuil, n'hesitez pas a en parler avec votre technicien ou votre medecin.`,
    links: [
      { label: 'Mon suivi d\'observance', url: '/dashboard-patient' },
      { label: 'Reglementation CPAM', url: '/faq' },
    ],
    category: 'reglementation',
  },
  {
    patterns: [/score.*baisse/i, /observance.*baisse/i, /chiffres.*mauvais/i, /resultats.*baisse/i, /iah.*augment/i],
    response: `Je vois que vos resultats ont baisse. Pas de panique, cela arrive et il y a souvent des solutions simples :

**Causes frequentes d'une baisse :**
- Fuites de masque (coussin use ou mal ajuste)
- Changement de position de sommeil
- Congestion nasale (allergie, rhume)
- Prise de poids recente
- Stress ou anxiete

**Actions recommandees :**
1. Verifiez l'etat de votre masque et de ses joints
2. Nettoyez le circuit (tuyau, humidificateur)
3. Essayez de dormir legerement sureleve
4. Notez vos heures de coucher/lever pendant une semaine

Si la baisse persiste plus de 2 semaines, je vous recommande de contacter votre technicien.`,
    links: [
      { label: 'Mes donnees detaillees', url: '/dashboard-patient' },
      { label: 'Contacter mon technicien', url: '/support' },
    ],
    category: 'suivi',
  },
  {
    patterns: [/changer.*masque/i, /nouveau.*masque/i, /autre.*masque/i, /remplacer.*masque/i],
    response: `Vous souhaitez changer de masque ? C'est tout a fait possible ! Il existe trois grands types de masques :

- **Nasal** : couvre uniquement le nez (le plus courant)
- **Narinaire** : petits coussins dans les narines (le plus discret)
- **Facial** : couvre le nez et la bouche (si respiration buccale)

Le renouvellement du masque est pris en charge par la CPAM tous les **6 mois** (coussin tous les 3 mois).

Rendez-vous sur notre marketplace pour decouvrir les modeles disponibles ou contactez votre technicien pour un essai.`,
    links: [
      { label: 'Marketplace consommables', url: '/consommables' },
      { label: 'Contacter un technicien', url: '/support' },
    ],
    category: 'equipement',
  },
  {
    patterns: [/bruit.*appareil/i, /appareil.*bruyant/i, /ppc.*bruit/i, /machine.*bruit/i],
    response: `Les appareils PPC modernes sont tres silencieux (moins de 30 dB), mais quelques astuces peuvent aider :

1. **Posez l'appareil** sur une surface stable et plane (pas sur une table de nuit qui vibre)
2. **Verifiez le filtre** : un filtre encrasse augmente le bruit
3. **Verifiez les connexions** du tuyau (pas de fuite d'air)
4. **Activez le mode "confort"** ou "rampe" pour un demarrage progressif

Si le bruit est inhabituel (sifflement, claquement), contactez votre technicien car cela peut indiquer un probleme technique.`,
    links: [
      { label: 'Support technique', url: '/support' },
    ],
    category: 'equipement',
  },
  {
    patterns: [/secheresse/i, /nez.*sec/i, /bouche.*s[eè]che/i, /humidificateur/i],
    response: `La secheresse nasale ou buccale est un effet secondaire courant du traitement PPC. Solutions :

1. **Augmentez le niveau d'humidification** sur votre appareil
2. **Utilisez un spray nasal salin** avant de dormir
3. **Verifiez que votre bac d'eau** est bien rempli chaque soir
4. Si vous avez la bouche seche, une **mentonniere** peut aider a garder la bouche fermee
5. En cas de persistance, parlez-en a votre medecin pour un spray nasal adapte`,
    links: [
      { label: 'Tutoriel humidificateur', url: '/tutoriels/humidificateur' },
    ],
    category: 'confort',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Mon masque me gene', query: 'Mon masque me gene', icon: '😷' },
  { label: "C'est quoi l'IAH ?", query: "C'est quoi l'IAH ?", icon: '📊' },
  { label: 'Pourquoi 4h minimum ?', query: 'Pourquoi 4h minimum ?', icon: '⏰' },
  { label: 'Mon score baisse', query: 'Mon score baisse', icon: '📉' },
  { label: 'Changer de masque', query: 'Je veux changer de masque', icon: '🔄' },
  { label: 'Bruit de l\'appareil', query: 'Mon appareil fait du bruit', icon: '🔊' },
];

// ---- Helpers ----

function findResponse(query: string): KBEntry | null {
  for (const entry of KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(query)) {
        return entry;
      }
    }
  }
  return null;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ---- Composant Principal ----

export function AIChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant virtuel. Comment puis-je vous aider aujourd\'hui ? Vous pouvez me poser une question ou choisir un sujet ci-dessous.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simuler un delai de reflexion
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const kbEntry = findResponse(text);

    if (kbEntry) {
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: kbEntry.response,
        timestamp: new Date(),
        links: kbEntry.links,
        feedback: null,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      // Fallback : creer un ticket
      const fallbackMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Je n'ai pas de reponse precise a votre question. Je vais transferer votre demande a un technicien qui vous repondra dans les meilleurs delais.

Un ticket de support a ete cree avec votre question. Vous serez notifie de la reponse.`,
        timestamp: new Date(),
        ticketCreated: true,
        feedback: null,
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      toast.info('Ticket cree', {
        description: 'Un technicien va prendre en charge votre question.',
      });
    }

    setIsTyping(false);
  }, []);

  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: type } : m))
    );
    toast.success(type === 'positive' ? 'Merci pour votre retour !' : 'Merci, nous ameliorerons cette reponse.');
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation reinitialise. Comment puis-je vous aider ?',
        timestamp: new Date(),
      },
    ]);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#007AFF] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistant virtuel</h3>
            {!isMinimized && (
              <p className="text-xs text-white/80">En ligne</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleReset} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Reinitialiser">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-[#007AFF] text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      {/* Render markdown-like bold */}
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-1' : ''}>
                          {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )}
                        </p>
                      ))}
                    </div>

                    {/* Links */}
                    {message.links && message.links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            className="flex items-center gap-1 text-xs text-[#007AFF] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Ticket created */}
                    {message.ticketCreated && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                        <Ticket className="w-3 h-3" />
                        Ticket envoye a un technicien
                      </div>
                    )}

                    {/* Feedback */}
                    {message.role === 'assistant' && message.id !== 'welcome' && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <button
                          onClick={() => handleFeedback(message.id, 'positive')}
                          className={`p-1 rounded hover:bg-green-50 ${message.feedback === 'positive' ? 'text-green-500' : 'text-slate-300'}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'negative')}
                          className={`p-1 rounded hover:bg-red-50 ${message.feedback === 'negative' ? 'text-red-500' : 'text-slate-300'}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-slate-400"
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">L'assistant reflechit...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-400 mb-2">Questions frequentes :</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.query)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-700 transition-colors"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:bg-white focus:ring-1 focus:ring-[#007AFF] outline-none transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                size="sm"
                className="bg-[#007AFF] hover:bg-[#0051D5] text-white rounded-xl px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </motion.div>
  );
}
