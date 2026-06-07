/**
 * Graphique historique scores Medical
 * Courbe 30 derniers jours avec trend
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ScoreData {
  date: string;
  total_score: number;
  grade: string;
}

interface ScoreHistoryChartProps {
  scores: ScoreData[];
}

export function ScoreHistoryChart({ scores }: ScoreHistoryChartProps) {
  // Préparer données pour le graphique (inverser pour ordre chronologique)
  const chartData = [...scores].reverse().map(s => ({
    date: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    score: s.total_score,
    grade: s.grade,
  }));

  // Moyenne
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length)
    : 0;

  // Min/Max
  const maxScore = Math.max(...scores.map(s => s.total_score));
  const minScore = Math.min(...scores.map(s => s.total_score));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{payload[0].payload.date}</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {payload[0].value}/100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Grade: {payload[0].payload.grade}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Évolution du score</h3>
          <p className="text-sm text-gray-500 mt-1">30 derniers jours</p>
        </div>

        {/* Stats rapides */}
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-500">Moyenne</p>
            <p className="text-lg font-semibold text-gray-900">{avgScore}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Max</p>
            <p className="text-lg font-semibold text-green-600">{maxScore}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Min</p>
            <p className="text-lg font-semibold text-red-600">{minScore}</p>
          </div>
        </div>
      </div>

      {/* Graphique */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#A8A49C"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#A8A49C"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Ligne de référence moyenne */}
          <Line 
            type="monotone" 
            dataKey={() => avgScore} 
            stroke="#d1d5db" 
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={1}
          />
          
          {/* Courbe principale */}
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#007AFF" 
            strokeWidth={3}
            fill="url(#colorScore)"
            dot={{ fill: '#007AFF', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Score quotidien</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-400" style={{ width: '20px' }} />
          <span>Moyenne ({avgScore})</span>
        </div>
      </div>
    </div>
  );
}
