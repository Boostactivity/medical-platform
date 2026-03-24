/**
 * PHASE 4 - COMPARAISON COHORTES
 * Compare un patient vs la moyenne de patients similaires (age, IMC, severite IAH)
 * Graphique radar : observance, IAH residuel, fuites, confort
 * Percentile du patient
 */

import { useMemo } from 'react';
import { Users, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface PatientMetrics {
  observance: number; // % (0-100)
  ahiResiduel: number; // events/h (lower is better)
  fuites: number; // L/min (lower is better)
  confort: number; // score 0-100
  usageMoyen: number; // heures/nuit
}

interface CohortComparisonProps {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientBMI?: number;
  patientIAHSeverity?: 'leger' | 'modere' | 'severe';
  patientMetrics?: PatientMetrics;
}

// Simulated cohort averages by severity
const cohortAverages: Record<string, PatientMetrics> = {
  leger: {
    observance: 72,
    ahiResiduel: 3.2,
    fuites: 12,
    confort: 68,
    usageMoyen: 5.8,
  },
  modere: {
    observance: 68,
    ahiResiduel: 5.5,
    fuites: 15,
    confort: 62,
    usageMoyen: 5.2,
  },
  severe: {
    observance: 65,
    ahiResiduel: 8.1,
    fuites: 18,
    confort: 55,
    usageMoyen: 4.8,
  },
};

// Normalize a metric to 0-100 scale for radar chart
// For "lower is better" metrics, we invert the scale
function normalizeForRadar(value: number, metric: string): number {
  switch (metric) {
    case 'observance':
    case 'confort':
      return Math.min(100, Math.max(0, value));
    case 'ahiResiduel':
      // 0 events = 100 score, 20 events = 0 score
      return Math.min(100, Math.max(0, 100 - (value / 20) * 100));
    case 'fuites':
      // 0 L/min = 100 score, 40 L/min = 0 score
      return Math.min(100, Math.max(0, 100 - (value / 40) * 100));
    case 'usageMoyen':
      // 0h = 0 score, 8h+ = 100 score
      return Math.min(100, Math.max(0, (value / 8) * 100));
    default:
      return value;
  }
}

function calculatePercentile(patientValue: number, metric: string): number {
  // Simulated percentile calculation based on normal distribution around cohort mean
  // In production, this would use actual cohort data from the database
  const basePercentiles: Record<string, number> = {
    observance: 50,
    ahiResiduel: 50,
    fuites: 50,
    confort: 50,
    usageMoyen: 50,
  };

  // Rough percentile estimation
  switch (metric) {
    case 'observance':
      if (patientValue >= 90) return 95;
      if (patientValue >= 80) return 80;
      if (patientValue >= 70) return 60;
      if (patientValue >= 60) return 40;
      return 20;
    case 'usageMoyen':
      if (patientValue >= 7) return 90;
      if (patientValue >= 6) return 75;
      if (patientValue >= 5) return 55;
      if (patientValue >= 4) return 35;
      return 15;
    case 'ahiResiduel':
      if (patientValue <= 2) return 90;
      if (patientValue <= 5) return 70;
      if (patientValue <= 10) return 40;
      return 15;
    case 'fuites':
      if (patientValue <= 8) return 85;
      if (patientValue <= 15) return 65;
      if (patientValue <= 24) return 40;
      return 15;
    case 'confort':
      if (patientValue >= 80) return 90;
      if (patientValue >= 65) return 65;
      if (patientValue >= 50) return 40;
      return 20;
    default:
      return basePercentiles[metric] || 50;
  }
}

export function CohortComparison({
  patientId,
  patientName,
  patientAge = 54,
  patientBMI = 28,
  patientIAHSeverity = 'modere',
  patientMetrics,
}: CohortComparisonProps) {
  const metrics: PatientMetrics = patientMetrics || {
    observance: 85,
    ahiResiduel: 3.4,
    fuites: 8.5,
    confort: 75,
    usageMoyen: 7.2,
  };

  const cohort = cohortAverages[patientIAHSeverity];

  const radarData = useMemo(() => {
    const dimensions = [
      { key: 'observance', label: 'Observance', unit: '%' },
      { key: 'usageMoyen', label: 'Usage moyen', unit: 'h' },
      { key: 'ahiResiduel', label: 'IAH residuel', unit: '/h' },
      { key: 'fuites', label: 'Fuites', unit: 'L/min' },
      { key: 'confort', label: 'Confort', unit: '/100' },
    ];

    return dimensions.map((dim) => ({
      subject: dim.label,
      patient: normalizeForRadar(
        metrics[dim.key as keyof PatientMetrics],
        dim.key
      ),
      cohorte: normalizeForRadar(
        cohort[dim.key as keyof PatientMetrics],
        dim.key
      ),
      fullMark: 100,
    }));
  }, [metrics, cohort]);

  const percentiles = useMemo(() => {
    return {
      observance: calculatePercentile(metrics.observance, 'observance'),
      usageMoyen: calculatePercentile(metrics.usageMoyen, 'usageMoyen'),
      ahiResiduel: calculatePercentile(metrics.ahiResiduel, 'ahiResiduel'),
      fuites: calculatePercentile(metrics.fuites, 'fuites'),
      confort: calculatePercentile(metrics.confort, 'confort'),
    };
  }, [metrics]);

  const globalPercentile = Math.round(
    Object.values(percentiles).reduce((a, b) => a + b, 0) / Object.values(percentiles).length
  );

  const getPercentileColor = (p: number) => {
    if (p >= 75) return 'text-green-600';
    if (p >= 50) return 'text-blue-600';
    if (p >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPercentileBg = (p: number) => {
    if (p >= 75) return 'bg-green-50 border-green-200';
    if (p >= 50) return 'bg-blue-50 border-blue-200';
    if (p >= 25) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Comparaison Cohorte - {patientName}
            </CardTitle>
            <CardDescription>
              Compare avec la cohorte IAH {patientIAHSeverity} (age ~{patientAge} ans, IMC ~{patientBMI})
            </CardDescription>
          </div>
          <Badge className={`${getPercentileBg(globalPercentile)} ${getPercentileColor(globalPercentile)} border`}>
            <Award className="w-3 h-3 mr-1" />
            Top {100 - globalPercentile}% global
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Radar Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
              <Radar
                name={patientName}
                dataKey="patient"
                stroke="#007AFF"
                fill="#007AFF"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name={`Cohorte IAH ${patientIAHSeverity}`}
                dataKey="cohorte"
                stroke="#86868B"
                fill="#86868B"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Percentile breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { key: 'observance', label: 'Observance', value: `${metrics.observance}%`, cohortValue: `${cohort.observance}%` },
            { key: 'usageMoyen', label: 'Usage', value: `${metrics.usageMoyen.toFixed(1)}h`, cohortValue: `${cohort.usageMoyen.toFixed(1)}h` },
            { key: 'ahiResiduel', label: 'IAH', value: `${metrics.ahiResiduel.toFixed(1)}/h`, cohortValue: `${cohort.ahiResiduel.toFixed(1)}/h` },
            { key: 'fuites', label: 'Fuites', value: `${metrics.fuites.toFixed(1)} L/min`, cohortValue: `${cohort.fuites.toFixed(1)} L/min` },
            { key: 'confort', label: 'Confort', value: `${metrics.confort}/100`, cohortValue: `${cohort.confort}/100` },
          ].map((item) => {
            const pct = percentiles[item.key as keyof typeof percentiles];
            return (
              <div
                key={item.key}
                className={`p-3 rounded-lg border text-center ${getPercentileBg(pct)}`}
              >
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-lg font-semibold ${getPercentileColor(pct)}`}>
                  Top {100 - pct}%
                </p>
                <div className="mt-1 text-xs space-y-0.5">
                  <p>
                    Patient : <span className="font-medium">{item.value}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Cohorte : {item.cohortValue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary text */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-start gap-2">
            <TrendingUp className={`w-5 h-5 mt-0.5 ${getPercentileColor(globalPercentile)}`} />
            <div>
              <p className="text-sm font-medium">
                {patientName} se situe dans le{' '}
                <span className={`font-bold ${getPercentileColor(globalPercentile)}`}>
                  top {100 - globalPercentile}%
                </span>{' '}
                des patients avec un SAOS {patientIAHSeverity}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {globalPercentile >= 75
                  ? 'Excellent profil. Le traitement est tres bien suivi et efficace par rapport aux patients comparables.'
                  : globalPercentile >= 50
                  ? 'Bon profil. Le patient est au-dessus de la moyenne de sa cohorte sur la plupart des indicateurs.'
                  : globalPercentile >= 25
                  ? 'Profil a surveiller. Certains indicateurs sont en dessous de la moyenne de la cohorte.'
                  : 'Profil necessitant une intervention. Le patient est significativement en dessous de la moyenne de sa cohorte.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
