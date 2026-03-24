/**
 * HOOK - Notifications in-app
 * Centre de notifications avec Supabase Realtime
 * Types: score, badge, message, alerte masque, rappel RDV
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type NotificationType =
  | 'score_available'
  | 'badge_unlocked'
  | 'message_received'
  | 'mask_change'
  | 'appointment_reminder'
  | 'iah_alert'
  | 'filter_change'
  | 'non_observance'
  | 'system';

export type NotificationCategory = 'urgent' | 'info' | 'success';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

// ============================================
// QUERY KEYS
// ============================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ============================================
// DONNEES MOCK
// ============================================

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: 'current-user',
    type: 'score_available',
    category: 'success',
    title: 'Nouveau score disponible',
    message: 'Votre score d\'observance de la semaine est pret : 87/100. Bravo !',
    read: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    action_url: '/dashboard-patient',
  },
  {
    id: 'notif-2',
    user_id: 'current-user',
    type: 'badge_unlocked',
    category: 'success',
    title: 'Badge debloque !',
    message: 'Vous avez debloque le badge "7 nuits consecutives". Continuez !',
    read: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    action_url: '/dashboard-patient',
  },
  {
    id: 'notif-3',
    user_id: 'current-user',
    type: 'message_received',
    category: 'info',
    title: 'Nouveau message',
    message: 'Dr. Sophie Martin vous a envoye un message.',
    read: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    action_url: '/dashboard-patient',
  },
  {
    id: 'notif-4',
    user_id: 'current-user',
    type: 'mask_change',
    category: 'urgent',
    title: 'Masque a remplacer',
    message: 'Votre masque a plus de 90 jours. Il est recommande de le remplacer pour un confort optimal.',
    read: false,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    action_url: '/dashboard-patient',
  },
  {
    id: 'notif-5',
    user_id: 'current-user',
    type: 'appointment_reminder',
    category: 'info',
    title: 'Rappel rendez-vous',
    message: 'Vous avez un rendez-vous avec Dr. Bernard dans 3 jours (jeudi 10h00).',
    read: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'notif-6',
    user_id: 'current-user',
    type: 'iah_alert',
    category: 'urgent',
    title: 'IAH en hausse',
    message: 'Votre index d\'apnee-hypopnee est en hausse cette semaine (12.3 vs 8.1). Consultez votre medecin.',
    read: true,
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    action_url: '/dashboard-patient',
  },
  {
    id: 'notif-7',
    user_id: 'current-user',
    type: 'non_observance',
    category: 'info',
    title: 'On vous accompagne',
    message: 'Nous avons remarque que vous n\'avez pas utilise votre PPC ces 2 dernieres nuits. Besoin d\'aide ?',
    read: true,
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
];

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return MOCK_NOTIFICATIONS;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return MOCK_NOTIFICATIONS;
    }

    return data as AppNotification[];
  } catch {
    return MOCK_NOTIFICATIONS;
  }
}

async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  } catch {
    // Fallback silencieux
  }
}

async function markAllNotificationsRead(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    }
  } catch {
    // Fallback silencieux
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook principal pour les notifications
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    placeholderData: MOCK_NOTIFICATIONS,
  });

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    ...query,
    notifications,
    unreadCount,
  };
}

/**
 * Hook pour marquer une notification comme lue
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = queryClient.getQueryData<AppNotification[]>(
        notificationKeys.list()
      );

      if (previous) {
        queryClient.setQueryData<AppNotification[]>(
          notificationKeys.list(),
          previous.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = queryClient.getQueryData<AppNotification[]>(
        notificationKeys.list()
      );

      if (previous) {
        queryClient.setQueryData<AppNotification[]>(
          notificationKeys.list(),
          previous.map((n) => ({ ...n, read: true }))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

/**
 * Hook Realtime pour les notifications en temps reel
 */
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: notificationKeys.all,
          });

          const notif = payload.new as any;
          const toastFn =
            notif.category === 'urgent'
              ? toast.error
              : notif.category === 'success'
              ? toast.success
              : toast.info;

          toastFn(notif.title || 'Nouvelle notification', {
            description: notif.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
