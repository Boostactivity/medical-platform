/**
 * HOOK ALERTES
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Gestion temps réel des alertes patients
 */

import { useState, useEffect, useCallback } from 'react';
import type { Alert, AlertSeverity, AlertType } from '../types';

interface UseAlertsOptions {
  patientId?: string;
  severity?: AlertSeverity;
  status?: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  realtime?: boolean;
}

/**
 * Hook personnalisé pour gérer les alertes
 * 
 * @example
 * ```tsx
 * const { alerts, criticalCount, markAsResolved } = useAlerts({ 
 *   patientId: '123',
 *   realtime: true 
 * });
 * ```
 */
export function useAlerts(options: UseAlertsOptions = {}) {
  const {
    patientId,
    severity,
    status = 'pending',
    realtime = false,
  } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupérer les alertes
   */
  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (patientId) params.append('patient_id', patientId);
      if (severity) params.append('severity', severity);
      if (status) params.append('status', status);

      const response = await fetch(`/api/alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des alertes');
      }

      const result = await response.json();
      setAlerts(result.data || []);
    } catch (err: any) {
      console.error('[useAlerts] Error:', err);
      setError(err.message || 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, severity, status]);

  /**
   * Marquer une alerte comme résolue
   */
  const markAsResolved = useCallback(async (
    alertId: string,
    resolutionNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la résolution');
      }

      // Mettre à jour l'état local
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
            : alert
        )
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Dismiss une alerte
   */
  const dismissAlert = useCallback(async (alertId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erreur lors du dismiss');
      }

      // Mettre à jour l'état local
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'dismissed' }
            : alert
        )
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Compter les alertes par sévérité
   */
  const countBySeverity = useCallback((sev: AlertSeverity): number => {
    return alerts.filter(alert => alert.severity === sev).length;
  }, [alerts]);

  /**
   * Obtenir les alertes critiques
   */
  const criticalAlerts = useCallback((): Alert[] => {
    return alerts.filter(alert => alert.severity === 'critical');
  }, [alerts]);

  /**
   * Charger les alertes au montage
   */
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /**
   * Temps réel avec polling (simple)
   * Dans une vraie app, utiliser WebSocket ou Supabase Realtime
   */
  useEffect(() => {
    if (!realtime) return;

    const intervalId = setInterval(() => {
      fetchAlerts();
    }, 10000); // Poll toutes les 10 secondes

    return () => clearInterval(intervalId);
  }, [realtime, fetchAlerts]);

  return {
    // État
    alerts,
    isLoading,
    error,
    
    // Compteurs
    totalCount: alerts.length,
    criticalCount: countBySeverity('critical'),
    highCount: countBySeverity('high'),
    mediumCount: countBySeverity('medium'),
    lowCount: countBySeverity('low'),
    
    // Méthodes
    refresh: fetchAlerts,
    markAsResolved,
    dismissAlert,
    criticalAlerts,
    countBySeverity,
  };
}
