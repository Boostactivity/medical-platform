/**
 * PILIER 1 - RÉACTIVITÉ & FLUIDITÉ
 * Hook pour gérer les alertes avec cache intelligent
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPublic } from '../utils/api';

interface Alert {
  id: string;
  patient_id: string;
  type: 'disconnect' | 'mask_old' | 'leak' | 'iah_high' | 'no_data' | 'follow_up';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

// ============================================
// QUERY KEYS - Pour la gestion du cache
// ============================================
export const alertKeys = {
  all: ['alerts'] as const,
  active: () => [...alertKeys.all, 'active'] as const,
  patient: (patientId: string) => [...alertKeys.all, 'patient', patientId] as const,
  detail: (alertId: string) => [...alertKeys.all, 'detail', alertId] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchActiveAlerts(): Promise<AlertsResponse> {
  return apiPublic('/alerts/active');
}

async function fetchPatientAlerts(patientId: string): Promise<Alert[]> {
  const data = await apiPublic(`/alerts/patient/${patientId}`);
  return data.alerts || [];
}

async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiPublic(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
}

async function resolveAlert(alertId: string): Promise<void> {
  await apiPublic(`/alerts/${alertId}/resolve`, { method: 'PATCH' });
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook pour charger toutes les alertes actives
 * ✅ Cache automatique pendant 30 secondes
 * ✅ Refetch automatique toutes les 30 secondes
 * ✅ Refetch au focus de la fenêtre
 */
export function useActiveAlerts() {
  return useQuery({
    queryKey: alertKeys.active(),
    queryFn: fetchActiveAlerts,
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 30 * 1000, // Refetch toutes les 30s pour les alertes
    // En cas d'erreur, retourne des données vides pour ne pas casser l'UI
    placeholderData: { alerts: [], unreadCount: 0 },
  });
}

/**
 * Hook pour charger les alertes d'un patient spécifique
 * ✅ Cache automatique
 * ✅ Réutilise le cache si déjà chargé
 */
export function usePatientAlerts(patientId: string) {
  return useQuery({
    queryKey: alertKeys.patient(patientId),
    queryFn: () => fetchPatientAlerts(patientId),
    enabled: !!patientId, // Ne charge que si patientId existe
    staleTime: 1 * 60 * 1000, // 1 minute
    placeholderData: [],
  });
}

/**
 * Hook pour marquer une alerte comme lue
 * ✅ Invalide automatiquement le cache pour forcer le refresh
 * ✅ Optimistic update pour mise à jour instantanée
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAlert,
    onMutate: async (alertId) => {
      // Annuler les refetch en cours
      await queryClient.cancelQueries({ queryKey: alertKeys.active() });

      // Snapshot de l'état actuel
      const previousAlerts = queryClient.getQueryData<AlertsResponse>(alertKeys.active());

      // Optimistic update - Mettre à jour immédiatement l'UI
      if (previousAlerts) {
        queryClient.setQueryData<AlertsResponse>(alertKeys.active(), {
          ...previousAlerts,
          alerts: previousAlerts.alerts.map(alert =>
            alert.id === alertId
              ? { ...alert, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
              : alert
          ),
          unreadCount: Math.max(0, previousAlerts.unreadCount - 1),
        });
      }

      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      // Rollback en cas d'erreur
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertKeys.active(), context.previousAlerts);
      }
    },
    onSuccess: () => {
      // Invalider le cache pour refetch depuis le serveur
      queryClient.invalidateQueries({ queryKey: alertKeys.active() });
    },
  });
}

/**
 * Hook pour résoudre une alerte
 * ✅ Invalide automatiquement le cache
 * ✅ Optimistic update
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveAlert,
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertKeys.active() });

      const previousAlerts = queryClient.getQueryData<AlertsResponse>(alertKeys.active());

      // Optimistic update - Retirer l'alerte de la liste
      if (previousAlerts) {
        queryClient.setQueryData<AlertsResponse>(alertKeys.active(), {
          alerts: previousAlerts.alerts.filter(alert => alert.id !== alertId),
          unreadCount: Math.max(0, previousAlerts.unreadCount - 1),
        });
      }

      return { previousAlerts };
    },
    onError: (err, alertId, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertKeys.active(), context.previousAlerts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.active() });
    },
  });
}
