/**
 * COMPOSANT ALERTS LIST - Liste des alertes
 * 
 * Affiche la liste des alertes récentes avec liens vers les patients
 * Permet le clic pour naviguer vers le détail patient
 */

import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, TrendingUp, Bell } from 'lucide-react';
import { Badge } from '../ui/badge';

interface PatientAlert {
  id: string;
  patientName: string;
  patientId: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  score?: number;
}

interface AlertsListProps {
  alerts: PatientAlert[];
  maxItems?: number;
}

export function AlertsList({ alerts, maxItems = 5 }: AlertsListProps) {
  const navigate = useNavigate();

  const severityConfig = {
    critical: {
      color: 'bg-red-500',
      badge: 'destructive' as const,
      label: 'Critique',
      icon: '🚨',
    },
    warning: {
      color: 'bg-orange-500',
      badge: 'default' as const,
      label: 'Attention',
      icon: '⚠️',
    },
    info: {
      color: 'bg-blue-500',
      badge: 'secondary' as const,
      label: 'Info',
      icon: 'ℹ️',
    },
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays}j`;
  };

  const displayedAlerts = alerts.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            Dernières Alertes
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Compteur alertes critiques */}
        {alerts.filter(a => a.severity === 'critical').length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-700">
              {alerts.filter(a => a.severity === 'critical').length} critique{alerts.filter(a => a.severity === 'critical').length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Liste des alertes */}
      <div className="space-y-3">
        {displayedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-500">Aucune alerte en cours</p>
            <p className="text-sm text-gray-400 mt-2">Tous vos patients sont en bonne santé</p>
          </div>
        ) : (
          displayedAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity];
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                onClick={() => navigate(`/patients/${alert.patientId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/patients/${alert.patientId}`); }}
                className="group flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r hover:from-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {/* Indicateur de sévérité */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-3 h-3 ${config.color} rounded-full ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {alert.patientName}
                    </p>
                    {alert.score !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.score >= 80 ? 'bg-green-100 text-green-700' :
                        alert.score >= 60 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Score: {alert.score}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={config.badge} className="text-xs">
                      {config.icon} {config.label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer - Voir tout */}
      {alerts.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/monitoring-dashboard')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Voir toutes les alertes ({alerts.length})
          </button>
        </div>
      )}
    </motion.div>
  );
}
