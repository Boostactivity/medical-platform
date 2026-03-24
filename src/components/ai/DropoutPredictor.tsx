import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// Types
interface PatientRisk {
  id: string;
  nom: string; // anonymise pour la demo
  score: number;
  facteurs: RiskFactor[];
  tendance: 'stable' | 'hausse' | 'baisse';
  dernierScore: number;
  dernierLogin: string;
  moyenneHeures14j: number;
}

interface RiskFactor {
  label: string;
  poids: number; // 0-100
  detail: string;
}

interface UsageDay {
  jour: string;
  heures: number;
  iah: number;
  fuites: number;
}

/**
 * Algorithme de prediction de decrochage PPC
 * Analyse les 14 derniers jours de donnees telemetriques
 * Score composite : 0 (aucun risque) - 100 (decrochage imminent)
 */
function computeDropoutScore(usage: UsageDay[]): { score: number; facteurs: RiskFactor[] } {
  const facteurs: RiskFactor[] = [];
  let totalWeight = 0;

  if (usage.length < 7) {
    return { score: 50, facteurs: [{ label: 'Donnees insuffisantes', poids: 50, detail: 'Moins de 7 jours de donnees' }] };
  }

  // 1. Tendance d'utilisation (40% du score)
  const firstWeek = usage.slice(0, 7).reduce((s, d) => s + d.heures, 0) / 7;
  const lastWeek = usage.slice(-7).reduce((s, d) => s + d.heures, 0) / 7;
  const tendancePct = firstWeek > 0 ? ((firstWeek - lastWeek) / firstWeek) * 100 : 0;
  const tendanceScore = Math.min(100, Math.max(0, tendancePct * 2.5));
  if (tendanceScore > 20) {
    facteurs.push({
      label: 'Baisse progressive d\'utilisation',
      poids: Math.round(tendanceScore),
      detail: `Moyenne semaine 1: ${firstWeek.toFixed(1)}h -> Semaine 2: ${lastWeek.toFixed(1)}h (${tendancePct > 0 ? '-' : '+'}${Math.abs(tendancePct).toFixed(0)}%)`,
    });
  }
  totalWeight += tendanceScore * 0.4;

  // 2. Nuits courtes < 2h (25% du score)
  const nuitsCortes = usage.filter(d => d.heures > 0 && d.heures < 2).length;
  const nuitsCortesScore = Math.min(100, (nuitsCortes / usage.length) * 200);
  if (nuitsCortes > 0) {
    facteurs.push({
      label: 'Nuits avec port < 2h',
      poids: Math.round(nuitsCortesScore),
      detail: `${nuitsCortes} nuit${nuitsCortes > 1 ? 's' : ''} sur ${usage.length} avec moins de 2h de port`,
    });
  }
  totalWeight += nuitsCortesScore * 0.25;

  // 3. Nuits sans utilisation (20% du score)
  const nuitsSans = usage.filter(d => d.heures === 0).length;
  const nuitsSansScore = Math.min(100, (nuitsSans / usage.length) * 150);
  if (nuitsSans > 0) {
    facteurs.push({
      label: 'Nuits sans utilisation',
      poids: Math.round(nuitsSansScore),
      detail: `${nuitsSans} nuit${nuitsSans > 1 ? 's' : ''} sans PPC sur les ${usage.length} derniers jours`,
    });
  }
  totalWeight += nuitsSansScore * 0.2;

  // 4. IAH residuel eleve (15% du score)
  const iahMoyen = usage.filter(d => d.heures > 0).reduce((s, d) => s + d.iah, 0) /
    Math.max(1, usage.filter(d => d.heures > 0).length);
  const iahScore = Math.min(100, Math.max(0, (iahMoyen - 5) * 10));
  if (iahScore > 15) {
    facteurs.push({
      label: 'IAH residuel eleve',
      poids: Math.round(iahScore),
      detail: `IAH moyen residuel: ${iahMoyen.toFixed(1)} evt/h (objectif < 5)`,
    });
  }
  totalWeight += iahScore * 0.15;

  return {
    score: Math.round(Math.min(100, Math.max(0, totalWeight))),
    facteurs: facteurs.sort((a, b) => b.poids - a.poids),
  };
}

