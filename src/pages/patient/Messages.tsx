/**
 * MESSAGERIE PATIENT — conversations avec l'équipe prestataire.
 * Branchée sur /messages/patient/* (messagerie sécurisée, chantier 6.4).
 *
 * Règles d'audience (50-70 ans) : texte >= 16px partout, ton bienveillant,
 * vouvoiement, aucun emoji, états vides honnêtes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Plus,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { api } from '../../utils/api';

interface ConversationSummary {
  id: string;
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
  sender_role: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function MessagesPatient() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);

  // Nouvelle conversation
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get('/messages/patient/conversations');
      setConversations(data.conversations ?? []);
    } catch {
      toast.error('Impossible de charger vos conversations');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv: ConversationSummary) => {
    setSelected(conv);
    setShowNewForm(false);
    setLoadingThread(true);
    setMessages([]);
    try {
      const data = await api.get(`/messages/patient/conversations/${conv.id}/messages`);
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

  const handleSend = async () => {
    const content = composerText.trim();
    if (!content || !selected || sending) return;

    setSending(true);
    try {
      const data = await api.post(
        `/messages/patient/conversations/${selected.id}/messages`,
        { content },
      );
      setMessages((prev) => [...prev, data.message]);
      setComposerText('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
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
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer votre message');
    } finally {
      setSending(false);
    }
  };

  const handleCreate = async () => {
    const subject = newSubject.trim();
    const content = newMessage.trim();
    if (!subject || !content || creating) return;

    setCreating(true);
    try {
      const data = await api.post('/messages/patient/conversations', { subject, content });
      toast.success('Votre message a bien été envoyé');
      setNewSubject('');
      setNewMessage('');
      setShowNewForm(false);
      await loadConversations();
      if (data.conversation) {
        openConversation(data.conversation);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible de créer la conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl text-[#1A1A1A] mb-1">Vos messages</h1>
            <p className="text-base text-[#5C5C5C]">
              Échangez en toute sécurité avec votre équipe de soins
            </p>
          </div>
          <Button
            onClick={() => {
              setShowNewForm(true);
              setSelected(null);
            }}
            className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-11 px-4 rounded-xl gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 md:h-[calc(100vh-220px)] md:min-h-[480px]">
          {/* Liste des conversations */}
          <div
            className={`bg-white rounded-2xl border border-[#E5E2DA] flex-col overflow-hidden ${
              selected || showNewForm ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="px-5 py-4 border-b border-[#E5E2DA]">
              <h2 className="text-base text-[#1A1A1A]">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex items-center justify-center py-12 text-[#5C5C5C]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <MessageCircle className="w-12 h-12 text-[#5C5C5C] opacity-30 mx-auto mb-4" />
                  <p className="text-base text-[#5C5C5C] leading-relaxed">
                    Vous n'avez pas encore de conversation. Votre équipe vous répond en
                    général sous 24 h ouvrées.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left px-5 py-4 border-b border-[#E5E2DA] transition-colors ${
                      selected?.id === conv.id ? 'bg-[#007AFF]/10' : 'hover:bg-[#FAFAF7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <span
                        className={`text-base text-[#1A1A1A] ${
                          conv.unread_count > 0 ? 'font-semibold' : ''
                        }`}
                      >
                        {conv.subject}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="shrink-0 min-w-[24px] h-6 px-2 bg-[#007AFF] text-white text-sm rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-base text-[#5C5C5C] truncate">
                        {conv.last_message.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm text-[#5C5C5C]">
                        {formatDateFr(conv.last_message_at)}
                      </span>
                      {conv.status === 'closed' && (
                        <span className="text-sm text-[#5C5C5C] bg-[#F2F0EB] px-2 py-0.5 rounded-full">
                          Clôturée
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Fil de discussion / formulaire nouvelle conversation */}
          <div
            className={`bg-white rounded-2xl border border-[#E5E2DA] flex-col overflow-hidden min-h-[420px] ${
              selected || showNewForm ? 'flex' : 'hidden md:flex'
            }`}
          >
            {showNewForm ? (
              <div className="flex-1 flex flex-col p-6">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="md:hidden flex items-center gap-2 text-base text-[#007AFF] mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </button>
                <h2 className="text-xl text-[#1A1A1A] mb-2">Nouvelle conversation</h2>
                <p className="text-base text-[#5C5C5C] mb-6">
                  Décrivez votre demande, votre équipe vous répond en général sous 24 h
                  ouvrées.
                </p>
                <label htmlFor="new-subject" className="text-base text-[#1A1A1A] mb-2">
                  Sujet de votre demande
                </label>
                <input
                  id="new-subject"
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Par exemple : question sur mon masque"
                  className="w-full px-4 py-3 mb-4 text-base border border-[#E5E2DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                />
                <label htmlFor="new-message" className="text-base text-[#1A1A1A] mb-2">
                  Votre message
                </label>
                <textarea
                  id="new-message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  maxLength={4000}
                  rows={6}
                  placeholder="Écrivez votre message à votre équipe…"
                  className="w-full px-4 py-3 text-base border border-[#E5E2DA] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                />
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleCreate}
                    disabled={!newSubject.trim() || !newMessage.trim() || creating}
                    className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-11 px-6 rounded-xl gap-2"
                  >
                    {creating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>
            ) : selected ? (
              <>
                {/* En-tête du fil */}
                <div className="px-5 py-4 border-b border-[#E5E2DA]">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="md:hidden flex items-center gap-2 text-base text-[#007AFF] mb-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Retour aux conversations
                  </button>
                  <h2 className="text-lg text-[#1A1A1A]">{selected.subject}</h2>
                  {selected.status === 'closed' && (
                    <p className="text-base text-[#5C5C5C] mt-1">
                      Cette conversation est clôturée.
                    </p>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {loadingThread ? (
                    <div className="flex items-center justify-center py-12 text-[#5C5C5C]">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.is_mine
                              ? 'bg-[#007AFF] text-white'
                              : 'bg-[#F2F0EB] text-[#1A1A1A]'
                          }`}
                        >
                          {!msg.is_mine && (
                            <p className="text-sm font-medium text-[#5C5C5C] mb-1">
                              {msg.sender_role === 'doctor'
                                ? `Dr ${msg.sender_name}`
                                : 'Votre équipe'}
                            </p>
                          )}
                          <p className="text-base whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                          <p
                            className={`text-sm mt-1 ${
                              msg.is_mine ? 'text-white/70' : 'text-[#5C5C5C]'
                            }`}
                          >
                            {formatDateFr(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                {selected.status === 'open' ? (
                  <div className="p-4 border-t border-[#E5E2DA] bg-[#FAFAF7]">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        maxLength={4000}
                        rows={2}
                        placeholder="Écrivez votre message à votre équipe…"
                        className="flex-1 px-4 py-3 text-base border border-[#E5E2DA] rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!composerText.trim() || sending}
                        className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-12 px-5 rounded-xl gap-2 shrink-0"
                      >
                        {sending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                        <span className="hidden sm:inline">Envoyer</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-[#E5E2DA] bg-[#FAFAF7]">
                    <p className="text-base text-[#5C5C5C] text-center">
                      Cette conversation est clôturée. Pour une nouvelle demande, créez une
                      nouvelle conversation.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                  <MessageCircle className="w-14 h-14 text-[#5C5C5C] opacity-30 mx-auto mb-4" />
                  <p className="text-base text-[#5C5C5C] leading-relaxed">
                    Sélectionnez une conversation, ou créez-en une nouvelle pour écrire à
                    votre équipe.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
