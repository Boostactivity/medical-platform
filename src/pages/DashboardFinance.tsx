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
import { toast } from 'sonner@2.0.3';
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
import { api, apiPublic, apiPublicRaw } from '../utils/api';
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

interface BillingLine {
  id: string;
  patient_id: string;
  period_start: string;
  period_end: string;
  amount_ttc: number | null;
  status: string;
  fse_reference: string | null;
  rejection_reason: string | null;
  lppr_codes: { short_code: string; code_lpp: string; label: string } | null;
}

interface BillingTotals {
  [status: string]: { count: number; amount: number };
}

export function DashboardFinance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<BillingKPIs | null>(null);
  const [patientsAtRisk, setPatientsAtRisk] = useState<PatientAtRisk[]>([]);
  const [renewalBatch, setRenewalBatch] = useState<RenewalBatch | null>(null);
  const [calculatingCompliance, setCalculatingCompliance] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [billingLines, setBillingLines] = useState<BillingLine[]>([]);
  const [billingTotals, setBillingTotals] = useState<BillingTotals>({});
  const [validatingDrafts, setValidatingDrafts] = useState(false);
  const [transmitting, setTransmitting] = useState(false);

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
      const kpisData = await apiPublic('/billing/kpis');
      setKpis(kpisData.kpis);

      // Fetch patients at risk
      const patientsData = await apiPublic('/billing/patients-at-risk');
      setPatientsAtRisk(patientsData.patients);

      // Facturation LPPR : lignes générées par le moteur observance
      try {
        const billing = await api.get('/billing/lines?limit=100');
        setBillingLines(billing.lines ?? []);
        setBillingTotals(billing.totals ?? {});
      } catch (billingError: any) {
        // Tables LPPR pas encore migrées → section vide, pas bloquant
        console.error('[Finance] billing/lines indisponible:', billingError?.message);
      }

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

      const data = await apiPublic('/billing/calculate-compliance', { method: 'POST' });

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

      const data = await apiPublic('/logistics/generate-renewal-batch', {
        method: 'POST',
        body: { days_ahead: daysAhead },
      });
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

  /** Valide toutes les lignes draft → ready (contrôle avant transmission). */
  const validateDrafts = async () => {
    const drafts = billingLines.filter((l) => l.status === 'draft');
    if (drafts.length === 0) {
      toast.info('Aucune ligne brouillon à valider');
      return;
    }
    setValidatingDrafts(true);
    let ok = 0;
    let ko = 0;
    for (const line of drafts) {
      try {
        await api.patch(`/billing/lines/${line.id}`, { status: 'ready' });
        ok++;
      } catch {
        ko++;
      }
    }
    toast.success(`${ok} ligne(s) validée(s)${ko ? `, ${ko} en erreur` : ''}`);
    setValidatingDrafts(false);
    fetchDashboardData();
  };

  /** Transmission FSE des lignes prêtes (mode mock tant que le SDK agréé n'est pas branché). */
  const transmitReady = async () => {
    setTransmitting(true);
    try {
      const result = await api.post('/billing/transmit', {});
      toast.success(
        `${result.transmitted} ligne(s) transmise(s), ${result.rejected} rejetée(s)`,
        result.mode === 'mock'
          ? { description: 'Mode démonstration — SDK SESAM-Vitale agréé non branché (réfs MOCK-*)' }
          : undefined,
      );
      fetchDashboardData();
    } catch (error: any) {
      toast.error('Erreur de transmission', { description: error.message });
    } finally {
      setTransmitting(false);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info('Génération du CSV...');

      const response = await apiPublicRaw('/logistics/export-csv', {
        method: 'POST',
        body: { days_ahead: 14 },
      });

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
        <LoadingSpinner size="lg" />
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
    <div className="min-h-screen bg-gradient-to-br from-[#00173D] via-[#003DA3] to-[#00173D] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl text-white mb-2">Dashboard Finance & Opérations</h1>
          <p className="text-gray-300">Pilotage de la rentabilité et de la logistique</p>
        </div>

        {/* Actions Rapides */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={calculateCompliance}
            disabled={calculatingCompliance}
            className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-all disabled:opacity-50"
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
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50"
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
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* CA Sécurisé */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div className="text-3xl text-green-600">
                {kpis?.pct_ca_secured?.toFixed(1) || 0}%
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">CA Sécurisé</div>
            <div className="text-2xl text-[#1A1A1A]">
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
            <div className="text-2xl text-[#1A1A1A]">
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
            <div className="text-2xl text-[#1A1A1A]">
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
            <div className="text-2xl text-[#1A1A1A]">Actifs</div>
            <div className="mt-2 text-xs text-gray-500">
              Appareils installés
            </div>
          </div>
        </div>

        {/* Facturation LPPR — lignes générées par le moteur observance */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl text-[#1A1A1A] flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[#007AFF]" />
              Facturation LPPR
              <span className="text-sm text-gray-500">(forfaits hebdomadaires PPC)</span>
            </h2>
            <div className="flex gap-3">
              <button
                onClick={validateDrafts}
                disabled={validatingDrafts || !(billingTotals.draft?.count > 0)}
                className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-all disabled:opacity-40 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider les brouillons ({billingTotals.draft?.count ?? 0})
              </button>
              <button
                onClick={transmitReady}
                disabled={transmitting || !(billingTotals.ready?.count > 0)}
                className="flex items-center gap-2 px-4 py-2 bg-[#18753C] text-white rounded-xl hover:bg-[#145F31] transition-all disabled:opacity-40 text-sm"
              >
                {transmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Transmettre FSE ({billingTotals.ready?.count ?? 0})
              </button>
            </div>
          </div>

          {/* Totaux par statut */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {([
              ['draft', 'Brouillons', 'text-gray-600 bg-gray-50 border-gray-200'],
              ['ready', 'Prêtes', 'text-[#007AFF] bg-blue-50 border-blue-200'],
              ['transmitted', 'Transmises', 'text-purple-700 bg-purple-50 border-purple-200'],
              ['paid', 'Payées', 'text-green-700 bg-green-50 border-green-200'],
              ['rejected', 'Rejetées', 'text-red-700 bg-red-50 border-red-200'],
            ] as const).map(([status, label, classes]) => (
              <div key={status} className={`rounded-xl border p-4 ${classes}`}>
                <div className="text-2xl tabular-nums">{billingTotals[status]?.count ?? 0}</div>
                <div className="text-sm">{label}</div>
                <div className="text-xs mt-1 tabular-nums">
                  {(billingTotals[status]?.amount ?? 0).toFixed(2)} € TTC
                </div>
              </div>
            ))}
          </div>

          {/* Lignes récentes */}
          {billingLines.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>Aucune ligne de facturation générée pour l'instant.</p>
              <p className="text-sm mt-2">
                Les lignes sont créées automatiquement chaque nuit par le moteur d'observance
                (forfait hebdomadaire par patient selon le code LPPR applicable).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4">Semaine</th>
                    <th className="py-2 pr-4">Code LPP</th>
                    <th className="py-2 pr-4">Montant TTC</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2">Référence / Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {billingLines.slice(0, 15).map((line) => (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 tabular-nums">
                        {line.period_start} → {line.period_end}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">{line.lppr_codes?.short_code ?? '—'}</span>
                        <span className="text-gray-400 ml-2 text-xs">{line.lppr_codes?.code_lpp}</span>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {line.amount_ttc != null ? `${Number(line.amount_ttc).toFixed(2)} €` : 'tarif à compléter'}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getRiskLevelColor(
                          line.status === 'rejected' ? 'lost' : line.status === 'draft' ? 'at_risk' : 'ok',
                        )}`}>
                          {line.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {line.fse_reference ?? line.rejection_reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {billingLines.length > 15 && (
                <p className="text-xs text-gray-400 mt-2">
                  {billingLines.length - 15} ligne(s) supplémentaire(s) non affichée(s)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Patients À Risque - Liste d'Appel Prioritaire */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl text-[#1A1A1A] mb-6 flex items-center gap-3">
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg">{patient.full_name}</h3>
                        <span className="px-2 py-1 bg-white rounded-lg text-xs border">
                          {getRiskLevelLabel(patient.risk_level)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
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

                    <div className="ml-4">
                      <button
                        onClick={() => toast.info('Fonctionnalité à venir : appel patient')}
                        className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0051D5] transition-all"
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
            <h2 className="text-2xl text-[#1A1A1A] mb-6 flex items-center gap-3">
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
                      <div className="grid grid-cols-4 gap-4 text-sm">
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