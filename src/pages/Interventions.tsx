import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { motion } from 'motion/react';
import { CheckCircle, Clock, User, AlertTriangle, Calendar, RefreshCw, Search } from 'lucide-react';

// Type pour les alertes résolues
interface ResolvedAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patient_id: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string;
  resolved_by?: string;
  // Infos patient
  patient_name?: string;
  patient_phone?: string;
}

// Mapper les types d'alertes vers labels français
function getAlertTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'DEVICE_OFFLINE': 'Machine déconnectée',
    'CONSUMABLE_OVERDUE': 'Masque à remplacer',
    'LEAK_CRITICAL': 'Fuites critiques',
    'LEAK_MODERATE': 'Fuites modérées',
    'AHI_HIGH': 'IAH élevé',
    'AHI_MODERATE': 'IAH modéré',
    'AHI_VERY_HIGH': 'IAH très élevé',
    'LOW_USAGE': 'Faible utilisation',
    'MASK_INSTABILITY': 'Instabilité masque',
    'SCORE_EXCELLENT': 'Score excellent',
  };
  return typeLabels[type] || type;
}

// Couleurs pour les types d'alertes
function getAlertTypeColor(type: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'DEVICE_OFFLINE': { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]' },
    'CONSUMABLE_OVERDUE': { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]' },
    'LEAK_CRITICAL': { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]' },
    'LEAK_MODERATE': { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]' },
    'AHI_HIGH': { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]' },
    'AHI_MODERATE': { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]' },
    'AHI_VERY_HIGH': { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]' },
    'LOW_USAGE': { bg: 'bg-[#007AFF]/10', text: 'text-[#007AFF]' },
    'MASK_INSTABILITY': { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]' },
    'SCORE_EXCELLENT': { bg: 'bg-[#34C759]/10', text: 'text-[#34C759]' },
  };
  return colorMap[type] || { bg: 'bg-[#86868B]/10', text: 'text-[#86868B]' };
}

// Couleurs pour les sévérités
function getSeverityBadge(severity: string): { label: string; bg: string; text: string } {
  const badges: Record<string, { label: string; bg: string; text: string }> = {
    'critical': { label: 'Critique', bg: 'bg-[#FF3B30]/20', text: 'text-[#FF3B30]' },
    'high': { label: 'Élevée', bg: 'bg-[#FF9500]/20', text: 'text-[#FF9500]' },
    'medium': { label: 'Moyenne', bg: 'bg-[#FFD60A]/20', text: 'text-[#FFD60A]' },
    'low': { label: 'Faible', bg: 'bg-[#34C759]/20', text: 'text-[#34C759]' },
  };
  return badges[severity] || { label: severity, bg: 'bg-[#86868B]/20', text: 'text-[#86868B]' };
}

// Calculer la durée entre création et résolution
function calculateDuration(createdAt: string, resolvedAt: string): string {
  const created = new Date(createdAt);
  const resolved = new Date(resolvedAt);
  const diffMs = resolved.getTime() - created.getTime();
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}j ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  } else {
    return `${minutes}min`;
  }
}

