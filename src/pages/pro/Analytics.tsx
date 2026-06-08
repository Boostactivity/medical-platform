/**
 * ANALYTICS — score de risque de décrochage + forecasting (back-office PSAD).
 *
 * Trois blocs, tous sur DONNÉES RÉELLES du tenant (routes /pro/analytics/*) :
 *   1. KPIs synthétiques (patients à risque élevé, observance moyenne flotte,
 *      CA LPPR du mois + évolution).
 *   2. Patients à risque de décrochage : liste triée élevé→faible, score +
 *      badge de niveau + facteurs explicites (dépliables), lien fiche. Sert à
 *      CIBLER les rappels humains — c'est un outil de priorisation bienveillant.
 *   3. Forecast : courbes historiques (trait plein) + projections (pointillés
 *      clairement étiquetés « estimation »), pour l'activité et les revenus LPPR.
 *
 * HONNÊTETÉ : le score est une heuristique transparente (chaque facteur est
 * nommé et chiffré) ; les projections sont des extrapolations de tendance,
 * jamais des certitudes. Mention méthodologique en bas de page.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

// ------------------------------------------------------------------
// Types (miroir des réponses serveur)
// ------------------------------------------------------------------

interface RiskFactorSummary {
  label: string;
  contribution: number;
  detail: string;
}

interface RiskRow {
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  score: number;
  level: 'faible' | 'modéré' | 'élevé';
  windows_available: number;
  top_factors: RiskFactorSummary[];
}

interface DropoutResponse {
  total_patients: number;
  distribution: { élevé: number; modéré: number; faible: number };
  patients: RiskRow[];
}

interface SeriesPoint {
  month: string;
  value: number;
  kind: 'reel' | 'estimation';
}

interface ForecastSeries {
  unit: string;
  trend_per_month: number | null;
  points: SeriesPoint[];
  coverage_note?: string;
  basis?: string;
}

interface ForecastResponse {
  history_months: number;
  horizon_months: number;
  disclaimer: string;
  activity: ForecastSeries;
  revenue: ForecastSeries;
  active_patients: ForecastSeries;
}

interface OverviewResponse {
  kpis: {
    patients_high_risk: number;
    fleet_size: number;
    risk_distribution: { élevé: number; modéré: number; faible: number };
    observance_avg_hours: number | null;
    observance_patients: number;
    ca_lppr_current_month: number;
    ca_lppr_previous_month: number;
    ca_evolution_pct: number | null;
    current_month: string;
  };
}

// ------------------------------------------------------------------
// Helpers d'affichage
// ------------------------------------------------------------------

const PRIMARY = '#007AFF';
const ESTIMATE = '#94A3B8'; // gris-bleu : la projection est visuellement secondaire

function levelBadgeClass(level: RiskRow['level']): string {
  switch (level) {
    case 'élevé':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'modéré':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}

function formatMonthFr(key: string): string {
  // 'YYYY-MM' → 'MM/YYYY' (lisible, sans dépendance locale lourde)
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

function formatEur(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}

/**
 * Transforme une série {month, value, kind} en lignes à deux clés :
 *  - `reel` (trait plein) pour l'historique,
 *  - `estimation` (pointillés) pour la projection.
 * Le dernier point réel est dupliqué dans `estimation` pour que la courbe
 * pointillée se RACCORDE à l'historique sans rupture visuelle.
 */
function toChartData(points: SeriesPoint[]) {
  const lastRealIdx = points.reduce((acc, p, i) => (p.kind === 'reel' ? i : acc), -1);
  return points.map((p, i) => ({
    month: formatMonthFr(p.month),
    reel: p.kind === 'reel' ? p.value : null,
    estimation:
      p.kind === 'estimation' || i === lastRealIdx ? p.value : null,
  }));
}

// ------------------------------------------------------------------
// Sous-composant : graphique de forecast (réel plein + estimation pointillés)
// ------------------------------------------------------------------

