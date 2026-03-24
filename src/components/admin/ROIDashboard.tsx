import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Heart, Shield, Activity,
  BarChart3, ArrowUpRight, ArrowDownRight, Users, AlertTriangle, Star
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';

// Mock data - Monthly evolution
const MONTHLY_DATA = [
  { month: 'Sep', observance: 55, interventions: 28, coutPatient: 145, economie: 2200, qualite: 72 },
  { month: 'Oct', observance: 58, interventions: 25, coutPatient: 138, economie: 3100, qualite: 74 },
  { month: 'Nov', observance: 61, interventions: 22, coutPatient: 132, economie: 4500, qualite: 77 },
  { month: 'Dec', observance: 59, interventions: 24, coutPatient: 135, economie: 3800, qualite: 75 },
  { month: 'Jan', observance: 63, interventions: 20, coutPatient: 128, economie: 5200, qualite: 79 },
  { month: 'Fev', observance: 66, interventions: 17, coutPatient: 122, economie: 6800, qualite: 82 },
  { month: 'Mar', observance: 68, interventions: 15, coutPatient: 118, economie: 7500, qualite: 84 },
  { month: 'Avr', observance: 70, interventions: 13, coutPatient: 112, economie: 8900, qualite: 86 },
  { month: 'Mai', observance: 72, interventions: 11, coutPatient: 108, economie: 10200, qualite: 88 },
  { month: 'Jun', observance: 71, interventions: 12, coutPatient: 110, economie: 9800, qualite: 87 },
  { month: 'Jul', observance: 73, interventions: 10, coutPatient: 105, economie: 11500, qualite: 89 },
  { month: 'Aou', observance: 75, interventions: 9, coutPatient: 102, economie: 12800, qualite: 91 },
];

const COST_BREAKDOWN = [
  { category: 'Interventions', avecPlateforme: 4200, sansPlateforme: 8900 },
  { category: 'Consommables', avecPlateforme: 3100, sansPlateforme: 3800 },
  { category: 'SAV', avecPlateforme: 1800, sansPlateforme: 4200 },
  { category: 'Hospitalisation', avecPlateforme: 2100, sansPlateforme: 6500 },
];

const NATIONAL_AVERAGE_OBSERVANCE = 60;

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  icon: typeof TrendingUp;
  color: string;
  bgColor: string;
}

