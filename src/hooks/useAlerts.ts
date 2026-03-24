/**
 * PILIER 1 - REACTIVITE & FLUIDITE
 * Hook pour gerer les alertes avec cache intelligent
 *
 * Gestion fine des droits :
 * - Patient : voit uniquement SES alertes
 * - Medecin : voit les alertes de SES patients
 * - Prestataire : voit les alertes techniques (disconnect, mask_old, leak)
 * - Admin : voit toutes les alertes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

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

type UserRole = 'patient' | 'medecin' | 'admin' | 'prestataire';

// Alert types that are purely technical (visible to prestataire)
const TECHNICAL_ALERT_TYPES: Alert['type'][] = ['disconnect', 'mask_old', 'leak', 'no_data'];

// Alert types that are medical (NOT visible to prestataire)
const MEDICAL_ALERT_TYPES: Alert['type'][] = ['iah_high', 'follow_up'];

/**
 * Filter alerts based on user role
 */
function filterAlertsByRole(alerts: Alert[], role: UserRole, currentUserId?: string): Alert[] {
  switch (role) {
    case 'admin':
      // Admin sees everything
      return alerts;

    case 'patient':
      // Patient sees only their own alerts
      if (!currentUserId) return [];
      return alerts.filter(a => a.patient_id === currentUserId);

    case 'prestataire':
      // Prestataire sees only technical alerts (no medical alerts like iah_high, follow_up)
      return alerts.filter(a => TECHNICAL_ALERT_TYPES.includes(a.type));

    case 'medecin':
      // Medecin sees all alert types for their patients (RLS handles patient filtering server-side)
      return alerts;

    default:
      return [];
  }
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
  const response = await fetch(`${API_URL}/alerts/active`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch alerts: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function fetchPatientAlerts(patientId: string): Promise<Alert[]> {
  const response = await fetch(`${API_URL}/alerts/patient/${patientId}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch patient alerts: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.alerts || [];
}

async function acknowledgeAlert(alertId: string): Promise<void> {
  const response = await fetch(`${API_URL}/alerts/${alertId}/acknowledge`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to acknowledge alert: ${response.status} ${errorText}`);
  }
}

async function resolveAlert(alertId: string): Promise<void> {
  const response = await fetch(`${API_URL}/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to resolve alert: ${response.status} ${errorText}`);
  }
}

// ============================================
// HOOKS
// ============================================

interface UseActiveAlertsOptions {
  userRole?: UserRole;
  currentUserId?: string;
}

/**
 * Hook pour charger toutes les alertes actives
 * Filtre automatiquement selon le role de l'utilisateur
 */
export function useActiveAlerts(options: UseActiveAlertsOptions = {}) {
  const { userRole = 'admin', currentUserId } = options;

  return useQuery({
    queryKey: [...alertKeys.active(), userRole],
    queryFn: async () => {
      const data = await fetchActiveAlerts();
      // Apply role-based filtering client-side
      const filteredAlerts = filterAlertsByRole(data.alerts, userRole, currentUserId);
      return {
        alerts: filteredAlerts,
        unreadCount: filteredAlerts.filter(a => a.status === 'active').length,
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: { alerts: [], unreadCount: 0 },
  });
}

/**
 * Hook pour charger les alertes d'un patient specifique
 * Respecte les restrictions de role
 */
export function usePatientAlerts(patientId: string, options: { userRole?: UserRole } = {}) {
  const { userRole = 'admin' } = options;

  return useQuery({
    queryKey: [...alertKeys.patient(patientId), userRole],
    queryFn: async () => {
      const alerts = await fetchPatientAlerts(patientId);
      return filterAlertsByRole(alerts, userRole, patientId);
    },
    enabled: !!patientId,
    staleTime: 1 * 60 * 1000,
    placeholderData: [],
  });
}

/**
 * Hook pour marquer une alerte comme lue
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAlert,
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertKeys.active() });

      const previousAlerts = queryClient.getQueryData<AlertsResponse>(alertKeys.active());

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
      if (context?.previousAlerts) {
        queryClient.setQueryData(alertKeys.active(), context.previousAlerts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.active() });
    },
  });
}

/**
 * Hook pour resoudre une alerte
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveAlert,
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: alertKeys.active() });

      const previousAlerts = queryClient.getQueryData<AlertsResponse>(alertKeys.active());

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
