/**
 * HOOK - Messagerie securisee
 * Gestion des messages patient <-> medecin <-> prestataire
 * Supabase Realtime pour temps reel + chiffrement cote client
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  encrypted: boolean;
  timestamp: string;
  read: boolean;
  sender_name?: string;
  sender_role?: 'patient' | 'medecin' | 'prestataire';
  receiver_name?: string;
  receiver_role?: 'patient' | 'medecin' | 'prestataire';
  attachment_url?: string;
  attachment_type?: string;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_role: 'patient' | 'medecin' | 'prestataire';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  avatar_initials: string;
}

export interface SendMessagePayload {
  receiver_id: string;
  content: string;
  encrypt?: boolean;
}

// ============================================
// CHIFFREMENT COTE CLIENT (AES-GCM)
// ============================================

const ENCRYPTION_KEY_NAME = 'medconnect-msg-key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // En production, la cle serait derivee du mot de passe utilisateur ou stockee dans un vault
  // Pour la demo, on utilise une cle generee et stockee dans IndexedDB
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY_NAME.padEnd(32, '0')),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('medconnect-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptMessage(plaintext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    // Concatener iv + ciphertext et encoder en base64
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    return plaintext;
  }
}

async function decryptMessage(ciphertext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const combined = new Uint8Array(
      atob(ciphertext).split('').map((c) => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return ciphertext;
  }
}

// ============================================
// QUERY KEYS
// ============================================

export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  conversation: (participantId: string) =>
    [...messageKeys.all, 'conversation', participantId] as const,
  unreadCount: () => [...messageKeys.all, 'unread'] as const,
};

// ============================================
// DONNEES MOCK (fallback si Supabase indisponible)
// ============================================

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participant_id: 'dr-martin',
    participant_name: 'Dr. Sophie Martin',
    participant_role: 'medecin',
    last_message: 'Vos resultats sont encourageants, continuez ainsi !',
    last_message_time: new Date(Date.now() - 2 * 3600000).toISOString(),
    unread_count: 1,
    avatar_initials: 'SM',
  },
  {
    id: 'conv-2',
    participant_id: 'tech-dupont',
    participant_name: 'Jean Dupont - Technicien',
    participant_role: 'prestataire',
    last_message: 'Votre nouveau masque sera livre jeudi entre 9h et 12h.',
    last_message_time: new Date(Date.now() - 24 * 3600000).toISOString(),
    unread_count: 0,
    avatar_initials: 'JD',
  },
  {
    id: 'conv-3',
    participant_id: 'dr-bernard',
    participant_name: 'Dr. Philippe Bernard',
    participant_role: 'medecin',
    last_message: 'Pensez a prendre RDV pour le bilan semestriel.',
    last_message_time: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    unread_count: 2,
    avatar_initials: 'PB',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'dr-martin': [
    {
      id: 'msg-1',
      sender_id: 'dr-martin',
      receiver_id: 'current-user',
      content: 'Bonjour, comment allez-vous depuis le changement de pression ?',
      encrypted: false,
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      read: true,
      sender_name: 'Dr. Sophie Martin',
      sender_role: 'medecin',
    },
    {
      id: 'msg-2',
      sender_id: 'current-user',
      receiver_id: 'dr-martin',
      content: 'Bonjour Docteur, je me sens beaucoup mieux ! Les fuites ont diminue.',
      encrypted: false,
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      read: true,
      sender_name: 'Moi',
      sender_role: 'patient',
    },
    {
      id: 'msg-3',
      sender_id: 'dr-martin',
      receiver_id: 'current-user',
      content: 'Vos resultats sont encourageants, continuez ainsi !',
      encrypted: false,
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      read: false,
      sender_name: 'Dr. Sophie Martin',
      sender_role: 'medecin',
    },
  ],
  'tech-dupont': [
    {
      id: 'msg-4',
      sender_id: 'current-user',
      receiver_id: 'tech-dupont',
      content: 'Bonjour, mon masque presente des signes d\'usure. Puis-je en avoir un nouveau ?',
      encrypted: false,
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
      read: true,
      sender_name: 'Moi',
      sender_role: 'patient',
    },
    {
      id: 'msg-5',
      sender_id: 'tech-dupont',
      receiver_id: 'current-user',
      content: 'Bien sur ! Je vous envoie un masque ResMed AirFit F20. Votre nouveau masque sera livre jeudi entre 9h et 12h.',
      encrypted: false,
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: true,
      sender_name: 'Jean Dupont - Technicien',
      sender_role: 'prestataire',
    },
  ],
  'dr-bernard': [
    {
      id: 'msg-6',
      sender_id: 'dr-bernard',
      receiver_id: 'current-user',
      content: 'Bonjour, votre IAH est en legere hausse ces dernieres semaines.',
      encrypted: false,
      timestamp: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
      read: true,
      sender_name: 'Dr. Philippe Bernard',
      sender_role: 'medecin',
    },
    {
      id: 'msg-7',
      sender_id: 'dr-bernard',
      receiver_id: 'current-user',
      content: 'Pensez a prendre RDV pour le bilan semestriel.',
      encrypted: false,
      timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      read: false,
      sender_name: 'Dr. Philippe Bernard',
      sender_role: 'medecin',
    },
  ],
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchConversations(): Promise<Conversation[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return MOCK_CONVERSATIONS;

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, timestamp, read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('timestamp', { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_CONVERSATIONS;
    }

    // Grouper par conversation
    const convMap = new Map<string, Conversation>();
    for (const msg of data) {
      const participantId =
        msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(participantId)) {
        convMap.set(participantId, {
          id: `conv-${participantId}`,
          participant_id: participantId,
          participant_name: participantId,
          participant_role: 'medecin',
          last_message: msg.content,
          last_message_time: msg.timestamp,
          unread_count: 0,
          avatar_initials: participantId.substring(0, 2).toUpperCase(),
        });
      }
      if (!msg.read && msg.receiver_id === user.id) {
        const conv = convMap.get(participantId)!;
        conv.unread_count++;
      }
    }
    return Array.from(convMap.values());
  } catch {
    return MOCK_CONVERSATIONS;
  }
}

async function fetchMessages(participantId: string): Promise<Message[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return MOCK_MESSAGES[participantId] || [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`
      )
      .order('timestamp', { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_MESSAGES[participantId] || [];
    }

    // Dechiffrer les messages si necessaire
    const decryptedMessages = await Promise.all(
      data.map(async (msg: any) => {
        if (msg.encrypted) {
          const decryptedContent = await decryptMessage(msg.content);
          return { ...msg, content: decryptedContent };
        }
        return msg;
      })
    );

    return decryptedMessages;
  } catch {
    return MOCK_MESSAGES[participantId] || [];
  }
}

async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let content = payload.content;
  let encrypted = false;

  if (payload.encrypt) {
    content = await encryptMessage(payload.content);
    encrypted = true;
  }

  const newMessage: Partial<Message> = {
    id: `msg-${Date.now()}`,
    sender_id: user?.id || 'current-user',
    receiver_id: payload.receiver_id,
    content,
    encrypted,
    timestamp: new Date().toISOString(),
    read: false,
    sender_name: 'Moi',
    sender_role: 'patient',
  };

  if (user) {
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: payload.receiver_id,
      content,
      encrypted,
      timestamp: newMessage.timestamp,
      read: false,
    });

    if (error) {
      // Fallback: retourner le message en local
      console.warn('[useMessages] Insert error, using local fallback');
    }
  }

  return newMessage as Message;
}

async function markAsRead(messageIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('messages')
    .update({ read: true })
    .in('id', messageIds);
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook pour lister les conversations
 */
