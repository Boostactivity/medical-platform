import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { AlertCard } from './AlertCard';
import { motion } from 'motion/react';
import { Filter, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

// Type pour les alertes Supabase (table alerts_queue)
interface SupabaseAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patient_id: string;
  title: string;
  message: string;
  recommendation?: string;
  context?: any;
  status: 'new' | 'acknowledged' | 'resolved';
  assigned_to?: string;
  resolved_at?: string;
  resolved_by?: string;
  auto_assigned?: boolean;
  suggested_actions?: string[];
  estimated_time?: number;
  created_at: string;
  updated_at: string;
}

// Type pour les patients
interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

// Type pour les alertes formatées pour AlertCard
interface FormattedAlert {
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

type FilterType = 'all' | 'critical' | 'resolved';

// Mapper les types d'alertes Supabase vers les types AlertCard
function mapAlertType(type: string): 'disconnect' | 'mask_old' | 'leak' | 'iah_high' | 'no_data' | 'follow_up' {
  const typeMap: Record<string, 'disconnect' | 'mask_old' | 'leak' | 'iah_high' | 'no_data' | 'follow_up'> = {
    'DEVICE_OFFLINE': 'disconnect',
    'CONSUMABLE_OVERDUE': 'mask_old',
    'LEAK_CRITICAL': 'leak',
    'LEAK_MODERATE': 'leak',
    'AHI_HIGH': 'iah_high',
    'AHI_MODERATE': 'iah_high',
    'AHI_VERY_HIGH': 'iah_high',
    'LOW_USAGE': 'no_data',
    'MASK_INSTABILITY': 'mask_old',
    'SCORE_EXCELLENT': 'follow_up',
  };
  return typeMap[type] || 'follow_up';
}

// Mapper les sévérités
function mapSeverity(severity: string): 'low' | 'medium' | 'high' {
  if (severity === 'critical') return 'high';
  if (severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

// Mapper les alertes Supabase vers le format AlertCard
function mapSupabaseAlertToCardAlert(alert: SupabaseAlert, patient?: Patient): FormattedAlert {
  return {
    id: alert.id,
    type: mapAlertType(alert.type),
    patientName: patient?.name || 'Patient inconnu',
    patientId: alert.patient_id,
    patientPhone: patient?.phone,
    severity: mapSeverity(alert.severity),
    message: alert.message,
    timestamp: alert.created_at,
    details: alert.recommendation,
    patient: patient ? {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
    } : undefined,
  };
}

export function MonitoringDashboard() {
  const [alerts, setAlerts] = useState<FormattedAlert[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fonction pour récupérer les alertes depuis Supabase
  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Construire la requête en fonction du filtre
      let query = supabase
        .from('alerts_queue')
        .select('*')
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filter === 'critical') {
        query = query.in('severity', ['critical', 'high']);
      } else if (filter === 'resolved') {
        query = query.eq('status', 'resolved');
      } else {
        // Pour 'all', on montre les alertes non résolues
        query = query.in('status', ['new', 'acknowledged']);
      }

      const { data: alertsData, error: alertsError } = await query;

      if (alertsError) {
        console.error('Erreur lors de la récupération des alertes:', alertsError);
        throw alertsError;
      }

      // Récupérer les infos des patients associés
      if (alertsData && alertsData.length > 0) {
        const patientIds = [...new Set(alertsData.map(a => a.patient_id).filter(Boolean))];
        
        const { data: patients, error: patientsError } = await supabase
          .from('users')
          .select('id, name, phone, email')
          .in('id', patientIds);

        if (patientsError) {
          console.error('Erreur lors de la récupération des patients:', patientsError);
        }

        // Créer un map patient_id -> patient
        const patientMap = new Map<string, Patient>();
        patients?.forEach(p => patientMap.set(p.id, p));

        // Mapper les alertes avec les infos patients
        const formattedAlerts = (alertsData as SupabaseAlert[]).map(alert => 
          mapSupabaseAlertToCardAlert(alert, patientMap.get(alert.patient_id))
        );

        setAlerts(formattedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des alertes:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect pour charger les alertes au montage et lors du changement de filtre
  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  // useEffect pour auto-refresh toutes les 30 secondes
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAlerts();
    }, 30000); // 30 secondes

    // Cleanup: arrêter l'intervalle au démontage
    return () => clearInterval(intervalId);
  }, [filter]); // Re-créer l'intervalle si le filtre change

  // Gérer l'actualisation manuelle
  const handleRefresh = () => {
    fetchAlerts();
  };

  // Résoudre une alerte
  const handleResolve = async (alert: FormattedAlert) => {
    // L'alerte est déjà résolue dans AlertCard, on rafraîchit juste la liste
    await fetchAlerts();
  };

  // Ignorer une alerte
  const handleIgnore = async (alertId: string) => {
    // L'alerte est déjà ignorée dans AlertCard, on rafraîchit juste la liste
    await fetchAlerts();
  };

  // Créer une intervention
  const handleCreateIntervention = async (alert: FormattedAlert) => {
    console.log('Créer une intervention pour:', alert);
    // TODO: Implémenter la création d'intervention
  };

  // Documenter une alerte
  const handleDocument = async (alert: FormattedAlert) => {
    console.log('Documenter l\'alerte:', alert);
    // TODO: Implémenter la documentation
  };

  // Calculer les statistiques
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'high').length,
    resolved: alerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl text-[#1D1D1F] mb-2">
                Monitoring des Alertes
              </h1>
              <p className="text-lg text-[#86868B]">
                Surveillance en temps réel des alertes patients
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-12 h-12 bg-[#007AFF]/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Total Alertes</p>
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
                <div className="w-12 h-12 bg-[#FF3B30]/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#FF3B30]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Critiques</p>
                  <p className="text-3xl text-[#1D1D1F]">{stats.critical}</p>
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
                <div className="w-12 h-12 bg-[#34C759]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#34C759]" />
                </div>
                <div>
                  <p className="text-sm text-[#86868B]">Résolues</p>
                  <p className="text-3xl text-[#1D1D1F]">{stats.resolved}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5EA]">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#86868B]" />
              <span className="text-sm text-[#86868B]">Filtrer :</span>
              
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filter === 'all'
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                  }`}
                >
                  Tout
                </button>
                
                <button
                  onClick={() => setFilter('critical')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filter === 'critical'
                      ? 'bg-[#FF3B30] text-white'
                      : 'bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                  }`}
                >
                  Critiques
                </button>
                
                <button
                  onClick={() => setFilter('resolved')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filter === 'resolved'
                      ? 'bg-[#34C759] text-white'
                      : 'bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                  }`}
                >
                  Résolues
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading && (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-[#007AFF] animate-spin mx-auto mb-4" />
              <p className="text-[#86868B]">Chargement des alertes...</p>
            </div>
          )}

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#FF3B30] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg text-[#FF3B30] mb-2">
                    Erreur de chargement
                  </h3>
                  <p className="text-[#86868B]">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && alerts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E5EA]">
              <CheckCircle className="w-16 h-16 text-[#34C759] mx-auto mb-4" />
              <p className="text-xl text-[#1D1D1F] mb-2">
                Aucune alerte {filter === 'critical' ? 'critique' : filter === 'resolved' ? 'résolue' : 'active'}
              </p>
              <p className="text-[#86868B]">
                Tout est sous contrôle !
              </p>
            </div>
          )}

          {!isLoading && !error && alerts.length > 0 && alerts.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={handleResolve}
              onIgnore={handleIgnore}
              onCreateIntervention={handleCreateIntervention}
              onDocument={handleDocument}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
