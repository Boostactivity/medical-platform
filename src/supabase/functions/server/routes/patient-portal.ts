/**
 * Routes PORTAIL PATIENT — surface la plus sensible du produit.
 * Montées sur `${prefix}` dans index.tsx (paths /patient/*).
 *
 * Règles dures (research/15 §VIII + research/12) :
 *   - Le patient n'accède QU'À ses propres données :
 *     user.id (auth) → patients.user_id → patients.id, filtré tenant.
 *   - Score TRANSPARENT : breakdown complet des 6 critères exposé.
 *   - Streaks OPT-IN : la série n'est renvoyée que si le patient
 *     l'a activée dans ses préférences (streaks_enabled).
 *   - FORGIVENESS : cumulative_nights (jamais resetée) toujours
 *     renvoyée — la série peut s'arrêter, la progression non.
 *   - Aucun message culpabilisant généré côté serveur : on renvoie
 *     des FAITS neutres, la copy bienveillante vit côté front.
 *
 * - GET   /patient/score                 : dernier score + breakdown 6 critères
 * - GET   /patient/score/history?days=N  : historique (7|30|90|365)
 * - GET   /patient/observance            : fenêtre 28j courante en langage simple
 * - GET   /patient/gamification          : nuits cumulées, badges, série si activée
 * - GET   /patient/preferences           : préférences du patient
 * - PATCH /patient/preferences           : opt-in streaks, notifications, etc.
 * - POST  /patient/tickets               : déclaration panne/masque/question
 * - GET   /patient/tickets               : tickets du patient
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Scopé /patient/* (pas '*') : monté au préfixe racine, un '*' avalerait
// les routes des sub-apps montées après (ex. 401 sur /public/agencies).
app.use('/patient/*', requireAuth, requireRole('patient'), requireTenant);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface PatientRow {
  id: string;
  user_id: string;
  treatment_start_date: string | null;
}

/**
 * Résout la ligne patients de l'utilisateur connecté (scopée tenant).
 * Le portail patient ne sert JAMAIS les données d'un autre patient.
 */
async function resolvePatient(c: any): Promise<PatientRow | null> {
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  // Tenant d'abord (comptes migrés), fallback sans tenant (comptes legacy
  // backfillés par la migration 100 mais jamais re-lus depuis).
  const { data } = await supabase
    .from('patients')
    .select('id, user_id, treatment_start_date')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (data) return data as PatientRow;

  const { data: legacy } = await supabase
    .from('patients')
    .select('id, user_id, treatment_start_date')
    .eq('user_id', user.id)
    .maybeSingle();

  return (legacy as PatientRow) ?? null;
}

/**
 * Historique des scores du patient.
 * Défensif : patient_stats a deux schémas historiques (clé users.id côté
 * gamification 002, clé patients.id côté moteur IoT) → on interroge les
 * deux identifiants et on ne garde que les lignes datées avec un score.
 */
async function fetchScoreRows(userId: string, patientId: string, limit: number) {
  const ids = [userId, patientId].filter(Boolean);
  const { data, error } = await supabase
    .from('patient_stats')
    .select('*')
    .in('patient_id', ids)
    .limit(Math.max(limit * 2, 30));

  if (error) {
    console.error('[PATIENT PORTAL] fetchScoreRows error:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((r: any) => r.exp_air_score != null && r.date)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
}

/** Nombre d'heures d'une nuit, tous schémas confondus. */
function nightHours(row: any): number {
  return Number(row.usage_hours ?? row.hours_used ?? 0) || 0;
}

// ------------------------------------------------------------------
// SCORE — transparence totale sur les 6 critères
// ------------------------------------------------------------------

app.get('/patient/score', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const rows = await fetchScoreRows(c.get('user').id, patient.id, 2);
  if (rows.length === 0) {
    return c.json({ score: null });
  }

  const latest: any = rows[0];
  return c.json({
    score: {
      total_score: latest.exp_air_score,
      grade: latest.grade ?? null,
      // Breakdown transparent : usage 30, ahi 25, leak 20, mask_fit 10,
      // pressure 10, consistency 5 (scoring-engine.ts)
      criteria: latest.score_details ?? null,
      date: latest.date,
      trend: latest.trend ?? 'stable',
      previous_score: rows[1]?.exp_air_score ?? null,
    },
  });
});

app.get('/patient/score/history', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const allowed = [7, 30, 90, 365];
  const requested = Number(c.req.query('days') ?? 30);
  const days = allowed.includes(requested) ? requested : 30;

  const rows = await fetchScoreRows(c.get('user').id, patient.id, days);

  return c.json({
    days,
    history: rows
      .map((r: any) => ({
        date: r.date,
        total_score: r.exp_air_score,
        grade: r.grade ?? null,
      }))
      .reverse(), // ascendant pour les graphiques
  });
});

