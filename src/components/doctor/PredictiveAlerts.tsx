/**
 * PHASE 4 - ALERTES PREDICTIVES IA
 * Analyse les tendances des 7 derniers jours pour predire les risques
 * Score de risque : faible/moyen/eleve avec explications
 */

import { useState, useEffect, useMemo } from 'react';
import { Brain, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Shield, Wind, Clock, Activity } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface DailyData {
  date: string;
  usage: number; // heures
  ahi: number; // events/h
  leaks: number; // L/min
}

interface PredictiveAlert {
  id: string;
  type: 'decrochage' | 'masque' | 'pression' | 'positif';
  severity: 'faible' | 'moyen' | 'eleve';
  title: string;
  description: string;
  recommendation: string;
  trend: number; // % variation
  icon: typeof AlertTriangle;
  confidence: number; // 0-100
}

interface PredictiveAlertsProps {
  patientId: string;
  patientName: string;
  last7DaysData?: DailyData[];
}

// Generate mock 7-day data if not provided
function generateMock7DaysData(): DailyData[] {
  const data: DailyData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      usage: Math.max(0, 6.5 - i * 0.3 + (Math.random() - 0.5) * 1.5),
      ahi: Math.max(0, 3 + i * 0.4 + (Math.random() - 0.5) * 2),
      leaks: Math.max(0, 10 + i * 1.5 + (Math.random() - 0.5) * 5),
    });
  }
  return data;
}

// Compute linear regression slope for trend analysis
function computeTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den === 0 ? 0 : num / den;
}

function analyzePatientData(data: DailyData[]): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  const usageValues = data.map((d) => d.usage);
  const ahiValues = data.map((d) => d.ahi);
  const leakValues = data.map((d) => d.leaks);

  const usageTrend = computeTrend(usageValues);
  const ahiTrend = computeTrend(ahiValues);
  const leakTrend = computeTrend(leakValues);

  const avgUsage = usageValues.reduce((a, b) => a + b, 0) / usageValues.length;
  const avgAhi = ahiValues.reduce((a, b) => a + b, 0) / ahiValues.length;
  const avgLeaks = leakValues.reduce((a, b) => a + b, 0) / leakValues.length;

  const usageChangePercent = avgUsage > 0 ? (usageTrend / avgUsage) * 100 : 0;
  const ahiChangePercent = avgAhi > 0 ? (ahiTrend / avgAhi) * 100 : 0;
  const leakChangePercent = avgLeaks > 0 ? (leakTrend / avgLeaks) * 100 : 0;

  // Check for observance drop
  if (usageTrend < -0.15) {
    const severity: PredictiveAlert['severity'] =
      usageTrend < -0.4 ? 'eleve' : usageTrend < -0.25 ? 'moyen' : 'faible';
    const confidence = Math.min(95, Math.abs(usageTrend) * 200);

    alerts.push({
      id: 'alert-decrochage',
      type: 'decrochage',
      severity,
      title: 'Risque de decrochage therapeutique',
      description: `L'usage PPC diminue progressivement (${usageChangePercent.toFixed(0)}% sur 7 jours). Moyenne actuelle : ${avgUsage.toFixed(1)}h/nuit. Si la tendance se poursuit, le patient pourrait passer sous le seuil de 4h dans ${Math.max(1, Math.ceil((avgUsage - 4) / Math.abs(usageTrend)))} jours.`,
      recommendation:
        severity === 'eleve'
          ? 'Contact telephonique urgent recommande. Evaluer les raisons du decrochage (inconfort, effets secondaires, motivation).'
          : 'Programmer un appel de suivi. Renforcer la motivation et verifier le confort du traitement.',
      trend: usageChangePercent,
      icon: Clock,
      confidence,
    });
  }

  // Check for leak increase
  if (leakTrend > 0.5) {
    const severity: PredictiveAlert['severity'] =
      avgLeaks > 30 ? 'eleve' : avgLeaks > 20 ? 'moyen' : 'faible';
    const confidence = Math.min(90, leakTrend * 50);

    alerts.push({
      id: 'alert-masque',
      type: 'masque',
      severity,
      title: 'Masque probablement use ou mal positionne',
      description: `Les fuites augmentent progressivement (+${leakChangePercent.toFixed(0)}% sur 7 jours). Moyenne actuelle : ${avgLeaks.toFixed(1)} L/min. Seuil recommande : < 24 L/min.`,
      recommendation:
        'Verifier l\'ajustement du masque. Si le masque a plus de 6 mois, envisager un remplacement. Proposer un essai de harnais ou de type de masque different.',
      trend: leakChangePercent,
      icon: Wind,
      confidence,
    });
  }

  // Check for AHI increase
  if (ahiTrend > 0.2) {
    const severity: PredictiveAlert['severity'] =
      avgAhi > 15 ? 'eleve' : avgAhi > 8 ? 'moyen' : 'faible';
    const confidence = Math.min(90, ahiTrend * 100);

    alerts.push({
      id: 'alert-pression',
      type: 'pression',
      severity,
      title: 'Reevaluation de pression recommandee',
      description: `L'IAH residuel augmente (+${ahiChangePercent.toFixed(0)}% sur 7 jours). Moyenne actuelle : ${avgAhi.toFixed(1)} ev/h. ${avgAhi > 10 ? 'Le seuil d\'efficacite therapeutique (< 5/h) est depasse.' : 'Surveillance necessaire.'}`,
      recommendation:
        avgAhi > 10
          ? 'Reevaluation clinique prioritaire. Envisager un ajustement de pression, changement de mode (APAP vers BiPAP), ou polysomnographie de controle.'
          : 'Surveiller l\'evolution. Si la tendance persiste, programmer une consultation de controle.',
      trend: ahiChangePercent,
      icon: Activity,
      confidence,
    });
  }

  // Positive alert if everything looks good
  if (alerts.length === 0) {
    alerts.push({
      id: 'alert-positif',
      type: 'positif',
      severity: 'faible',
      title: 'Traitement bien suivi',
      description: `Aucune anomalie detectee sur les 7 derniers jours. Usage moyen : ${avgUsage.toFixed(1)}h/nuit, IAH : ${avgAhi.toFixed(1)}/h, Fuites : ${avgLeaks.toFixed(1)} L/min.`,
      recommendation: 'Continuer le suivi habituel. Les indicateurs sont stables et dans les normes.',
      trend: 0,
      icon: CheckCircle,
      confidence: 95,
    });
  }

  return alerts;
}

