/**
 * Historique du score — onglets 7j / 30j / 90j / 365j (Recharts).
 * Chargement à la demande par période, cache local par onglet.
 */

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { api } from '../../utils/api';

interface HistoryPoint {
  date: string;
  total_score: number;
}

const PERIODS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
  { days: 365, label: '1 an' },
];

function formatTick(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function ScoreHistoryTabs() {
  const [active, setActive] = useState('7');
  const [cache, setCache] = useState<Record<string, HistoryPoint[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cache[active]) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`/patient/score/history?days=${active}`)
      .then((res) => {
        if (!cancelled) {
          setCache((c) => ({ ...c, [active]: res.history ?? [] }));
        }
      })
      .catch(() => {
        if (!cancelled) setCache((c) => ({ ...c, [active]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, cache]);

  const data = cache[active] ?? [];

  return (
    <section className="bg-white rounded-3xl border border-[#E8E5DE] p-6 sm:p-8 shadow-sm">
      <h2 className="text-xl text-[#1A1A1A] mb-1">Votre historique</h2>
      <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
        L'évolution de votre score, nuit après nuit.
      </p>

      <Tabs defaultValue="7" value={active} onValueChange={setActive}>
        <TabsList className="flex-wrap gap-2 mb-5">
          {PERIODS.map((p) => (
            <TabsTrigger
              key={p.days}
              value={String(p.days)}
              className="rounded-full text-base px-5 h-11 border data-[state=active]:bg-[#007AFF] data-[state=active]:text-white data-[state=active]:border-[#007AFF] data-[state=inactive]:bg-white data-[state=inactive]:text-[#1A1A1A] data-[state=inactive]:border-[#E8E5DE]"
            >
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PERIODS.map((p) => (
          <TabsContent key={p.days} value={String(p.days)}>
            {loading && data.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-base text-[#5C5C5C]">
                Chargement…
              </div>
            ) : data.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-center px-4">
                <p className="text-base text-[#5C5C5C] leading-relaxed max-w-sm">
                  Pas encore assez de nuits enregistrées sur cette période.
                  Votre courbe se dessinera au fil des nuits.
                </p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007AFF" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E5DE" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatTick}
                      tick={{ fontSize: 14, fill: '#5C5C5C' }}
                      tickLine={false}
                      axisLine={{ stroke: '#E8E5DE' }}
                      minTickGap={32}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 14, fill: '#5C5C5C' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} / 100`, 'Score']}
                      labelFormatter={(label: string) => formatTick(String(label))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #E8E5DE',
                        fontSize: 16,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_score"
                      stroke="#007AFF"
                      strokeWidth={2.5}
                      fill="url(#scoreGradient)"
                      dot={data.length <= 31}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
