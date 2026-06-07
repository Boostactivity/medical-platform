/**
 * PORTAIL MÉDECIN — tableau de bord prescripteur (pneumologue / médecin du sommeil).
 *
 * Données réelles via routes /doctor/* (doctor-portal.ts) :
 *   - file active triée par priorité clinique (bandes low/none d'abord)
 *   - alertes prioritaires de la cohorte (sévérité décroissante)
 *   - fiche patient en drawer : courbe 90 j, fenêtres 28 j, alertes,
 *     bloc-notes privé
 *
 * Aucune donnée fictive : cohorte vide = état d'attente d'assignation.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layouts/DashboardLayout';
import { AlertsPanel } from '../components/doctor/AlertsPanel';
import { CohortTable } from '../components/doctor/CohortTable';
import { PatientDrawer } from '../components/doctor/PatientDrawer';
import {
  BAND_META,
  BAND_ORDER,
  type CohortPatient,
  type CohortSummary,
  type DoctorAlert,
} from '../components/doctor/types';

interface CohortResponse {
  patients: CohortPatient[];
  summary: CohortSummary;
}

export function DashboardMedecin() {
  const [patients, setPatients] = useState<CohortPatient[]>([]);
  const [summary, setSummary] = useState<CohortSummary | null>(null);
  const [alerts, setAlerts] = useState<DoctorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/medecin/connexion');
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const [cohortRes, alertsRes] = await Promise.all([
        api.get('/doctor/cohort') as Promise<CohortResponse>,
        api.get('/doctor/alerts') as Promise<{ alerts: DoctorAlert[] }>,
      ]);
      setPatients(cohortRes.patients ?? []);
      setSummary(cohortRes.summary ?? null);
      setAlerts(alertsRes.alerts ?? []);
    } catch (error: unknown) {
      console.error('[DASHBOARD MEDECIN] load failed:', error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        toast.error('Accès refusé', {
          description:
            "Votre compte n'a pas les droits médecin. Reconnectez-vous ou contactez votre prestataire.",
        });
        setTimeout(() => navigate('/medecin/connexion'), 2000);
      } else {
        toast.error('Impossible de charger votre cohorte', {
          description: 'Réessayez ou contactez le support si le problème persiste.',
        });
        setLoadError(true);
      }
      // Pas de fallback démo : état vide réel.
      setPatients([]);
      setSummary(null);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const userName = (user?.user_metadata?.name as string | undefined) ?? 'Médecin';
  const userEmail = user?.email ?? '';
  const totalPatients = summary?.total ?? patients.length;

  return (
    <DashboardLayout userRole="medecin" userName={userName} userEmail={userEmail}>
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement de votre file active…</p>
          </div>
        ) : (
          <>
            {/* En-tête : synthèse de la file active */}
            <header className="mb-6">
              <h1 className="text-xl font-medium text-foreground">
                {alerts.length === 0
                  ? `Aucune alerte sur votre file de ${totalPatients} patient${totalPatients > 1 ? 's' : ''}`
                  : `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} prioritaire${alerts.length > 1 ? 's' : ''} sur votre file de ${totalPatients} patient${totalPatients > 1 ? 's' : ''}`}
              </h1>
              {summary && totalPatients > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {BAND_ORDER.filter((band) => summary.bands[band] > 0)
                    .map(
                      (band) =>
                        `${summary.bands[band]} ${BAND_META[band].label.toLowerCase()} (${BAND_META[band].range})`,
                    )
                    .join(' · ')}
                </p>
              )}
            </header>

            {loadError && (
              <div className="bg-card border border-border rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground">
                  Le chargement de votre cohorte a échoué.
                </p>
                <button
                  type="button"
                  onClick={loadData}
                  className="text-sm text-[#007AFF] hover:underline mt-1"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loadError && totalPatients === 0 ? (
              /* État vide : aucun patient assigné — pas de faux patients */
              <div className="bg-card border border-border rounded-lg py-16 px-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h2 className="text-base font-medium text-foreground mb-1">
                  Aucun patient ne vous est assigné
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  L'assignation des patients à votre file active est effectuée par votre
                  prestataire. Dès qu'un patient appareillé vous sera rattaché, son suivi
                  d'observance apparaîtra ici.
                </p>
              </div>
            ) : !loadError ? (
              <>
                <AlertsPanel alerts={alerts} onSelectPatient={setSelectedPatientId} />
                <CohortTable patients={patients} onSelect={setSelectedPatientId} />
              </>
            ) : null}
          </>
        )}

        <PatientDrawer
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
