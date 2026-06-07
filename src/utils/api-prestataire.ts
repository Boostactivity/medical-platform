import { createClient } from './supabase/client';
import { api } from './api';

// Use shared singleton from client.ts (realtime subscriptions)
const supabase = createClient();

// ============================================
// ALERTS API
// ============================================

export const alertsApi = {
  /**
   * Get all active alerts
   */
  getAll: async () => {
    return api.get('/prestataire/alerts');
  },

  /**
   * Resolve an alert
   */
  resolve: async (alertId: string, data: { method: string; notes: string }) => {
    return api.post(`/prestataire/alerts/${alertId}/resolve`, data);
  },

  /**
   * Ignore an alert
   */
  ignore: async (alertId: string) => {
    return api.post(`/prestataire/alerts/${alertId}/ignore`);
  },

  /**
   * Subscribe to real-time alerts changes
   */
  subscribe: (callback: (payload: any) => void) => {
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: 'status=eq.active',
        },
        (payload) => {
          console.log('[REALTIME] Alert change:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Alerts subscription status:', status);
      });

    return () => {
      console.log('[REALTIME] Unsubscribing from alerts');
      supabase.removeChannel(channel);
    };
  },
};

// ============================================
// INTERVENTIONS API
// ============================================

export const interventionsApi = {
  /**
   * Get all interventions
   * @param status - Filter by status: 'all', 'scheduled', 'in_progress', 'completed'
   */
  getAll: async (status: string = 'all') => {
    return api.get(`/prestataire/interventions?status=${status}`);
  },

  /**
   * Create a new intervention
   */
  create: async (data: {
    patient_id: string;
    technician_id: string;
    type: string;
    date: string;
    notes?: string;
    material?: string;
    alert_id?: string;
  }) => {
    return api.post('/prestataire/interventions', data);
  },

  /**
   * Start an intervention
   */
  start: async (interventionId: string) => {
    return api.patch(`/prestataire/interventions/${interventionId}/start`);
  },

  /**
   * Complete an intervention
   */
  complete: async (interventionId: string, data: {
    duration?: string;
    materialUsed?: string;
    notes: string;
    patientSatisfaction?: number;
    followUpNeeded?: boolean;
    followUpNotes?: string;
  }) => {
    return api.patch(`/prestataire/interventions/${interventionId}/complete`, data);
  },

  /**
   * Subscribe to real-time interventions changes
   */
  subscribe: (callback: (payload: any) => void) => {
    const channel = supabase
      .channel('interventions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
        },
        (payload) => {
          console.log('[REALTIME] Intervention change:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Interventions subscription status:', status);
      });

    return () => {
      console.log('[REALTIME] Unsubscribing from interventions');
      supabase.removeChannel(channel);
    };
  },
};

// ============================================
// DASHBOARD API
// ============================================

export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async () => {
    return api.get('/prestataire/dashboard/stats');
  },
};

// ============================================
// AUDIT LOGS API (Admin only)
// ============================================

export const auditApi = {
  /**
   * Get audit logs
   */
  getLogs: async (filters?: { user_id?: string; action?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return api.get(`/prestataire/audit/logs?${params}`);
  },
};

// ============================================
// COMBINED REALTIME SUBSCRIPTION
// ============================================

/**
 * Subscribe to all prestataire-related changes
 * Returns unsubscribe function
 */
export const subscribeToAll = (callbacks: {
  onAlertChange?: (payload: any) => void;
  onInterventionChange?: (payload: any) => void;
}) => {
  const unsubscribers: Array<() => void> = [];

  if (callbacks.onAlertChange) {
    unsubscribers.push(alertsApi.subscribe(callbacks.onAlertChange));
  }

  if (callbacks.onInterventionChange) {
    unsubscribers.push(interventionsApi.subscribe(callbacks.onInterventionChange));
  }

  return () => {
    console.log('[REALTIME] Unsubscribing from all prestataire channels');
    unsubscribers.forEach(unsub => unsub());
  };
};

export default {
  alerts: alertsApi,
  interventions: interventionsApi,
  dashboard: dashboardApi,
  audit: auditApi,
  subscribeToAll,
};
