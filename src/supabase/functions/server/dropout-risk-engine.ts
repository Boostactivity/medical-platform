/**
 * MOTEUR SCORE DE RISQUE DE DÉCROCHAGE — heuristique TRANSPARENTE.
 *
 * Objectif : aider le back-office PSAD à PRIORISER les rappels humains vers
 * les patients qui risquent d'abandonner leur traitement PPC. Ce n'est PAS
 * un diagnostic, PAS une boîte noire ML, PAS une prédiction certaine —
 * c'est une somme pondérée de signaux RÉELS et EXPLICABLES, chacun renvoyé
 * avec sa contribution exacte. Aucune allégation clinique.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * FORMULE — score = somme des contributions des facteurs, borné [0, 100].
 * Chaque facteur a un poids MAX explicite ; la somme des poids max = 100,
 * donc le score est directement lisible (aucun « nombre magique » caché).
 *
 *   1. Tendance d'observance ............. max 30 pts
 *      Pente (régression linéaire) des heures totales sur les 3-4 dernières
 *      fenêtres 28j. Une pente DESCENDANTE = risque. On mappe une baisse de
 *      0 → 20 h par fenêtre sur 0 → 30 pts (≥ 20 h de chute/fenêtre = plafond).
 *      Pente nulle ou positive (stable / en hausse) = 0 pt.
 *      Nécessite ≥ 2 fenêtres ; sinon facteur neutre (0, signalé).
 *
 *   2. Bande d'observance actuelle ....... max 25 pts
 *      Dernière fenêtre : none = 25 | low = 20 | partial = 10 | full = 0.
 *      (Seuils réglementaires : full ≥ 112 h, partial 56-112 h, low < 56 h,
 *       none = aucun relevé — cf. observance-lppr-engine.ts.)
 *
 *   3. Phase initiale (premières semaines) max 15 pts
 *      L'abandon de la PPC est le plus fréquent dans les toutes premières
 *      semaines (fait documenté : adaptation au masque/pression). On front-load :
 *      J1-J14 = 15 | J15-J28 = 11 | J29-J91 (reste des 13 sem) = 6 | > J91 = 0.
 *      Date de début inconnue = 0 (on ne pénalise pas l'absence de donnée).
 *
 *   4. Franchissement récent de seuil .... max 20 pts
 *      Comparaison dernière fenêtre vs précédente. Passage SOUS 56 h
 *      (full/partial → low/none) = 20 | passage SOUS 112 h (full → partial)
 *      = 12 | pas de franchissement à la baisse = 0. Une amélioration ne
 *      réduit pas le score sous 0 (les autres facteurs restent).
 *
 *   5. Check-ins récents bas (optionnel) . max 10 pts
 *      Sur les check-ins des 30 derniers jours (migration 112, peut être vide) :
 *      au moins un avec humeur ≤ 2 OU confort masque ≤ 2 = 10 | moyenne
 *      humeur/confort ≤ 3 (sans seuil bas franc) = 5 | sinon 0.
 *      Aucun check-in = facteur ABSENT (non pénalisé), signalé comme tel.
 *
 *   Poids max : 30 + 25 + 15 + 20 + 10 = 100.
 *
 * NIVEAUX : 0-33 faible | 34-66 modéré | 67-100 élevé.
 *
 * Tous les seuils ci-dessus sont des CHOIX PRODUIT documentés (pas des
 * constantes réglementaires, hormis les bandes 112 h / 56 h). Ils sont
 * regroupés dans WEIGHTS / THRESHOLDS pour être audités et ajustés d'un
 * coup d'œil. Le moteur ne « valide » rien médicalement.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { ComplianceBand } from './observance-lppr-engine.ts';

// ------------------------------------------------------------------
// Paramètres explicites (aucune pondération « magique » dans le code)
// ------------------------------------------------------------------

/** Poids maximum de chaque facteur (somme = 100). */
export const WEIGHTS = {
  trend: 30,
  currentBand: 25,
  initialPhase: 15,
  thresholdCrossing: 20,
  checkins: 10,
} as const;

