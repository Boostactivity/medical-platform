/**
 * SCORING ENGINE - Algorithme Medical Score (0-100)
 * Calcul automatique du score de qualité de traitement
 */

import { supabase } from './lib/supabase.ts';
import type { StandardizedSleepData } from './universal-adapter.ts';

/**
 * STRUCTURE DU SCORE EXP'AIR
 * Total: 100 points répartis sur 6 critères
 */
export interface MedicalScore {
  // Score global
  total_score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Détail par critère
  criteria: {
    usage: CriteriaScore;          // 30 points - Temps d'utilisation
    ahi: CriteriaScore;            // 25 points - Contrôle apnées
    leak: CriteriaScore;           // 20 points - Étanchéité masque
    mask_fit: CriteriaScore;       // 10 points - Stabilité masque
    pressure: CriteriaScore;       // 10 points - Pression optimale
    consistency: CriteriaScore;    // 5 points - Régularité
  };
  
  // Métadonnées
  date: string;
  patient_id: string;
  trend: 'improving' | 'stable' | 'declining';
  previous_score?: number;
}

interface CriteriaScore {
  score: number;
  max_score: number;
  percentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

/**
 * CALCUL DU SCORE GLOBAL
 */
export function calculateMedicalScore(
  data: StandardizedSleepData,
  previousScores?: MedicalScore[]
): MedicalScore {
  // 1. USAGE (30 points) - Critère le plus important
  const usageScore = calculateUsageScore(data.usage_hours);
  
  // 2. AHI (25 points) - Efficacité du traitement
  const ahiScore = calculateAhiScore(data.ahi);
  
  // 3. LEAK (20 points) - Étanchéité masque
  const leakScore = calculateLeakScore(data.leak_95th);
  
  // 4. MASK FIT (10 points) - Stabilité masque
  const maskFitScore = calculateMaskFitScore(data.mask_on_off_events, data.usage_hours);
  
  // 5. PRESSURE (10 points) - Pression optimale
  const pressureScore = calculatePressureScore(data.pressure_95th, data.pressure_mode);
  
  // 6. CONSISTENCY (5 points) - Régularité traitement
  const consistencyScore = calculateConsistencyScore(previousScores);
  
  // Score total
  const totalScore = Math.round(
    usageScore.score +
    ahiScore.score +
    leakScore.score +
    maskFitScore.score +
    pressureScore.score +
    consistencyScore.score
  );
  
  // Grade
  const grade = calculateGrade(totalScore);
  
  // Trend
  const trend = calculateTrend(totalScore, previousScores);
  
  return {
    total_score: totalScore,
    grade,
    criteria: {
      usage: usageScore,
      ahi: ahiScore,
      leak: leakScore,
      mask_fit: maskFitScore,
      pressure: pressureScore,
      consistency: consistencyScore,
    },
    date: data.session_date,
    patient_id: data.patient_id,
    trend,
    previous_score: previousScores?.[0]?.total_score,
  };
}

/**
 * CRITÈRE 1 : USAGE (30 points)
 * Cible: ≥ 4h/nuit (compliance Medicare/CPAM)
 */
function calculateUsageScore(usageHours: number): CriteriaScore {
  const maxScore = 30;
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  if (usageHours >= 7) {
    // Excellent: 7h+ = 100%
    score = maxScore;
    status = 'excellent';
    message = `Utilisation excellente (${usageHours.toFixed(1)}h)`;
  } else if (usageHours >= 4) {
    // Bon: 4-7h = proportionnel
    score = maxScore * (0.7 + (usageHours - 4) / 3 * 0.3);
    status = 'good';
    message = `Utilisation conforme (${usageHours.toFixed(1)}h)`;
  } else if (usageHours >= 2) {
    // Passable: 2-4h
    score = maxScore * (usageHours / 4) * 0.7;
    status = 'fair';
    message = `Utilisation insuffisante (${usageHours.toFixed(1)}h) - Cible: 4h minimum`;
  } else {
    // Mauvais: < 2h
    score = maxScore * (usageHours / 4) * 0.5;
    status = 'poor';
    message = `Utilisation très insuffisante (${usageHours.toFixed(1)}h)`;
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CRITÈRE 2 : AHI (25 points)
 * Cible: < 5 événements/heure (normal)
 */
function calculateAhiScore(ahi: number): CriteriaScore {
  const maxScore = 25;
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  if (ahi < 5) {
    // Excellent: AHI < 5 (normal)
    score = maxScore;
    status = 'excellent';
    message = `Apnées parfaitement contrôlées (AHI: ${ahi.toFixed(1)})`;
  } else if (ahi < 15) {
    // Bon: AHI 5-15 (apnée légère résiduelle)
    score = maxScore * (1 - (ahi - 5) / 10 * 0.3);
    status = 'good';
    message = `Apnées bien contrôlées (AHI: ${ahi.toFixed(1)})`;
  } else if (ahi < 30) {
    // Passable: AHI 15-30 (apnée modérée)
    score = maxScore * (1 - (ahi - 5) / 25 * 0.6);
    status = 'fair';
    message = `Apnées partiellement contrôlées (AHI: ${ahi.toFixed(1)}) - Ajustement recommandé`;
  } else {
    // Mauvais: AHI > 30 (apnée sévère)
    score = maxScore * 0.2;
    status = 'poor';
    message = `Apnées non contrôlées (AHI: ${ahi.toFixed(1)}) - Consulter médecin`;
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CRITÈRE 3 : LEAK (20 points)
 * Cible: < 24 L/min au 95ème percentile
 */
function calculateLeakScore(leak95: number): CriteriaScore {
  const maxScore = 20;
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  if (leak95 < 10) {
    // Excellent: < 10 L/min
    score = maxScore;
    status = 'excellent';
    message = `Étanchéité parfaite (fuite: ${leak95.toFixed(1)} L/min)`;
  } else if (leak95 < 24) {
    // Bon: 10-24 L/min (acceptable)
    score = maxScore * (1 - (leak95 - 10) / 14 * 0.3);
    status = 'good';
    message = `Étanchéité correcte (fuite: ${leak95.toFixed(1)} L/min)`;
  } else if (leak95 < 40) {
    // Passable: 24-40 L/min
    score = maxScore * (1 - (leak95 - 10) / 30 * 0.6);
    status = 'fair';
    message = `Fuites importantes (${leak95.toFixed(1)} L/min) - Réajuster masque`;
  } else {
    // Mauvais: > 40 L/min
    score = maxScore * 0.2;
    status = 'poor';
    message = `Fuites excessives (${leak95.toFixed(1)} L/min) - Changement masque nécessaire`;
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CRITÈRE 4 : MASK FIT (10 points)
 * Cible: < 2 retraits masque/nuit
 */
function calculateMaskFitScore(maskEvents: number, usageHours: number): CriteriaScore {
  const maxScore = 10;
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  // Normaliser par heure d'utilisation
  const eventsPerHour = usageHours > 0 ? maskEvents / usageHours : maskEvents;
  
  if (eventsPerHour < 0.5) {
    // Excellent: < 0.5 événement/heure
    score = maxScore;
    status = 'excellent';
    message = `Masque très stable (${maskEvents} retraits)`;
  } else if (eventsPerHour < 1) {
    // Bon: 0.5-1 événement/heure
    score = maxScore * 0.8;
    status = 'good';
    message = `Masque stable (${maskEvents} retraits)`;
  } else if (eventsPerHour < 2) {
    // Passable: 1-2 événements/heure
    score = maxScore * 0.5;
    status = 'fair';
    message = `Masque instable (${maskEvents} retraits) - Vérifier ajustement`;
  } else {
    // Mauvais: > 2 événements/heure
    score = maxScore * 0.2;
    status = 'poor';
    message = `Masque très instable (${maskEvents} retraits) - Essayer autre modèle`;
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CRITÈRE 5 : PRESSURE (10 points)
 * Cible: Pression dans plage optimale (variable selon patient)
 */
function calculatePressureScore(
  pressure95: number,
  mode: 'CPAP' | 'APAP' | 'BiPAP'
): CriteriaScore {
  const maxScore = 10;
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  // Plage optimale générale: 8-15 cmH2O
  if (pressure95 >= 8 && pressure95 <= 15) {
    score = maxScore;
    status = 'excellent';
    message = `Pression optimale (${pressure95.toFixed(1)} cmH2O)`;
  } else if (pressure95 >= 6 && pressure95 <= 18) {
    score = maxScore * 0.7;
    status = 'good';
    message = `Pression acceptable (${pressure95.toFixed(1)} cmH2O)`;
  } else if (pressure95 >= 4 && pressure95 <= 20) {
    score = maxScore * 0.5;
    status = 'fair';
    message = `Pression à vérifier (${pressure95.toFixed(1)} cmH2O)`;
  } else {
    score = maxScore * 0.2;
    status = 'poor';
    message = `Pression anormale (${pressure95.toFixed(1)} cmH2O) - Consulter médecin`;
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CRITÈRE 6 : CONSISTENCY (5 points)
 * Régularité sur les 7 derniers jours
 */
function calculateConsistencyScore(previousScores?: MedicalScore[]): CriteriaScore {
  const maxScore = 5;
  
  if (!previousScores || previousScores.length < 3) {
    // Pas assez de données
    return {
      score: maxScore * 0.5,
      max_score: maxScore,
      percentage: 50,
      status: 'fair',
      message: 'Données insuffisantes pour évaluer régularité',
    };
  }
  
  // Calculer variance des 7 derniers scores
  const last7 = previousScores.slice(0, 7);
  const scores = last7.map(s => s.total_score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  let score: number;
  let status: CriteriaScore['status'];
  let message: string;
  
  if (stdDev < 5) {
    score = maxScore;
    status = 'excellent';
    message = 'Traitement très régulier';
  } else if (stdDev < 10) {
    score = maxScore * 0.7;
    status = 'good';
    message = 'Traitement régulier';
  } else if (stdDev < 15) {
    score = maxScore * 0.5;
    status = 'fair';
    message = 'Traitement irrégulier';
  } else {
    score = maxScore * 0.2;
    status = 'poor';
    message = 'Traitement très irrégulier - Routine à améliorer';
  }
  
  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    status,
    message,
  };
}

/**
 * CALCUL DU GRADE (A+ à F)
 */
function calculateGrade(score: number): MedicalScore['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * CALCUL DU TREND
 */
function calculateTrend(
  currentScore: number,
  previousScores?: MedicalScore[]
): 'improving' | 'stable' | 'declining' {
  if (!previousScores || previousScores.length === 0) {
    return 'stable';
  }
  
  // Moyenne des 3 derniers scores
  const last3 = previousScores.slice(0, 3);
  const avgPrevious = last3.reduce((sum, s) => sum + s.total_score, 0) / last3.length;
  
  const diff = currentScore - avgPrevious;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * SAUVEGARDE DU SCORE DANS LA BASE
 */
export async function saveMedicalScore(score: MedicalScore): Promise<void> {
  const { error } = await supabase
    .from('patient_stats')
    .upsert({
      patient_id: score.patient_id,
      date: score.date,
      exp_air_score: score.total_score,
      grade: score.grade,
      score_details: score.criteria,
      trend: score.trend,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,date' });
  
  if (error) {
    throw new Error(`Erreur sauvegarde score: ${error.message}`);
  }
}

/**
 * RÉCUPÉRATION HISTORIQUE SCORES
 */
export async function getScoreHistory(
  patientId: string,
  days: number = 30
): Promise<MedicalScore[]> {
  const { data, error } = await supabase
    .from('patient_stats')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .limit(days);
  
  if (error) {
    throw new Error(`Erreur récupération historique: ${error.message}`);
  }
  
  return (data || []).map(row => ({
    total_score: row.exp_air_score,
    grade: row.grade,
    criteria: row.score_details,
    date: row.date,
    patient_id: row.patient_id,
    trend: row.trend,
  }));
}