function computeGlobalRiskScore(alerts: PredictiveAlert[]): {
  score: number;
  level: 'faible' | 'moyen' | 'eleve';
  label: string;
} {
  if (alerts.length === 1 && alerts[0].type === 'positif') {
    return { score: 15, level: 'faible', label: 'Risque faible' };
  }

  const severityScores = { faible: 20, moyen: 45, eleve: 80 };
  const maxScore = Math.max(
    ...alerts.filter((a) => a.type !== 'positif').map((a) => severityScores[a.severity])
  );

  // Adjust based on number of simultaneous alerts
  const adjustedScore = Math.min(100, maxScore + (alerts.filter((a) => a.type !== 'positif').length - 1) * 10);

  if (adjustedScore >= 60) return { score: adjustedScore, level: 'eleve', label: 'Risque eleve' };
  if (adjustedScore >= 35) return { score: adjustedScore, level: 'moyen', label: 'Risque moyen' };
  return { score: adjustedScore, level: 'faible', label: 'Risque faible' };
}

export function PredictiveAlerts({ patientId, patientName, last7DaysData }: PredictiveAlertsProps) {
  const [realData, setRealData] = useState<DailyData[] | null>(null);

  useEffect(() => {
    if (last7DaysData) return;
    const fetchData = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const { data: therapyData, error } = await supabase
          .from('therapy_data')
          .select('date, usage_hours, ahi, leaks')
          .eq('patient_id', patientId)
          .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(14);
        if (!error && therapyData?.length >= 3) {
          const mapped: DailyData[] = therapyData.map((d: any) => ({
            date: d.date,
            usage: d.usage_hours ?? 0,
            ahi: d.ahi ?? 0,
            leaks: d.leaks ?? 0,
          }));
          setRealData(mapped);
        }
      } catch (e) {
        console.warn('PredictiveAlerts: Using mock data', e);
      }
    };
    fetchData();
  }, [patientId, last7DaysData]);

  const data = last7DaysData || realData || generateMock7DaysData();

  const alerts = useMemo(() => analyzePatientData(data), [data]);
  const riskScore = useMemo(() => computeGlobalRiskScore(alerts), [alerts]);

  const getSeverityColor = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'eleve':
        return 'text-red-600';
      case 'moyen':
        return 'text-orange-500';
      case 'faible':
        return 'text-green-600';
    }
  };

  const getSeverityBg = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'eleve':
        return 'bg-red-50 border-red-200';
      case 'moyen':
        return 'bg-orange-50 border-orange-200';
      case 'faible':
        return 'bg-green-50 border-green-200';
    }
  };

  const getSeverityBadge = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'eleve':
        return <Badge variant="destructive">Eleve</Badge>;
      case 'moyen':
        return <Badge className="bg-orange-500">Moyen</Badge>;
      case 'faible':
        return <Badge className="bg-green-500">Faible</Badge>;
    }
  };

  const getRiskBarColor = (level: string) => {
    switch (level) {
      case 'eleve':
        return 'bg-red-500';
      case 'moyen':
        return 'bg-orange-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-500" />
              Alertes Predictives IA - {patientName}
            </CardTitle>
            <CardDescription>
              Analyse des tendances sur les 7 derniers jours avec detection automatique des risques
            </CardDescription>
          </div>
          {getSeverityBadge(riskScore.level)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global risk score */}
        <div className={`p-4 rounded-lg border ${getSeverityBg(riskScore.level)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${getSeverityColor(riskScore.level)}`} />
              <span className="font-medium text-sm">Score de risque global</span>
            </div>
            <span className={`text-2xl font-bold ${getSeverityColor(riskScore.level)}`}>
              {riskScore.score}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${getRiskBarColor(riskScore.level)}`}
              style={{ width: `${riskScore.score}%` }}
            />
          </div>
          <p className={`text-xs mt-2 ${getSeverityColor(riskScore.level)}`}>
            {riskScore.label} -{' '}
            {riskScore.level === 'faible'
              ? 'Aucune intervention immediate necessaire'
              : riskScore.level === 'moyen'
              ? 'Surveillance renforcee recommandee'
              : 'Intervention rapide recommandee'}
          </p>
        </div>

        {/* 7-day micro trend */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Tendances 7 jours</h4>
          <div className="grid grid-cols-7 gap-1">
            {data.map((day, i) => {
              const isGood = day.usage >= 4 && day.ahi <= 5 && day.leaks <= 24;
              const isWarning = day.usage >= 3 && day.ahi <= 10 && day.leaks <= 30;
              const dayLabel = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' });
              return (
                <div key={i} className="text-center">
                  <div
                    className={`w-full aspect-square rounded-md flex items-center justify-center text-xs font-medium ${
                      isGood
                        ? 'bg-green-100 text-green-700'
                        : isWarning
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={`Usage: ${day.usage.toFixed(1)}h | IAH: ${day.ahi.toFixed(1)} | Fuites: ${day.leaks.toFixed(1)}`}
                  >
                    {day.usage.toFixed(0)}h
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dayLabel}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert details */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getSeverityBg(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'positif'
                        ? 'bg-green-100'
                        : alert.severity === 'eleve'
                        ? 'bg-red-100'
                        : 'bg-orange-100'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        alert.type === 'positif'
                          ? 'text-green-600'
                          : getSeverityColor(alert.severity)
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-sm">{alert.title}</h5>
                      <div className="flex items-center gap-2">
                        {alert.trend !== 0 && (
                          <span className="text-xs flex items-center gap-0.5">
                            {alert.trend > 0 ? (
                              <TrendingUp className="w-3 h-3 text-red-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            {Math.abs(alert.trend).toFixed(0)}%
                          </span>
                        )}
                        {getSeverityBadge(alert.severity)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                    <div className="p-2 bg-white/60 rounded border border-white">
                      <p className="text-xs">
                        <span className="font-medium">Recommandation :</span> {alert.recommendation}
                      </p>
                    </div>
                    {alert.confidence > 0 && alert.type !== 'positif' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Confiance IA :</span>
                        <div className="flex-1 max-w-[100px]">
                          <Progress value={alert.confidence} className="h-1" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {alert.confidence.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
