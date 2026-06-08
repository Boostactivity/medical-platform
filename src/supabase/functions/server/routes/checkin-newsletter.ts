/**
 * Routes CARE CHECK-IN + NEWSLETTER (back-office).
 * À monter dans index.tsx : `app.route(prefix, checkinNewsletterRoutes);`
 * (paths /patient/checkin*, /pro-checkin/*, /pro-newsletter/*).
 *
 * Règles dures :
 *   - Middlewares scopés PAR CHEMIN (jamais use('*')) : monté au préfixe
 *     racine, un '*' avalerait les routes des sub-apps montées après.
 *   - Le patient n'accède QU'À ses propres données :
 *     user.id (auth) → patients.user_id → patients.id, filtré tenant.
 *   - ANTI-SHAME ABSOLU : aucun score, aucune moyenne, aucun "flagged"
 *     n'est renvoyé au patient. flagged est un signal STAFF uniquement
 *     (mood <= 2 OU mask_comfort <= 2 → un rappel humain est souhaitable).
 *   - Cadence check-in : QUOTIDIEN tant que day_index <= 28 (J1-J28),
 *     puis SEMESTRIEL (1 check-in tous les 182 jours). day_index est
 *     calculé depuis patient_therapy_status.therapy_start_date
 *     (migration 101) ; 0 si la date de début est inconnue.
 *   - Newsletter : l'envoi réel est une dépendance externe (fournisseur
 *     email non configuré). Pattern fse-transmitter.ts : interface
 *     NewsletterSender + MockNewsletterSender explicite, status
 *     'sent_mock' — JAMAIS de faux "envoyé".
 *
 * Côté patient (requireRole('patient')) :
 * - GET  /patient/checkin/today : faut-il un check-in aujourd'hui ?
 *        (+ check-in du jour s'il existe, + dernier check-in)
 * - POST /patient/checkin       : 3 réponses 1-5 + note libre optionnelle
 *
 * Côté pro (requireRole('admin','prestataire')) :
 * - GET   /pro-checkin/flagged?status=pending|handled|all
 * - PATCH /pro-checkin/:id/handled
 * - GET   /pro-checkin/stats    : agrégats uniquement (volume, moyennes 7 j)
 * - GET   /pro-newsletter/issues
 * - POST  /pro-newsletter/issues
 * - POST  /pro-newsletter/issues/:id/send  (MOCK explicite)
 *
 * Les routes PUBLIQUES newsletter (subscribe / unsubscribe) vivent dans
 * routes/public-vitrine.ts (visiteurs anonymes, service role).
 *
 * Schéma : migration 112 (care_checkins, newsletter_subscriptions,
 * newsletter_issues), 101 (patient_therapy_status).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Scopé par chemin (pas '*') : monté au préfixe racine, un '*' avalerait
// les routes des sub-apps montées après (bug connu d'interception).
app.use('/patient/checkin', requireAuth, requireRole('patient'), requireTenant);
app.use('/patient/checkin/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/pro-checkin/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);
app.use('/pro-newsletter/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// ------------------------------------------------------------------
// Constantes métier — cadence du check-in
// ------------------------------------------------------------------

/** J1-J28 : check-in quotidien (période d'adaptation à la PPC). */
const DAILY_PHASE_MAX_DAY = 28;
/** Au-delà de J28 : 1 check-in tous les 6 mois (~182 jours). */
const SEMIANNUAL_INTERVAL_DAYS = 182;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ------------------------------------------------------------------
// Interface d'envoi newsletter — MOCKABLE (pattern fse-transmitter.ts)
// ------------------------------------------------------------------

export interface NewsletterSendResult {
  mode: 'mock' | 'resend';
  delivered: number;
  message: string;
}

export interface NewsletterSender {
  readonly mode: 'mock' | 'resend';
  sendIssue(
    issue: { id: string; subject: string; body_md: string },
    recipients: Array<{ email: string; token_unsubscribe: string }>,
  ): Promise<NewsletterSendResult>;
}

/**
 * Implémentation MOCK — aucun email ne part. Le numéro est marqué
 * 'sent_mock' et le mock NE se fait JAMAIS passer pour un vrai envoi :
 * le mode et le message sont retournés à l'appelant.
 */
