/**
 * GENERATEUR DE RAPPORTS CPAM AUTOMATISES
 *
 * - Calcul observance format CPAM (112h/28j)
 * - Statut conforme/non-conforme par patient
 * - Export CSV format CPAM
 * - Historique des rapports generes
 * - Alertes quand rapport a generer
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Download, AlertTriangle, CheckCircle, XCircle,
  Calendar, Clock, Search, Filter, Bell, Users, RefreshCw,
  FileSpreadsheet, History, ChevronDown, ChevronRight, Eye, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ---- Types ----

type ComplianceStatus = 'CONFORME' | 'NON_CONFORME' | 'ATTENTION';

interface PatientCPAMData {
  id: string;
  nom: string;
  prenom: string;
  nir: string;  // Numero de securite sociale
  dateNaissance: string;
  medecinPrescripteur: string;
  rpps: string;
  deviceSerial: string;
  dateAppareillage: string;
  // Donnees d'utilisation 28 jours glissants
  totalHeures28j: number;
  joursUtilisation28j: number;
  moyenneNuitHours: number;
  status: ComplianceStatus;
}

interface GeneratedReport {
  id: string;
  dateGeneration: string;
  periodeDebut: string;
  periodeFin: string;
  nbPatients: number;
  nbConformes: number;
  nbNonConformes: number;
  nbAttention: number;
  format: 'CSV' | 'PDF';
  generePar: string;
}

interface ReportAlert {
  id: string;
  type: 'report_due' | 'patient_risk' | 'deadline';
  message: string;
  date: string;
  urgent: boolean;
}

// ---- Constants ----

const CPAM_THRESHOLD_HOURS = 112;
const CPAM_PERIOD_DAYS = 28;
const CPAM_MIN_NIGHTLY_HOURS = 4;

// ---- Mock Data ----

function generateMockPatients(): PatientCPAMData[] {
  const noms = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent'];
  const prenoms = ['Jean', 'Pierre', 'Marie', 'Paul', 'Sophie', 'Isabelle', 'Michel', 'Anne', 'Philippe', 'Catherine', 'Luc', 'Francoise'];

  return noms.map((nom, i) => {
    const totalHeures = Math.round((80 + Math.random() * 80) * 10) / 10;
    const jours = Math.floor(20 + Math.random() * 8);
    const moyenne = totalHeures / jours;
    let status: ComplianceStatus = 'CONFORME';
    if (totalHeures < CPAM_THRESHOLD_HOURS) status = 'NON_CONFORME';
    else if (totalHeures < 130) status = 'ATTENTION';

    return {
      id: `pat-${i + 1}`,
      nom,
      prenom: prenoms[i],
      nir: `${1 + (i % 2)}${70 + i}${(10 + i).toString().padStart(2, '0')}${(100 + i * 3).toString().padStart(3, '0')}${(10 + i).toString().padStart(3, '0')}${(10 + i * 7).toString().padStart(2, '0')}`,
      dateNaissance: `${1950 + i * 3}-${(1 + i % 12).toString().padStart(2, '0')}-${(1 + i * 2 % 28).toString().padStart(2, '0')}`,
      medecinPrescripteur: `Dr ${['Dupont', 'Lefebvre', 'Garcia', 'Roux'][i % 4]}`,
      rpps: `1234567${(8900 + i).toString()}`,
      deviceSerial: `PPC-${(2024000 + i * 100).toString()}`,
      dateAppareillage: `2024-${(1 + i % 12).toString().padStart(2, '0')}-15`,
      totalHeures28j: totalHeures,
      joursUtilisation28j: jours,
      moyenneNuitHours: Math.round(moyenne * 10) / 10,
      status,
    };
  });
}

function generateMockHistory(): GeneratedReport[] {
  const reports: GeneratedReport[] = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const periodeDebut = new Date(date);
    periodeDebut.setDate(1);
    const periodeFin = new Date(periodeDebut);
    periodeFin.setMonth(periodeFin.getMonth() + 1);
    periodeFin.setDate(0);

    reports.push({
      id: `rpt-${i + 1}`,
      dateGeneration: date.toISOString().split('T')[0],
      periodeDebut: periodeDebut.toISOString().split('T')[0],
      periodeFin: periodeFin.toISOString().split('T')[0],
      nbPatients: 10 + Math.floor(Math.random() * 5),
      nbConformes: 7 + Math.floor(Math.random() * 3),
      nbNonConformes: 1 + Math.floor(Math.random() * 3),
      nbAttention: Math.floor(Math.random() * 3),
      format: i % 2 === 0 ? 'CSV' : 'PDF',
      generePar: 'admin@plateforme.fr',
    });
  }
  return reports;
}

function generateMockAlerts(): ReportAlert[] {
  return [
    {
      id: 'alert-1',
      type: 'report_due',
      message: 'Rapport CPAM mensuel a generer avant le 5 du mois',
      date: new Date().toISOString().split('T')[0],
      urgent: true,
    },
    {
      id: 'alert-2',
      type: 'patient_risk',
      message: '3 patients risquent de passer sous le seuil d\'observance',
      date: new Date().toISOString().split('T')[0],
      urgent: true,
    },
    {
      id: 'alert-3',
      type: 'deadline',
      message: 'Renouvellement trimestriel CPAM dans 15 jours',
      date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      urgent: false,
    },
  ];
}

// ---- Export CSV CPAM ----

function generateCSVCPAM(patients: PatientCPAMData[], periodeDebut: string, periodeFin: string): string {
  const headers = [
    'NIR',
    'NOM',
    'PRENOM',
    'DATE_NAISSANCE',
    'RPPS_PRESCRIPTEUR',
    'NOM_PRESCRIPTEUR',
    'SERIAL_APPAREIL',
    'DATE_APPAREILLAGE',
    'PERIODE_DEBUT',
    'PERIODE_FIN',
    'HEURES_TOTALES_28J',
    'JOURS_UTILISATION_28J',
    'MOYENNE_NUIT_HEURES',
    'SEUIL_REQUIS_HEURES',
    'STATUT_OBSERVANCE',
    'CONFORME',
  ].join(';');

  const rows = patients.map((p) =>
    [
      p.nir,
      p.nom,
      p.prenom,
      p.dateNaissance,
      p.rpps,
      p.medecinPrescripteur,
      p.deviceSerial,
      p.dateAppareillage,
      periodeDebut,
      periodeFin,
      p.totalHeures28j.toFixed(1),
      p.joursUtilisation28j.toString(),
      p.moyenneNuitHours.toFixed(1),
      CPAM_THRESHOLD_HOURS.toString(),
      p.status,
      p.status === 'CONFORME' ? 'OUI' : 'NON',
    ].join(';')
  );

  return [headers, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Composant Principal ----

export function CPAMReportGenerator() {
  const [patients] = useState<PatientCPAMData[]>(generateMockPatients);
  const [history, setHistory] = useState<GeneratedReport[]>(generateMockHistory);
  const [alerts] = useState<ReportAlert[]>(generateMockAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'alerts'>('generate');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  // Filtrage
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch = `${p.nom} ${p.prenom} ${p.nir}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const conformes = patients.filter((p) => p.status === 'CONFORME').length;
    const nonConformes = patients.filter((p) => p.status === 'NON_CONFORME').length;
    const attention = patients.filter((p) => p.status === 'ATTENTION').length;
    const avgHours = patients.reduce((sum, p) => sum + p.totalHeures28j, 0) / patients.length;
    return { conformes, nonConformes, attention, total: patients.length, avgHours };
  }, [patients]);

  const pieData = [
    { name: 'Conformes', value: stats.conformes, color: '#22C55E' },
    { name: 'Attention', value: stats.attention, color: '#F59E0B' },
    { name: 'Non conformes', value: stats.nonConformes, color: '#EF4444' },
  ];

  const barData = filteredPatients.map((p) => ({
    name: `${p.nom.substring(0, 3)}.`,
    heures: p.totalHeures28j,
    status: p.status,
  }));

  // Export
  const handleExportCSV = () => {
    const today = new Date();
    const periodeDebut = new Date(today);
    periodeDebut.setDate(today.getDate() - CPAM_PERIOD_DAYS);

    const csv = generateCSVCPAM(
      filteredPatients,
      periodeDebut.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );

    const filename = `CPAM_OBSERVANCE_${today.toISOString().split('T')[0].replace(/-/g, '')}.csv`;
    downloadCSV(csv, filename);

    // Ajouter a l'historique
    const newReport: GeneratedReport = {
      id: `rpt-${Date.now()}`,
      dateGeneration: today.toISOString().split('T')[0],
      periodeDebut: periodeDebut.toISOString().split('T')[0],
      periodeFin: today.toISOString().split('T')[0],
      nbPatients: filteredPatients.length,
      nbConformes: filteredPatients.filter((p) => p.status === 'CONFORME').length,
      nbNonConformes: filteredPatients.filter((p) => p.status === 'NON_CONFORME').length,
      nbAttention: filteredPatients.filter((p) => p.status === 'ATTENTION').length,
      format: 'CSV',
      generePar: 'admin@plateforme.fr',
    };
    setHistory((prev) => [newReport, ...prev]);

    toast.success('Rapport CPAM exporte !', {
      description: `${filteredPatients.length} patients - Format CSV CPAM`,
    });
  };

  const getStatusColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'CONFORME': return 'text-green-600 bg-green-50 border-green-200';
      case 'NON_CONFORME': return 'text-red-600 bg-red-50 border-red-200';
      case 'ATTENTION': return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const getStatusIcon = (status: ComplianceStatus) => {
    switch (status) {
      case 'CONFORME': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NON_CONFORME': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'ATTENTION': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-[#007AFF]" />
            Rapports CPAM automatises
          </h2>
          <p className="text-slate-500 mt-1">
            Calcul d'observance 112h/28j - Export format CPAM
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            className="bg-[#007AFF] hover:bg-[#0051D5] text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV CPAM
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {alerts.filter((a) => a.urgent).length > 0 && (
        <div className="space-y-2">
          {alerts.filter((a) => a.urgent).map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800 flex-1">{alert.message}</span>
              <span className="text-xs text-amber-500">{alert.date}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-slate-400" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">Patients suivis</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{stats.conformes}</div>
            <div className="text-xs text-slate-500">Conformes</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <div className="text-2xl font-bold text-amber-600">{stats.attention}</div>
            <div className="text-xs text-slate-500">Attention</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <div className="text-2xl font-bold text-red-600">{stats.nonConformes}</div>
            <div className="text-xs text-slate-500">Non conformes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold text-blue-600">{stats.avgHours.toFixed(0)}h</div>
            <div className="text-xs text-slate-500">Moyenne 28j</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: 'generate', label: 'Generer rapport', icon: FileText },
          { key: 'history', label: 'Historique', icon: History },
          { key: 'alerts', label: `Alertes (${alerts.length})`, icon: Bell },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Generate */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Camembert statuts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Repartition observance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Barres heures par patient */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Heures d'utilisation 28j par patient</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(value: number) => [`${value}h`, 'Heures']} />
                    <ReferenceLine y={CPAM_THRESHOLD_HOURS} stroke="#EF4444" strokeDasharray="5 5" label={{ value: '112h', position: 'right' }} />
                    <Bar dataKey="heures" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.status === 'CONFORME' ? '#22C55E' : entry.status === 'ATTENTION' ? '#F59E0B' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ComplianceStatus | 'ALL')}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#007AFF] outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="CONFORME">Conformes</option>
              <option value="ATTENTION">Attention</option>
              <option value="NON_CONFORME">Non conformes</option>
            </select>
          </div>

          {/* Tableau patients */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-3 text-xs font-semibold text-slate-500">Patient</th>
                      <th className="text-left p-3 text-xs font-semibold text-slate-500">NIR</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500">Heures 28j</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500">Jours</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500">Moy/nuit</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500">Statut</th>
                      <th className="text-center p-3 text-xs font-semibold text-slate-500">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredPatients.map((patient) => (
                        <motion.tr
                          key={patient.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                          onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}
                        >
                          <td className="p-3">
                            <div className="font-medium text-sm">{patient.nom} {patient.prenom}</div>
                            <div className="text-xs text-slate-400">{patient.medecinPrescripteur}</div>
                          </td>
                          <td className="p-3 text-xs font-mono text-slate-500">{patient.nir.substring(0, 5)}...</td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${patient.totalHeures28j >= CPAM_THRESHOLD_HOURS ? 'text-green-600' : 'text-red-600'}`}>
                              {patient.totalHeures28j.toFixed(1)}h
                            </span>
                          </td>
                          <td className="p-3 text-center text-sm">{patient.joursUtilisation28j}/28</td>
                          <td className="p-3 text-center text-sm">{patient.moyenneNuitHours.toFixed(1)}h</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                              {getStatusIcon(patient.status)}
                              {patient.status === 'CONFORME' ? 'Conforme' : patient.status === 'ATTENTION' ? 'Attention' : 'Non conforme'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {expandedPatient === patient.id ? (
                              <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 mx-auto" />
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des rapports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#007AFF]/10 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-[#007AFF]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Rapport du {report.dateGeneration}
                      </div>
                      <div className="text-xs text-slate-500">
                        Periode : {report.periodeDebut} au {report.periodeFin}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <div className="text-green-600">{report.nbConformes} conformes</div>
                      <div className="text-red-600">{report.nbNonConformes} non conf.</div>
                    </div>
                    <Badge variant="outline">{report.format}</Badge>
                    <Badge>{report.nbPatients} patients</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Alerts */}
      {activeTab === 'alerts' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alertes rapports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    alert.urgent
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {alert.urgent ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <Bell className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{alert.message}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{alert.date}</div>
                  </div>
                  {alert.urgent && (
                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
