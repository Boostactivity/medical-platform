'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Package, Activity, LogOut, Bell, Phone, AlertCircle, CheckCircle, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Hooks - Version 2.0.1
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useRealtimeInterventions } from '../hooks/useRealtimeInterventions';
import { usePatients } from '../hooks/usePatients';

// Components
import { AlertList } from '../components/dashboard/AlertCard';
import { InterventionTimeline } from '../components/dashboard/InterventionTimeline';
import { CreateInterventionModal, InterventionData } from '../components/admin/CreateInterventionModal';
import { ResolveAlertModal, ResolutionData } from '../components/admin/ResolveAlertModal';
import { CompleteInterventionModal, CompletionData } from '../components/admin/CompleteInterventionModal';
// SetupWarningBanner removed (component file missing)

// API
import prestataireApi from '../utils/api-prestataire';

import type { Alert } from '../hooks/useRealtimeAlerts';
import type { Intervention } from '../hooks/useRealtimeInterventions';

// PHASE 3: Import Business Components
import { BusinessMetrics } from '../components/business/BusinessMetrics';
import { RevenueRiskAlert } from '../components/business/RevenueRiskAlert';

export function DashboardAdmin() {
  const navigate = useNavigate();
  
  // Auth verification state
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Views and filters
  const [activeView, setActiveView] = useState<'alerts' | 'interventions' | 'logistics'>('alerts');
  const [interventionFilter, setInterventionFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  
  // Modal states
  const [createInterventionModal, setCreateInterventionModal] = useState<{ isOpen: boolean; alert?: Alert | null }>({ isOpen: false, alert: null });
  const [resolveAlertModal, setResolveAlertModal] = useState<{ isOpen: boolean; alert?: Alert | null }>({ isOpen: false, alert: null });
  const [completeInterventionModal, setCompleteInterventionModal] = useState<{ isOpen: boolean; intervention?: Intervention | null }>({ isOpen: false, intervention: null });
  
  // History
  const [history, setHistory] = useState<any[]>([]);
  
  // Load data with realtime hooks
  const { alerts, loading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useRealtimeAlerts(isAuthenticated);
  const { interventions, loading: interventionsLoading, error: interventionsError, refresh: refreshInterventions } = useRealtimeInterventions(interventionFilter, isAuthenticated);
  const { patients, loading: patientsLoading, refresh: refreshPatients } = usePatients(isAuthenticated);
  
  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { createClient } = await import('../utils/supabase/client');
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('[DashboardAdmin] No valid session, redirecting to login');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_type');
          localStorage.removeItem('user_role');
          navigate('/espace-admin');
          toast.error('Session expirée - veuillez vous reconnecter');
        } else {
          localStorage.setItem('access_token', session.access_token);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('[DashboardAdmin] Auth check error:', error);
        navigate('/espace-admin');
      } finally {
        setIsAuthChecking(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // If tables don't exist, redirect to setup page
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Convert errors to strings safely
    const getErrorMessage = (error: Error | string | null | undefined): string => {
      if (!error) return '';
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message || '');
      }
      return String(error);
    };

    const alertsErrorMsg = getErrorMessage(alertsError);
    const interventionsErrorMsg = getErrorMessage(interventionsError);
    
    // Check for table existence errors
    const hasTableError = 
      alertsErrorMsg.includes('does not exist') || 
      alertsErrorMsg.includes('PGRST205') ||
      interventionsErrorMsg.includes('does not exist') ||
      interventionsErrorMsg.includes('PGRST205');

    if (hasTableError && !alertsLoading && !interventionsLoading) {
      console.log('[DashboardAdmin] 🚨 PGRST205 detected - tables not found, redirecting to setup...');
      toast.error('⚠️ Configuration requise', {
        description: 'Les tables SQL sont manquantes. Redirection vers la page de setup...',
        duration: 5000,
      });
      navigate('/setup-prestataire');
    }
  }, [alertsError, interventionsError, alertsLoading, interventionsLoading, navigate, isAuthenticated]);

  // Handle auth errors
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Convert errors to strings safely
    const getErrorMessage = (error: Error | string | null | undefined): string => {
      if (!error) return '';
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message || '');
      }
      return String(error);
    };

    const alertsErrorMsg = getErrorMessage(alertsError);
    const interventionsErrorMsg = getErrorMessage(interventionsError);
    
    const hasAuthError = 
      alertsErrorMsg.includes('Invalid JWT') ||
      alertsErrorMsg.includes('Session expired') ||
      interventionsErrorMsg.includes('Invalid JWT') ||
      interventionsErrorMsg.includes('Session expired');

    if (hasAuthError) {
      console.log('[DashboardAdmin] Auth error detected, redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_type');
      localStorage.removeItem('user_role');
      toast.error('Session expirée - veuillez vous reconnecter', {
        duration: 3000,
      });
      setTimeout(() => {
        navigate('/espace-admin');
      }, 1000);
    }
  }, [alertsError, interventionsError, navigate, isAuthenticated]);

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/espace-admin');
    toast.success('Déconnexion réussie');
  };

  const handleCallPatient = (alert: Alert) => {
    setResolveAlertModal({ isOpen: true, alert });
  };

  const handleDocumentAlert = (alert: Alert) => {
    setResolveAlertModal({ isOpen: true, alert });
  };

  const handleResolveAlert = async (data: ResolutionData) => {
    try {
      const alert = resolveAlertModal.alert;
      if (!alert) return;

      await prestataireApi.alerts.resolve(alert.id, {
        method: data.method,
        notes: data.notes,
      });

      setHistory(prev => [{
        type: 'alert_resolved',
        alert,
        resolution: data,
        timestamp: new Date().toISOString(),
      }, ...prev]);

      setResolveAlertModal({ isOpen: false, alert: null });
      toast.success('✅ Alerte résolue et documentée avec succès');
      refreshAlerts();
    } catch (error: any) {
      console.error('[handleResolveAlert] Error:', error);
      toast.error(`❌ Erreur lors de la résolution : ${error.message}`);
    }
  };

  const handleIgnoreAlert = async (alertId: string) => {
    try {
      await prestataireApi.alerts.ignore(alertId);
      toast.success('Alerte ignorée');
      refreshAlerts();
    } catch (error: any) {
      console.error('[handleIgnoreAlert] Error:', error);
      toast.error('Erreur lors de l\'ignorance de l\'alerte');
    }
  };

  const handleCreateInterventionFromAlert = (alert: Alert) => {
    setCreateInterventionModal({ isOpen: true, alert });
  };

  const handleCreateIntervention = async (data: InterventionData) => {
    try {
      const alert = createInterventionModal.alert;
      const patientId = alert?.patient?.id || data.patientId;
      if (!patientId) {
        toast.error('Patient non trouvé');
        return;
      }

      const currentUserId = 'demo-technician-id';

      await prestataireApi.interventions.create({
        patient_id: patientId,
        technician_id: currentUserId,
        type: data.type,
        date: data.date,
        notes: data.notes,
        material: data.material,
        alert_id: alert?.id,
      });

      setHistory(prev => [{
        type: 'intervention_created',
        intervention: data,
        fromAlert: alert,
        timestamp: new Date().toISOString(),
      }, ...prev]);

      setCreateInterventionModal({ isOpen: false, alert: null });
      toast.success('Intervention créée avec succès');
      refreshInterventions();
      refreshAlerts();
    } catch (error: any) {
      console.error('[handleCreateIntervention] Error:', error);
      toast.error('Erreur lors de la création de l\'intervention');
    }
  };

  const handleStartIntervention = async (interventionId: string) => {
    try {
      await prestataireApi.interventions.start(interventionId);
      toast.success('Intervention démarrée');
      refreshInterventions();
    } catch (error: any) {
      console.error('[handleStartIntervention] Error:', error);
      toast.error('Erreur lors du démarrage de l\'intervention');
    }
  };

  const handleCompleteIntervention = (intervention: Intervention) => {
    setCompleteInterventionModal({ isOpen: true, intervention });
  };

  const handleCompleteInterventionSubmit = async (data: CompletionData) => {
    try {
      const intervention = completeInterventionModal.intervention;
      if (!intervention) return;

      await prestataireApi.interventions.complete(intervention.id, {
        duration: data.duration,
        materialUsed: data.materialUsed,
        notes: data.notes,
        patientSatisfaction: data.patientSatisfaction,
        followUpNeeded: data.followUpNeeded,
        followUpNotes: data.followUpNotes,
      });

      setHistory(prev => [{
        type: 'intervention_completed',
        intervention,
        completion: data,
        timestamp: new Date().toISOString(),
      }, ...prev]);

      setCompleteInterventionModal({ isOpen: false, intervention: null });
      toast.success('Intervention terminée avec succès');
      refreshInterventions();
      if (data.followUpNeeded) {
        toast.info('Une nouvelle alerte de suivi a été créée');
        refreshAlerts();
      }
    } catch (error: any) {
      console.error('[handleCompleteInterventionSubmit] Error:', error);
      toast.error('Erreur lors de la clôture de l\'intervention');
    }
  };

  // Stats calculation
  const stats = {
    alerts: {
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
    },
    interventions: {
      total: interventions.length,
      scheduled: interventions.filter(i => i.status === 'scheduled').length,
      in_progress: interventions.filter(i => i.status === 'in_progress').length,
      completed: interventions.filter(i => i.status === 'completed').length,
    },
    patients: {
      total: patients.length,
    },
  };

  const isLoading = alertsLoading || interventionsLoading || patientsLoading;

  // Show loading screen while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#007AFF] animate-spin mx-auto mb-4" />
          <p className="text-[#1D1D1F] mb-2">Vérification de l'authentification...</p>
          <p className="text-sm text-[#86868B]">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-[#1D1D1F] mb-1">Dashboard Prestataire</h1>
              <p className="text-sm text-[#86868B]">Gestion des alertes et interventions</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  refreshAlerts();
                  refreshInterventions();
                  refreshPatients();
                }}
                className="flex items-center gap-2 px-4 py-2 text-[#007AFF] hover:text-[#0051D5] transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Actualiser</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF3B30] text-white rounded-lg hover:bg-[#D32F2F] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* SetupWarningBanner removed */}

        {/* PHASE 3: Business Metrics - Revenue Risk Alert */}
        {/* TEMPORAIREMENT DÉSACTIVÉ - Routes backend /business/revenue-at-risk et /business/dashboard non implémentées */}
        {/* <div className="mb-8">
          <RevenueRiskAlert onPatientClick={(id) => console.log('Navigate to patient:', id)} />
        </div> */}

        {/* PHASE 3: Business Dashboard KPIs */}
        {/* TEMPORAIREMENT DÉSACTIVÉ - Routes backend /business/revenue-at-risk et /business/dashboard non implémentées */}
        {/* <div className="mb-8">
          <BusinessMetrics />
        </div> */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#FF3B30]/10 rounded-xl">
                <Bell className="w-6 h-6 text-[#FF3B30]" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl text-[#1D1D1F]">{stats.alerts.total}</span>
                <span className="text-sm text-[#86868B]">Alertes actives</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#86868B]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]"></span>
                {stats.alerts.high} urgentes
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF9500]"></span>
                {stats.alerts.medium} moyennes
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#007AFF]/10 rounded-xl">
                <Activity className="w-6 h-6 text-[#007AFF]" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl text-[#1D1D1F]">{stats.interventions.total}</span>
                <span className="text-sm text-[#86868B]">Interventions</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#86868B]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF9500]"></span>
                {stats.interventions.scheduled} planifiées
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#007AFF]"></span>
                {stats.interventions.in_progress} en cours
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#34C759]/10 rounded-xl">
                <Users className="w-6 h-6 text-[#34C759]" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl text-[#1D1D1F]">{stats.patients.total}</span>
                <span className="text-sm text-[#86868B]">Patients</span>
              </div>
            </div>
            <div className="text-xs text-[#86868B]">
              Base de données Supabase
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-white rounded-xl p-2 border border-[#D2D2D7]">
          <button
            onClick={() => setActiveView('alerts')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all ${
              activeView === 'alerts'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              <span>Alertes ({stats.alerts.total})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('interventions')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all ${
              activeView === 'interventions'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Interventions ({stats.interventions.total})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('logistics')}
            className={`flex-1 px-4 py-3 rounded-lg text-sm transition-all ${
              activeView === 'logistics'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="w-4 h-4" />
              <span>Logistique</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeView === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-[#1D1D1F]">Alertes actives</h2>
                <button
                  onClick={() => setCreateInterventionModal({ isOpen: true, alert: null })}
                  className="px-4 py-2 bg-[#007AFF] text-white text-sm rounded-lg hover:bg-[#0051D5] transition-all"
                >
                  + Créer intervention
                </button>
              </div>

              {alertsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin mx-auto mb-4" />
                  <p className="text-[#86868B]">Chargement des alertes...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-[#34C759] mx-auto mb-4" />
                  <p className="text-[#86868B]">Aucune alerte active</p>
                  <p className="text-xs text-[#86868B] mt-2">Toutes les alertes ont été traitées ✨</p>
                </div>
              ) : (
                <AlertList
                  alerts={alerts}
                  onResolve={handleResolveAlert}
                  onDocument={handleDocumentAlert}
                  onCreateIntervention={handleCreateInterventionFromAlert}
                  onIgnore={handleIgnoreAlert}
                />
              )}
            </motion.div>
          )}

          {activeView === 'interventions' && (
            <motion.div
              key="interventions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl text-[#1D1D1F]">Interventions</h2>
                <div className="flex items-center gap-2">
                  {(['all', 'scheduled', 'in_progress', 'completed'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setInterventionFilter(filter)}
                      className={`px-3 py-1 text-xs rounded-lg transition-all ${
                        interventionFilter === filter
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5E7]'
                      }`}
                    >
                      {filter === 'all' && 'Toutes'}
                      {filter === 'scheduled' && 'Planifiées'}
                      {filter === 'in_progress' && 'En cours'}
                      {filter === 'completed' && 'Terminées'}
                    </button>
                  ))}
                </div>
              </div>

              {interventionsLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin mx-auto mb-4" />
                  <p className="text-[#86868B]">Chargement des interventions...</p>
                </div>
              ) : interventions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
                  <p className="text-[#86868B]">Aucune intervention</p>
                  <p className="text-xs text-[#86868B] mt-2">
                    {interventionFilter === 'all' ? 'Créez votre première intervention' : `Aucune intervention ${interventionFilter}`}
                  </p>
                </div>
              ) : (
                <InterventionTimeline
                  interventions={interventions}
                  onStart={handleStartIntervention}
                  onComplete={handleCompleteIntervention}
                />
              )}
            </motion.div>
          )}

          {activeView === 'logistics' && (
            <motion.div
              key="logistics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-6 border border-[#D2D2D7]"
            >
              <h2 className="text-xl text-[#1D1D1F] mb-6">Logistique</h2>
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-[#86868B] mx-auto mb-4" />
                <p className="text-[#86868B]">Module logistique en développement</p>
                <p className="text-xs text-[#86868B] mt-2">Gestion du stock et des commandes</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <CreateInterventionModal
        isOpen={createInterventionModal.isOpen}
        onClose={() => setCreateInterventionModal({ isOpen: false, alert: null })}
        onSubmit={handleCreateIntervention}
        alert={createInterventionModal.alert || undefined}
        patients={patients}
      />

      <ResolveAlertModal
        isOpen={resolveAlertModal.isOpen}
        onClose={() => setResolveAlertModal({ isOpen: false, alert: null })}
        onResolve={handleResolveAlert}
        alert={resolveAlertModal.alert || undefined}
      />

      <CompleteInterventionModal
        isOpen={completeInterventionModal.isOpen}
        onClose={() => setCompleteInterventionModal({ isOpen: false, intervention: null })}
        onSubmit={handleCompleteInterventionSubmit}
        intervention={completeInterventionModal.intervention || undefined}
      />
    </div>
  );
}