const THRESHOLDS = {
  /** Nb de fenêtres récentes prises en compte pour la pente. */
  trendWindows: 4,
  /** Chute (h/fenêtre) au-delà de laquelle la tendance plafonne le facteur. */
  trendFullDropHoursPerWindow: 20,
  /** Seuils réglementaires (fenêtre 28 j) — repris de l'observance. */
  hoursFull: 112,
  hoursPartial: 56,
  /** Bornes de phase initiale (jours de thérapie). */
  initialPhaseDays: 91, // 13 semaines
  /** Fenêtre de prise en compte des check-ins (jours). */
  checkinLookbackDays: 30,
} as const;

const LEVEL_BOUNDS = { moderate: 34, high: 67 } as const;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface RiskFactor {
  key: string;
  label: string;
  /** Points effectivement ajoutés au score (0 si neutre). */
  contribution: number;
  /** Poids maximum théorique du facteur. */
  maxContribution: number;
  /** Explication lisible, chiffrée, en français. */
  detail: string;
}

export type RiskLevel = 'faible' | 'modéré' | 'élevé';

export interface DropoutRisk {
  patientId: string;
  score: number; // 0-100
  level: RiskLevel;
  factors: RiskFactor[];
  /** Nb de fenêtres d'observance disponibles (transparence sur la base de calcul). */
  windowsAvailable: number;
  computedAt: string;
}

/** Une fenêtre 28 j (sous-ensemble de observance_periods). */
export interface ObservanceWindowPoint {
  window_end: string; // YYYY-MM-DD
  total_hours: number;
  compliance_band: ComplianceBand;
}

/** Un check-in récent (sous-ensemble de care_checkins). */
export interface CheckinPoint {
  mood: number;
  mask_comfort: number;
  checkin_date: string; // YYYY-MM-DD
}

/** Signaux d'entrée — pré-collectés (permet le calcul flotte sans N+1). */
export interface PatientSignals {
  /** Fenêtres d'observance, ORDRE CROISSANT par window_end. */
  windows: ObservanceWindowPoint[];
  therapyStartDate: string | null;
  recentCheckins: CheckinPoint[];
  /** Date de référence (YYYY-MM-DD). */
  today: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.floor((b - a) / MS_PER_DAY);
}

/**
 * Pente d'une régression linéaire simple de `values` sur leur index (0..n-1).
 * Unité : variation de la valeur PAR pas (ici, par fenêtre). null si < 2 points
 * ou variance d'index nulle.
 */