// ------------------------------------------------------------------
// OBSERVANCE — fenêtre 28 jours en langage simple
// ------------------------------------------------------------------

app.get('/patient/observance', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');

  // 1. Fenêtre courante calculée par le moteur LPPR (source de vérité)
  const { data: period } = await supabase
    .from('observance_periods')
    .select('window_start, window_end, total_hours, nights_with_data, nights_over_4h, avg_hours_per_night, compliance_band')
    .eq('patient_id', patient.id)
    .eq('tenant_id', tenantId)
    .order('window_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  let totalHours: number;
  let nightsWithData: number;
  let windowStart: string | null = null;
  let windowEnd: string | null = null;
  let avgHours: number | null = null;
  let source: 'engine' | 'computed' | 'none' = 'none';

  if (period) {
    totalHours = Number(period.total_hours) || 0;
    nightsWithData = period.nights_with_data ?? 0;
    windowStart = period.window_start;
    windowEnd = period.window_end;
    avgHours = period.avg_hours_per_night != null ? Number(period.avg_hours_per_night) : null;
    source = 'engine';
  } else {
    // 2. Fallback : calcul direct sur observance_data (28 derniers jours)
    const since = new Date();
    since.setDate(since.getDate() - 28);
    const sinceStr = since.toISOString().split('T')[0];

    const { data: nights } = await supabase
      .from('observance_data')
      .select('*')
      .eq('patient_id', patient.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true });

    const rows = nights ?? [];
    totalHours = Math.round(rows.reduce((s: number, n: any) => s + nightHours(n), 0) * 10) / 10;
    nightsWithData = rows.length;
    if (rows.length > 0) {
      windowStart = rows[0].date;
      windowEnd = rows[rows.length - 1].date;
      avgHours = Math.round((totalHours / rows.length) * 10) / 10;
      source = 'computed';
    }
  }

  // Seuil réglementaire : 112 h / 28 j (forfait plein, research/05)
  const TARGET_HOURS = 112;
  const percent = Math.min(100, Math.round((totalHours / TARGET_HOURS) * 100));

  return c.json({
    window_start: windowStart,
    window_end: windowEnd,
    total_hours: totalHours,
    target_hours: TARGET_HOURS,
    percent,
    nights_with_data: nightsWithData,
    avg_hours_per_night: avgHours,
    source,
  });
});

// ------------------------------------------------------------------
// GAMIFICATION — opt-in, forgiveness, badges sobres
// ------------------------------------------------------------------

/**
 * Badges affichés au patient : factuels, dignes, jalons cliniques.
 * Les achievements "gaming" (LEVEL_*, XP) ne sont PAS exposés au patient
 * (audience 50-70 ans — pas de "Champion de la semaine !").
 */
const PATIENT_BADGES: Record<string, { name: string; description: string }> = {
  FIRST_NIGHT: {
    name: 'Première nuit',
    description: 'Votre traitement a commencé',
  },
  ONBOARDING_COMPLETE: {
    name: 'Première semaine',
    description: '7 nuits de traitement enregistrées',
  },
  STREAK_7: {
    name: '1 semaine de bonne observance',
    description: '7 nuits de suite avec plus de 4 heures',
  },
  STREAK_30: {
    name: '1 mois de traitement régulier',
    description: '30 nuits de suite avec plus de 4 heures',
  },
  STREAK_90: {
    name: '3 mois de traitement régulier',
    description: '90 nuits de suite avec plus de 4 heures',
  },
  STREAK_365: {
    name: '1 an de traitement régulier',
    description: '365 nuits de suite avec plus de 4 heures',
  },
  PERFECT_NIGHT: {
    name: 'Nuit de grande qualité',
    description: 'Respiration bien contrôlée et masque bien ajusté',
  },
  PERFECT_WEEK: {
    name: 'Semaine de grande qualité',
    description: '7 nuits de grande qualité de suite',
  },
  ZERO_LEAK_NIGHT: {
    name: 'Masque parfaitement ajusté',
    description: 'Une nuit presque sans fuite d\'air',
  },
  ZERO_LEAK_WEEK: {
    name: 'Une semaine de masque bien ajusté',
    description: '7 nuits de suite presque sans fuite',
  },
};

async function getPreferences(patientId: string) {
  const { data } = await supabase
    .from('patient_preferences')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  return data;
}

