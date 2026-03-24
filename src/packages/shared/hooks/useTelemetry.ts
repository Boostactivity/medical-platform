/**
 * HOOK TÉLÉMÉTRIE
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Logique métier pour données PPC - Compatible IoT multi-appareils
 */

import { useState, useEffect, useCallback } from 'react';
import type { TelemetryData } from '../types';

interface UseTelemetryOptions {
  patientId?: string;
  deviceSerial?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

/**
 * Hook personnalisé pour gérer les données télémétrie
 * 
 * @example
 * ```tsx
 * const { data, isLoading, refresh } = useTelemetry({ 
 *   patientId: '123',
 *   autoRefresh: true 
 * });
 * ```
 */
export function useTelemetry(options: UseTelemetryOptions = {}) {
  const {
    patientId,
    deviceSerial,
    autoRefresh = false,
    refreshInterval = 30000, // 30 secondes par défaut
  } = options;

  const [data, setData] = useState<TelemetryData[]>([]);
  const [latestData, setLatestData] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupérer les données télémétrie
   */
  const fetchTelemetry = useCallback(async () => {
    if (!patientId && !deviceSerial) {
      setError('patientId ou deviceSerial requis');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // PLACEHOLDER - Remplacer par appel API réel
      const params = new URLSearchParams();
      if (patientId) params.append('patient_id', patientId);
      if (deviceSerial) params.append('device_serial', deviceSerial);

      const response = await fetch(`/api/telemetry?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const result = await response.json();
      setData(result.data || []);
      
      // Mettre à jour la dernière donnée
      if (result.data && result.data.length > 0) {
        setLatestData(result.data[0]);
      }
    } catch (err: any) {
      console.error('[useTelemetry] Error:', err);
      setError(err.message || 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, deviceSerial]);

  /**
   * Refresh manuel
   */
  const refresh = useCallback(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  /**
   * Charger les données au montage
   */
  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  /**
   * Auto-refresh si activé
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchTelemetry();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchTelemetry]);

  /**
   * Calculer les statistiques agrégées
   */
  const stats = useCallback(() => {
    if (data.length === 0) {
      return {
        avgIAH: 0,
        avgObservance: 0,
        avgUsageHours: 0,
        avgLeakRate: 0,
        totalNights: 0,
      };
    }

    const totalNights = data.length;
    const sum = data.reduce(
      (acc, item) => ({
        iah: acc.iah + item.iah,
        observance: acc.observance + item.observance,
        usageHours: acc.usageHours + item.usage_hours,
        leakRate: acc.leakRate + item.leak_rate,
      }),
      { iah: 0, observance: 0, usageHours: 0, leakRate: 0 }
    );

    return {
      avgIAH: sum.iah / totalNights,
      avgObservance: sum.observance / totalNights,
      avgUsageHours: sum.usageHours / totalNights,
      avgLeakRate: sum.leakRate / totalNights,
      totalNights,
    };
  }, [data]);

  /**
   * Détecter les anomalies
   */
  const detectAnomalies = useCallback(() => {
    if (!latestData) return [];

    const anomalies: string[] = [];

    // IAH élevé
    if (latestData.iah > 30) {
      anomalies.push('IAH critique (>30)');
    } else if (latestData.iah > 15) {
      anomalies.push('IAH élevé (15-30)');
    }

    // Observance faible
    if (latestData.observance < 50) {
      anomalies.push('Observance très faible (<50%)');
    } else if (latestData.observance < 70) {
      anomalies.push('Observance insuffisante (<70%)');
    }

    // Fuite masque élevée
    if (latestData.leak_rate > 24) {
      anomalies.push('Fuite masque excessive (>24 L/min)');
    }

    // Utilisation insuffisante
    if (latestData.usage_hours < 4) {
      anomalies.push('Utilisation insuffisante (<4h)');
    }

    return anomalies;
  }, [latestData]);

  /**
   * Filtrer par période
   */
  const filterByPeriod = useCallback((days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return data.filter(item => {
      const itemDate = new Date(item.recorded_at);
      return itemDate >= cutoffDate;
    });
  }, [data]);

  return {
    // État
    data,
    latestData,
    isLoading,
    error,
    
    // Méthodes
    refresh,
    stats,
    detectAnomalies,
    filterByPeriod,
  };
}