function linearSlope(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

const BAND_LABEL: Record<ComplianceBand, string> = {
  full: 'pleine (≥ 112 h / 28 j)',
  partial: 'partielle (56-112 h / 28 j)',
  low: 'faible (< 56 h / 28 j)',
  none: 'aucun relevé',
};

// ------------------------------------------------------------------
// Facteurs — chacun renvoie un RiskFactor (contribution + détail chiffré)
// ------------------------------------------------------------------

function factorTrend(windows: ObservanceWindowPoint[]): RiskFactor {
  const max = WEIGHTS.trend;
  const recent = windows.slice(-THRESHOLDS.trendWindows);
  const hours = recent.map((w) => Number(w.total_hours) || 0);
  const slope = linearSlope(hours);

  if (slope === null) {
    return {
      key: 'trend',
      label: 'Tendance d\'observance',
      contribution: 0,
      maxContribution: max,
      detail:
        recent.length === 0
          ? 'Aucune fenêtre d\'observance disponible — tendance non calculable.'
          : 'Une seule fenêtre disponible — tendance non calculable (neutre).',
    };
  }

  // Pente négative = baisse = risque. On ne compte que la baisse.
  const dropPerWindow = Math.max(0, -slope);
  const contribution = Math.round(
    (clamp(dropPerWindow, 0, THRESHOLDS.trendFullDropHoursPerWindow) /
      THRESHOLDS.trendFullDropHoursPerWindow) *
      max,
  );

  const direction =
    slope < -0.5 ? 'en baisse' : slope > 0.5 ? 'en hausse' : 'stable';
  const detail =
    `Observance ${direction} sur les ${recent.length} dernières fenêtres ` +
    `(${recent.map((w) => `${round1(Number(w.total_hours) || 0)}h`).join(' → ')}), ` +
    `soit ${round1(slope)} h par fenêtre.`;

  return {
    key: 'trend',
    label: 'Tendance d\'observance',
    contribution,
    maxContribution: max,
    detail,
  };
}

function factorCurrentBand(windows: ObservanceWindowPoint[]): RiskFactor {
  const max = WEIGHTS.currentBand;
  const last = windows.at(-1);

  if (!last) {
    return {
      key: 'current_band',
      label: 'Bande d\'observance actuelle',
      contribution: 0,
      maxContribution: max,
      detail: 'Aucune fenêtre d\'observance — bande actuelle inconnue.',
    };
  }

  const byBand: Record<ComplianceBand, number> = {
    none: max, // 25
    low: 20,
    partial: 10,
    full: 0,
  };
  const contribution = byBand[last.compliance_band] ?? 0;

  return {
    key: 'current_band',
    label: 'Bande d\'observance actuelle',
    contribution,
    maxContribution: max,
    detail:
      `Dernière fenêtre (${last.window_end}) : ${round1(Number(last.total_hours) || 0)} h, ` +
      `observance ${BAND_LABEL[last.compliance_band]}.`,
  };
}

function factorInitialPhase(
  therapyStartDate: string | null,
  today: string,
): RiskFactor {
  const max = WEIGHTS.initialPhase;

  if (!therapyStartDate) {
    return {
      key: 'initial_phase',
      label: 'Phase initiale de traitement',
      contribution: 0,
      maxContribution: max,
      detail: 'Date de début de thérapie inconnue — facteur neutre.',
    };
  }

  const dayIndex = daysBetween(therapyStartDate, today) + 1; // J1 = jour de début
  if (Number.isNaN(dayIndex) || dayIndex < 1) {
    return {
      key: 'initial_phase',
      label: 'Phase initiale de traitement',
      contribution: 0,
      maxContribution: max,
      detail: 'Date de début de thérapie non exploitable — facteur neutre.',
    };
  }

  // Front-load : le risque d'abandon est maximal les 2 premières semaines.
  let contribution: number;
  if (dayIndex <= 14) contribution = max; // 15
  else if (dayIndex <= 28) contribution = 11;
  else if (dayIndex <= THRESHOLDS.initialPhaseDays) contribution = 6;
  else contribution = 0;

  const phaseLabel =
    dayIndex <= THRESHOLDS.initialPhaseDays
      ? `phase initiale (J${dayIndex} / 91)`
      : `phase d'entretien (J${dayIndex})`;

  return {
    key: 'initial_phase',
    label: 'Phase initiale de traitement',
    contribution,
    maxContribution: max,
    detail:
      `Patient à J${dayIndex} de thérapie — ${phaseLabel}. ` +
      (contribution > 0
        ? 'Les premières semaines concentrent le risque d\'abandon.'
        : 'Hors fenêtre à risque élevé d\'abandon précoce.'),
  };
}

function factorThresholdCrossing(windows: ObservanceWindowPoint[]): RiskFactor {
  const max = WEIGHTS.thresholdCrossing;
  const last = windows.at(-1);
  const prev = windows.at(-2);

  if (!last || !prev) {
    return {
      key: 'threshold_crossing',
      label: 'Franchissement récent de seuil',
      contribution: 0,
      maxContribution: max,
      detail: 'Moins de deux fenêtres — franchissement non évaluable.',
    };
  }

  const prevH = Number(prev.total_hours) || 0;
  const lastH = Number(last.total_hours) || 0;

  let contribution = 0;
  let detail = `Stable : ${round1(prevH)} h → ${round1(lastH)} h (aucun seuil franchi à la baisse).`;

  if (prevH >= THRESHOLDS.hoursPartial && lastH < THRESHOLDS.hoursPartial) {
    // Passage sous 56 h
    contribution = max; // 20
    detail = `Chute sous le seuil de 56 h : ${round1(prevH)} h → ${round1(lastH)} h sur la dernière fenêtre.`;
  } else if (prevH >= THRESHOLDS.hoursFull && lastH < THRESHOLDS.hoursFull) {
    // Passage sous 112 h (mais reste ≥ 56 h)
    contribution = 12;
    detail = `Passage sous le seuil de 112 h : ${round1(prevH)} h → ${round1(lastH)} h sur la dernière fenêtre.`;
  } else if (lastH > prevH) {
    detail = `En amélioration : ${round1(prevH)} h → ${round1(lastH)} h.`;
  }

  return {
    key: 'threshold_crossing',
    label: 'Franchissement récent de seuil',
    contribution,
    maxContribution: max,
    detail,
  };
}

function factorCheckins(
  checkins: CheckinPoint[],
  today: string,
): RiskFactor {
  const max = WEIGHTS.checkins;
  const recent = checkins.filter((ck) => {
    const d = daysBetween(ck.checkin_date, today);
    return !Number.isNaN(d) && d >= 0 && d <= THRESHOLDS.checkinLookbackDays;
  });

  if (recent.length === 0) {
    return {
      key: 'checkins',
      label: 'Ressenti récent (check-ins)',
      contribution: 0,
      maxContribution: max,
      detail: 'Aucun check-in sur les 30 derniers jours — facteur absent (non pénalisé).',
    };
  }

  const hasLow = recent.some((ck) => ck.mood <= 2 || ck.mask_comfort <= 2);
  const avgMood = recent.reduce((s, ck) => s + ck.mood, 0) / recent.length;
  const avgComfort = recent.reduce((s, ck) => s + ck.mask_comfort, 0) / recent.length;

  let contribution = 0;
  let detail =
    `${recent.length} check-in(s) récent(s) — humeur moy. ${round1(avgMood)}/5, ` +
    `confort masque moy. ${round1(avgComfort)}/5 : ressenti correct.`;

  if (hasLow) {
    contribution = max; // 10
    detail =
      `${recent.length} check-in(s) récent(s) avec au moins un signal bas ` +
      `(humeur ≤ 2 ou confort masque ≤ 2). Moyennes : humeur ${round1(avgMood)}/5, ` +
      `confort ${round1(avgComfort)}/5.`;
  } else if (avgMood <= 3 || avgComfort <= 3) {
    contribution = 5;
    detail =
      `${recent.length} check-in(s) récent(s) au ressenti modéré — humeur moy. ` +
      `${round1(avgMood)}/5, confort masque moy. ${round1(avgComfort)}/5.`;
  }

  return {
    key: 'checkins',
    label: 'Ressenti récent (check-ins)',
    contribution,
    maxContribution: max,
    detail,
  };
}

// ------------------------------------------------------------------
// Score — fonction PURE, entièrement explicable
// ------------------------------------------------------------------

export function levelOf(score: number): RiskLevel {
  if (score >= LEVEL_BOUNDS.high) return 'élevé';
  if (score >= LEVEL_BOUNDS.moderate) return 'modéré';
  return 'faible';
}

/**
 * Calcule le score de risque à partir de signaux pré-collectés.
 * Fonction PURE : déterministe, testable, sans accès DB.
 */
export function computeRiskScore(
  patientId: string,
  signals: PatientSignals,
): DropoutRisk {
  const windows = signals.windows; // déjà ordre croissant

  const factors: RiskFactor[] = [
    factorTrend(windows),
    factorCurrentBand(windows),
    factorInitialPhase(signals.therapyStartDate, signals.today),
    factorThresholdCrossing(windows),
    factorCheckins(signals.recentCheckins, signals.today),
  ];

  const rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  const score = clamp(Math.round(rawScore), 0, 100); // somme des poids = 100, borne défensive

  return {
    patientId,
    score,
    level: levelOf(score),
    factors,
    windowsAvailable: windows.length,
    computedAt: new Date().toISOString(),
  };
}