app.get('/patient/gamification', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const user = c.get('user');
  const ids = [user.id, patient.id];

  const prefs = await getPreferences(patient.id);
  const streaksEnabled = prefs?.streaks_enabled === true;

  // Stats gamification — ligne la plus complète disponible
  const { data: statsRows } = await supabase
    .from('patient_stats')
    .select('*')
    .in('patient_id', ids)
    .limit(30);

  const statRow: any =
    (statsRows ?? []).find((r: any) => r.current_streak_days != null) ??
    (statsRows ?? [])[0] ??
    null;

  // FORGIVENESS : nuits cumulées, jamais resetées.
  // Fallback robuste : si la colonne/ligne manque, on compte directement
  // les nuits enregistrées (cumulatif par construction).
  let cumulativeNights: number =
    Number(statRow?.cumulative_nights ?? statRow?.total_nights_tracked ?? 0) || 0;

  if (cumulativeNights === 0) {
    const { count } = await supabase
      .from('observance_data')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id);
    cumulativeNights = count ?? 0;
  }

  // Badges sobres uniquement (mapping clinique, pas de niveaux/XP)
  const { data: achievements } = await supabase
    .from('patient_achievements')
    .select('achievement_type, unlocked_at')
    .in('patient_id', ids)
    .order('unlocked_at', { ascending: true });

  const badges = (achievements ?? [])
    .filter((a: any) => PATIENT_BADGES[a.achievement_type])
    .map((a: any) => ({
      type: a.achievement_type,
      ...PATIENT_BADGES[a.achievement_type],
      unlocked_at: a.unlocked_at,
    }));

  return c.json({
    cumulative_nights: cumulativeNights,
    // Série : seulement si le patient l'a activée (opt-in strict)
    streaks_enabled: streaksEnabled,
    current_streak: streaksEnabled ? (statRow?.current_streak_days ?? 0) : null,
    longest_streak: streaksEnabled ? (statRow?.longest_streak_days ?? 0) : null,
    badges,
    treatment_start_date: patient.treatment_start_date,
  });
});

// ------------------------------------------------------------------
// PRÉFÉRENCES
// ------------------------------------------------------------------

app.get('/patient/preferences', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const prefs = await getPreferences(patient.id);
  return c.json({
    preferences: {
      streaks_enabled: prefs?.streaks_enabled ?? false,
      notifications_daily_max: prefs?.notifications_daily_max ?? 1,
      notification_channel: prefs?.notification_channel ?? 'app',
      dark_mode: prefs?.dark_mode ?? false,
    },
  });
});

app.patch('/patient/preferences', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));

  // Whitelist stricte — rien d'autre ne passe
  const patch: Record<string, unknown> = {};
  if (typeof body.streaks_enabled === 'boolean') patch.streaks_enabled = body.streaks_enabled;
  if (typeof body.dark_mode === 'boolean') patch.dark_mode = body.dark_mode;
  if (Number.isInteger(body.notifications_daily_max) && body.notifications_daily_max >= 0 && body.notifications_daily_max <= 3) {
    patch.notifications_daily_max = body.notifications_daily_max;
  }
  if (['app', 'email', 'sms', 'none'].includes(body.notification_channel)) {
    patch.notification_channel = body.notification_channel;
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'Aucune préférence valide fournie' }, 400);
  }

  const { data, error } = await supabase
    .from('patient_preferences')
    .upsert(
      {
        patient_id: patient.id,
        tenant_id: c.get('tenantId'),
        ...patch,
      },
      { onConflict: 'patient_id' },
    )
    .select('*')
    .single();

  if (error) {
    console.error('[PATIENT PORTAL] preferences upsert error:', error.message);
    return c.json({ error: 'Impossible d\'enregistrer vos préférences' }, 500);
  }

  return c.json({
    success: true,
    preferences: {
      streaks_enabled: data.streaks_enabled,
      notifications_daily_max: data.notifications_daily_max,
      notification_channel: data.notification_channel,
      dark_mode: data.dark_mode,
    },
  });
});

// ------------------------------------------------------------------
// TICKETS — "J'ai un problème"
// ------------------------------------------------------------------

app.post('/patient/tickets', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const type = body.type as string;
  const message = (body.message as string ?? '').trim();

  if (!['panne', 'masque', 'question'].includes(type)) {
    return c.json({ error: 'Type invalide (panne, masque ou question)' }, 400);
  }
  if (message.length === 0 || message.length > 2000) {
    return c.json({ error: 'Décrivez votre problème (2000 caractères maximum)' }, 400);
  }

  const { data, error } = await supabase
    .from('patient_tickets')
    .insert({
      patient_id: patient.id,
      tenant_id: c.get('tenantId'),
      type,
      message,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[PATIENT PORTAL] ticket insert error:', error.message);
    return c.json({ error: 'Impossible d\'envoyer votre demande, réessayez' }, 500);
  }

  return c.json({ success: true, ticket: data });
});

app.get('/patient/tickets', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data, error } = await supabase
    .from('patient_tickets')
    .select('id, type, message, status, created_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ tickets: data ?? [] });
});

export default app;
