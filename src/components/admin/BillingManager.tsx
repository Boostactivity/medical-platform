/**
 * FACTURATION AUTOMATIQUE (BASE)
 *
 * Fiche facturation par patient, calcul LPPR, statuts, export CSV
 * Dashboard CA mensuel, impayes, a facturer
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard, Download, Search, Filter, ChevronDown, ChevronUp,
  FileText, AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp,
  Euro, Users, Calendar, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ---- Types ----

type BillingStatus = 'a_facturer' | 'facture' | 'rejete' | 'en_attente';
type ViewMode = 'dashboard' | 'patients' | 'historique';

interface BillingEntry {
  id: string;
  patientId: string;
  patientName: string;
  installDate: string;
  tarifLPPR: string; // code LPPR
  baseMontant: number;
  majorations: { label: string; montant: number }[];
  totalMontant: number;
  periode: string;
  status: BillingStatus;
  dateFacturation?: string;
  dateRejet?: string;
  motifRejet?: string;
}

// ---- LPPR Config ----

const LPPR_TARIFS: Record<string, { label: string; base: number; description: string }> = {
  'LPPR_1188781': { label: 'Forfait 9 - PPC + humidificateur', base: 23.96, description: 'Forfait hebdomadaire PPC avec humidificateur' },
  'LPPR_1113244': { label: 'Forfait 9 bis - PPC seule', base: 20.50, description: 'Forfait hebdomadaire PPC sans humidificateur' },
  'LPPR_1134031': { label: 'Supplement teleoobservance', base: 4.50, description: 'Supplement hebdomadaire teleobservance' },
};

const MAJORATIONS_CONFIG = [
  { label: 'Majoration teleobservance', montant: 4.50 },
  { label: 'Majoration nuit', montant: 1.20 },
];

// ---- Mock Data ----

function generateBillingData(): BillingEntry[] {
  const patients = [
    { id: 'p1', name: 'Jean Dupont', install: '2025-12-01', lppr: 'LPPR_1188781' },
    { id: 'p2', name: 'Marie Martin', install: '2025-09-15', lppr: 'LPPR_1188781' },
    { id: 'p3', name: 'Pierre Bernard', install: '2026-01-10', lppr: 'LPPR_1113244' },
    { id: 'p4', name: 'Paul Durand', install: '2025-06-01', lppr: 'LPPR_1188781' },
    { id: 'p5', name: 'Sophie Leroy', install: '2026-03-01', lppr: 'LPPR_1188781' },
    { id: 'p6', name: 'Claire Petit', install: '2025-10-20', lppr: 'LPPR_1113244' },
    { id: 'p7', name: 'Luc Moreau', install: '2025-11-05', lppr: 'LPPR_1188781' },
    { id: 'p8', name: 'Emma Girard', install: '2026-02-01', lppr: 'LPPR_1188781' },
  ];

  const entries: BillingEntry[] = [];
  const statuses: BillingStatus[] = ['a_facturer', 'facture', 'facture', 'facture', 'rejete', 'en_attente', 'facture', 'a_facturer'];

  patients.forEach((p, idx) => {
    // Current month billing
    const lpprInfo = LPPR_TARIFS[p.lppr];
    const weeksInMonth = 4;
    const baseMontant = +(lpprInfo.base * weeksInMonth).toFixed(2);
    const majorations = idx % 2 === 0 ? [MAJORATIONS_CONFIG[0]] : [];
    const majTotal = majorations.reduce((s, m) => s + m.montant * weeksInMonth, 0);
    const totalMontant = +(baseMontant + majTotal).toFixed(2);

    entries.push({
      id: `bill-${p.id}-2026-03`,
      patientId: p.id,
      patientName: p.name,
      installDate: p.install,
      tarifLPPR: p.lppr,
      baseMontant,
      majorations: majorations.map(m => ({ label: m.label, montant: +(m.montant * weeksInMonth).toFixed(2) })),
      totalMontant,
      periode: '2026-03',
      status: statuses[idx],
      dateFacturation: statuses[idx] === 'facture' ? '2026-03-15' : undefined,
      dateRejet: statuses[idx] === 'rejete' ? '2026-03-18' : undefined,
      motifRejet: statuses[idx] === 'rejete' ? 'Observance insuffisante (<112h sur 28j)' : undefined,
    });

    // Previous month
    entries.push({
      id: `bill-${p.id}-2026-02`,
      patientId: p.id,
      patientName: p.name,
      installDate: p.install,
      tarifLPPR: p.lppr,
      baseMontant,
      majorations: majorations.map(m => ({ label: m.label, montant: +(m.montant * weeksInMonth).toFixed(2) })),
      totalMontant,
      periode: '2026-02',
      status: 'facture',
      dateFacturation: '2026-02-28',
    });
  });

  return entries;
}

// ---- CSV Export ----

function exportToCSV(entries: BillingEntry[], filename: string) {
  const headers = ['Patient', 'Date installation', 'Code LPPR', 'Base', 'Majorations', 'Total', 'Periode', 'Statut', 'Date facturation'];
  const rows = entries.map(e => [
    e.patientName,
    e.installDate,
    e.tarifLPPR,
    e.baseMontant.toFixed(2),
    e.majorations.map(m => `${m.label}: ${m.montant}`).join(' | ') || '-',
    e.totalMontant.toFixed(2),
    e.periode,
    e.status,
    e.dateFacturation || '-',
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ---- Composant Principal ----

export function BillingManager() {
  const [billingData] = useState<BillingEntry[]>(generateBillingData);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillingStatus | 'all'>('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  // Dashboard stats
  const dashStats = useMemo(() => {
    const currentPeriod = billingData.filter(e => e.periode === '2026-03');
    const prevPeriod = billingData.filter(e => e.periode === '2026-02');

    const caFacture = currentPeriod.filter(e => e.status === 'facture').reduce((s, e) => s + e.totalMontant, 0);
    const caFacturePrev = prevPeriod.filter(e => e.status === 'facture').reduce((s, e) => s + e.totalMontant, 0);
    const aFacturer = currentPeriod.filter(e => e.status === 'a_facturer').reduce((s, e) => s + e.totalMontant, 0);
    const rejete = currentPeriod.filter(e => e.status === 'rejete').reduce((s, e) => s + e.totalMontant, 0);
    const enAttente = currentPeriod.filter(e => e.status === 'en_attente').reduce((s, e) => s + e.totalMontant, 0);
    const nbPatients = new Set(currentPeriod.map(e => e.patientId)).size;

    return {
      caFacture: +caFacture.toFixed(2),
      caFacturePrev: +caFacturePrev.toFixed(2),
      aFacturer: +aFacturer.toFixed(2),
      rejete: +rejete.toFixed(2),
      enAttente: +enAttente.toFixed(2),
      nbPatients,
      total: +(caFacture + aFacturer + enAttente).toFixed(2),
    };
  }, [billingData]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return billingData
      .filter(e => e.periode === '2026-03')
      .filter(e => statusFilter === 'all' || e.status === statusFilter)
      .filter(e => e.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [billingData, statusFilter, searchQuery]);

  const statusConfig: Record<BillingStatus, { color: string; bg: string; border: string; icon: typeof CheckCircle; label: string }> = {
    a_facturer: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock, label: 'A facturer' },
    facture: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, label: 'Facture' },
    rejete: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, label: 'Rejete' },
    en_attente: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock, label: 'En attente' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Facturation
          </h2>
          <p className="text-sm text-gray-500 mt-1">Gestion de la facturation LPPR patients PPC</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(filteredEntries, 'facturation_mars_2026')}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['dashboard', 'patients', 'historique'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v === 'dashboard' ? 'Dashboard' : v === 'patients' ? 'Par patient' : 'Historique'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== DASHBOARD ===== */}
      {viewMode === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                <Euro className="w-4 h-4" /> CA facture
              </div>
              <p className="text-2xl font-bold text-green-800">{dashStats.caFacture.toFixed(2)} EUR</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {dashStats.caFacture >= dashStats.caFacturePrev
                  ? <><ArrowUpRight className="w-3 h-3 text-green-600" /><span className="text-green-600">vs mois precedent</span></>
                  : <><ArrowDownRight className="w-3 h-3 text-red-600" /><span className="text-red-600">vs mois precedent</span></>
                }
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
                <Clock className="w-4 h-4" /> A facturer
              </div>
              <p className="text-2xl font-bold text-orange-800">{dashStats.aFacturer.toFixed(2)} EUR</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                <Clock className="w-4 h-4" /> En attente
              </div>
              <p className="text-2xl font-bold text-blue-800">{dashStats.enAttente.toFixed(2)} EUR</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
                <AlertTriangle className="w-4 h-4" /> Rejetes
              </div>
              <p className="text-2xl font-bold text-red-800">{dashStats.rejete.toFixed(2)} EUR</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-indigo-600 mb-1">
                <Users className="w-4 h-4" /> Patients
              </div>
              <p className="text-2xl font-bold text-indigo-800">{dashStats.nbPatients}</p>
              <p className="text-xs text-gray-500">ce mois</p>
            </div>
          </div>

          {/* CA total card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">CA mensuel total (Mars 2026)</p>
                <p className="text-4xl font-bold mt-1">{dashStats.total.toFixed(2)} EUR</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Rejets */}
          {billingData.filter(e => e.status === 'rejete').length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" /> Factures rejetees
              </h3>
              {billingData.filter(e => e.status === 'rejete').map(e => (
                <div key={e.id} className="bg-white border border-red-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{e.patientName}</p>
                    <p className="text-xs text-red-600">{e.motifRejet}</p>
                  </div>
                  <p className="font-bold text-red-700">{e.totalMontant.toFixed(2)} EUR</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== PATIENTS VIEW ===== */}
      {viewMode === 'patients' && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as BillingStatus | 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="a_facturer">A facturer</option>
              <option value="facture">Facture</option>
              <option value="rejete">Rejete</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>

          <div className="space-y-2">
            {filteredEntries.map(entry => {
              const cfg = statusConfig[entry.status];
              const Icon = cfg.icon;
              const isExpanded = expandedPatient === entry.id;

              return (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div
                    onClick={() => setExpandedPatient(isExpanded ? null : entry.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{entry.patientName}</p>
                        <p className="text-xs text-gray-400">Install. {new Date(entry.installDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <p className="font-bold text-gray-900">{entry.totalMontant.toFixed(2)} EUR</p>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-t border-gray-100 p-4 bg-gray-50"
                    >
                      <div className="grid sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Code LPPR</p>
                          <p className="text-sm font-medium">{entry.tarifLPPR}</p>
                          <p className="text-xs text-gray-400">{LPPR_TARIFS[entry.tarifLPPR]?.label || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Periode</p>
                          <p className="text-sm font-medium">{entry.periode}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500 mb-2">Detail facturation</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Base LPPR (4 semaines)</span>
                            <span className="font-medium">{entry.baseMontant.toFixed(2)} EUR</span>
                          </div>
                          {entry.majorations.map((m, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{m.label}</span>
                              <span className="font-medium">+{m.montant.toFixed(2)} EUR</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1 mt-1">
                            <span>Total</span>
                            <span>{entry.totalMontant.toFixed(2)} EUR</span>
                          </div>
                        </div>
                      </div>

                      {entry.motifRejet && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">
                          <strong>Motif de rejet :</strong> {entry.motifRejet}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== HISTORIQUE ===== */}
      {viewMode === 'historique' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-600">Patient</th>
                <th className="text-left p-3 font-semibold text-gray-600">Periode</th>
                <th className="text-left p-3 font-semibold text-gray-600">LPPR</th>
                <th className="text-right p-3 font-semibold text-gray-600">Montant</th>
                <th className="text-left p-3 font-semibold text-gray-600">Statut</th>
                <th className="text-left p-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billingData
                .sort((a, b) => b.periode.localeCompare(a.periode))
                .map(entry => {
                  const cfg = statusConfig[entry.status];
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{entry.patientName}</td>
                      <td className="p-3 text-gray-500">{entry.periode}</td>
                      <td className="p-3 text-gray-500 text-xs">{entry.tarifLPPR}</td>
                      <td className="p-3 text-right font-bold">{entry.totalMontant.toFixed(2)} EUR</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {entry.dateFacturation ? new Date(entry.dateFacturation).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
