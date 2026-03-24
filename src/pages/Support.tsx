/**
 * PHASE 3.5 - CENTRE DE SUPPORT
 * Système de tickets et messagerie patient
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Send, 
  User, 
  Calendar, 
  Wrench, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Paperclip,
  Search,
  Filter,
  MoreVertical,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

interface Message {
  id: string;
  sender: 'patient' | 'support';
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_avatar?: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  last_message: string;
  last_message_at: string;
  unread_count: number;
  messages: Message[];
  created_at: string;
}

// Mock Data
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    patient_id: 'p1',
    patient_name: 'Jean Dupont',
    subject: 'Problème de fuite sur le masque',
    status: 'open',
    priority: 'high',
    last_message: 'Le masque fuit toujours malgré les ajustements...',
    last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unread_count: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    messages: [
      {
        id: 'm1',
        sender: 'patient',
        content: 'Bonjour, j\'ai un problème avec mon masque depuis hier soir. Il fuit beaucoup.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        read: true,
      },
      {
        id: 'm2',
        sender: 'support',
        content: 'Bonjour M. Dupont, merci pour votre message. Pouvez-vous me préciser à quel endroit le masque fuit ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: true,
      },
      {
        id: 'm3',
        sender: 'patient',
        content: 'Principalement au niveau du nez. J\'ai essayé de resserrer les sangles mais ça n\'a pas aidé.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: true,
      },
      {
        id: 'm4',
        sender: 'patient',
        content: 'Le masque fuit toujours malgré les ajustements...',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        read: false,
      },
    ],
  },
  {
    id: 'conv-2',
    patient_id: 'p2',
    patient_name: 'Marie Martin',
    subject: 'Question sur le nettoyage',
    status: 'pending',
    priority: 'low',
    last_message: 'D\'accord, merci pour ces précisions !',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unread_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    messages: [
      {
        id: 'm5',
        sender: 'patient',
        content: 'Bonjour, à quelle fréquence dois-je nettoyer mon masque ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        read: true,
      },
      {
        id: 'm6',
        sender: 'support',
        content: 'Bonjour Mme Martin ! Il est recommandé de nettoyer le masque chaque jour avec de l\'eau tiède et du savon doux.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        read: true,
      },
      {
        id: 'm7',
        sender: 'patient',
        content: 'D\'accord, merci pour ces précisions !',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: true,
      },
    ],
  },
  {
    id: 'conv-3',
    patient_id: 'p3',
    patient_name: 'Pierre Dubois',
    subject: 'Renouvellement de consommables',
    status: 'open',
    priority: 'medium',
    last_message: 'Quand puis-je recevoir mon nouveau filtre ?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unread_count: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    messages: [
      {
        id: 'm8',
        sender: 'patient',
        content: 'Bonjour, je souhaiterais renouveler mes filtres.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
      },
      {
        id: 'm9',
        sender: 'support',
        content: 'Bonjour M. Dubois, nous préparons votre commande de filtres. Livraison prévue sous 48h.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        read: true,
      },
      {
        id: 'm10',
        sender: 'patient',
        content: 'Quand puis-je recevoir mon nouveau filtre ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        read: false,
      },
    ],
  },
  {
    id: 'conv-4',
    patient_id: 'p4',
    patient_name: 'Sophie Bernard',
    subject: 'Problème technique avec l\'appareil',
    status: 'resolved',
    priority: 'high',
    last_message: 'Merci beaucoup pour votre aide !',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    unread_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    messages: [
      {
        id: 'm11',
        sender: 'patient',
        content: 'Mon appareil ne démarre plus depuis ce matin.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        read: true,
      },
      {
        id: 'm12',
        sender: 'support',
        content: 'Bonjour Mme Bernard, je vais programmer une intervention technique pour demain matin.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
        read: true,
      },
      {
        id: 'm13',
        sender: 'patient',
        content: 'Merci beaucoup pour votre aide !',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        read: true,
      },
    ],
  },
];

export function Support() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(MOCK_CONVERSATIONS[0]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConv) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      sender: 'support',
      content: messageInput,
      timestamp: new Date().toISOString(),
      read: true,
    };

    // Update conversation
    const updatedConv = {
      ...selectedConv,
      messages: [...selectedConv.messages, newMessage],
      last_message: messageInput,
      last_message_at: new Date().toISOString(),
    };

    setSelectedConv(updatedConv);
    setConversations(prev => 
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );
    setMessageInput('');
    toast.success('Message envoyé');
  };

  const handleCreateIntervention = () => {
    if (!selectedConv) return;
    
    toast.success('Intervention créée', {
      description: `Ticket créé pour ${selectedConv.patient_name}`,
    });

    // Mark as resolved
    const updatedConv = { ...selectedConv, status: 'resolved' as const };
    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );
  };

  const handleResolve = () => {
    if (!selectedConv) return;
    
    const updatedConv = { ...selectedConv, status: 'resolved' as const };
    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );
    toast.success('Conversation marquée comme résolue');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: { label: 'Ouvert', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800 border-green-200' },
    };
    const style = styles[status as keyof typeof styles] || styles.open;
    return <Badge className={`${style.color} border`}>{style.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
      medium: { label: 'Moyen', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      low: { label: 'Faible', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    };
    const style = styles[priority as keyof typeof styles] || styles.medium;
    return <Badge className={`${style.color} border text-xs`}>{style.label}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: conversations.length,
    open: conversations.filter(c => c.status === 'open').length,
    pending: conversations.filter(c => c.status === 'pending').length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
    unread: conversations.reduce((acc, c) => acc + c.unread_count, 0),
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7]">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl text-[#1D1D1F] mb-2">Centre de Support</h1>
              <p className="text-sm text-[#86868B]">
                {stats.open} conversations ouvertes • {stats.unread} messages non lus
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-red-100 text-red-800 border border-red-200">
                {stats.unread} non lus
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-[#D2D2D7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#86868B] mb-1">Total</p>
                <p className="text-2xl text-[#1D1D1F]">{stats.total}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-[#007AFF] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D2D2D7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#86868B] mb-1">Ouverts</p>
                <p className="text-2xl text-[#007AFF]">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-[#007AFF] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D2D2D7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#86868B] mb-1">En attente</p>
                <p className="text-2xl text-[#FF9500]">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-[#FF9500] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D2D2D7]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#86868B] mb-1">Résolus</p>
                <p className="text-2xl text-[#34C759]">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#34C759] opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Layout: List + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-300px)]">
          {/* Conversations List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#D2D2D7] flex flex-col overflow-hidden max-h-[50vh] lg:max-h-none">
            {/* Search & Filters */}
            <div className="p-4 border-b border-[#D2D2D7] bg-[#F5F5F7]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868B]" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#D2D2D7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'open', 'pending', 'resolved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      filterStatus === status
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-white text-[#86868B] hover:bg-[#E5E5E7]'
                    }`}
                  >
                    {status === 'all' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedConv(conv); }}
                  className={`p-4 border-b border-[#D2D2D7] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 ${
                    selectedConv?.id === conv.id ? 'bg-[#007AFF]/10' : 'hover:bg-[#F5F5F7]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white">
                        {conv.patient_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm ${conv.unread_count > 0 ? 'font-semibold' : ''} text-[#1D1D1F]`}>
                          {conv.patient_name}
                        </h3>
                        <p className="text-xs text-[#86868B] truncate max-w-[200px]">
                          {conv.subject}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-[#86868B]">
                        {formatTimestamp(conv.last_message_at)}
                      </span>
                      {conv.unread_count > 0 && (
                        <div className="w-5 h-5 bg-[#007AFF] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">{conv.unread_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conv.status)}
                    {getPriorityBadge(conv.priority)}
                  </div>
                  <p className="text-xs text-[#86868B] mt-2 truncate">
                    {conv.last_message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#D2D2D7] flex flex-col overflow-hidden min-h-[400px]">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[#D2D2D7] bg-gradient-to-r from-[#007AFF]/5 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white text-lg">
                        {selectedConv.patient_name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg text-[#1D1D1F]">{selectedConv.patient_name}</h2>
                        <p className="text-sm text-[#86868B]">{selectedConv.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedConv.status !== 'resolved' && (
                        <>
                          <Button
                            onClick={handleCreateIntervention}
                            variant="outline"
                            className="gap-2"
                          >
                            <Wrench className="w-4 h-4" />
                            Créer intervention
                          </Button>
                          <Button
                            onClick={handleResolve}
                            className="bg-[#34C759] hover:bg-[#2FB34A] gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Marquer résolu
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedConv.messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender === 'support' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${
                        msg.sender === 'support'
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F5F5F7] text-[#1D1D1F]'
                      } rounded-2xl px-4 py-3`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === 'support' ? 'text-white/70' : 'text-[#86868B]'
                        }`}>
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {selectedConv.status !== 'resolved' && (
                  <div className="p-4 border-t border-[#D2D2D7] bg-[#F5F5F7]">
                    <div className="flex items-center gap-3">
                      <button className="p-2 hover:bg-white rounded-lg transition-colors min-h-12 min-w-12 flex items-center justify-center" aria-label="Joindre un fichier">
                        <Paperclip className="w-5 h-5 text-[#86868B]" />
                      </button>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-3 border border-[#D2D2D7] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Envoyer
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-[#86868B] mx-auto mb-4 opacity-30" />
                  <p className="text-[#86868B]">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
