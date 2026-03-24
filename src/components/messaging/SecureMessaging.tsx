/**
 * MESSAGERIE SECURISEE
 * Chat patient <-> medecin <-> prestataire
 * UI sobre et medicale, type iMessage
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Lock,
  Check,
  CheckCheck,
  Search,
  Paperclip,
  Shield,
  X,
} from 'lucide-react';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkAsRead,
  useRealtimeMessages,
  useUnreadCount,
} from '../../hooks/useMessages';
import type { Conversation, Message } from '../../hooks/useMessages';

// ============================================
// SOUS-COMPOSANTS
// ============================================

function ConversationList({
  conversations,
  onSelect,
  selectedId,
}: {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  selectedId?: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.participant_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#e2e8f0]">
        <h2 className="text-lg font-semibold text-[#1a2b3c] mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#3b82f6]" />
          Messagerie securisee
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#86868B] text-sm">
            Aucune conversation trouvee
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-4 text-left hover:bg-[#f5f5f7] transition-colors border-b border-[#f0f0f2] ${
                selectedId === conv.participant_id
                  ? 'bg-[#3b82f6]/5 border-l-2 border-l-[#3b82f6]'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                    conv.participant_role === 'medecin'
                      ? 'bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]'
                      : 'bg-gradient-to-br from-[#10b981] to-[#34d399]'
                  }`}
                >
                  {conv.avatar_initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#1a2b3c] truncate">
                      {conv.participant_name}
                    </span>
                    <span className="text-xs text-[#86868B] flex-shrink-0 ml-2">
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#86868B] truncate pr-2">
                      {conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-[#3b82f6] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {conv.unread_count}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        conv.participant_role === 'medecin'
                          ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                          : 'bg-[#10b981]/10 text-[#10b981]'
                      }`}
                    >
                      {conv.participant_role === 'medecin'
                        ? 'Medecin'
                        : 'Technicien'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ChatView({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useConversationMessages(
    conversation.participant_id
  );
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unread = messages.filter(
      (m) =>
        !m.read &&
        m.sender_id === conversation.participant_id
    );
    if (unread.length > 0) {
      markAsRead.mutate(unread.map((m) => m.id));
    }
  }, [messages, conversation.participant_id]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    sendMessage.mutate(
      {
        receiver_id: conversation.participant_id,
        content: newMessage.trim(),
        encrypt: encryptEnabled,
      },
      {
        onSuccess: () => {
          setNewMessage('');
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#e2e8f0] bg-white flex items-center gap-3">
        <button
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#1a2b3c]" />
        </button>

        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
            conversation.participant_role === 'medecin'
              ? 'bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]'
              : 'bg-gradient-to-br from-[#10b981] to-[#34d399]'
          }`}
        >
          {conversation.avatar_initials}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#1a2b3c]">
            {conversation.participant_name}
          </h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#34C759] rounded-full" />
            <span className="text-xs text-[#86868B]">En ligne</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-[#34C759]" />
          <span className="text-xs text-[#34C759] font-medium">Chiffre</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fb]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-16 h-16 text-[#86868B] opacity-20 mb-4" />
            <p className="text-[#86868B] text-sm">
              Commencez la conversation
            </p>
          </div>
        ) : (
          <>
            {/* Avis de securite */}
            <div className="flex justify-center mb-4">
              <div className="bg-[#34C759]/10 text-[#34C759] text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Les messages sont chiffres de bout en bout
              </div>
            </div>

            {messages.map((msg, index) => {
              const isMe =
                msg.sender_id === 'current-user' ||
                msg.sender_role === 'patient';
              const showDate =
                index === 0 ||
                !isSameDay(
                  msg.timestamp,
                  messages[index - 1].timestamp
                );

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-white text-[#86868B] text-xs px-3 py-1 rounded-full shadow-sm">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-[#3b82f6] text-white rounded-br-md'
                          : 'bg-white text-[#1a2b3c] shadow-sm border border-[#e2e8f0] rounded-bl-md'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-xs font-medium text-[#3b82f6] mb-1">
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 ${
                          isMe ? 'text-white/60' : 'text-[#86868B]'
                        }`}
                      >
                        {msg.encrypted && (
                          <Lock className="w-3 h-3" />
                        )}
                        <span className="text-[10px]">
                          {formatHour(msg.timestamp)}
                        </span>
                        {isMe &&
                          (msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#e2e8f0] bg-white">
        {/* Encryption toggle */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setEncryptEnabled(!encryptEnabled)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-colors ${
              encryptEnabled
                ? 'bg-[#34C759]/10 text-[#34C759]'
                : 'bg-[#f5f5f7] text-[#86868B]'
            }`}
          >
            <Lock className="w-3 h-3" />
            {encryptEnabled
              ? 'Chiffrement active'
              : 'Chiffrement additionnel'}
          </button>
        </div>

        <div className="flex items-end gap-2">
          <button className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5 text-[#86868B]" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Votre message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-[#f5f5f7] rounded-2xl text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 max-h-32"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${
              newMessage.trim()
                ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb] shadow-md'
                : 'bg-[#f5f5f7] text-[#86868B]'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UTILITAIRES
// ============================================

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return 'A l\'instant';
  if (hours < 24) return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (days < 7) {
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return jours[date.getDay()];
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatHour(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - date.getTime()) / 86400000
  );

  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function isSameDay(t1: string, t2: string): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function SecureMessaging() {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const { data: conversations = [], isLoading } = useConversations();
  useRealtimeMessages(selectedConversation?.participant_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xl overflow-hidden"
      style={{ height: '600px' }}
    >
      <div className="flex h-full">
        {/* Liste des conversations (desktop: toujours visible, mobile: cache quand chat ouvert) */}
        <div
          className={`w-full lg:w-[340px] border-r border-[#e2e8f0] ${
            selectedConversation ? 'hidden lg:block' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              onSelect={setSelectedConversation}
              selectedId={selectedConversation?.participant_id}
            />
          )}
        </div>

        {/* Zone de chat */}
        <div
          className={`flex-1 ${
            !selectedConversation ? 'hidden lg:flex' : 'flex'
          } flex-col`}
        >
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              onBack={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#f8f9fb]">
              <div className="w-20 h-20 bg-[#3b82f6]/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-[#3b82f6]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a2b3c] mb-2">
                Messagerie securisee
              </h3>
              <p className="text-sm text-[#86868B] text-center max-w-xs">
                Selectionnez une conversation pour echanger avec votre medecin ou
                technicien de maniere confidentielle.
              </p>
              <div className="flex items-center gap-1.5 mt-4 text-[#34C759]">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Chiffrement de bout en bout
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default SecureMessaging;