export class MockNewsletterSender implements NewsletterSender {
  readonly mode = 'mock' as const;

  async sendIssue(
    _issue: { id: string; subject: string; body_md: string },
    recipients: Array<{ email: string; token_unsubscribe: string }>,
  ): Promise<NewsletterSendResult> {
    return {
      mode: 'mock',
      delivered: recipients.length,
      message:
        `Envoi simulé : ${recipients.length} abonné(s) compté(s), aucun email réel envoyé. ` +
        'Envoi réel à brancher : fournisseur email non configuré (Resend).',
    };
  }
}

/**
 * Point d'extension fournisseur réel (Resend).
 * À implémenter quand RESEND_API_KEY sera disponible — switch sur
 * Deno.env.get('NEWSLETTER_MODE'), sans toucher au reste du code.
 */
// export class ResendNewsletterSender implements NewsletterSender { ... }

export function getNewsletterSender(): NewsletterSender {
  return new MockNewsletterSender();
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface PatientRow {
  id: string;
  user_id: string;
}

/**
 * Résout la ligne patients de l'utilisateur connecté (scopée tenant,
 * fallback legacy sans tenant — même pattern que patient-services.ts).
 */
async function resolvePatient(c: any): Promise<PatientRow | null> {
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  const { data } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (data) return data as PatientRow;

  const { data: legacy } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return (legacy as PatientRow) ?? null;
}

/** Date calendaire du jour (UTC, cohérente avec checkin_date DEFAULT CURRENT_DATE). */
function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Jour de thérapie aujourd'hui (J1 = therapy_start_date).
 * 0 = date de début inconnue (pas de ligne patient_therapy_status).
 */
async function computeDayIndex(patientId: string): Promise<number> {
  const { data } = await supabase
    .from('patient_therapy_status')
    .select('therapy_start_date')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (!data?.therapy_start_date) return 0;

  const start = new Date(`${data.therapy_start_date}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || start > today) return 0;

  return Math.floor((today - start) / MS_PER_DAY) + 1;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Noms/emails des patients (patients.id → users) pour les vues pro. */
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

/**
 * Projection PATIENT d'un check-in : les réponses lui appartiennent,
 * mais JAMAIS flagged / handled_* (signaux staff, anti-shame).
 */
function patientView(checkin: any) {
  if (!checkin) return null;
  return {
    id: checkin.id,
    checkin_date: checkin.checkin_date,
    day_index: checkin.day_index,
    mood: checkin.mood,
    mask_comfort: checkin.mask_comfort,
    sleep_feeling: checkin.sleep_feeling,
    free_note: checkin.free_note,
    created_at: checkin.created_at,
  };
}

// ==================================================================
// PATIENT — CHECK-IN
// ==================================================================

// GET /patient/checkin/today — faut-il un check-in aujourd'hui ?
// Cadence : quotidien si day_index <= 28, sinon 1 tous les 6 mois.
// Renvoie aussi le check-in du jour (s'il existe) et le dernier.
app.get('/patient/checkin/today', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const today = todayIso();
  const dayIndex = await computeDayIndex(patient.id);

  const { data: last, error } = await supabase
    .from('care_checkins')
    .select('id, checkin_date, day_index, mood, mask_comfort, sleep_feeling, free_note, created_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('checkin_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);

  const doneToday = last?.checkin_date === today;
  const phase: 'daily' | 'semiannual' =
    dayIndex >= 1 && dayIndex <= DAILY_PHASE_MAX_DAY ? 'daily' : 'semiannual';

  let due = false;
  if (!doneToday) {
    if (phase === 'daily') {
      due = true;
    } else {
      // Semestriel : dû si aucun check-in, ou dernier check-in > 182 jours
      if (!last) {
        due = true;
      } else {
        const lastMs = new Date(`${last.checkin_date}T00:00:00Z`).getTime();
        const todayMs = new Date(`${today}T00:00:00Z`).getTime();
        due = (todayMs - lastMs) / MS_PER_DAY >= SEMIANNUAL_INTERVAL_DAYS;
      }
    }
  }

  return c.json({
    due,
    phase,
    day_index: dayIndex,
    today: doneToday ? patientView(last) : null,
    last: patientView(last),
  });
});

// POST /patient/checkin — 3 réponses 1-5 + note libre optionnelle.
// day_index et flagged calculés CÔTÉ SERVEUR (jamais par le client).
app.post('/patient/checkin', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { mood, mask_comfort, sleep_feeling } = body;

  if (
    !isIntInRange(mood, 1, 5) ||
    !isIntInRange(mask_comfort, 1, 5) ||
    !isIntInRange(sleep_feeling, 1, 5)
  ) {
    return c.json({ error: 'Merci de répondre aux trois questions' }, 400);
  }

  const freeNote =
    typeof body.free_note === 'string' ? body.free_note.trim().slice(0, 500) : null;

  const dayIndex = await computeDayIndex(patient.id);
  const flagged = mood <= 2 || mask_comfort <= 2;

  const { data: checkin, error } = await supabase
    .from('care_checkins')
    .insert({
      tenant_id: c.get('tenantId'),
      patient_id: patient.id,
      day_index: dayIndex,
      checkin_date: todayIso(),
      mood,
      mask_comfort,
      sleep_feeling,
      free_note: freeNote || null,
      flagged,
    })
    .select('*')
    .single();

  if (error) {
    // 23505 = UNIQUE (patient_id, checkin_date) : déjà répondu aujourd'hui
    if ((error as any).code === '23505') {
      return c.json({ error: 'Vous avez déjà répondu aujourd\'hui. Merci.' }, 409);
    }
    console.error('[CHECKIN] insert error:', error.message);
    return c.json({ error: 'Impossible d\'enregistrer vos réponses, réessayez' }, 500);
  }

  // Projection patient : pas de flagged, pas de score (anti-shame)
  return c.json({ success: true, checkin: patientView(checkin) });
});

// ==================================================================
// PRO — SUIVI DES CHECK-INS
// ==================================================================

// GET /pro-checkin/flagged?status=pending|handled|all
// Check-ins préoccupants (flagged) à suivre, plus récents d'abord.
app.get('/pro-checkin/flagged', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status') ?? 'pending';
  if (!['pending', 'handled', 'all'].includes(status)) {
    return c.json({ error: 'status invalide (pending, handled ou all)' }, 400);
  }

  let query = supabase
    .from('care_checkins')
    .select('id, patient_id, checkin_date, day_index, mood, mask_comfort, sleep_feeling, free_note, flagged, handled_by, handled_at, created_at')
    .eq('tenant_id', tenantId)
    .eq('flagged', true)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status === 'pending') query = query.is('handled_at', null);
  if (status === 'handled') query = query.not('handled_at', 'is', null);

  const { data: checkins, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const identities = await fetchPatientIdentities(
    [...new Set((checkins ?? []).map((ck) => ck.patient_id))],
  );

  return c.json({
    checkins: (checkins ?? []).map((ck) => ({
      ...ck,
      patient_name: identities.get(ck.patient_id)?.name ?? null,
      patient_email: identities.get(ck.patient_id)?.email ?? null,
    })),
  });
});

// PATCH /pro-checkin/:id/handled — marque le check-in pris en charge.
// Conserve le premier intervenant (pas d'écrasement silencieux).
app.patch('/pro-checkin/:id/handled', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');

  const { data: checkin, error: readError } = await supabase
    .from('care_checkins')
    .select('id, handled_by, handled_at')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!checkin) return c.json({ error: 'Check-in introuvable' }, 404);

  if (checkin.handled_at) {
    return c.json({ success: true, already_handled: true, checkin });
  }

  const { data: updated, error: updError } = await supabase
    .from('care_checkins')
    .update({ handled_by: user.id, handled_at: new Date().toISOString() })
    .eq('id', checkin.id)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, checkin: updated });
});

// GET /pro-checkin/stats — agrégats UNIQUEMENT (volume, moyennes 7 j,
// signalements en attente). Aucune liste nominative ici.
app.get('/pro-checkin/stats', async (c) => {
  const tenantId = c.get('tenantId');

  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY).toISOString().split('T')[0];

  const [recentRes, totalRes, pendingRes] = await Promise.all([
    supabase
      .from('care_checkins')
      .select('mood, mask_comfort, sleep_feeling')
      .eq('tenant_id', tenantId)
      .gte('checkin_date', sevenDaysAgo)
      .limit(5000),
    supabase
      .from('care_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('care_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('flagged', true)
      .is('handled_at', null),
  ]);

  if (recentRes.error) return c.json({ error: recentRes.error.message }, 500);

  const recent = recentRes.data ?? [];
  const avg = (key: 'mood' | 'mask_comfort' | 'sleep_feeling') =>
    recent.length === 0
      ? null
      : Math.round((recent.reduce((sum, r) => sum + (r[key] ?? 0), 0) / recent.length) * 10) / 10;

  return c.json({
    total_checkins: totalRes.count ?? 0,
    flagged_pending: pendingRes.count ?? 0,
    last_7_days: {
      count: recent.length,
      avg_mood: avg('mood'),
      avg_mask_comfort: avg('mask_comfort'),
      avg_sleep_feeling: avg('sleep_feeling'),
    },
  });
});

// ==================================================================
// PRO — NEWSLETTER
// ==================================================================

// GET /pro-newsletter/issues — numéros du tenant + nombre d'abonnés actifs
app.get('/pro-newsletter/issues', async (c) => {
  const tenantId = c.get('tenantId');

  const [issuesRes, subsRes] = await Promise.all([
    supabase
      .from('newsletter_issues')
      .select('id, subject, body_md, status, sent_at, recipients_count, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('newsletter_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'subscribed'),
  ]);

  if (issuesRes.error) return c.json({ error: issuesRes.error.message }, 500);

  return c.json({
    issues: issuesRes.data ?? [],
    subscribers_count: subsRes.count ?? 0,
    send_mode: getNewsletterSender().mode,
  });
});

// POST /pro-newsletter/issues — Body : { subject, body_md } → brouillon
app.post('/pro-newsletter/issues', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
  const bodyMd = typeof body.body_md === 'string' ? body.body_md.trim().slice(0, 50000) : '';

  if (!subject) return c.json({ error: 'Le sujet est requis' }, 400);
  if (!bodyMd) return c.json({ error: 'Le contenu est requis' }, 400);

  const { data: issue, error } = await supabase
    .from('newsletter_issues')
    .insert({ tenant_id: tenantId, subject, body_md: bodyMd, status: 'draft' })
    .select('*')
    .single();

  if (error) {
    console.error('[NEWSLETTER] issue insert error:', error.message);
    return c.json({ error: 'Impossible de créer le brouillon, réessayez' }, 500);
  }

  return c.json({ success: true, issue });
});

// POST /pro-newsletter/issues/:id/send — envoi MOCK explicite.
// Compte les abonnés actifs, marque sent_mock + recipients_count.
// AUCUN email réel ne part : fournisseur email non configuré.
app.post('/pro-newsletter/issues/:id/send', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: issue, error: readError } = await supabase
    .from('newsletter_issues')
    .select('id, subject, body_md, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!issue) return c.json({ error: 'Numéro introuvable' }, 404);
  if (issue.status !== 'draft') {
    return c.json({ error: 'Ce numéro a déjà été traité' }, 409);
  }

  const { data: subscribers, error: subsError } = await supabase
    .from('newsletter_subscriptions')
    .select('email, token_unsubscribe')
    .eq('tenant_id', tenantId)
    .eq('status', 'subscribed')
    .limit(10000);
  if (subsError) return c.json({ error: subsError.message }, 500);

  const sender = getNewsletterSender();
  const result = await sender.sendIssue(
    { id: issue.id, subject: issue.subject, body_md: issue.body_md },
    subscribers ?? [],
  );

  // Le statut reflète la réalité : sent_mock (jamais un faux "sent")
  const { data: updated, error: updError } = await supabase
    .from('newsletter_issues')
    .update({
      status: 'sent_mock',
      sent_at: new Date().toISOString(),
      recipients_count: result.delivered,
    })
    .eq('id', issue.id)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({
    success: true,
    mode: result.mode,
    message: result.message,
    issue: updated,
  });
});

export default app;
