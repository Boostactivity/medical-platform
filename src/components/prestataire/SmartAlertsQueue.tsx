/**
 * File d'alertes intelligentes pour prestataire
 * Affichage + Actions + Workflow
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  AlertCircle,
  TrendingDown,
  Wind,
  Activity
} from 'lucide-react';
import { apiPublic } from '../../utils/api';

interface SmartAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  patient_id: string;
  title: string;
  message: string;
  recommendation: string;
  context: {
    value: number;
    threshold: number;
    unit: string;
    trend?: string;
  };
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  assigned_to?: string;
  suggested_actions: string[];
  estimated_time?: number;
  created_at: string;
}

export function SmartAlertsQueue() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiPublic('/prestataire/alerts/iot');
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-500',
      icon: AlertCircle,
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-500',
      icon: AlertTriangle,
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-500',
      icon: TrendingDown,
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-500',
      icon: Activity,
    },
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  const alertCounts = {
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Alertes Intelligentes</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes ({alertCounts.all})
          </button>
          
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'critical'
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Critiques ({alertCounts.critical})
          </button>
          
          <button
            onClick={() => setFilter('high')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'high'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            Importantes ({alertCounts.high})
          </button>
          
          <button
            onClick={() => setFilter('medium')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'medium'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            Modérées ({alertCounts.medium})
          </button>
          
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'low'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Faibles ({alertCounts.low})
          </button>
        </div>
      </div>

      {/* Liste alertes */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chargement des alertes...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune alerte
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Aucune alerte active pour le moment'
                : `Aucune alerte ${filter}`
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`
                  rounded-2xl border-2 p-6 transition-all cursor-pointer hover:shadow-lg
                  ${config.bg} ${config.border}
                  ${selectedAlert?.id === alert.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                `}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${config.badge} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${config.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className={`font-semibold text-lg ${config.text}`}>
                          {alert.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {alert.message}
                        </p>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${config.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>

                    {/* Context */}
                    <div className="flex items-center gap-6 mb-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4" />
                        <span>
                          Valeur: <strong>{alert.context.value.toFixed(1)} {alert.context.unit}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          Seuil: <strong>{alert.context.threshold} {alert.context.unit}</strong>
                        </span>
                      </div>
                      {alert.estimated_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            <strong>{alert.estimated_time} min</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recommendation */}
                    <div className={`p-4 rounded-xl ${config.bg} border ${config.border} mb-4`}>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        📋 Recommandation
                      </p>
                      <p className="text-sm text-gray-700">
                        {alert.recommendation}
                      </p>
                    </div>

                    {/* Actions suggérées */}
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        ✅ Actions suggérées ({alert.suggested_actions.length})
                      </p>
                      <ul className="space-y-1">
                        {alert.suggested_actions.slice(0, 3).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(alert.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                          Créer intervention
                        </button>
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                          Résoudre
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors">
                          Ignorer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}