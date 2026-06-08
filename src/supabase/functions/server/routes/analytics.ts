/**
 * Routes ANALYTICS back-office (admin / prestataire) — score de risque de
 * décrochage + forecasting. À monter dans index.tsx :
 *   `app.route(prefix, analyticsRoutes);`
 * (paths sous /pro/analytics/*).
 *
 * Règles dures (cohérence avec observance-billing.ts / checkin-newsletter.ts) :
 *   - Middlewares scopés PAR CHEMIN (jamais use('*')) : ce sous-app est
 *     monté au préfixe racine ; un '*' avalerait les routes montées après.
 *   - Toutes les requêtes DB sont scopées tenant explicitement (.eq('tenant_id'))
 *     car les Edge Functions tournent en service_role (bypass RLS).
 *   - HONNÊTETÉ DES CHIFFRES :
 *       · Le score de risque est une HEURISTIQUE transparente (dropout-risk-engine.ts) :
 *         chaque score arrive avec SES facteurs chiffrés. Pas de boîte noire.
 *       · Les projections sont des EXTRAPOLATIONS de tendance (régression
 *         linéaire sur l'historique réel), TOUJOURS étiquetées « estimation »,
 *         points réels et points estimés distincts (champ `kind`).
 *       · Aucune allégation clinique, aucune certitude affichée.
 *
 * Routes :
 *   - GET /pro/analytics/dropout-risk            liste flotte triée élevé→faible
 *   - GET /pro/analytics/dropout-risk/:patientId détail des facteurs d'un patient
 *   - GET /pro/analytics/forecast                projections activité / revenus / file
 *   - GET /pro/analytics/overview                KPIs synthétiques réels
 *
 * Schéma : observance_periods / patient_therapy_status / billing_lines (101),
 * interventions (create-prestataire-tables + tenant_id migration 100),
 * care_checkins (112), patients (base).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';
import {
  computeRiskScore,
  WEIGHTS,
  type CheckinPoint,
  type DropoutRisk,
  type ObservanceWindowPoint,
  type PatientSignals,
} from '../dropout-risk-engine.ts';
import type { ComplianceBand } from '../observance-lppr-engine.ts';

const app = new Hono<TenantEnv>();

// Scopé par chemin (pas '*') — voir en-tête.
app.use('/pro/analytics/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// CA LPPR = lignes effectivement présentées (mêmes statuts que crm-exports.ts).
const PAID_BILLING_STATUSES = ['paid', 'transmitted'];

// ------------------------------------------------------------------
// Helpers dates / mois (UTC, jamais d'heure locale serveur)
// ------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7); // 'YYYY-MM'
}

/** Liste des N derniers mois (clés 'YYYY-MM'), ordre croissant, finissant au mois courant. */
function lastNMonths(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys;
}

/** Mois suivant une clé 'YYYY-MM'. */
function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(Date.UTC(y, m, 1))); // m (1-based) → mois suivant en 0-based
}

// ------------------------------------------------------------------
// Forecast — régression linéaire sur l'historique réel
// ------------------------------------------------------------------

interface SeriesPoint {
  month: string;
  value: number;
  kind: 'reel' | 'estimation';
}

/**
 * Projette `horizon` mois à partir d'un historique mensuel RÉEL via une
 * régression linéaire simple. Renvoie l'historique (kind='reel') suivi des
 * points estimés (kind='estimation'). Valeurs bornées à ≥ 0 (pas de compte
 * ni de CA négatif). Si < 2 points historiques : pas d'estimation (on ne
 * fabrique pas une tendance à partir d'un seul point).
 */
