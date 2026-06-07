/**
 * PORTAIL MÉDECIN — messagerie médicale de la cohorte.
 * Panneau autonome : charge /messages/doctor/conversations (kind=medical,
 * patients assignés uniquement), fil de discussion + réponse.
 * Conçu pour être intégré tel quel dans le portail médecin.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { api } from '../../utils/api';

interface DoctorConversation {
  id: string;
  patient_id: string;
  patient_name: string;
  subject: string;
  status: 'open' | 'closed';
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

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const SENDER_LABEL: Record<ThreadMessage['sender_role'], string> = {
  patient: 'Patient',
  prestataire: 'Prestataire',
  admin: 'Prestataire',
  doctor: 'Médecin',
};

export function MessagesPanel() {
  const [conversations, setConversations] = useState<DoctorConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DoctorConversation | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get('/messages/doctor/conversations');
      setConversations(data.conversations ?? []);
    } catch {
      toast.error('Impossible de charger la messagerie');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv: DoctorConversation) => {
    setSelected(conv);
    setLoadingThread(true);
    setMessages([]);
    try {
      const data = await api.get(`/messages/doctor/conversations/${conv.id}/messages`);
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
    const content = reply.trim();
    if (!content || !selected || sending) return;

    setSending(true);
    try {
      const data = await api.post(
        `/messages/doctor/conversations/${selected.id}/messages`,
        { content },
      );
      setMessages((prev) => [...prev, data.message]);
      setReply('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer la réponse');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <section className="bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageCircle className="w-4 h-4 text-[#007AFF]" />
        <h2 className="text-sm font-medium text-foreground">Messagerie médicale</h2>
        <span className="text-sm text-muted-foreground">({conversations.length})</span>
        {totalUnread > 0 && (
          <Badge className="bg-[#007AFF] text-white border-0 ml-auto">
            {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : selected ? (
        <div className="flex flex-col max-h-[480px]">
          {/* En-tête du fil */}
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Retour
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selected.patient_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{selected.subject}</p>
            </div>
          </div>

          {/* Fil */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loadingThread ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.is_mine
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-accent text-foreground'
                    }`}
                  >
                    {!msg.is_mine && (
                      <p className="text-xs font-medium opacity-70 mb-0.5">
                        {SENDER_LABEL[msg.sender_role]} — {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.is_mine ? 'text-white/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatDateFr(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Réponse */}
          {selected.status === 'open' ? (
            <div className="px-4 py-3 border-t border-border flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                maxLength={4000}
                rows={2}
                placeholder="Votre réponse…"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className="bg-[#007AFF] hover:bg-[#0051D5] text-white shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Conversation clôturée par le prestataire.
              </p>
            </div>
          )}
        </div>
      ) : conversations.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune conversation médicale pour le moment.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => openConversation(conv)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground shrink-0 min-w-[140px] truncate">
                  {conv.patient_name}
                </span>
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {conv.subject}
                  {conv.last_message ? ` — ${conv.last_message.content}` : ''}
                </span>
                {conv.unread_count > 0 && (
                  <Badge className="bg-[#007AFF] text-white border-0 shrink-0">
                    {conv.unread_count}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {formatDateFr(conv.last_message_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
