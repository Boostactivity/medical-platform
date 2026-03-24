/**
 * RAPPORT OBSERVANCE CPAM
 *
 * Calcul automatique du seuil legal : 112h minimum sur 28 jours consecutifs
 * Suivi observance glissant, alertes, export PDF pour envoi CPAM
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Download, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Calendar, Clock, Search, Filter,
  ChevronDown, ChevronRight, Bell, BarChart3, Users, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import jsPDF from 'jspdf';

// ---- Types ----

type ComplianceStatus = 'CONFORME' | 'ATTENTION' | 'NON_CONFORME';

interface DailyUsage {
  date: string;
  hours: number;
}

interface PatientCompliance {
  id: string;
  patientName: string;
  patientId: string;
  nir?: string;
  medecinName: string;
  deviceSerial: string;
  dailyUsage: DailyUsage[];
  rolling28dHours: number;
  averageNightlyHours: number;
  status: ComplianceStatus;
  trend: 'up' | 'down' | 'stable';
  lastSyncDate: string;
  alertSent: boolean;
}

interface ComplianceAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'threshold_crossed' | 'risk_warning' | 'no_data';
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

// ---- Constantes CPAM ----

const CPAM_THRESHOLD_HOURS = 112; // Seuil legal 112h sur 28 jours
const CPAM_ROLLING_DAYS = 28;
const ATTENTION_THRESHOLD_HOURS = 130; // Seuil d'attention

// ---- Mock Data ----

function generateDailyUsage(avgHours: number, variance: number): DailyUsage[] {
  const usage: DailyUsage[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const hours = Math.max(0, Math.min(12, avgHours + (Math.random() - 0.5) * variance));
    usage.push({
      date: date.toISOString().split('T')[0],
      hours: Math.round(hours * 10) / 10,
    });
  }
  return usage;
}

function calculateRolling28d(dailyUsage: DailyUsage[]): number {
  const last28 = dailyUsage.slice(-CPAM_ROLLING_DAYS);
  return Math.round(last28.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;
}

function getComplianceStatus(hours: number): ComplianceStatus {
  if (hours >= ATTENTION_THRESHOLD_HOURS) return 'CONFORME';
  if (hours >= CPAM_THRESHOLD_HOURS) return 'ATTENTION';
  return 'NON_CONFORME';
}

function getTrend(dailyUsage: DailyUsage[]): 'up' | 'down' | 'stable' {
  if (dailyUsage.length < 14) return 'stable';
  const prev14 = dailyUsage.slice(-28, -14).reduce((s, d) => s + d.hours, 0);
  const last14 = dailyUsage.slice(-14).reduce((s, d) => s + d.hours, 0);
  const diff = last14 - prev14;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

function buildMockPatients(): PatientCompliance[] {
  const patients = [
    { name: 'Jean Dupont', id: 'p1', nir: '1 85 12 75 108 042 36', medecin: 'Dr. Moreau', serial: 'RS11-2023-00142', avg: 5.2, var: 2 },
    { name: 'Marie Martin', id: 'p2', nir: '2 90 06 69 380 015 22', medecin: 'Dr. Laurent', serial: 'PDS2-2021-00089', avg: 3.2, var: 1.5 },
    { name: 'Paul Durand', id: 'p4', nir: '1 78 03 13 055 048 17', medecin: 'Dr. Moreau', serial: 'RS10-2020-00331', avg: 6.1, var: 1 },
    { name: 'Sophie Leroy', id: 'p5', nir: '2 82 11 92 034 021 44', medecin: 'Dr. Bernard', serial: 'LPS-2024-00015', avg: 4.5, var: 2.5 },
    { name: 'Pierre Bernard', id: 'p3', nir: '1 95 01 33 102 064 55', medecin: 'Dr. Laurent', serial: 'RS11-2024-00201', avg: 2.8, var: 1 },
    { name: 'Claire Petit', id: 'p6', nir: '2 88 07 44 256 033 18', medecin: 'Dr. Moreau', serial: 'PDS2-2023-00145', avg: 5.8, var: 1.2 },
    { name: 'Marc Lefebvre', id: 'p7', nir: '1 72 09 59 178 055 29', medecin: 'Dr. Bernard', serial: 'RS11-2023-00188', avg: 3.8, var: 2 },
    { name: 'Anne Roux', id: 'p8', nir: '2 91 04 75 112 042 61', medecin: 'Dr. Laurent', serial: 'LPS-2024-00022', avg: 7.0, var: 0.8 },
  ];

  return patients.map(p => {
    const dailyUsage = generateDailyUsage(p.avg, p.var);
    const rolling28d = calculateRolling28d(dailyUsage);
    return {
      id: p.id,
      patientName: p.name,
      patientId: p.id,
      nir: p.nir,
      medecinName: p.medecin,
      deviceSerial: p.serial,
      dailyUsage,
      rolling28dHours: rolling28d,
      averageNightlyHours: Math.round((rolling28d / CPAM_ROLLING_DAYS) * 10) / 10,
      status: getComplianceStatus(rolling28d),
      trend: getTrend(dailyUsage),
      lastSyncDate: dailyUsage[dailyUsage.length - 1].date,
      alertSent: rolling28d < ATTENTION_THRESHOLD_HOURS,
    };
  });
}

const MOCK_ALERTS: ComplianceAlert[] = [
  { id: 'a1', patientId: 'p2', patientName: 'Marie Martin', type: 'threshold_crossed', message: 'Passage sous le seuil 112h CPAM', createdAt: '2026-03-22T10:30:00', acknowledged: false },
  { id: 'a2', patientId: 'p5', patientName: 'Sophie Leroy', type: 'risk_warning', message: 'Observance en baisse - risque de non-conformite', createdAt: '2026-03-21T14:15:00', acknowledged: true },
  { id: 'a3', patientId: 'p3', patientName: 'Pierre Bernard', type: 'threshold_crossed', message: 'Passage sous le seuil 112h CPAM', createdAt: '2026-03-20T09:00:00', acknowledged: false },
  { id: 'a4', patientId: 'p7', patientName: 'Marc Lefebvre', type: 'risk_warning', message: 'Approche du seuil critique (<130h)', createdAt: '2026-03-23T08:45:00', acknowledged: false },
];

// ---- Composant Principal ----

export default function CPAMComplianceReport() {
  const [patients] = useState<PatientCompliance[]>(buildMockPatients);
  const [alerts] = useState<ComplianceAlert[]>(MOCK_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'all'>('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientCompliance | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  // Filtrage
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchSearch = p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deviceSerial.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [patients, searchQuery, statusFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = patients.length;
    const conforme = patients.filter(p => p.status === 'CONFORME').length;
    const attention = patients.filter(p => p.status === 'ATTENTION').length;
    const nonConforme = patients.filter(p => p.status === 'NON_CONFORME').length;
    const avgObservance = Math.round(patients.reduce((s, p) => s + p.rolling28dHours, 0) / total * 10) / 10;
    const unackAlerts = alerts.filter(a => !a.acknowledged).length;
    return { total, conforme, attention, nonConforme, avgObservance, unackAlerts };
  }, [patients, alerts]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('fr-FR');

    doc.setFontSize(18);
    doc.text('Rapport Observance CPAM', 14, 22);
    doc.setFontSize(10);
    doc.text(`Date du rapport : ${now}`, 14, 30);
    doc.text(`Periode : 28 jours glissants`, 14, 36);
    doc.text(`Seuil legal : ${CPAM_THRESHOLD_HOURS}h sur ${CPAM_ROLLING_DAYS} jours consecutifs`, 14, 42);

    doc.setFontSize(12);
    doc.text('Resume', 14, 54);
    doc.setFontSize(10);
    doc.text(`Patients total : ${stats.total}`, 14, 62);
    doc.text(`Conformes : ${stats.conforme}`, 14, 68);
    doc.text(`Attention : ${stats.attention}`, 14, 74);
    doc.text(`Non conformes : ${stats.nonConforme}`, 14, 80);

    doc.setFontSize(12);
    doc.text('Detail par patient', 14, 94);

    let y = 102;
    doc.setFontSize(8);
    doc.text('Patient', 14, y);
    doc.text('NIR', 55, y);
    doc.text('Heures 28j', 110, y);
    doc.text('Moy/nuit', 140, y);
    doc.text('Statut', 165, y);
    y += 6;

    patients.forEach(p => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(p.patientName, 14, y);
      doc.text(p.nir || '-', 55, y);
      doc.text(`${p.rolling28dHours}h`, 110, y);
      doc.text(`${p.averageNightlyHours}h`, 140, y);
      doc.text(p.status.replace('_', ' '), 165, y);
      y += 5;
    });

    // Section patients a risque
    const atRisk = patients.filter(p => p.status !== 'CONFORME');
    if (atRisk.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      y += 10;
      doc.setFontSize(12);
      doc.text('Patients a risque de perte de remboursement', 14, y);
      y += 8;
      doc.setFontSize(9);
      atRisk.forEach(p => {
        if (y > 270) { doc.addPage(); y = 20; }
        const label = p.status === 'NON_CONFORME' ? '[NON CONFORME]' : '[ATTENTION]';
        doc.text(`${label} ${p.patientName} - ${p.rolling28dHours}h / ${CPAM_THRESHOLD_HOURS}h`, 14, y);
        y += 5;
      });
    }

    doc.save(`rapport-observance-cpam-${now.replace(/\//g, '-')}.pdf`);
  };

  // Status badge
  const StatusBadge = ({ status }: { status: ComplianceStatus }) => {
    const config = {
      CONFORME: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'CONFORME' },
      ATTENTION: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle, label: 'ATTENTION' },
      NON_CONFORME: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'NON CONFORME' },
    };
    const c = config[status];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <span className="w-4 h-4 text-gray-400">-</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Rapport Observance CPAM
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seuil legal : {CPAM_THRESHOLD_HOURS}h minimum sur {CPAM_ROLLING_DAYS} jours consecutifs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4" />
            {stats.unackAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {stats.unackAlerts}
              </span>
            )}
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Alertes */}
      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2"
          >
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alertes observance ({alerts.filter(a => !a.acknowledged).length} non traitees)
            </h3>
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-red-900">{alert.patientName}</p>
                  <p className="text-xs text-red-600">{alert.message}</p>
                  <p className="text-xs text-red-400">{new Date(alert.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                  Traiter
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" /> Total
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" /> Conformes
          </div>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.conforme}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-700 text-sm">
            <AlertTriangle className="w-4 h-4" /> Attention
          </div>
          <p className="text-2xl font-bold text-orange-800 mt-1">{stats.attention}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <XCircle className="w-4 h-4" /> Non conformes
          </div>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.nonConforme}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <BarChart3 className="w-4 h-4" /> Moy. 28j
          </div>
          <p className="text-2xl font-bold mt-1">{stats.avgObservance}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un patient ou appareil..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'CONFORME', 'ATTENTION', 'NON_CONFORME'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'NON_CONFORME' ? 'Non conforme' : s === 'ATTENTION' ? 'Attention' : 'Conforme'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Patient</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Medecin</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Appareil</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Heures 28j</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Moy/nuit</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Tendance</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Statut</th>
                <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr
                  key={patient.id}
                  onClick={() => setSelectedPatient(selectedPatient?.id === patient.id ? null : patient)}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {selectedPatient?.id === patient.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div>
                        <p className="font-medium text-sm">{patient.patientName}</p>
                        <p className="text-xs text-muted-foreground">{patient.nir}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{patient.medecinName}</td>
                  <td className="p-3 text-sm text-muted-foreground font-mono">{patient.deviceSerial}</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold text-sm ${
                      patient.rolling28dHours >= ATTENTION_THRESHOLD_HOURS ? 'text-green-700' :
                      patient.rolling28dHours >= CPAM_THRESHOLD_HOURS ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {patient.rolling28dHours}h
                    </span>
                    <span className="text-xs text-muted-foreground"> / {CPAM_THRESHOLD_HOURS}h</span>
                  </td>
                  <td className="p-3 text-right text-sm">{patient.averageNightlyHours}h</td>
                  <td className="p-3 text-center"><TrendIcon trend={patient.trend} /></td>
                  <td className="p-3 text-center"><StatusBadge status={patient.status} /></td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {new Date(patient.lastSyncDate).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail graphique patient selectionne */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">
                Evolution observance 28j glissant - {selectedPatient.patientName}
              </h3>
              <StatusBadge status={selectedPatient.status} />
            </div>

            {/* Graphique evolution 28j glissant */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(() => {
                    const data: { date: string; hours28d: number }[] = [];
                    const usage = selectedPatient.dailyUsage;
                    for (let i = CPAM_ROLLING_DAYS - 1; i < usage.length; i++) {
                      const window = usage.slice(i - CPAM_ROLLING_DAYS + 1, i + 1);
                      const total = Math.round(window.reduce((s, d) => s + d.hours, 0) * 10) / 10;
                      data.push({ date: usage[i].date, hours28d: total });
                    }
                    return data;
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(v: number) => [`${v}h`, 'Heures 28j']}
                    labelFormatter={v => new Date(v).toLocaleDateString('fr-FR')}
                  />
                  <ReferenceLine y={CPAM_THRESHOLD_HOURS} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Seuil CPAM ${CPAM_THRESHOLD_HOURS}h`, fill: '#ef4444', fontSize: 11 }} />
                  <ReferenceLine y={ATTENTION_THRESHOLD_HOURS} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Attention ${ATTENTION_THRESHOLD_HOURS}h`, fill: '#f59e0b', fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="hours28d"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Utilisation quotidienne recente */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Utilisation quotidienne (30 derniers jours)</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedPatient.dailyUsage.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit' })}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(v: number) => [`${v}h`, 'Heures']}
                      labelFormatter={v => new Date(v).toLocaleDateString('fr-FR')}
                    />
                    <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '4h/nuit', fill: '#f59e0b', fontSize: 10 }} />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patients a risque */}
      {patients.filter(p => p.status !== 'CONFORME').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            Patients a risque de perte de remboursement ({patients.filter(p => p.status !== 'CONFORME').length})
          </h3>
          <div className="space-y-2">
            {patients.filter(p => p.status !== 'CONFORME').sort((a, b) => a.rolling28dHours - b.rolling28dHours).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <div>
                    <p className="font-medium text-sm">{p.patientName}</p>
                    <p className="text-xs text-muted-foreground">{p.medecinName} - {p.deviceSerial}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${p.status === 'NON_CONFORME' ? 'text-red-700' : 'text-orange-700'}`}>
                    {p.rolling28dHours}h / {CPAM_THRESHOLD_HOURS}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deficit : {Math.max(0, CPAM_THRESHOLD_HOURS - p.rolling28dHours)}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
