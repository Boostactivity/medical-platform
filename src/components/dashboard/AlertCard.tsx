import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Wifi, Calendar, Wind, Clock, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';

export interface Alert {
  id: string;
  type: 'disconnect' | 'mask_old' | 'leak' | 'iah_high' | 'no_data' | 'follow_up';
  patientName: string;
  patientId: string;
  patientPhone?: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  details?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface AlertCardProps {
  alert: Alert;
  onResolve?: (alert: Alert) => void;
  onCall?: (alert: Alert) => void;
  onCreateIntervention?: (alert: Alert) => void;
  onIgnore?: (id: string) => void;
  onDocument?: (alert: Alert) => void;
  index?: number;
}

export function AlertCard({ alert, onResolve, onCall, onCreateIntervention, onIgnore, onDocument, index = 0 }: AlertCardProps) {
  // État pour le feedback visuel lors de la résolution
  const [isResolving, setIsResolving] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const supabase = createClient();

  // Fonction pour gérer l'appel téléphonique
  const handlePhoneClick = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Fonction pour résoudre l'alerte directement dans Supabase
  const handleResolveAlert = async () => {
    setIsResolving(true);
    
    try {
      const { error } = await supabase
        .from('alerts_queue')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alert.id);

      if (error) {
        console.error('Erreur lors de la résolution de l\'alerte:', error);
        throw error;
      }

      // Appeler le callback onResolve si fourni
      if (onResolve) {
        onResolve(alert);
      }
    } catch (error) {
      console.error('Erreur lors de la résolution:', error);
      // Vous pouvez ajouter un toast/notification d'erreur ici
    } finally {
      setIsResolving(false);
    }
  };

  // Fonction pour ignorer l'alerte (marquer comme acknowledged)
  const handleIgnoreAlert = async () => {
    setIsIgnoring(true);
    
    try {
      const { error } = await supabase
        .from('alerts_queue')
        .update({
          status: 'acknowledged',
        })
        .eq('id', alert.id);

      if (error) {
        console.error('Erreur lors de l\'ignorance de l\'alerte:', error);
        throw error;
      }

      // Appeler le callback onIgnore si fourni
      if (onIgnore) {
        onIgnore(alert.id);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ignorance:', error);
      // Vous pouvez ajouter un toast/notification d'erreur ici
    } finally {
      setIsIgnoring(false);
    }
  };

  const getAlertConfig = () => {
    const configs = {
      disconnect: {
        icon: <Wifi className="w-5 h-5" />,
        color: '#CE0500',
        bg: 'bg-[#CE0500]/10',
        label: 'Machine déconnectée',
      },
      mask_old: {
        icon: <Calendar className="w-5 h-5" />,
        color: '#B34000',
        bg: 'bg-[#B34000]/10',
        label: 'Masque à remplacer',
      },
      leak: {
        icon: <Wind className="w-5 h-5" />,
        color: '#B34000',
        bg: 'bg-[#B34000]/10',
        label: 'Fuites importantes',
      },
      iah_high: {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: '#CE0500',
        bg: 'bg-[#CE0500]/10',
        label: 'IAH élevé',
      },
      no_data: {
        icon: <Clock className="w-5 h-5" />,
        color: '#007AFF',
        bg: 'bg-[#007AFF]/10',
        label: 'Pas de données',
      },
      follow_up: {
        icon: <CheckCircle className="w-5 h-5" />,
        color: '#18753C',
        bg: 'bg-[#18753C]/10',
        label: 'Suivi',
      },
    };
    return configs[alert.type];
  };

  const getSeverityBadge = () => {
    const badges = {
      low: { text: 'Faible', color: '#B34000', bg: 'bg-[#B34000]/20' },
      medium: { text: 'Moyen', color: '#B34000', bg: 'bg-[#B34000]/20' },
      high: { text: 'Urgent', color: '#CE0500', bg: 'bg-[#CE0500]/20' },
    };
    return badges[alert.severity];
  };

  const config = getAlertConfig();
  const severityBadge = getSeverityBadge();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl p-5 hover:shadow-md transition-all border border-[#D9D5CC]"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
          style={{ color: config.color }}
        >
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-[#1A1A1A]">{config.label}</h4>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${severityBadge.bg}`}
                  style={{ color: severityBadge.color }}
                >
                  {severityBadge.text}
                </span>
              </div>
              <p className="text-lg text-[#1A1A1A] mb-1">{alert.patientName}</p>
              
              {alert.patientPhone && (
                <a
                  href={`tel:${alert.patientPhone}`}
                  className="inline-flex items-center gap-2 text-sm text-[#007AFF] hover:text-[#0051D5] mb-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {alert.patientPhone}
                </a>
              )}
              
              <p className="text-sm text-[#5C5C5C] mb-2">{alert.message}</p>
              {alert.details && (
                <p className="text-xs text-[#5C5C5C] italic">{alert.details}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[#5C5C5C]">
              {new Date(alert.timestamp).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            <div className="flex items-center gap-2">
              {onDocument && (
                <button
                  onClick={() => onDocument(alert)}
                  className="px-4 py-2 bg-[#007AFF] text-white text-sm rounded-lg hover:bg-[#0051D5] transition-all"
                >
                  Documenter
                </button>
              )}
              {onCreateIntervention && (
                <button
                  onClick={() => onCreateIntervention(alert)}
                  className="px-4 py-2 bg-[#18753C] text-white text-sm rounded-lg hover:bg-[#18753C] transition-all"
                >
                  Créer une intervention
                </button>
              )}
              {onResolve && (
                <button
                  onClick={handleResolveAlert}
                  disabled={isResolving}
                  className="px-4 py-2 bg-[#18753C] text-white text-sm rounded-lg hover:bg-[#18753C] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isResolving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isResolving ? 'Résolution...' : 'Résoudre'}
                </button>
              )}
              {onIgnore && (
                <button
                  onClick={handleIgnoreAlert}
                  disabled={isIgnoring}
                  className="px-4 py-2 bg-[#CE0500] text-white text-sm rounded-lg hover:bg-[#FF1A1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isIgnoring && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isIgnoring ? 'Traitement...' : 'Ignorer'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface AlertListProps {
  alerts: Alert[];
  onResolve?: (alert: Alert) => void;
  onCall?: (alert: Alert) => void;
  onCreateIntervention?: (alert: Alert) => void;
  onIgnore?: (id: string) => void;
  onDocument?: (alert: Alert) => void;
}

export function AlertList({ alerts, onResolve, onCall, onCreateIntervention, onIgnore, onDocument }: AlertListProps) {
  const highPriority = alerts.filter(a => a.severity === 'high').length;
  const mediumPriority = alerts.filter(a => a.severity === 'medium').length;
  const lowPriority = alerts.filter(a => a.severity === 'low').length;

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-[#5C5C5C] text-lg">Aucune alerte active</p>
        </div>
      ) : (
        alerts.map((alert, index) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onResolve={onResolve}
            onCall={onCall}
            onCreateIntervention={onCreateIntervention}
            onIgnore={onIgnore}
            onDocument={onDocument}
            index={index}
          />
        ))
      )}
    </div>
  );
}