function getRecommendations(score: number, facteurs: RiskFactor[]): string[] {
  const recs: string[] = [];
  if (score < 30) {
    recs.push('Continuer le suivi standard');
    recs.push('Envoyer un message de felicitations pour l\'observance');
  } else if (score < 70) {
    recs.push('Planifier un appel de suivi dans les 48h');
    recs.push('Envoyer des conseils personnalises par notification');
    if (facteurs.some(f => f.label.includes('IAH'))) {
      recs.push('Verifier le reglage de pression avec le pneumologue');
    }
    if (facteurs.some(f => f.label.includes('fuites') || f.label.includes('masque'))) {
      recs.push('Proposer un rendez-vous pour ajustement du masque');
    }
    recs.push('Proposer un echange avec un patient-ambassadeur');
  } else {
    recs.push('URGENT : Contacter le patient dans les 24h');
    recs.push('Planifier une visite a domicile');
    recs.push('Evaluer un changement de masque ou de machine');
    recs.push('Proposer une teleconsultation avec le pneumologue');
    recs.push('Activer le protocole de retention patient');
  }
  return recs;
}

// Donnees de demonstration
function generateMockPatients(): PatientRisk[] {
  const patients: PatientRisk[] = [
    { id: '1', nom: 'Patient #A2847', score: 82, facteurs: [], tendance: 'hausse', dernierScore: 65, dernierLogin: '2026-03-18', moyenneHeures14j: 2.1 },
    { id: '2', nom: 'Patient #B1293', score: 71, facteurs: [], tendance: 'hausse', dernierScore: 58, dernierLogin: '2026-03-20', moyenneHeures14j: 3.2 },
    { id: '3', nom: 'Patient #C4521', score: 56, facteurs: [], tendance: 'stable', dernierScore: 54, dernierLogin: '2026-03-22', moyenneHeures14j: 4.1 },
    { id: '4', nom: 'Patient #D7834', score: 43, facteurs: [], tendance: 'baisse', dernierScore: 51, dernierLogin: '2026-03-23', moyenneHeures14j: 4.8 },
    { id: '5', nom: 'Patient #E9102', score: 28, facteurs: [], tendance: 'stable', dernierScore: 25, dernierLogin: '2026-03-24', moyenneHeures14j: 5.9 },
    { id: '6', nom: 'Patient #F3456', score: 15, facteurs: [], tendance: 'baisse', dernierScore: 22, dernierLogin: '2026-03-24', moyenneHeures14j: 6.8 },
    { id: '7', nom: 'Patient #G6789', score: 88, facteurs: [], tendance: 'hausse', dernierScore: 72, dernierLogin: '2026-03-15', moyenneHeures14j: 1.3 },
  ];

  return patients.map(p => {
    // Generer des donnees d'usage coherentes avec le score
    const baseHours = p.moyenneHeures14j;
    const usage: UsageDay[] = Array.from({ length: 14 }, (_, i) => {
      const variation = (Math.random() - 0.5) * 3;
      const trend = p.tendance === 'hausse' ? (i * 0.15) : p.tendance === 'baisse' ? -(i * 0.1) : 0;
      const h = Math.max(0, baseHours + variation - trend);
      return {
        jour: `J-${14 - i}`,
        heures: Math.round(h * 10) / 10,
        iah: Math.max(1, 5 + (Math.random() - 0.5) * 8),
        fuites: Math.random() * 30,
      };
    });
    const result = computeDropoutScore(usage);
    return { ...p, score: result.score, facteurs: result.facteurs };
  }).sort((a, b) => b.score - a.score);
}