function buildForecast(
  history: Array<{ month: string; value: number }>,
  horizon: number,
): { points: SeriesPoint[]; slopePerMonth: number | null } {
  const points: SeriesPoint[] = history.map((h) => ({
    month: h.month,
    value: Math.round(h.value * 100) / 100,
    kind: 'reel' as const,
  }));

  const n = history.length;
  if (n < 2) return { points, slopePerMonth: null };

  const meanX = (n - 1) / 2;
  const meanY = history.reduce((s, h) => s + h.value, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (history[i].value - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let key = history[n - 1].month;
  for (let h = 1; h <= horizon; h++) {
    key = nextMonthKey(key);
    const projected = intercept + slope * (n - 1 + h);
    points.push({
      month: key,
      value: Math.max(0, Math.round(projected * 100) / 100),
      kind: 'estimation',
    });
  }

  return { points, slopePerMonth: Math.round(slope * 100) / 100 };
}

// ------------------------------------------------------------------
// Identités patients (patients.id → users.name/email) — pour les vues pro
// ------------------------------------------------------------------

async function fetchPatientIdentities(patientIds: string[]) {
  const identity = new Map<string, { name: string | null; email: string | null }>();
  if (patientIds.length === 0) return identity;

  const { data: patients } = await supabase
    .from('patients')
    .select('id, user_id')
    .in('id', patientIds);

  const userIds = [...new Set((patients ?? []).map((p) => p.user_id).filter(Boolean))];
  const userById = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    for (const u of users ?? []) userById.set(u.id, { name: u.name, email: u.email });
  }
  for (const p of patients ?? []) {
    identity.set(p.id, userById.get(p.user_id) ?? { name: null, email: null });
  }
  return identity;
}

// ------------------------------------------------------------------
// Collecte des signaux flotte (1 requête par table → pas de N+1)
// ------------------------------------------------------------------

interface FleetSignals {
  /** patient_id → fenêtres ordre croissant. */
  windowsByPatient: Map<string, ObservanceWindowPoint[]>;
  /** patient_id → therapy_start_date. */
  startByPatient: Map<string, string | null>;
  /** patient_id → check-ins récents. */
  checkinsByPatient: Map<string, CheckinPoint[]>;
  /** Tous les patient_id connus (statut thérapie OU fenêtres). */
  patientIds: Set<string>;
}

async function collectFleetSignals(tenantId: string): Promise<FleetSignals> {
  const today = todayIso();
  const checkinFloor = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [periodsRes, statusRes, checkinsRes] = await Promise.all([
    supabase
      .from('observance_periods')
      .select('patient_id, window_end, total_hours, compliance_band')
      .eq('tenant_id', tenantId)
      .order('window_end', { ascending: true })
      .limit(20000),
    supabase
      .from('patient_therapy_status')
      .select('patient_id, therapy_start_date, phase')
      .eq('tenant_id', tenantId)
      .limit(20000),
    supabase
      .from('care_checkins')
      .select('patient_id, mood, mask_comfort, checkin_date')
      .eq('tenant_id', tenantId)
      .gte('checkin_date', checkinFloor)
      .limit(20000),
  ]);

  if (periodsRes.error) throw new Error(periodsRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);
  // care_checkins peut être vide / absent (migration 112 optionnelle) → non bloquant

  const windowsByPatient = new Map<string, ObservanceWindowPoint[]>();
  for (const p of periodsRes.data ?? []) {
    const arr = windowsByPatient.get(p.patient_id) ?? [];
    arr.push({
      window_end: p.window_end,
      total_hours: Number(p.total_hours) || 0,
      compliance_band: p.compliance_band as ComplianceBand,
    });
    windowsByPatient.set(p.patient_id, arr);
  }

  const startByPatient = new Map<string, string | null>();
  const patientIds = new Set<string>();
  for (const s of statusRes.data ?? []) {
    // Patients arrêtés : exclus du ciblage rappel (plus de risque de décrochage à suivre)
    if (s.phase === 'stopped') continue;
    startByPatient.set(s.patient_id, s.therapy_start_date ?? null);
    patientIds.add(s.patient_id);
  }
  for (const id of windowsByPatient.keys()) patientIds.add(id);

  const checkinsByPatient = new Map<string, CheckinPoint[]>();
  for (const ck of checkinsRes.data ?? []) {
    const arr = checkinsByPatient.get(ck.patient_id) ?? [];
    arr.push({ mood: ck.mood, mask_comfort: ck.mask_comfort, checkin_date: ck.checkin_date });
    checkinsByPatient.set(ck.patient_id, arr);
  }

  return { windowsByPatient, startByPatient, checkinsByPatient, patientIds };
}

function riskForPatient(
  patientId: string,
  fleet: FleetSignals,
  today: string,
): DropoutRisk {
  const signals: PatientSignals = {
    windows: fleet.windowsByPatient.get(patientId) ?? [],
    therapyStartDate: fleet.startByPatient.get(patientId) ?? null,
    recentCheckins: fleet.checkinsByPatient.get(patientId) ?? [],
    today,
  };
  return computeRiskScore(patientId, signals);
}

// ==================================================================
// GET /pro/analytics/dropout-risk — liste flotte triée élevé → faible
// ==================================================================

app.get('/pro/analytics/dropout-risk', async (c) => {
  const tenantId = c.get('tenantId');
  const today = todayIso();
  const minScore = Number(c.req.query('min_score') ?? 0);

  let fleet: FleetSignals;
  try {
    fleet = await collectFleetSignals(tenantId);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'collecte échouée' }, 500);
  }

  const risks = [...fleet.patientIds].map((id) => riskForPatient(id, fleet, today));
  const filtered = risks
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const identities = await fetchPatientIdentities(filtered.map((r) => r.patientId));

  // Résumé des facteurs : on remonte ceux qui contribuent (poids effectif > 0),
  // triés par contribution décroissante — ce sont les motifs d'un rappel.
  const rows = filtered.map((r) => ({
    patient_id: r.patientId,
    patient_name: identities.get(r.patientId)?.name ?? null,
    patient_email: identities.get(r.patientId)?.email ?? null,
    score: r.score,
    level: r.level,
    windows_available: r.windowsAvailable,
    top_factors: r.factors
      .filter((f) => f.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .map((f) => ({ label: f.label, contribution: f.contribution, detail: f.detail })),
  }));

  const distribution = { élevé: 0, modéré: 0, faible: 0 };
  for (const r of risks) distribution[r.level]++;

  return c.json({
    generated_at: new Date().toISOString(),
    method:
      'Heuristique transparente : score 0-100 = somme pondérée de 5 facteurs ' +
      '(tendance, bande actuelle, phase initiale, franchissement de seuil, ressenti). ' +
      'Aide à la priorisation des rappels, pas une prédiction certaine.',
    weights: WEIGHTS,
    total_patients: fleet.patientIds.size,
    distribution,
    patients: rows,
  });
});

