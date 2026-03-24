import { useState } from 'react';
import {
  Star, Heart, Clock, Smile, Package, TrendingUp, Award, Eye,
  BarChart3, ArrowUpRight, ArrowDownRight, Shield, Users
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// Types
interface ScoreCategory {
  key: string;
  label: string;
  value: number;
  maxValue: number;
  weight: number;
  icon: typeof Star;
  color: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  description: string;
}

interface BenchmarkData {
  category: string;
  vousEtes: number;
  moyenneSecteur: number;
  meilleur: number;
}

interface MonthlyScore {
  month: string;
  score: number;
  observance: number;
  sav: number;
  satisfaction: number;
  consommables: number;
}

// Mock data
const SCORE_CATEGORIES: ScoreCategory[] = [
  { key: 'observance', label: 'Taux d\'observance patients', value: 75, maxValue: 100, weight: 0.35, icon: Heart, color: 'text-green-600', trend: 'up', trendValue: '+3%', description: 'Pourcentage de patients avec > 4h/nuit d\'utilisation PPC' },
  { key: 'sav', label: 'Temps moyen reponse SAV', value: 82, maxValue: 100, weight: 0.25, icon: Clock, color: 'text-blue-600', trend: 'up', trendValue: '-1.2h', description: '3.2h en moyenne (objectif < 4h). Score base sur respect du SLA.' },
  { key: 'satisfaction', label: 'Satisfaction patients (NPS)', value: 78, maxValue: 100, weight: 0.25, icon: Smile, color: 'text-amber-600', trend: 'up', trendValue: '+5pts', description: 'NPS de +62 (excellent). Base sur enquetes de satisfaction.' },
  { key: 'consommables', label: 'Consommables envoyes a temps', value: 94, maxValue: 100, weight: 0.15, icon: Package, color: 'text-purple-600', trend: 'down', trendValue: '-2%', description: '94% des consommables envoyes avant la date limite.' },
];

const GLOBAL_SCORE = Math.round(SCORE_CATEGORIES.reduce((sum, c) => sum + c.value * c.weight, 0));

const RADAR_DATA = SCORE_CATEGORIES.map(c => ({
  subject: c.label.split(' ').slice(0, 2).join(' '),
  score: c.value,
  fullMark: 100,
}));

const BENCHMARK_DATA: BenchmarkData[] = [
  { category: 'Observance', vousEtes: 75, moyenneSecteur: 60, meilleur: 85 },
  { category: 'Reponse SAV', vousEtes: 82, moyenneSecteur: 65, meilleur: 92 },
  { category: 'NPS', vousEtes: 78, moyenneSecteur: 55, meilleur: 88 },
  { category: 'Consommables', vousEtes: 94, moyenneSecteur: 78, meilleur: 98 },
];

const MONTHLY_SCORES: MonthlyScore[] = [
  { month: 'Sep', score: 72, observance: 68, sav: 75, satisfaction: 70, consommables: 90 },
  { month: 'Oct', score: 74, observance: 70, sav: 77, satisfaction: 72, consommables: 91 },
  { month: 'Nov', score: 76, observance: 73, sav: 78, satisfaction: 74, consommables: 92 },
  { month: 'Dec', score: 75, observance: 71, sav: 80, satisfaction: 73, consommables: 91 },
  { month: 'Jan', score: 78, observance: 74, sav: 81, satisfaction: 76, consommables: 93 },
  { month: 'Fev', score: 80, observance: 76, sav: 82, satisfaction: 78, consommables: 93 },
  { month: 'Mar', score: GLOBAL_SCORE, observance: 75, sav: 82, satisfaction: 78, consommables: 94 },
];

function ScoreGauge({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34C759' : score >= 60 ? '#FF9500' : '#FF3B30';
  const isLarge = size === 'large';

  return (
    <div className={`relative inline-flex items-center justify-center ${isLarge ? 'w-48 h-48' : 'w-24 h-24'}`}>
      <svg className="transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E5EA" strokeWidth={isLarge ? 8 : 6} />
        <circle
          cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth={isLarge ? 8 : 6}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-[#1D1D1F] ${isLarge ? 'text-4xl' : 'text-lg'}`}>{score}</span>
        <span className={`text-[#86868B] ${isLarge ? 'text-sm' : 'text-xs'}`}>/100</span>
      </div>
    </div>
  );
}

export function ProviderScore() {
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  const chartData = selectedPeriod === '3m' ? MONTHLY_SCORES.slice(-3) :
                    selectedPeriod === '6m' ? MONTHLY_SCORES.slice(-6) : MONTHLY_SCORES;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Score prestataire</h1>
          <p className="text-[#86868B] mt-1">Note globale visible par les medecins prescripteurs</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#86868B]">
          <Eye className="w-4 h-4" />
          Visible par les prescripteurs
        </div>
      </div>

      {/* Global Score */}
      <div className="bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-3xl p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="text-center">
            <ScoreGauge score={GLOBAL_SCORE} />
            <div className="mt-4">
              <div className="text-2xl font-bold">Score global</div>
              <div className="text-white/70 text-sm mt-1">
                {GLOBAL_SCORE >= 80 ? 'Excellent' : GLOBAL_SCORE >= 60 ? 'Bon' : 'A ameliorer'}
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4">
            {SCORE_CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              return (
                <div key={cat.key} className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <CatIcon className="w-5 h-5 text-white/80" />
                    <div className={`flex items-center gap-0.5 text-xs ${cat.trend === 'up' ? 'text-green-300' : 'text-red-300'}`}>
                      {cat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {cat.trendValue}
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{cat.value}%</div>
                  <div className="text-white/70 text-xs mt-1">{cat.label}</div>
                  <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${cat.value}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCORE_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.key} className="bg-white rounded-2xl border border-[#E5E5EA] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#F5F5F7]`}>
                  <CatIcon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1D1D1F] text-sm">{cat.label}</div>
                  <div className="text-xs text-[#86868B]">Poids: {Math.round(cat.weight * 100)}%</div>
                </div>
              </div>
              <p className="text-xs text-[#86868B]">{cat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4">Vue d'ensemble</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#E5E5EA" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#86868B', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#86868B', fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmark */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
          <h2 className="text-lg font-semibold text-[#1D1D1F] mb-1">Benchmark vs secteur</h2>
          <p className="text-xs text-[#86868B] mb-4">Comparaison anonymisee avec les autres prestataires</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BENCHMARK_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                <XAxis dataKey="category" stroke="#86868B" fontSize={11} />
                <YAxis stroke="#86868B" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA' }} />
                <Legend />
                <Bar dataKey="vousEtes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Vous" />
                <Bar dataKey="moyenneSecteur" fill="#E5E5EA" radius={[4, 4, 0, 0]} name="Moyenne secteur" />
                <Bar dataKey="meilleur" fill="#34C759" radius={[4, 4, 0, 0]} name="Meilleur" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Evolution */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Evolution du score</h2>
            <p className="text-xs text-[#86868B]">Progression mois par mois</p>
          </div>
          <div className="flex gap-2">
            {(['3m', '6m', '12m'] as const).map(p => (
              <button key={p} onClick={() => setSelectedPeriod(p)} className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${selectedPeriod === p ? 'bg-[#1D1D1F] text-white' : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E5E5EA]'}`}>
                {p === '3m' ? '3 mois' : p === '6m' ? '6 mois' : '12 mois'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {chartData.length > 1 && (
            <>
              <div className="bg-[#F5F5F7] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-[#1D1D1F]">{chartData[0].score}</div>
                <div className="text-xs text-[#86868B]">Debut periode</div>
              </div>
              <div className="bg-[#F5F5F7] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-[#1D1D1F]">{chartData[chartData.length - 1].score}</div>
                <div className="text-xs text-[#86868B]">Score actuel</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-700">+{chartData[chartData.length - 1].score - chartData[0].score}</div>
                <div className="text-xs text-[#86868B]">Progression</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-700">{Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length)}</div>
                <div className="text-xs text-[#86868B]">Moyenne</div>
              </div>
            </>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="month" stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} domain={[50, 100]} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E5EA' }} />
              <Bar dataKey="score" fill="url(#scoreGradient)" radius={[6, 6, 0, 0]} name="Score global" />
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Prescriber View Note */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Score visible par les prescripteurs</h3>
            <p className="text-sm text-green-800">
              Votre score de <strong>{GLOBAL_SCORE}/100</strong> est affiche aux medecins prescripteurs comme indicateur de qualite.
              Un score superieur a 80 vous donne le badge "Prestataire Premium", un argument de vente decisif pour les medecins
              qui choisissent a quel prestataire adresser leurs patients.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-green-700">
                <Users className="w-4 h-4" />
                <span>12 prescripteurs vous suivent</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-green-700">
                <Shield className="w-4 h-4" />
                <span>Top 15% du secteur</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
