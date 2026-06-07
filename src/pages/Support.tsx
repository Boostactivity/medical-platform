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

// Messagerie support : branchee sur la table messages (chantier communication).
// Tant que le backend messagerie n'est pas livre, la page affiche un etat vide honnete.
const INITIAL_CONVERSATIONS: Conversation[] = [];

export function Support() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
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
    <div className="min-h-screen bg-[#F2F0EB]">
      {/* Header */}
      <header className="bg-white border-b border-[#D9D5CC]">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-[#1A1A1A] mb-2">Centre de Support</h1>
              <p className="text-sm text-[#5C5C5C]">
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

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">Total</p>
                <p className="text-2xl text-[#1A1A1A]">{stats.total}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-[#007AFF] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">Ouverts</p>
                <p className="text-2xl text-[#007AFF]">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-[#007AFF] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">En attente</p>
                <p className="text-2xl text-[#B34000]">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-[#B34000] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">Résolus</p>
                <p className="text-2xl text-[#18753C]">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#18753C] opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Layout: List + Chat */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
          {/* Conversations List */}
          <div className="col-span-4 bg-white rounded-2xl border border-[#D9D5CC] flex flex-col overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-[#D9D5CC] bg-[#F2F0EB]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5C5C5C]" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#D9D5CC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
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
                        : 'bg-white text-[#5C5C5C] hover:bg-[#E8E5DE]'
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
                  className={`p-4 border-b border-[#D9D5CC] cursor-pointer transition-colors ${
                    selectedConv?.id === conv.id ? 'bg-[#007AFF]/10' : 'hover:bg-[#F2F0EB]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#007AFF] flex items-center justify-center text-white">
                        {conv.patient_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-sm ${conv.unread_count > 0 ? 'font-semibold' : ''} text-[#1A1A1A]`}>
                          {conv.patient_name}
                        </h3>
                        <p className="text-xs text-[#5C5C5C] truncate max-w-[200px]">
                          {conv.subject}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-[#5C5C5C]">
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
                  <p className="text-xs text-[#5C5C5C] mt-2 truncate">
                    {conv.last_message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-8 bg-white rounded-2xl border border-[#D9D5CC] flex flex-col overflow-hidden">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[#D9D5CC] bg-gradient-to-r from-[#007AFF]/5 to-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF] to-[#007AFF] flex items-center justify-center text-white text-lg">
                        {selectedConv.patient_name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg text-[#1A1A1A]">{selectedConv.patient_name}</h2>
                        <p className="text-sm text-[#5C5C5C]">{selectedConv.subject}</p>
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
                            className="bg-[#18753C] hover:bg-[#18753C] gap-2"
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
                          : 'bg-[#F2F0EB] text-[#1A1A1A]'
                      } rounded-2xl px-4 py-3`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === 'support' ? 'text-white/70' : 'text-[#5C5C5C]'
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
                  <div className="p-4 border-t border-[#D9D5CC] bg-[#F2F0EB]">
                    <div className="flex items-center gap-3">
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <Paperclip className="w-5 h-5 text-[#5C5C5C]" />
                      </button>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-3 border border-[#D9D5CC] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
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
                  <MessageCircle className="w-16 h-16 text-[#5C5C5C] mx-auto mb-4 opacity-30" />
                  <p className="text-[#5C5C5C]">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
