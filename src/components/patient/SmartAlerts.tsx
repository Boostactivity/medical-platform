/**
 * ALERTES AUTOMATIQUES PATIENT
 * Alertes intelligentes basees sur les donnees du patient
 * Masque > 90j, non-observance, IAH en hausse, filtre use
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ShoppingCart,
  MessageCircle,
  Stethoscope,
  Filter,
  Clock,
  X,
  ChevronRight,
  Heart,
  TrendingUp,
  Moon,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type AlertLevel = 'warning' | 'info' | 'danger';

interface SmartAlert {
  id: string;
  type: 'mask_old' | 'non_observance' | 'iah_rising' | 'filter_old';
  level: AlertLevel;
  title: string;
  message: string;
  detail?: string;
  action_label: string;
  action_type: 'order' | 'help' | 'consult' | 'order_filter';
  dismissable: boolean;
  icon: React.ReactNode;
}

// ============================================
// DONNEES MOCK (en production: calculees depuis les donnees patient)
// ============================================

function generateAlerts(): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  // Masque > 90 jours
  const maskAgeDays = 95;
  if (maskAgeDays > 90) {
    alerts.push({
      id: 'alert-mask',
      type: 'mask_old',
      level: 'warning',
      title: 'Il est temps de remplacer votre masque',
      message: `Votre masque a ${maskAgeDays} jours. Pour un confort optimal et une bonne etancheite, nous recommandons un remplacement tous les 90 jours.`,
      detail: 'Un masque use peut provoquer des fuites et reduire l\'efficacite du traitement.',
      action_label: 'Commander un nouveau masque',
      action_type: 'order',
      dismissable: true,
      icon: <Clock className="w-6 h-6" />,
    });
  }

  // Non-observance 3 jours
  const consecutiveSkippedNights = 3;
  if (consecutiveSkippedNights >= 3) {
    alerts.push({
      id: 'alert-observance',
      type: 'non_observance',
      level: 'info',
      title: 'On est la pour vous aider',
      message: `Nous avons remarque que vous n'avez pas utilise votre PPC ces ${consecutiveSkippedNights} dernieres nuits. Ce n'est pas grave, chaque nuit est un nouveau depart.`,
      detail: 'Saviez-vous que meme une utilisation partielle est benefique ? Commencez par 30 minutes ce soir.',
      action_label: 'Besoin d\'aide ? Parlons-en',
      action_type: 'help',
      dismissable: true,
      icon: <Heart className="w-6 h-6" />,
    });
  }

  // IAH en hausse
  const currentIAH = 12.3;
  const previousIAH = 8.1;
  if (currentIAH > previousIAH * 1.3) {
    alerts.push({
      id: 'alert-iah',
      type: 'iah_rising',
      level: 'danger',
      title: 'Votre IAH est en hausse',
      message: `Votre index d'apnee-hypopnee est passe de ${previousIAH} a ${currentIAH} cette semaine. Il est recommande de consulter votre medecin.`,
      detail: 'Une hausse de l\'IAH peut indiquer un besoin d\'ajustement de la pression ou un probleme de masque.',
      action_label: 'Consulter mon medecin',
      action_type: 'consult',
      dismissable: false,
      icon: <TrendingUp className="w-6 h-6" />,
    });
  }

  // Filtre use
  const filterAgeDays = 35;
  if (filterAgeDays > 30) {
    alerts.push({
      id: 'alert-filter',
      type: 'filter_old',
      level: 'info',
      title: 'Pensez a changer votre filtre',
      message: `Votre filtre a ${filterAgeDays} jours. Un filtre propre assure une meilleure qualite de l'air et protege votre machine.`,
      action_label: 'Commander un filtre',
      action_type: 'order_filter',
      dismissable: true,
      icon: <Filter className="w-6 h-6" />,
    });
  }

  return alerts;
}

// ============================================
// HELPERS
// ============================================

function getLevelStyles(level: AlertLevel) {
  const styles: Record<
    AlertLevel,
    {
      bg: string;
      border: string;
      iconBg: string;
      iconColor: string;
      accentColor: string;
    }
  > = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      accentColor: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
      accentColor: 'bg-amber-500 hover:bg-amber-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
      accentColor: 'bg-blue-500 hover:bg-blue-600',
    },
  };
  return styles[level];
}

function getActionIcon(actionType: string) {
  const icons: Record<string, React.ReactNode> = {
    order: <ShoppingCart className="w-4 h-4" />,
    help: <MessageCircle className="w-4 h-4" />,
    consult: <Stethoscope className="w-4 h-4" />,
    order_filter: <ShoppingCart className="w-4 h-4" />,
  };
  return icons[actionType] || <ChevronRight className="w-4 h-4" />;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function SmartAlerts() {
  const [allAlerts] = useState<SmartAlert[]>(() => generateAlerts());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleAlerts = allAlerts.filter(
    (a) => !dismissedIds.has(a.id)
  );

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const handleAction = (alert: SmartAlert) => {
    // En production : navigation ou ouverture de modale selon le type
    switch (alert.action_type) {
      case 'order':
      case 'order_filter':
        // Ouvrir la page de commande
        window.location.href = '#commander';
        break;
      case 'help':
        // Ouvrir l'assistance
        window.location.href = '#assistance';
        break;
      case 'consult':
        // Ouvrir la messagerie medecin
        window.location.href = '#messagerie';
        break;
    }
  };

  if (visibleAlerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center"
      >
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Moon className="w-6 h-6 text-green-500" />
        </div>
        <h4 className="text-sm font-semibold text-green-800 mb-1">
          Tout est en ordre
        </h4>
        <p className="text-xs text-green-600">
          Aucune alerte pour le moment. Continuez votre bon traitement !
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-[#ef4444] to-[#f97316] rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-[17px] font-semibold text-[#1a2b3c]">
            Alertes & recommandations
          </h3>
          <p className="text-[12px] text-[#64748b]">
            {visibleAlerts.length} alerte{visibleAlerts.length > 1 ? 's' : ''}{' '}
            active{visibleAlerts.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        <AnimatePresence>
          {visibleAlerts.map((alert, index) => {
            const styles = getLevelStyles(alert.level);
            const isExpanded = expandedId === alert.id;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`${styles.bg} border ${styles.border} rounded-2xl overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 ${styles.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconColor}`}
                    >
                      {alert.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold text-[#1a2b3c]">
                          {alert.title}
                        </h4>
                        {alert.dismissable && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="p-1 hover:bg-black/5 rounded-lg transition-colors flex-shrink-0 ml-2"
                            aria-label="Fermer"
                          >
                            <X className="w-4 h-4 text-[#86868B]" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[#64748b] leading-relaxed mb-3">
                        {alert.message}
                      </p>

                      {/* Detail expandable */}
                      {alert.detail && (
                        <div className="mb-3">
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : alert.id)
                            }
                            className="text-xs text-[#3b82f6] hover:underline"
                          >
                            {isExpanded ? 'Moins de details' : 'En savoir plus'}
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-[#64748b] mt-2 leading-relaxed bg-white/50 rounded-lg p-3"
                              >
                                {alert.detail}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Action button */}
                      <button
                        onClick={() => handleAction(alert)}
                        className={`inline-flex items-center gap-2 px-4 py-2 ${styles.accentColor} text-white rounded-xl text-xs font-medium transition-colors`}
                      >
                        {getActionIcon(alert.action_type)}
                        {alert.action_label}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default SmartAlerts;
