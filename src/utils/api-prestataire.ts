import { SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

// Use shared singleton from client.ts to avoid multiple instances
const supabase = createClient();

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52`;

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAuthHeaders = async () => {
  // Try to get fresh session from Supabase
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    // No valid session - user needs to log in
    console.error('[getAuthHeaders] No valid session:', error?.message);
    throw new Error('Session expired - please log in again');
  }
  
  // Update localStorage with fresh token
  localStorage.setItem('access_token', session.access_token);
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    console.error('[API ERROR]', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      error
    });
    throw new Error(error.error || error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// ============================================
// ALERTS API
// ============================================

export const alertsApi = {
  /**
   * Get all active alerts
   */
  getAll: async () => {
    const response = await fetch(`${API_BASE}/prestataire/alerts`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Resolve an alert
   */
  resolve: async (alertId: string, data: { method: string; notes: string }) => {
    const response = await fetch(`${API_BASE}/prestataire/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Ignore an alert
   */
  ignore: async (alertId: string) => {
    const response = await fetch(`${API_BASE}/prestataire/alerts/${alertId}/ignore`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
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
    const response = await fetch(`${API_BASE}/prestataire/interventions?status=${status}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
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
    const response = await fetch(`${API_BASE}/prestataire/interventions`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Start an intervention
   */
  start: async (interventionId: string) => {
    const response = await fetch(`${API_BASE}/prestataire/interventions/${interventionId}/start`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
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
    const response = await fetch(`${API_BASE}/prestataire/interventions/${interventionId}/complete`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
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
    const response = await fetch(`${API_BASE}/prestataire/dashboard/stats`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
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

    const response = await fetch(`${API_BASE}/prestataire/audit/logs?${params}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
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