// ==================================================================
// GET /pro/analytics/dropout-risk/:patientId — détail des facteurs
// ==================================================================

app.get('/pro/analytics/dropout-risk/:patientId', async (c) => {
  const tenantId = c.get('tenantId');
  const patientId = c.req.param('patientId');
  const today = todayIso();

  // Vérifie l'appartenance au tenant avant tout (pas de fuite cross-tenant).
  const { data: patient, error: patErr } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (patErr) return c.json({ error: patErr.message }, 500);
  if (!patient) return c.json({ error: 'Patient introuvable pour ce compte' }, 404);

  const checkinFloor = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [periodsRes, statusRes, checkinsRes] = await Promise.all([
    supabase
      .from('observance_periods')
      .select('window_end, total_hours, compliance_band')
      .eq('tenant_id', tenantId)
      .eq('patient_id', patientId)
      .order('window_end', { ascending: true })
      .limit(60),
    supabase
      .from('patient_therapy_status')
      .select('therapy_start_date, phase')
      .eq('tenant_id', tenantId)
      .eq('patient_id', patientId)
      .maybeSingle(),
    supabase
      .from('care_checkins')
      .select('mood, mask_comfort, checkin_date')
      .eq('tenant_id', tenantId)
      .eq('patient_id', patientId)
      .gte('checkin_date', checkinFloor)
      .limit(60),
  ]);

  if (periodsRes.error) return c.json({ error: periodsRes.error.message }, 500);

  const windows: ObservanceWindowPoint[] = (periodsRes.data ?? []).map((p) => ({
    window_end: p.window_end,
    total_hours: Number(p.total_hours) || 0,
    compliance_band: p.compliance_band as ComplianceBand,
  }));

  const risk = computeRiskScore(patientId, {
    windows,
    therapyStartDate: statusRes.data?.therapy_start_date ?? null,
    recentCheckins: (checkinsRes.data ?? []) as CheckinPoint[],
    today,
  });

  const identities = await fetchPatientIdentities([patientId]);

  return c.json({
    patient_id: patientId,
    patient_name: identities.get(patientId)?.name ?? null,
    patient_email: identities.get(patientId)?.email ?? null,
    phase: statusRes.data?.phase ?? null,
    score: risk.score,
    level: risk.level,
    windows_available: risk.windowsAvailable,
    weights: WEIGHTS,
    // TOUS les facteurs (y compris contribution 0) → score entièrement explicable
    factors: risk.factors,
    // Série brute (transparence : la base du calcul de tendance)
    observance_history: windows,
    method:
      'Score = somme des contributions ci-dessous, borné 0-100. Chaque facteur ' +
      'et son poids sont explicites (cf. dropout-risk-engine.ts). Outil d\'aide ' +
      'à la décision, jamais un diagnostic.',
  });
});

// ==================================================================
// GET /pro/analytics/forecast — projections tendance (réel vs estimé)
// ==================================================================