export function Interventions() {
  const [alerts, setAlerts] = useState<ResolvedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  // Fonction pour récupérer les alertes résolues
  const fetchResolvedAlerts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Récupérer les alertes résolues triées par date de résolution
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts_queue')
        .select('*')
        .eq('status', 'resolved')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false });

      if (alertsError) {
        console.error('Erreur lors de la récupération des alertes résolues:', alertsError);
        throw alertsError;
      }

      // Récupérer les infos des patients
      if (alertsData && alertsData.length > 0) {
        const patientIds = [...new Set(alertsData.map(a => a.patient_id).filter(Boolean))];
        
        const { data: patients, error: patientsError } = await supabase
          .from('users')
          .select('id, name, phone')
          .in('id', patientIds);

        if (patientsError) {
          console.error('Erreur lors de la récupération des patients:', patientsError);
        }

        // Créer un map patient_id -> patient
        const patientMap = new Map();
        patients?.forEach(p => patientMap.set(p.id, p));

        // Enrichir les alertes avec les infos patients
        const enrichedAlerts = alertsData.map(alert => ({
          ...alert,
          patient_name: patientMap.get(alert.patient_id)?.name || 'Patient inconnu',
          patient_phone: patientMap.get(alert.patient_id)?.phone,
        }));

        setAlerts(enrichedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des interventions:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect pour charger les interventions au montage
  useEffect(() => {
    fetchResolvedAlerts();
  }, []);

  // Gérer l'actualisation
  const handleRefresh = () => {
    fetchResolvedAlerts();
  };

  // Filtrer par recherche
  const filteredAlerts = alerts.filter(alert => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      alert.patient_name?.toLowerCase().includes(search) ||
      getAlertTypeLabel(alert.type).toLowerCase().includes(search) ||
      alert.message.toLowerCase().includes(search)
    );
  });

  // Statistiques
  const stats = {
    total: alerts.length,
    thisMonth: alerts.filter(a => {
      const resolvedDate = new Date(a.resolved_at);
      const now = new Date();
      return resolvedDate.getMonth() === now.getMonth() && 
             resolvedDate.getFullYear() === now.getFullYear();
    }).length,
    avgDuration: alerts.length > 0 
      ? Math.round(
          alerts.reduce((acc, a) => {
            const diff = new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime();
            return acc + diff;
          }, 0) / alerts.length / 3600000 // Convertir en heures
        )
      : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-[#1D1D1F] mb-2">
                Historique des Interventions
              </h1>
              <p className="text-base sm:text-lg text-[#86868B]">
                Toutes les alertes résolues
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Actualiser la liste"
              className="flex items-center justify-center gap-2 px-4 py-2 min-h-12 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#34C759]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Total Résolues</p>
                  <p className="text-3xl text-[#1D1D1F]">{stats.total}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Ce Mois</p>
                  <p className="text-3xl text-[#1D1D1F]">{stats.thisMonth}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FF9500]/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#FF9500]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Durée Moy.</p>
                  <p className="text-3xl text-[#1D1D1F]">{stats.avgDuration}h</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Barre de recherche */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5EA]">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-[#86868B]" />
              <input
                type="text"
                placeholder="Rechercher par patient, type d'alerte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-[#1D1D1F] placeholder:text-[#86868B]"
              />
            </div>
          </div>
        </div>

        {/* Table des interventions */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
          {isLoading && (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-[#007AFF] animate-spin mx-auto mb-4" />
              <p className="text-[#86868B]">Chargement des interventions...</p>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-[#FF3B30] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg text-[#FF3B30] mb-2">
                      Erreur de chargement
                    </h3>
                    <p className="text-[#86868B]">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredAlerts.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-[#34C759] mx-auto mb-4" />
              <p className="text-xl text-[#1D1D1F] mb-2">
                Aucune intervention trouvée
              </p>
              <p className="text-[#86868B]">
                {searchTerm ? 'Essayez un autre terme de recherche' : 'Aucune alerte résolue pour le moment'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredAlerts.length > 0 && (
            <>
              {/* Table Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F2F2F7]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm text-[#86868B]">
                        Patient
                      </th>
                      <th className="px-6 py-4 text-left text-sm text-[#86868B]">
                        Type d&apos;Alerte
                      </th>
                      <th className="px-6 py-4 text-left text-sm text-[#86868B]">
                        Sévérité
                      </th>
                      <th className="px-6 py-4 text-left text-sm text-[#86868B]">
                        Résolution
                      </th>
                      <th className="px-6 py-4 text-left text-sm text-[#86868B]">
                        Durée
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {filteredAlerts.map((alert, index) => {
                      const typeColor = getAlertTypeColor(alert.type);
                      const severityBadge = getSeverityBadge(alert.severity);
                      
                      return (
                        <motion.tr
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-[#F8F9FA] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#007AFF]/10 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-[#007AFF]" />
                              </div>
                              <div>
                                <p className="text-sm text-[#1D1D1F]">
                                  {alert.patient_name}
                                </p>
                                {alert.patient_phone && (
                                  <p className="text-xs text-[#86868B]">
                                    {alert.patient_phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${typeColor.bg} ${typeColor.text}`}>
                              {getAlertTypeLabel(alert.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${severityBadge.bg} ${severityBadge.text}`}>
                              {severityBadge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-[#1D1D1F]">
                              {new Date(alert.resolved_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-[#86868B]">
                              {new Date(alert.resolved_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#86868B]" />
                              <span className="text-sm text-[#1D1D1F]">
                                {calculateDuration(alert.created_at, alert.resolved_at)}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden divide-y divide-[#E5E5EA]">
                {filteredAlerts.map((alert, index) => {
                  const typeColor = getAlertTypeColor(alert.type);
                  const severityBadge = getSeverityBadge(alert.severity);
                  
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-[#007AFF]/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-[#007AFF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1D1D1F] mb-1">
                            {alert.patient_name}
                          </p>
                          {alert.patient_phone && (
                            <p className="text-xs text-[#86868B]">
                              {alert.patient_phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${typeColor.bg} ${typeColor.text}`}>
                          {getAlertTypeLabel(alert.type)}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${severityBadge.bg} ${severityBadge.text}`}>
                          {severityBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#86868B]">
                        <div>
                          <p>
                            {new Date(alert.resolved_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{calculateDuration(alert.created_at, alert.resolved_at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        {!isLoading && !error && filteredAlerts.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-[#86868B]">
              {filteredAlerts.length} intervention{filteredAlerts.length > 1 ? 's' : ''} affichée{filteredAlerts.length > 1 ? 's' : ''}
              {searchTerm && ` sur ${alerts.length} au total`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