function ScoreIndicator({ score }: { score: number }) {
  const level = score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low';
  const colors = {
    high: 'bg-red-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white',
  };
  const labels = { high: 'Eleve', medium: 'Moyen', low: 'Faible' };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colors[level]}`}>
        {score}
      </div>
      <span className={`text-xs font-medium ${
        level === 'high' ? 'text-red-600 dark:text-red-400' :
        level === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
        'text-green-600 dark:text-green-400'
      }`}>{labels[level]}</span>
    </div>
  );
}

export function DropoutPredictor() {
  const [patients] = useState(() => generateMockPatients());
  const [selectedPatient, setSelectedPatient] = useState<PatientRisk | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredPatients = useMemo(() => {
    if (filterLevel === 'all') return patients;
    if (filterLevel === 'high') return patients.filter(p => p.score >= 70);
    if (filterLevel === 'medium') return patients.filter(p => p.score >= 30 && p.score < 70);
    return patients.filter(p => p.score < 30);
  }, [patients, filterLevel]);

  const stats = useMemo(() => ({
    total: patients.length,
    high: patients.filter(p => p.score >= 70).length,
    medium: patients.filter(p => p.score >= 30 && p.score < 70).length,
    low: patients.filter(p => p.score < 30).length,
    avgScore: Math.round(patients.reduce((s, p) => s + p.score, 0) / patients.length),
  }), [patients]);

  // Donnees pour le graphique de tendance du patient selectionne
  const patientUsageData = useMemo(() => {
    if (!selectedPatient) return [];
    const base = selectedPatient.moyenneHeures14j;
    return Array.from({ length: 14 }, (_, i) => {
      const trend = selectedPatient.tendance === 'hausse'
        ? (i * 0.2) : selectedPatient.tendance === 'baisse' ? -(i * 0.15) : 0;
      const h = Math.max(0, base + (Math.random() - 0.3) * 2 - trend);
      return { jour: `J-${14 - i}`, heures: Math.round(h * 10) / 10 };
    });
  }, [selectedPatient]);

  // Vue detail patient
  if (selectedPatient) {
    const recs = getRecommendations(selectedPatient.score, selectedPatient.facteurs);

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedPatient(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </button>

        {/* Score */}
        <div className={`rounded-2xl p-6 border shadow-sm ${
          selectedPatient.score >= 70 ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
          selectedPatient.score >= 30 ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
          'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{selectedPatient.nom}</h3>
              <p className="text-sm text-muted-foreground">
                Derniere connexion : {new Date(selectedPatient.dernierLogin).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-muted-foreground">
                Moyenne 14j : {selectedPatient.moyenneHeures14j}h/nuit
              </p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold text-foreground">{selectedPatient.score}</p>
              <p className="text-sm text-muted-foreground">Score de risque</p>
              <div className="flex items-center gap-1 mt-1 justify-end">
                <svg className={`w-4 h-4 ${
                  selectedPatient.tendance === 'hausse' ? 'text-red-500 rotate-0' :
                  selectedPatient.tendance === 'baisse' ? 'text-green-500 rotate-180' :
                  'text-yellow-500'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                <span className="text-xs text-muted-foreground">
                  {selectedPatient.tendance === 'hausse' ? 'En hausse' :
                   selectedPatient.tendance === 'baisse' ? 'En baisse' : 'Stable'}
                  {' '}(precedent: {selectedPatient.dernierScore})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Facteurs de risque */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h4 className="font-semibold text-foreground mb-4">Facteurs de risque identifies</h4>
          {selectedPatient.facteurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun facteur de risque significatif detecte.</p>
          ) : (
            <div className="space-y-3">
              {selectedPatient.facteurs.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    f.poids >= 60 ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                    f.poids >= 30 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                    'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  }`}>
                    {f.poids}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graphique d'utilisation */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h4 className="font-semibold text-foreground mb-4">Utilisation PPC - 14 derniers jours</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={patientUsageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="jour" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--foreground)',
                }}
                formatter={(value: number) => [`${value}h`, 'Utilisation']}
              />
              <ReferenceLine y={4} stroke="var(--success)" strokeDasharray="5 5" label={{ value: 'Seuil HAS (4h)', fill: 'var(--success)', fontSize: 10 }} />
              <Line type="monotone" dataKey="heures" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recommandations */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h4 className="font-semibold text-foreground mb-4">Recommandations automatiques</h4>
          <div className="space-y-2">
            {recs.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                  i === 0 && selectedPatient.score >= 70
                    ? 'bg-red-500 text-white'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vue dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">IA predictive - Risque de decrochage</h3>
            <p className="text-sm text-muted-foreground">Analyse des 14 derniers jours d'utilisation PPC</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Patients suivis</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.high}</p>
          <p className="text-xs text-red-600 dark:text-red-400">Risque eleve</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.medium}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400">Risque moyen</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.low}</p>
          <p className="text-xs text-green-600 dark:text-green-400">Risque faible</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map(level => {
          const labels = { all: 'Tous', high: 'Eleve', medium: 'Moyen', low: 'Faible' };
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterLevel === level
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {labels[level]}
            </button>
          );
        })}
      </div>

      {/* Liste patients */}
      <div className="space-y-2">
        {filteredPatients.map(patient => (
          <button
            key={patient.id}
            onClick={() => setSelectedPatient(patient)}
            className="w-full text-left bg-card rounded-xl border border-border p-4 shadow-sm
              hover:border-primary/30 hover:shadow-md transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 flex-1">
              <ScoreIndicator score={patient.score} />
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{patient.nom}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Moy. {patient.moyenneHeures14j}h/nuit</span>
                  <span>Dernier login: {new Date(patient.dernierLogin).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className={`w-4 h-4 ${
                patient.tendance === 'hausse' ? 'text-red-500 rotate-0' :
                patient.tendance === 'baisse' ? 'text-green-500 rotate-180' :
                'text-yellow-500'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              <span>{patient.tendance === 'hausse' ? 'Hausse' : patient.tendance === 'baisse' ? 'Baisse' : 'Stable'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DropoutPredictor;
