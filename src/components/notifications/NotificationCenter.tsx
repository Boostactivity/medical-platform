/**
 * CENTRE DE NOTIFICATIONS
 * Cloche dans le header avec panneau deroulant
 * Types: score, badge, message, alerte masque, rappel RDV
 * Categories: urgent (rouge), info (bleu), succes (vert)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  CheckCheck,
  TrendingUp,
  Award,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Activity,
  Filter as FilterIcon,
  Trash2,
  Settings,
  Shield,
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useRealtimeNotifications,
} from '../../hooks/useNotifications';
import type {
  AppNotification,
  NotificationType,
  NotificationCategory,
} from '../../hooks/useNotifications';

// ============================================
// HELPERS
// ============================================

function getNotificationIcon(type: NotificationType) {
  const icons: Record<NotificationType, React.ReactNode> = {
    score_available: <TrendingUp className="w-5 h-5" />,
    badge_unlocked: <Award className="w-5 h-5" />,
    message_received: <MessageCircle className="w-5 h-5" />,
    mask_change: <AlertTriangle className="w-5 h-5" />,
    appointment_reminder: <Calendar className="w-5 h-5" />,
    iah_alert: <Activity className="w-5 h-5" />,
    filter_change: <Settings className="w-5 h-5" />,
    non_observance: <Shield className="w-5 h-5" />,
    system: <Bell className="w-5 h-5" />,
  };
  return icons[type] || <Bell className="w-5 h-5" />;
}

function getCategoryStyles(category: NotificationCategory) {
  const styles: Record<
    NotificationCategory,
    { bg: string; iconColor: string; border: string; badge: string }
  > = {
    urgent: {
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
      border: 'border-l-4 border-l-red-500',
      badge: 'bg-red-100 text-red-700',
    },
    info: {
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      border: 'border-l-4 border-l-blue-500',
      badge: 'bg-blue-100 text-blue-700',
    },
    success: {
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      border: 'border-l-4 border-l-green-500',
      badge: 'bg-green-100 text-green-700',
    },
  };
  return styles[category] || styles.info;
}

function getCategoryLabel(category: NotificationCategory): string {
  const labels: Record<NotificationCategory, string> = {
    urgent: 'Urgent',
    info: 'Information',
    success: 'Succes',
  };
  return labels[category] || 'Information';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'A l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR');
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');

  const { notifications, unreadCount, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  // Activer le realtime
  useRealtimeNotifications();

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === filter);

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markRead.mutate(notif.id);
    }
    if (notif.action_url) {
      setIsOpen(false);
      // Navigation geree par le parent ou via window.location
      window.location.href = notif.action_url;
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#F5F5F7] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
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

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[440px] bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#e2e8f0] bg-gradient-to-br from-[#3b82f6]/5 to-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-[#1a2b3c]">
                    Notifications
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#86868B]" />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[#86868B]">
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                      : 'Tout est lu'}
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#3b82f6] hover:text-[#2563eb] flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                {/* Filtres */}
                <div className="flex gap-2">
                  {(['all', 'urgent', 'info', 'success'] as const).map(
                    (f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                          filter === f
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-[#f5f5f7] text-[#86868B] hover:bg-[#e5e5ea]'
                        }`}
                      >
                        {f === 'all'
                          ? 'Toutes'
                          : f === 'urgent'
                          ? 'Urgentes'
                          : f === 'info'
                          ? 'Infos'
                          : 'Succes'}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Notifications list */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-[#86868B]">Chargement...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-16 h-16 text-[#86868B] mx-auto mb-4 opacity-20" />
                    <p className="text-[#86868B] mb-2">
                      Aucune notification
                    </p>
                    <p className="text-xs text-[#86868B]">
                      Vous serez notifie en temps reel
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.map((notif, index) => {
                      const styles = getCategoryStyles(notif.category);

                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 cursor-pointer hover:bg-[#f5f5f7] transition-colors border-b border-[#f0f0f2] ${
                            !notif.read ? styles.bg : ''
                          } ${styles.border}`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 mt-0.5 ${styles.iconColor}`}
                            >
                              {getNotificationIcon(notif.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h3
                                  className={`text-sm text-[#1a2b3c] ${
                                    !notif.read ? 'font-semibold' : ''
                                  }`}
                                >
                                  {notif.title}
                                </h3>
                                {!notif.read && (
                                  <div className="w-2 h-2 bg-[#3b82f6] rounded-full flex-shrink-0 ml-2 mt-1.5" />
                                )}
                              </div>

                              <p className="text-xs text-[#86868B] mb-2 leading-relaxed">
                                {notif.message}
                              </p>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#86868B]">
                                  {formatTimestamp(notif.created_at)}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${styles.badge}`}
                                >
                                  {getCategoryLabel(notif.category)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e2e8f0] bg-[#f5f5f7]">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 text-sm text-[#3b82f6] font-medium hover:bg-white rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default NotificationCenter;
