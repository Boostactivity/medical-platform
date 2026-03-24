/**
 * RAPPORTS POPULATION POUR ARS
 *
 * Statistiques anonymisees agregees :
 * - Nombre patients suivis, taux observance moyen
 * - Distribution IAH, repartition par tranche d'age
 * - Taux d'equipement par zone geographique
 * - Export PDF, graphiques Recharts
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Download, Users, TrendingUp, MapPin,
  Calendar, FileText, Printer, PieChart as PieChartIcon,
  Activity, Clock, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart,
  Line, Legend, Area, AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// ---- Types ----

interface PopulationStats {
  totalPatients: number;
  patientsActifs: number;
  nouveauxPatientsMois: number;
  tauxObservanceMoyen: number;
  tauxConformiteCPAM: number;
  iahMoyen: number;
  ageMoyen: number;
}

interface AgeDistribution {
  tranche: string;
  count: number;
  percentage: number;
}

interface IAHDistribution {
  categorie: string;
  count: number;
  percentage: number;
  color: string;
}

interface GeoEquipment {
  zone: string;
  codePostal: string;
  population: number;
  patientsEquipes: number;
  tauxEquipement: number;
}

interface ObservanceEvolution {
  mois: string;
  tauxObservance: number;
  tauxConformite: number;
  nouveauxPatients: number;
}

// ---- Mock Data ----

const STATS: PopulationStats = {
  totalPatients: 1247,
  patientsActifs: 1183,
  nouveauxPatientsMois: 42,
  tauxObservanceMoyen: 76.3,
  tauxConformiteCPAM: 81.2,
  iahMoyen: 18.4,
  ageMoyen: 58.7,
};

const AGE_DISTRIBUTION: AgeDistribution[] = [
  { tranche: '18-30', count: 45, percentage: 3.6 },
  { tranche: '31-40', count: 98, percentage: 7.9 },
  { tranche: '41-50', count: 187, percentage: 15.0 },
  { tranche: '51-60', count: 312, percentage: 25.0 },
  { tranche: '61-70', count: 356, percentage: 28.5 },
  { tranche: '71-80', count: 186, percentage: 14.9 },
  { tranche: '80+', count: 63, percentage: 5.1 },
];

const IAH_DISTRIBUTION: IAHDistribution[] = [
  { categorie: 'Leger (5-15)', count: 312, percentage: 25.0, color: '#22C55E' },
  { categorie: 'Modere (15-30)', count: 548, percentage: 43.9, color: '#F59E0B' },
  { categorie: 'Severe (>30)', count: 387, percentage: 31.0, color: '#EF4444' },
];

const GEO_EQUIPMENT: GeoEquipment[] = [
  { zone: 'Paris', codePostal: '75', population: 2175000, patientsEquipes: 342, tauxEquipement: 1.57 },
  { zone: 'Lyon', codePostal: '69', population: 522969, patientsEquipes: 198, tauxEquipement: 3.79 },
  { zone: 'Marseille', codePostal: '13', population: 873076, patientsEquipes: 267, tauxEquipement: 3.06 },
  { zone: 'Bordeaux', codePostal: '33', population: 260958, patientsEquipes: 155, tauxEquipement: 5.94 },
  { zone: 'Toulouse', codePostal: '31', population: 493465, patientsEquipes: 142, tauxEquipement: 2.88 },
  { zone: 'Lille', codePostal: '59', population: 236234, patientsEquipes: 143, tauxEquipement: 6.05 },
];

const OBSERVANCE_EVOLUTION: ObservanceEvolution[] = [
  { mois: 'Oct', tauxObservance: 72.1, tauxConformite: 77.5, nouveauxPatients: 35 },
  { mois: 'Nov', tauxObservance: 73.4, tauxConformite: 78.2, nouveauxPatients: 38 },
  { mois: 'Dec', tauxObservance: 71.8, tauxConformite: 76.9, nouveauxPatients: 28 },
  { mois: 'Jan', tauxObservance: 74.5, tauxConformite: 79.8, nouveauxPatients: 45 },
  { mois: 'Fev', tauxObservance: 75.2, tauxConformite: 80.5, nouveauxPatients: 41 },
  { mois: 'Mar', tauxObservance: 76.3, tauxConformite: 81.2, nouveauxPatients: 42 },
];

// ---- PDF Export ----

function generateARSReport(stats: PopulationStats) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(0, 122, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Rapport Population - ARS', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} - Donnees anonymisees`, pageWidth / 2, 28, { align: 'center' });

  // Stats generales
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text('1. Indicateurs generaux', 14, 55);

  doc.setFontSize(10);
  const statsLines = [
    `Patients suivis : ${stats.totalPatients} (dont ${stats.patientsActifs} actifs)`,
    `Nouveaux patients ce mois : ${stats.nouveauxPatientsMois}`,
    `Taux d'observance moyen : ${stats.tauxObservanceMoyen}%`,
    `Taux de conformite CPAM : ${stats.tauxConformiteCPAM}%`,
    `IAH moyen residuel : ${stats.iahMoyen}`,
    `Age moyen de la cohorte : ${stats.ageMoyen} ans`,
  ];
  statsLines.forEach((line, i) => {
    doc.text(line, 20, 65 + i * 7);
  });

  // Distribution ages
  doc.setFontSize(14);
  doc.text('2. Repartition par tranche d\'age', 14, 115);
  doc.setFontSize(9);
  AGE_DISTRIBUTION.forEach((age, i) => {
    doc.text(`${age.tranche} ans : ${age.count} patients (${age.percentage}%)`, 20, 125 + i * 6);
  });

  // Distribution IAH
  doc.setFontSize(14);
  doc.text('3. Distribution IAH', 14, 175);
  doc.setFontSize(9);
  IAH_DISTRIBUTION.forEach((iah, i) => {
    doc.text(`${iah.categorie} : ${iah.count} patients (${iah.percentage}%)`, 20, 185 + i * 6);
  });

  // Zones geographiques
  doc.setFontSize(14);
  doc.text('4. Taux d\'equipement par zone', 14, 210);
  doc.setFontSize(9);
  GEO_EQUIPMENT.forEach((geo, i) => {
    doc.text(
      `${geo.zone} (${geo.codePostal}) : ${geo.patientsEquipes} patients / ${(geo.population / 1000).toFixed(0)}k hab = ${geo.tauxEquipement.toFixed(2)} pour 10 000`,
      20,
      220 + i * 6
    );
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Rapport genere automatiquement - Donnees anonymisees conformement au RGPD', pageWidth / 2, 285, { align: 'center' });
  doc.text('Ce document est destine aux autorites de sante (ARS) dans le cadre du suivi epidemiologique', pageWidth / 2, 290, { align: 'center' });

  doc.save(`Rapport_ARS_Population_${new Date().toISOString().split('T')[0]}.pdf`);
  toast.success('Rapport PDF genere', { description: 'Le fichier a ete telecharge.' });
}

// ---- Composant Principal ----

export function PopulationReport() {
  const [period, setPeriod] = useState<'trimestre' | 'semestre' | 'annuel'>('trimestre');

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#22C55E', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#007AFF]" />
            Rapports population ARS
          </h2>
          <p className="text-slate-500 mt-1">
            Statistiques anonymisees pour le reporting aux autorites de sante
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['trimestre', 'semestre', 'annuel'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button onClick={() => generateARSReport(STATS)} className="bg-[#007AFF] hover:bg-[#0051D5] text-white">
            <Download className="w-4 h-4 mr-2" />
            Export PDF ARS
          </Button>
        </div>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{STATS.totalPatients}</div>
            <div className="text-xs text-slate-500">Patients suivis</div>
            <div className="text-xs text-green-500 mt-1">+{STATS.nouveauxPatientsMois} ce mois</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{STATS.tauxObservanceMoyen}%</div>
            <div className="text-xs text-slate-500">Observance moyenne</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <div className="text-2xl font-bold text-amber-600">{STATS.iahMoyen}</div>
            <div className="text-xs text-slate-500">IAH moyen residuel</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold text-purple-600">{STATS.ageMoyen}</div>
            <div className="text-xs text-slate-500">Age moyen (ans)</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques ligne 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution par age - Histogramme */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Repartition par tranche d'age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={AGE_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tranche" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value: number, name: string) => [value, name === 'count' ? 'Patients' : '%']} />
                <Bar dataKey="count" name="Patients" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {AGE_DISTRIBUTION.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution IAH - Camembert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Distribution IAH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={IAH_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  label={({ categorie, percentage }) => `${categorie}: ${percentage}%`}
                >
                  {IAH_DISTRIBUTION.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques ligne 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution observance - Courbe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Evolution observance (6 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={OBSERVANCE_EVOLUTION}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" fontSize={11} />
                <YAxis fontSize={11} domain={[65, 90]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="tauxObservance"
                  name="Observance %"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="tauxConformite"
                  name="Conformite CPAM %"
                  stroke="#22C55E"
                  fill="#22C55E"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Equipement par zone - Bar horizontal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Taux d'equipement par zone (/10 000 hab)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={GEO_EQUIPMENT} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="zone" fontSize={11} width={80} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)} / 10 000`, 'Taux']} />
                <Bar dataKey="tauxEquipement" name="Taux equipement" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                  {GEO_EQUIPMENT.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau geo detaille */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detail par zone geographique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-3 text-xs font-semibold text-slate-500">Zone</th>
                  <th className="text-left p-3 text-xs font-semibold text-slate-500">Code</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500">Population</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500">Patients equipes</th>
                  <th className="text-right p-3 text-xs font-semibold text-slate-500">Taux /10k</th>
                </tr>
              </thead>
              <tbody>
                {GEO_EQUIPMENT.map((geo) => (
                  <tr key={geo.zone} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-sm font-medium">{geo.zone}</td>
                    <td className="p-3 text-sm text-slate-500">{geo.codePostal}</td>
                    <td className="p-3 text-sm text-right">{geo.population.toLocaleString('fr-FR')}</td>
                    <td className="p-3 text-sm text-right font-medium">{geo.patientsEquipes}</td>
                    <td className="p-3 text-right">
                      <Badge variant={geo.tauxEquipement > 4 ? 'default' : 'secondary'}>
                        {geo.tauxEquipement.toFixed(2)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center">
        Donnees anonymisees conformement au RGPD. Ce rapport est destine aux autorites de sante
        dans le cadre du suivi epidemiologique. Aucune donnee nominative n'est incluse.
      </div>
    </div>
  );
}