function ForecastChart({
  series,
  color,
  valueFormatter,
}: {
  series: ForecastSeries;
  color: string;
  valueFormatter?: (v: number) => string;
}) {
  const data = useMemo(() => toChartData(series.points), [series.points]);
  const hasEstimation = series.points.some((p) => p.kind === 'estimation');

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#9CA3AF"
          width={48}
          tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
        />
        <RechartsTooltip
          formatter={(value: number | string, name: string) => {
            const num = Number(value);
            const label = name === 'estimation' ? 'Estimation' : 'Réel';
            return [valueFormatter ? valueFormatter(num) : num, label];
          }}
        />
        <Legend
          formatter={(value) => (value === 'estimation' ? 'Estimation (tendance)' : 'Réel')}
        />
        <Line
          type="monotone"
          dataKey="reel"
          name="reel"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
          isAnimationActive={false}
        />
        {hasEstimation && (
          <Line
            type="monotone"
            dataKey="estimation"
            name="estimation"
            stroke={ESTIMATE}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [dropout, setDropout] = useState<DropoutResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, drRes, fcRes] = await Promise.allSettled([
        api.get('/pro/analytics/overview'),
        api.get('/pro/analytics/dropout-risk'),
        api.get('/pro/analytics/forecast'),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      else toast.error('Erreur chargement KPIs', { description: ovRes.reason?.message });
      if (drRes.status === 'fulfilled') setDropout(drRes.value);
      else toast.error('Erreur chargement risques', { description: drRes.reason?.message });
      if (fcRes.status === 'fulfilled') setForecast(fcRes.value);
      else toast.error('Erreur chargement projections', { description: fcRes.reason?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const k = overview?.kpis;
  const evolution = k?.ca_evolution_pct;

  const kpiCards: Array<{ label: string; value: string; hint?: string; danger?: boolean }> = [
    {
      label: 'Patients à risque élevé',
      value: k ? String(k.patients_high_risk) : '—',
      hint: k ? `sur ${k.fleet_size} patients suivis` : undefined,
      danger: (k?.patients_high_risk ?? 0) > 0,
    },
    {
      label: 'Observance moyenne flotte',
      value: k?.observance_avg_hours != null ? `${k.observance_avg_hours} h / 28j` : '—',
      hint: k ? `sur ${k.observance_patients} patients avec relevé` : undefined,
    },
    {
      label: 'CA LPPR du mois',
      value: k ? formatEur(k.ca_lppr_current_month) : '—',
      hint: k ? `mois ${formatMonthFr(k.current_month)}` : undefined,
    },
    {
      label: 'Évolution vs mois précédent',
      value:
        evolution == null
          ? '—'
          : `${evolution > 0 ? '+' : ''}${evolution} %`,
      hint:
        evolution == null
          ? 'pas de base de comparaison'
          : k
          ? `mois précédent : ${formatEur(k.ca_lppr_previous_month)}`
          : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Score de risque de décrochage et projections d'activité — pour
              prioriser vos rappels et anticiper la charge
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* 1. KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p
                  className={`text-2xl font-semibold mt-1 ${
                    card.danger ? 'text-red-600' : 'text-foreground'
                  }`}
                >
                  {card.value}
                </p>
                {card.hint && <p className="text-xs text-muted-foreground mt-1">{card.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 2. Patients à risque de décrochage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Patients à risque de décrochage
              </CardTitle>
              {dropout && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={levelBadgeClass('élevé')}>
                    {dropout.distribution.élevé} élevé
                  </Badge>
                  <Badge variant="outline" className={levelBadgeClass('modéré')}>
                    {dropout.distribution.modéré} modéré
                  </Badge>
                  <Badge variant="outline" className={levelBadgeClass('faible')}>
                    {dropout.distribution.faible} faible
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Triés du plus au moins à risque. Dépliez une ligne pour voir les
              facteurs qui composent le score — ce sont vos motifs de rappel.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Patient</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Principaux facteurs</TableHead>
                  <TableHead className="text-right">Fiche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Calcul des scores en cours...
                    </TableCell>
                  </TableRow>
                ) : !dropout || dropout.patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Aucun patient à évaluer pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  dropout.patients.map((row) => {
                    const isOpen = expanded.has(row.patient_id);
                    return (
                      <Fragment key={row.patient_id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleRow(row.patient_id)}
                        >
                          <TableCell>
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {row.patient_name ?? 'Patient'}
                            </div>
                            {row.patient_email && (
                              <div className="text-xs text-muted-foreground">
                                {row.patient_email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-semibold tabular-nums">
                              {row.score}
                            </span>
                            <span className="text-xs text-muted-foreground"> / 100</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={levelBadgeClass(row.level)}>
                              {row.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {row.top_factors.length > 0
                                ? row.top_factors
                                    .map((f) => `${f.label} (+${f.contribution})`)
                                    .join(', ')
                                : 'Aucun facteur de risque marqué'}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/pro/patients/${row.patient_id}`}>Ouvrir</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-muted/30">
                            <TableCell />
                            <TableCell colSpan={5}>
                              <div className="py-2 space-y-2">
                                {row.top_factors.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    Aucun facteur ne contribue au score pour ce patient.
                                  </p>
                                ) : (
                                  row.top_factors.map((f) => (
                                    <div
                                      key={f.label}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="shrink-0 tabular-nums"
                                        style={{ borderColor: PRIMARY, color: PRIMARY }}
                                      >
                                        +{f.contribution}
                                      </Badge>
                                      <div>
                                        <span className="font-medium text-foreground">
                                          {f.label}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {' '}
                                          — {f.detail}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3. Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" style={{ color: PRIMARY }} />
                Activité — interventions / mois
              </CardTitle>
              {forecast && (
                <p className="text-sm text-muted-foreground">
                  {forecast.history_months} mois d'historique, projection sur{' '}
                  {forecast.horizon_months} mois (pointillés = estimation).
                </p>
              )}
            </CardHeader>
            <CardContent>
              {forecast ? (
                <ForecastChart series={forecast.activity} color={PRIMARY} />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                  {loading ? 'Chargement...' : 'Données indisponibles'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" style={{ color: PRIMARY }} />
                Revenus LPPR / mois
              </CardTitle>
              {forecast && (
                <p className="text-sm text-muted-foreground">
                  Lignes transmises / payées. {forecast.revenue.coverage_note}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {forecast ? (
                <ForecastChart
                  series={forecast.revenue}
                  color={PRIMARY}
                  valueFormatter={formatEur}
                />
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                  {loading ? 'Chargement...' : 'Données indisponibles'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mention méthodologique honnête */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scores et projections sont calculés sur vos données réelles par une
              méthode heuristique transparente : le score de risque est la somme
              de facteurs explicites (tendance d'observance, bande actuelle, phase
              de traitement, franchissement de seuil, ressenti récent), et les
              projections sont une extrapolation de la tendance des derniers mois.
              Ce sont des aides à la décision, pas des prédictions certaines ni un
              avis médical.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