app.get('/pro/analytics/forecast', async (c) => {
  const tenantId = c.get('tenantId');
  const historyMonths = Math.min(24, Math.max(3, Number(c.req.query('history') ?? 6)));
  const horizon = Math.min(6, Math.max(1, Number(c.req.query('horizon') ?? 3)));
  const months = lastNMonths(historyMonths);
  const monthSet = new Set(months);
  const floorDate = `${months[0]}-01`;

  // 1. Activité — interventions par mois (sur l'historique)
  const { data: interventions, error: itErr } = await supabase
    .from('interventions')
    .select('date')
    .eq('tenant_id', tenantId)
    .gte('date', `${floorDate}T00:00:00`)
    .limit(50000);
  if (itErr) return c.json({ error: itErr.message }, 500);

  const activityByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  for (const it of interventions ?? []) {
    if (!it.date) continue;
    const key = monthKeyOf(String(it.date));
    if (monthSet.has(key)) activityByMonth.set(key, (activityByMonth.get(key) ?? 0) + 1);
  }
  const activity = buildForecast(
    months.map((m) => ({ month: m, value: activityByMonth.get(m) ?? 0 })),
    horizon,
  );

  // 2. Revenus LPPR — billing_lines transmises/payées par mois (clé = period_start)
  const { data: lines, error: blErr } = await supabase
    .from('billing_lines')
    .select('period_start, amount_ttc, status')
    .eq('tenant_id', tenantId)
    .in('status', PAID_BILLING_STATUSES)
    .gte('period_start', floorDate)
    .limit(50000);
  if (blErr) return c.json({ error: blErr.message }, 500);

  const revenueByMonth = new Map<string, number>(months.map((m) => [m, 0]));
  let linesWithAmount = 0;
  let linesNullAmount = 0;
  for (const l of lines ?? []) {
    if (!l.period_start) continue;
    const key = monthKeyOf(String(l.period_start));
    if (!monthSet.has(key)) continue;
    const amount = Number(l.amount_ttc);
    if (l.amount_ttc == null || Number.isNaN(amount)) {
      linesNullAmount++; // tarif non sourcé (NULL) → exclu de la somme, signalé
      continue;
    }
    linesWithAmount++;
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
  }
  const revenue = buildForecast(
    months.map((m) => ({ month: m, value: Math.round((revenueByMonth.get(m) ?? 0) * 100) / 100 })),
    horizon,
  );

  // 3. File active — patients dont la thérapie a démarré à la fin de chaque mois
  //    (cumul des débuts de thérapie, hors patients arrêtés). À défaut de date
  //    de début, on retombe sur patients.created_at (cohorte d'entrée).
  const [statusRes, patientsRes] = await Promise.all([
    supabase
      .from('patient_therapy_status')
      .select('therapy_start_date, phase')
      .eq('tenant_id', tenantId)
      .limit(50000),
    supabase
      .from('patients')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .limit(50000),
  ]);
  if (statusRes.error) return c.json({ error: statusRes.error.message }, 500);

  // Dates de début exploitables (statut non arrêté). Fallback created_at.
  const startDates: string[] = [];
  for (const s of statusRes.data ?? []) {
    if (s.phase === 'stopped') continue;
    if (s.therapy_start_date) startDates.push(String(s.therapy_start_date).slice(0, 10));
  }
  let activeSource: 'therapy_start' | 'created_at' = 'therapy_start';
  if (startDates.length === 0) {
    activeSource = 'created_at';
    for (const p of patientsRes.data ?? []) {
      if (p.created_at) startDates.push(String(p.created_at).slice(0, 10));
    }
  }

  // Cumul à la fin de chaque mois historique = file active réelle observée.
  const activeHistory = months.map((m) => {
    const monthEnd = `${m}-31`; // borne haute lexicographique (YYYY-MM-DD) suffisante
    const value = startDates.filter((d) => d <= monthEnd).length;
    return { month: m, value };
  });
  const activePatients = buildForecast(activeHistory, horizon);

  return c.json({
    generated_at: new Date().toISOString(),
    history_months: historyMonths,
    horizon_months: horizon,
    disclaimer:
      `Les points « réel » proviennent de vos données. Les points « estimation » ` +
      `sont une extrapolation linéaire de la tendance des ${historyMonths} derniers ` +
      `mois — ce ne sont pas des prévisions certaines.`,
    activity: {
      unit: 'interventions / mois',
      trend_per_month: activity.slopePerMonth,
      points: activity.points,
    },
    revenue: {
      unit: 'EUR (TTC) / mois',
      trend_per_month: revenue.slopePerMonth,
      points: revenue.points,
      coverage_note:
        linesNullAmount > 0
          ? `${linesWithAmount} ligne(s) avec tarif sourcé incluse(s), ` +
            `${linesNullAmount} ligne(s) à tarif non sourcé (NULL) exclue(s) de la somme.`
          : `${linesWithAmount} ligne(s) facturée(s) prise(s) en compte.`,
    },
    active_patients: {
      unit: 'patients en file active',
      basis:
        activeSource === 'therapy_start'
          ? 'Cumul des débuts de thérapie (patients non arrêtés).'
          : 'Cumul des dates de création patient (date de début de thérapie indisponible).',
      trend_per_month: activePatients.slopePerMonth,
      points: activePatients.points,
    },
  });
});