function MetricCard({ label, value, subValue, trend, trendValue, icon: Icon, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-[#1D1D1F]">{value}</div>
      <div className="text-sm text-[#86868B] mt-1">{label}</div>
      {subValue && <div className="text-xs text-[#86868B] mt-0.5">{subValue}</div>}
    </div>
  );
}

export function ROIDashboard() {
  const [period, setPeriod] = useState<'6m' | '12m'>('12m');

  const chartData = period === '6m' ? MONTHLY_DATA.slice(-6) : MONTHLY_DATA;
  const latest = MONTHLY_DATA[MONTHLY_DATA.length - 1];
  const previous = MONTHLY_DATA[MONTHLY_DATA.length - 2];

  const totalEconomies = useMemo(() => MONTHLY_DATA.reduce((sum, d) => sum + d.economie, 0), []);
  const interventionsEvitees = useMemo(() => {
    const baseline = MONTHLY_DATA[0].interventions;
    return MONTHLY_DATA.reduce((sum, d) => sum + Math.max(0, baseline - d.interventions), 0);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Dashboard ROI</h1>
          <p className="text-[#86868B] mt-1">Retour sur investissement et indicateurs de performance</p>
        </div>
        <div className="flex gap-2">
          {(['6m', '12m'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                period === p ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'
              }`}
            >
              {p === '6m' ? '6 mois' : '12 mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={Heart}
          label="Taux d'observance global"
          value={`${latest.observance}%`}
          subValue={`Moyenne nationale: ${NATIONAL_AVERAGE_OBSERVANCE}% (+${latest.observance - NATIONAL_AVERAGE_OBSERVANCE}pts)`}
          trend="up"
          trendValue={`+${latest.observance - previous.observance}%`}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          icon={Shield}
          label="Interventions evitees"
          value={String(interventionsEvitees)}
          subValue="Grace aux alertes precoces"
          trend="up"
          trendValue="-68%"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={DollarSign}
          label="Cout moyen / patient / mois"
          value={`${latest.coutPatient} EUR`}
          subValue="Interventions + consommables + SAV"
          trend="down"
          trendValue={`-${previous.coutPatient - latest.coutPatient} EUR`}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          icon={TrendingUp}
          label="Economies realisees (total)"
          value={`${(totalEconomies / 1000).toFixed(1)}k EUR`}
          subValue="vs sans plateforme"
          trend="up"
          trendValue="+42%"
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <MetricCard
          icon={Star}
          label="Score qualite prestataire"
          value={`${latest.qualite}/100`}
          subValue="Base sur observance, SAV et satisfaction"
          trend="up"
          trendValue={`+${latest.qualite - previous.qualite}`}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <MetricCard
          icon={Users}
          label="Patients actifs"
          value="142"
          subValue="5 nouveaux ce mois"
          trend="up"
          trendValue="+3.6%"
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Observance Chart */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-1">Evolution du taux d'observance</h2>
        <p className="text-sm text-[#86868B] mb-6">Comparaison avec la moyenne nationale ({NATIONAL_AVERAGE_OBSERVANCE}%)</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="observanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="month" stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} domain={[40, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: number, name: string) => [`${value}%`, name === 'observance' ? 'Observance' : 'Moy. nationale']}
              />
              <Legend />
              <Area type="monotone" dataKey="observance" stroke="#3b82f6" strokeWidth={3} fill="url(#observanceGrad)" name="Observance" />
              <Line type="monotone" dataKey={() => NATIONAL_AVERAGE_OBSERVANCE} stroke="#ef4444" strokeWidth={2} strokeDasharray="8 4" dot={false} name="Moy. nationale" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventions & Cost */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-1">Interventions & cout par patient</h2>
          <p className="text-sm text-[#86868B] mb-6">Evolution mensuelle</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                <XAxis dataKey="month" stroke="#86868B" fontSize={12} />
                <YAxis yAxisId="left" stroke="#86868B" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#86868B" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="interventions" stroke="#ef4444" strokeWidth={2} name="Interventions" dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="coutPatient" stroke="#8b5cf6" strokeWidth={2} name="Cout/patient (EUR)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Economies */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-1">Economies realisees</h2>
          <p className="text-sm text-[#86868B] mb-6">Cumul mensuel vs sans plateforme</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                <XAxis dataKey="month" stroke="#86868B" fontSize={12} />
                <YAxis stroke="#86868B" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA' }} formatter={(v: number) => [`${v} EUR`, 'Economies']} />
                <Bar dataKey="economie" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Economies (EUR)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <h2 className="text-xl font-semibold text-[#1D1D1F] mb-1">Comparaison des couts</h2>
        <p className="text-sm text-[#86868B] mb-6">Avec plateforme vs sans plateforme (EUR/mois moyen)</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={COST_BREAKDOWN} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis type="number" stroke="#86868B" fontSize={12} />
              <YAxis dataKey="category" type="category" stroke="#86868B" fontSize={12} width={120} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA' }} formatter={(v: number) => [`${v} EUR`]} />
              <Legend />
              <Bar dataKey="avecPlateforme" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Avec plateforme" />
              <Bar dataKey="sansPlateforme" fill="#E5E5EA" radius={[0, 6, 6, 0]} name="Sans plateforme" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality Score Detail */}
      <div className="bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Score de qualite du prestataire</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Observance patients', value: `${latest.observance}%`, target: '> 70%', ok: latest.observance >= 70 },
            { label: 'Temps reponse SAV', value: '3.2h', target: '< 4h', ok: true },
            { label: 'Satisfaction NPS', value: '+62', target: '> +50', ok: true },
            { label: 'Consommables a temps', value: '94%', target: '> 90%', ok: true },
          ].map((item, i) => (
            <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl p-5">
              <div className="text-3xl font-bold">{item.value}</div>
              <div className="text-white/80 text-sm mt-1">{item.label}</div>
              <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${item.ok ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                Objectif: {item.target}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4 text-center">
            <div className="text-5xl font-bold">{latest.qualite}/100</div>
            <div className="text-white/80 mt-1">Score global</div>
          </div>
        </div>
      </div>
    </div>
  );
}
