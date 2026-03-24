/**
 * PHASE 3.5 - NOTIFICATION BELL
 * PILIER 1 - RÉACTIVITÉ & FLUIDITÉ
 * Version: 2.0.1 - Build fix
 * ✅ TanStack Query pour le cache
 * ✅ Supabase Realtime pour les mises à jour temps réel
 * ✅ Optimistic updates pour réactivité instantanée
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCheck, AlertCircle, TrendingDown, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

// NOUVEAU : Utiliser les hooks optimisés
import { useActiveAlerts, useAcknowledgeAlert } from '../hooks/useAlerts';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';

interface Notification {
  id: string;
  type: 'alert' | 'intervention' | 'system';
  title: string;
  message: string;
  patient_id?: string;
  patient_name?: string;
  severity?: 'low' | 'medium' | 'high';
  created_at: string;
  read: boolean;
  action_url?: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // ✅ TanStack Query - Cache intelligent
  const { data, isLoading } = useActiveAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();

  // ✅ Supabase Realtime - Mises à jour temps réel
  useRealtimeAlerts(true);

  const alerts = data?.alerts || [];
  const unreadCount = data?.unreadCount || 0;

  // Transformer les alertes en notifications
  const notifications: Notification[] = alerts.map((alert) => ({
    id: alert.id,
    type: 'alert',
    title: getAlertTitle(alert.type),
    message: alert.message || getAlertMessage(alert.type),
    patient_id: alert.patient_id,
    patient_name: 'Patient',
    severity: alert.severity || 'medium',
    created_at: alert.created_at,
    read: alert.status !== 'active',
    action_url: alert.patient_id ? `/patient/${alert.patient_id}` : undefined,
  }));

  const getAlertTitle = (type: string): string => {
    const titles: Record<string, string> = {
      disconnect: '📴 Machine déconnectée',
      mask_old: '😷 Masque à renouveler',
      leak: '💨 Fuite importante',
      iah_high: '⚠️ IAH élevé',
      no_data: '📊 Absence de données',
      follow_up: '📋 Suivi requis',
    };
    return titles[type] || '🔔 Alerte';
  };

  const getAlertMessage = (type: string): string => {
    const messages: Record<string, string> = {
      disconnect: 'Appareil non connecté depuis plusieurs jours',
      mask_old: 'Le masque doit être renouvelé',
      leak: 'Fuites anormales détectées sur le masque',
      iah_high: 'Index d\'apnée-hypopnée élevé',
      no_data: 'Aucune donnée reçue récemment',
      follow_up: 'Suivi nécessaire avec le patient',
    };
    return messages[type] || 'Notification système';
  };

  const getSeverityIcon = (severity?: string) => {
    if (severity === 'high') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (severity === 'medium') return <TrendingDown className="w-5 h-5 text-orange-500" />;
    return <Package className="w-5 h-5 text-blue-500" />;
  };

  const getSeverityColor = (severity?: string) => {
    if (severity === 'high') return 'border-l-4 border-red-500 bg-red-50';
    if (severity === 'medium') return 'border-l-4 border-orange-500 bg-orange-50';
    return 'border-l-4 border-blue-500 bg-blue-50';
  };

  const handleNotificationClick = (notif: Notification) => {
    // ✅ Optimistic update - Marquer comme lu instantanément
    if (!notif.read) {
      acknowledgeAlert.mutate(notif.id);
    }

    // Navigation
    if (notif.action_url) {
      setIsOpen(false);
      navigate(notif.action_url);
    }
  };

  const markAllAsRead = () => {
    // Marquer toutes les alertes actives comme lues
    alerts.forEach((alert) => {
      if (alert.status === 'active') {
        acknowledgeAlert.mutate(alert.id);
      }
    });
    toast.success('Toutes les notifications marquées comme lues');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
      >
        <Bell className="w-5 h-5 text-[#1D1D1F]" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-white text-xs font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </motion.div>
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#D2D2D7] bg-gradient-to-br from-[#007AFF]/5 to-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl text-[#1D1D1F]">Notifications</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#86868B]" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#86868B]">
                    {unreadCount > 0 
                      ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                      : 'Aucune nouvelle notification'
                    }
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#007AFF] hover:text-[#0051D5] flex items-center gap-1"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-[#86868B]">Chargement...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-16 h-16 text-[#86868B] mx-auto mb-4 opacity-30" />
                    <p className="text-[#86868B] mb-2">Aucune notification</p>
                    <p className="text-xs text-[#86868B]">Les alertes apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D2D2D7]">
                    {notifications.map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 cursor-pointer hover:bg-[#F5F5F7] transition-colors ${
                          !notif.read ? 'bg-blue-50/50' : ''
                        } ${getSeverityColor(notif.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getSeverityIcon(notif.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className={`text-sm ${!notif.read ? 'font-semibold' : ''} text-[#1D1D1F]`}>
                                {notif.title}
                              </h3>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-[#007AFF] rounded-full flex-shrink-0 ml-2 mt-1"></div>
                              )}
                            </div>
                            {notif.patient_name && (
                              <p className="text-xs text-[#007AFF] mb-1">
                                👤 {notif.patient_name}
                              </p>
                            )}
                            <p className="text-xs text-[#86868B] mb-2 line-clamp-2">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#86868B]">
                                {formatTimestamp(notif.created_at)}
                              </span>
                              {notif.severity && (
                                <Badge 
                                  variant={notif.severity === 'high' ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {notif.severity === 'high' ? 'Urgent' : 
                                   notif.severity === 'medium' ? 'Important' : 'Info'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#D2D2D7] bg-[#F5F5F7]">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/dashboard-admin');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Voir toutes les alertes
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}