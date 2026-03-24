/**
 * ═══════════════════════════════════════════════════════════════════
 * DASHBOARD FINANCE & OPÉRATIONS - Phase 3
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Dashboard pour le Directeur Administratif :
 * - KPIs de rentabilité (CA sécurisé/à risque/perdu)
 * - Liste des patients à risque financier
 * - Gestion des renouvellements de consommables
 * - Export CSV pour la logistique
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Package,
  Download,
  RefreshCw,
  DollarSign,
  Users,
  Phone,
  Mail
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface BillingKPIs {
  patients_eligible: number;
  patients_at_risk: number;
  patients_lost: number;
  total_active_patients: number;
  pct_ca_secured: number;
  pct_ca_at_risk: number;
  pct_ca_lost: number;
}

interface PatientAtRisk {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  compliance_28d_average: number;
  is_reimbursable: boolean;
  doctor_name: string;
  risk_level: 'lost' | 'at_risk' | 'ok';
}

interface RenewalBatch {
  batch_id: string;
  items_count: number;
  items: any[];
}

export function DashboardFinance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<BillingKPIs | null>(null);
  const [patientsAtRisk, setPatientsAtRisk] = useState<PatientAtRisk[]>([]);
  const [renewalBatch, setRenewalBatch] = useState<RenewalBatch | null>(null);
  const [calculatingCompliance, setCalculatingCompliance] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        toast.error('Non authentifié');
        navigate('/login');
        return;
      }

      // Fetch KPIs
      const kpisResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/billing/kpis`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!kpisResponse.ok) {
        throw new Error('Failed to fetch KPIs');
      }

      const kpisData = await kpisResponse.json();
      setKpis(kpisData.kpis);

      // Fetch patients at risk
      const patientsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/billing/patients-at-risk`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!patientsResponse.ok) {
        throw new Error('Failed to fetch patients at risk');
      }

      const patientsData = await patientsResponse.json();
      setPatientsAtRisk(patientsData.patients);

    } catch (error: any) {
      console.error('[Dashboard Finance] Error:', error);
      toast.error('Erreur lors du chargement des données', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCompliance = async () => {
    try {
      setCalculatingCompliance(true);
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/billing/calculate-compliance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to calculate compliance');
      }

      const data = await response.json();

      toast.success('Compliance calculée !', {
        description: `${data.results.patients_processed} patients traités`,
      });

      // Recharger les données
      fetchDashboardData();
    } catch (error: any) {
      console.error('[Calculate Compliance] Error:', error);
      toast.error('Erreur lors du calcul', {
        description: error.message,
      });
    } finally {
      setCalculatingCompliance(false);
    }
  };

  const generateRenewalBatch = async (daysAhead: number = 14) => {
    try {
      setGeneratingBatch(true);
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/logistics/generate-renewal-batch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days_ahead: daysAhead }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate renewal batch');
      }

      const data = await response.json();
      setRenewalBatch(data.batch);

      toast.success('Batch généré !', {
        description: `${data.batch.items_count} renouvellements à expédier`,
      });
    } catch (error: any) {
      console.error('[Generate Batch] Error:', error);
      toast.error('Erreur lors de la génération', {
        description: error.message,
      });
    } finally {
      setGeneratingBatch(false);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info('Génération du CSV...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/logistics/export-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days_ahead: 14 }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      // Télécharger le fichier CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `renouvellements_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV téléchargé !');
    } catch (error: any) {
      console.error('[Export CSV] Error:', error);
      toast.error('Erreur lors de l\'export', {
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'lost':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'at_risk':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'lost':
        return 'CA Perdu';
      case 'at_risk':
        return 'À Risque';
      default:
        return 'OK';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E27] via-[#1E3A8A] to-[#0A0E27] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white mb-2">Dashboard Finance & Opérations</h1>
          <p className="text-sm sm:text-base text-gray-300">Pilotage de la rentabilité et de la logistique</p>
        </div>

        {/* Actions Rapides */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={calculateCompliance}
            disabled={calculatingCompliance}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 min-h-12 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-all disabled:opacity-50 w-full sm:w-auto text-sm sm:text-base"
          >
            {calculatingCompliance ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Recalculer Compliance
          </button>

          <button
            onClick={() => generateRenewalBatch(14)}
            disabled={generatingBatch}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 min-h-12 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 w-full sm:w-auto text-sm sm:text-base"
          >
            {generatingBatch ? (
              <Package className="w-5 h-5 animate-spin" />
            ) : (
              <Package className="w-5 h-5" />
            )}
            Générer Renouvellements
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 min-h-12 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all w-full sm:w-auto text-sm sm:text-base"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* CA Sécurisé */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div className="text-3xl text-green-600">
                {kpis?.pct_ca_secured?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">CA Sécurisé</div>
            <div className="text-2xl text-[#1D1D1F]">
              {kpis?.patients_eligible || 0} patients
            </div>
            <div className="mt-2 text-xs text-gray-500">
              ≥ 3h/nuit - Remboursement CPAM OK
            </div>
          </div>

          {/* CA À Risque */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="text-3xl text-orange-600">
                {kpis?.pct_ca_at_risk?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">CA À Risque</div>
            <div className="text-2xl text-[#1D1D1F]">
              {kpis?.patients_at_risk || 0} patients
            </div>
            <div className="mt-2 text-xs text-orange-600">
              2-3h/nuit - Action requise !
            </div>
          </div>

          {/* CA Perdu */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div className="text-3xl text-red-600">
                {kpis?.pct_ca_lost?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">CA Perdu</div>
            <div className="text-2xl text-[#1D1D1F]">
              {kpis?.patients_lost || 0} patients
            </div>
            <div className="mt-2 text-xs text-red-600">
              &lt; 2h/nuit - Non remboursable
            </div>
          </div>

          {/* Total Patients */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-[#007AFF]" />
              <div className="text-3xl text-[#007AFF]">
                {kpis?.total_active_patients || 0}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">Total Patients</div>
            <div className="text-2xl text-[#1D1D1F]">Actifs</div>
            <div className="mt-2 text-xs text-gray-500">
              Appareils installés
            </div>
          </div>
        </div>

        {/* Patients À Risque - Liste d'Appel Prioritaire */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl text-[#1D1D1F] mb-6 flex items-center gap-3">
            <Phone className="w-6 h-6 text-orange-600" />
            Liste d'Appel Prioritaire
            <span className="text-sm text-gray-500">
              ({patientsAtRisk.length} patients)
            </span>
          </h2>

          {patientsAtRisk.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p>Aucun patient à risque financier !</p>
              <p className="text-sm mt-2">Tous les patients sont au-dessus du seuil de 3h/nuit.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patientsAtRisk.map((patient) => (
                <div
                  key={patient.id}
                  className={`border-2 rounded-xl p-4 ${getRiskLevelColor(patient.risk_level)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg">{patient.full_name}</h3>
                        <span className="px-2 py-1 bg-white rounded-lg text-xs border">
                          {getRiskLevelLabel(patient.risk_level)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {patient.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {patient.phone || 'N/A'}
                        </div>
                        <div>
                          <strong>Médecin :</strong> {patient.doctor_name || 'Non assigné'}
                        </div>
                        <div>
                          <strong>Moyenne 28j :</strong> {patient.compliance_28d_average?.toFixed(2)}h/nuit
                        </div>
                      </div>
                    </div>

                    <div className="sm:ml-4">
                      <button
                        onClick={() => toast.info('Fonctionnalité à venir : appel patient')}
                        className="px-4 py-2 min-h-12 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-all w-full sm:w-auto"
                      >
                        Appeler
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Renouvellements de Consommables */}
        {renewalBatch && (
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl text-[#1D1D1F] mb-6 flex items-center gap-3">
              <Package className="w-6 h-6 text-purple-600" />
              Renouvellements à Valider
              <span className="text-sm text-gray-500">
                ({renewalBatch.items_count} articles)
              </span>
            </h2>

            {renewalBatch.items_count === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4" />
                <p>Aucun renouvellement à expédier pour les 14 prochains jours.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-4">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger CSV
                  </button>
                  
                  <button
                    onClick={() => toast.success('Batch validé ! (Simulation)')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Tout Valider
                  </button>
                </div>

                <div className="space-y-3">
                  {renewalBatch.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <strong>Patient :</strong> {item.patient_name}
                        </div>
                        <div>
                          <strong>Article :</strong> {item.item_type} - {item.model_ref}
                        </div>
                        <div>
                          <strong>Taille :</strong> {item.size || 'N/A'}
                        </div>
                        <div>
                          <strong>Échéance :</strong> {new Date(item.renewal_due_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}