// ==================================================================
// GET /pro/analytics/overview — KPIs synthétiques réels
// ==================================================================

app.get('/pro/analytics/overview', async (c) => {
  const tenantId = c.get('tenantId');
  const today = todayIso();
  const thisMonth = monthKey(new Date());
  const prevMonth = (() => {
    const d = new Date();
    return monthKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)));
  })();

  // 1. Risque flotte (réutilise la collecte) → nb élevé + distribution
  let highRisk = 0;
  let fleetCount = 0;
  const distribution = { élevé: 0, modéré: 0, faible: 0 };
  try {
    const fleet = await collectFleetSignals(tenantId);
    fleetCount = fleet.patientIds.size;
    for (const id of fleet.patientIds) {
      const r = riskForPatient(id, fleet, today);
      distribution[r.level]++;
      if (r.level === 'élevé') highRisk++;
    }
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'collecte risque échouée' }, 500);
  }

  // 2. Observance moyenne flotte = moyenne des heures de la DERNIÈRE fenêtre par patient
  const { data: periods, error: opErr } = await supabase
    .from('observance_periods')
    .select('patient_id, total_hours, window_end')
    .eq('tenant_id', tenantId)
    .order('window_end', { ascending: false })
    .limit(20000);
  if (opErr) return c.json({ error: opErr.message }, 500);

  const seen = new Set<string>();
  let obsSum = 0;
  let obsN = 0;
  for (const p of periods ?? []) {
    if (seen.has(p.patient_id)) continue; // 1ère occurrence = fenêtre la plus récente
    seen.add(p.patient_id);
    obsSum += Number(p.total_hours) || 0;
    obsN++;
  }
  const observanceAvg = obsN > 0 ? Math.round((obsSum / obsN) * 10) / 10 : null;

  // 3. CA LPPR du mois (transmises/payées) + mois précédent → évolution
  const floor = `${prevMonth}-01`;
  const { data: lines, error: blErr } = await supabase
    .from('billing_lines')
    .select('period_start, amount_ttc, status')
    .eq('tenant_id', tenantId)
    .in('status', PAID_BILLING_STATUSES)
    .gte('period_start', floor)
    .limit(50000);
  if (blErr) return c.json({ error: blErr.message }, 500);

  let caThisMonth = 0;
  let caPrevMonth = 0;
  for (const l of lines ?? []) {
    const amount = Number(l.amount_ttc);
    if (l.amount_ttc == null || Number.isNaN(amount)) continue;
    const key = monthKeyOf(String(l.period_start));
    if (key === thisMonth) caThisMonth += amount;
    else if (key === prevMonth) caPrevMonth += amount;
  }
  const caEvolutionPct =
    caPrevMonth > 0
      ? Math.round(((caThisMonth - caPrevMonth) / caPrevMonth) * 1000) / 10
      : null; // null = pas de base de comparaison fiable (mois précédent à 0)

  return c.json({
    generated_at: new Date().toISOString(),
    kpis: {
      patients_high_risk: highRisk,
      fleet_size: fleetCount,
      risk_distribution: distribution,
      observance_avg_hours: observanceAvg,
      observance_patients: obsN,
      ca_lppr_current_month: Math.round(caThisMonth * 100) / 100,
      ca_lppr_previous_month: Math.round(caPrevMonth * 100) / 100,
      ca_evolution_pct: caEvolutionPct,
      current_month: thisMonth,
    },
    note:
      'KPIs calculés en direct sur vos données réelles. L\'observance moyenne ' +
      'est la moyenne des heures de la dernière fenêtre 28j de chaque patient.',
  });
});

export default app;
