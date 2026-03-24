/**
 * COMPOSANT IAH CHART - Graphique IAH
 * 
 * Affiche l'évolution de l'IAH moyen du parc de patients
 * Adapté du composant ObservanceChart avec focus sur l'IAH
 */

import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface IAHData {
  date: string;
  iah_moyen: number;
  patients_total: number;
}

interface IAHChartProps {
  data: IAHData[];
  title?: string;
}

export function IAHChart({ data, title = 'Évolution IAH Moyen' }: IAHChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl p-4 shadow-xl border border-gray-100">
          <p className="text-sm text-gray-500 mb-2">
            {new Date(payload[0].payload.date).toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">
                IAH: {payload[0].value.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {payload[0].payload.patients_total} patients
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculer statistiques
  const avgIAH = data.length > 0
    ? data.reduce((acc, d) => acc + d.iah_moyen, 0) / data.length
    : 0;

  const minIAH = data.length > 0
    ? Math.min(...data.map(d => d.iah_moyen))
    : 0;

  const maxIAH = data.length > 0
    ? Math.max(...data.map(d => d.iah_moyen))
    : 0;

  // Déterminer la tendance (dernière vs première valeur)
  const trend = data.length >= 2
    ? data[data.length - 1].iah_moyen - data[0].iah_moyen
    : 0;

  const trendColor = trend < 0 ? 'text-green-600' : trend > 0 ? 'text-orange-600' : 'text-gray-600';
  const trendIcon = trend < 0 ? '↓' : trend > 0 ? '↑' : '→';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>{Math.abs(trend).toFixed(1)}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500">Sur les 7 derniers jours</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="text-2xl font-semibold text-blue-600">{avgIAH.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Moyenne</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <div className="text-2xl font-semibold text-green-600">{minIAH.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Minimum</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-3">
          <div className="text-2xl font-semibold text-orange-600">{maxIAH.toFixed(1)}</div>
          <div className="text-xs text-gray-600">Maximum</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500">Aucune donnée disponible</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <defs>
                <linearGradient id="colorIAH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="iah_moyen"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>IAH {'<'} 5 (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>5-15 (Léger)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>{'>'} 15 (Modéré/Sévère)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}