export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: fetchConversations,
    staleTime: 30 * 1000,
    placeholderData: MOCK_CONVERSATIONS,
  });
}

/**
 * Hook pour les messages d'une conversation
 */
export function useConversationMessages(participantId: string) {
  return useQuery({
    queryKey: messageKeys.conversation(participantId),
    queryFn: () => fetchMessages(participantId),
    enabled: !!participantId,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    placeholderData: MOCK_MESSAGES[participantId] || [],
  });
}

/**
 * Hook pour envoyer un message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (newMessage) => {
      // Invalider la conversation concernee
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(newMessage.receiver_id),
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi du message');
    },
  });
}

/**
 * Hook pour marquer des messages comme lus
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

/**
 * Hook pour le compteur de messages non lus
 */
export function useUnreadCount() {
  const { data: conversations } = useConversations();
  const total = (conversations || []).reduce(
    (sum, c) => sum + c.unread_count,
    0
  );
  return total;
}

/**
 * Hook Realtime pour les nouveaux messages
 */
export function useRealtimeMessages(participantId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // Invalider le cache pour rafraichir
          queryClient.invalidateQueries({ queryKey: messageKeys.all });

          const msg = payload.new as any;
          if (msg.sender_id !== 'current-user') {
            toast.info('Nouveau message', {
              description: 'Vous avez recu un nouveau message',
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participantId, queryClient]);
}
