import { useState, useEffect } from 'react';
import { Bell, AlertCircle, Info, AlertTriangle, Check, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Alert {
  id: string;
  type: string; // 'disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up'
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: string;
  created_at: string;
  status: 'active' | 'resolved' | 'ignored';
  patient_id: string;
}

export function AlertsCenter({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchAlerts();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);

  async function fetchAlerts() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/alerts/patient/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/alerts/${alertId}/acknowledge`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  }

  async function dismissAlert(alertId: string) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/alerts/${alertId}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }

      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'from-[#FF3B30] to-[#FF9500]',
          icon: <AlertCircle className="w-6 h-6" />,
          badge: 'bg-[#FF3B30]',
        };
      case 'medium':
        return {
          bg: 'from-[#FF9500] to-[#FFCC00]',
          icon: <AlertTriangle className="w-6 h-6" />,
          badge: 'bg-[#FF9500]',
        };
      case 'low':
        return {
          bg: 'from-[#007AFF] to-[#5AC8FA]',
          icon: <Info className="w-6 h-6" />,
          badge: 'bg-[#007AFF]',
        };
      default:
        return {
          bg: 'from-[#86868B] to-[#1D1D1F]',
          icon: <Bell className="w-6 h-6" />,
          badge: 'bg-[#86868B]',
        };
    }
  };

  const getAlertTypeLabel = (type: string) => {
    // Types from schema: 'disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up'
    const labels: Record<string, string> = {
      disconnect: 'Machine déconnectée',
      mask_old: 'Masque à renouveler',
      leak: 'Fuites importantes',
      iah_high: 'IAH élevé',
      no_data: 'Absence de données',
      follow_up: 'Suivi requis',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-[#34C759]/10 to-[#30D158]/10 rounded-2xl p-8 border-2 border-[#34C759]/30 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl text-[#1D1D1F] mb-2">Tout va bien !</h3>
        <p className="text-[#86868B]">
          Aucune alerte en cours. Continuez comme ça ! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl text-[#1D1D1F]">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-[#86868B]">
                {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <div className="px-3 py-1 bg-[#FF3B30] text-white text-sm rounded-full">
            {unreadCount}
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`bg-gradient-to-r ${styles.bg} rounded-xl p-4 text-white relative overflow-hidden ${
                  alert.status === 'acknowledged' && 'opacity-60'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                  {styles.icon}
                </div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {styles.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm opacity-90">
                            {getAlertTypeLabel(alert.type)}
                          </span>
                          {alert.status === 'ignored' && (
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                              Lu
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold">{alert.message}</h4>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                          title="Marquer comme lu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                        title="Résoudre"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  {alert.details && (
                    <p className="text-sm opacity-90 mb-3 ml-11">
                      {alert.details}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between ml-11">
                    <span className="text-xs opacity-75">
                      {new Date(alert.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* View All Link */}
      {alerts.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            to="/alerts-history"
            className="text-sm text-[#007AFF] hover:text-[#0051D5] inline-flex items-center gap-1"
          >
            Voir tout l'historique
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}