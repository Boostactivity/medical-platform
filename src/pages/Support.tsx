/**
 * PHASE 3.5 - CENTRE DE SUPPORT
 * Messagerie sécurisée côté pro (admin / prestataire).
 * Branchée sur /messages/pro/* (conversations + fil + clôture/réouverture).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  MessageCircle,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  RotateCcw,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api } from '../utils/api';

interface Conversation {
  id: string;
  patient_id: string;
  patient_name: string;
  subject: string;
  kind: 'patient_support' | 'medical';
  status: 'open' | 'closed';
  created_at: string;
  last_message_at: string;
  last_message: { content: string; sender_role: string; created_at: string } | null;
  unread_count: number;
}

interface ThreadMessage {
  id: string;
  sender_id: string;
  sender_role: 'patient' | 'prestataire' | 'admin' | 'doctor';
  sender_name: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

export function Support() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get('/messages/pro/conversations');
      setConversations(data.conversations ?? []);
    } catch {
      toast.error('Impossible de charger les conversations');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingThread(true);
    setMessages([]);
    try {
      const data = await api.get(`/messages/pro/conversations/${conv.id}/messages`);
      setMessages(data.messages ?? []);
      // Le serveur a marqué les messages comme lus
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
      );
    } catch {
      toast.error('Impossible de charger cette conversation');
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedConv || sending) return;

    setSending(true);
    try {
      const data = await api.post(
        `/messages/pro/conversations/${selectedConv.id}/messages`,
        { content },
      );
      setMessages((prev) => [...prev, data.message]);
      setMessageInput('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? {
                ...c,
                last_message_at: data.message.created_at,
                last_message: {
                  content: data.message.content,
                  sender_role: data.message.sender_role,
                  created_at: data.message.created_at,
                },
              }
            : c,
        ),
      );
      toast.success('Message envoyé');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const handleSetStatus = async (status: 'open' | 'closed') => {
    if (!selectedConv) return;
    try {
      await api.patch(`/messages/pro/conversations/${selectedConv.id}`, { status });
      const updated = { ...selectedConv, status };
      setSelectedConv(updated);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(status === 'closed' ? 'Conversation clôturée' : 'Conversation réouverte');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible de modifier le statut');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: { label: 'Ouvert', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      closed: { label: 'Clôturé', color: 'bg-green-100 text-green-800 border-green-200' },
    };
    const style = styles[status as keyof typeof styles] || styles.open;
    return <Badge className={`${style.color} border`}>{style.label}</Badge>;
  };

  const getKindBadge = (kind: string) => {
    if (kind !== 'medical') return null;
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200 border text-xs gap-1">
        <Stethoscope className="w-3 h-3" />
        Médical
      </Badge>
    );
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
    closed: conversations.filter(c => c.status === 'closed').length,
    unread: conversations.reduce((acc, c) => acc + c.unread_count, 0),
  };

  const STATUS_FILTERS = [
    { value: 'all', label: 'Tous' },
    { value: 'open', label: 'Ouverts' },
    { value: 'closed', label: 'Clôturés' },
  ];

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
                <p className="text-sm text-[#5C5C5C] mb-1">Non lus</p>
                <p className="text-2xl text-[#B34000]">{stats.unread}</p>
              </div>
              <Clock className="w-8 h-8 text-[#B34000] opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5C5C5C] mb-1">Clôturés</p>
                <p className="text-2xl text-[#18753C]">{stats.closed}</p>
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
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setFilterStatus(status.value)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      filterStatus === status.value
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-white text-[#5C5C5C] hover:bg-[#E8E5DE]'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center py-12 text-[#5C5C5C]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <MessageCircle className="w-12 h-12 text-[#5C5C5C] opacity-30 mx-auto mb-3" />
                  <p className="text-sm text-[#5C5C5C]">
                    Aucune conversation pour le moment. Les demandes des patients
                    apparaîtront ici.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv)}
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
                      {getKindBadge(conv.kind)}
                    </div>
                    {conv.last_message && (
                      <p className="text-xs text-[#5C5C5C] mt-2 truncate">
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                ))
              )}
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
                      {selectedConv.status === 'open' ? (
                        <Button
                          onClick={() => handleSetStatus('closed')}
                          className="bg-[#18753C] hover:bg-[#18753C] gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Clôturer
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSetStatus('open')}
                          variant="outline"
                          className="gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Réouvrir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loadingThread ? (
                    <div className="flex items-center justify-center py-12 text-[#5C5C5C]">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.sender_role !== 'patient' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${
                          msg.sender_role !== 'patient'
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-[#F2F0EB] text-[#1A1A1A]'
                        } rounded-2xl px-4 py-3`}>
                          {msg.sender_role !== 'patient' && !msg.is_mine && (
                            <p className="text-xs text-white/70 mb-1">
                              {msg.sender_role === 'doctor' ? `Dr ${msg.sender_name}` : msg.sender_name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_role !== 'patient' ? 'text-white/70' : 'text-[#5C5C5C]'
                          }`}>
                            {formatTimestamp(msg.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {selectedConv.status === 'open' ? (
                  <div className="p-4 border-t border-[#D9D5CC] bg-[#F2F0EB]">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Tapez votre message..."
                        className="flex-1 px-4 py-3 border border-[#D9D5CC] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sending}
                        className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Envoyer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-[#D9D5CC] bg-[#F2F0EB]">
                    <p className="text-sm text-[#5C5C5C] text-center">
                      Conversation clôturée — réouvrez-la pour répondre.
                    </p>
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
