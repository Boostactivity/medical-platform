import { useState } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartData {
  date: string;
  hours_used: number;
  leakage: number;
  events: number;
}

interface ObservanceChartProps {
  data: ChartData[];
  title?: string;
}

export function ObservanceChart({ data, title = 'Mon suivi' }: ObservanceChartProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const periods = {
    '7d': { label: '7 jours', days: 7 },
    '30d': { label: '30 jours', days: 30 },
    '90d': { label: '90 jours', days: 90 },
  };

  const filteredData = data.slice(-periods[period].days);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#D9D5CC]">
          <p className="text-sm text-[#5C5C5C] mb-2">
            {new Date(payload[0].payload.date).toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#007AFF] rounded-full"></div>
              <span className="text-sm text-[#1A1A1A]">
                {payload[0].value.toFixed(1)}h d'utilisation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#B34000] rounded-full"></div>
              <span className="text-sm text-[#1A1A1A]">
                {payload[1]?.value || 0} fuites
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#CE0500] rounded-full"></div>
              <span className="text-sm text-[#1A1A1A]">
                {payload[2]?.value || 0} événements
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Safety checks for empty data
  const avgHours = filteredData.length > 0
    ? filteredData.reduce((acc, d) => acc + d.hours_used, 0) / filteredData.length
    : 0;
  const compliance = filteredData.length > 0
    ? (filteredData.filter(d => d.hours_used >= 4).length / filteredData.length) * 100
    : 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl text-[#1A1A1A] mb-1">{title}</h3>
          <p className="text-sm text-[#5C5C5C]">Évolution de votre traitement</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 bg-[#F2F0EB] rounded-xl p-1">
          {Object.entries(periods).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setPeriod(key as '7d' | '30d' | '90d')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                period === key
                  ? 'bg-white text-[#007AFF] shadow-sm'
                  : 'text-[#5C5C5C] hover:text-[#1A1A1A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#007AFF]/10 to-[#5AC8FA]/10 rounded-2xl p-4"
        >
          <div className="text-3xl text-[#1A1A1A] mb-1">{avgHours.toFixed(1)}h</div>
          <div className="text-sm text-[#5C5C5C]">Moyenne par nuit</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#18753C]/10 to-[#18753C]/10 rounded-2xl p-4"
        >
          <div className="text-3xl text-[#1A1A1A] mb-1">{compliance.toFixed(0)}%</div>
          <div className="text-sm text-[#5C5C5C]">Nuits observantes</div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="h-64"
      >
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-[#5C5C5C] text-lg">Aucune donnée disponible pour cette période</p>
              <p className="text-[#5C5C5C] text-sm mt-2">Vos données d'observance apparaîtront ici</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9D5CC" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#5C5C5C"
                style={{ fontSize: '12px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#5C5C5C"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="hours_used"
                stroke="#007AFF"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorHours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#18753C] rounded-full"></div>
          <span className="text-[#5C5C5C]">≥ 4h (objectif atteint)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#B34000] rounded-full"></div>
          <span className="text-[#5C5C5C]">&lt; 4h (à améliorer)</span>
        </div>
      </div>
    </div>
  );
}