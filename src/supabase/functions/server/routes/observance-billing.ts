/**
 * Routes observance / LPPR / facturation (back-office PSAD).
 * Montées sur `${prefix}` dans index.tsx.
 *
 * - POST /observance/run-nightly   : recalcul flotte (cron pg_cron, secret partagé)
 * - POST /observance/run/:patientId: recalcul unitaire (admin/prestataire)
 * - GET  /observance/patient/:id   : historique fenêtres 28j
 * - GET  /observance/fleet         : répartition flotte par bande + patients sous seuil
 * - GET  /billing/lines            : lignes à facturer (filtre status)
 * - PATCH /billing/lines/:id       : transition de statut (draft→ready→transmitted→paid/rejected)
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';
import { runForPatient, runNightlyRecalc } from '../observance-lppr-engine.ts';
import { transmitReadyLines } from '../fse-transmitter.ts';

const app = new Hono<TenantEnv>();

// ------------------------------------------------------------------
// Cron nightly — authentifié par secret partagé (pas de session user)
// ------------------------------------------------------------------

app.post('/observance/run-nightly', async (c) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const provided = c.req.header('x-cron-secret') ?? c.req.header('Authorization')?.split(' ')[1];

  // Accepté : secret cron dédié OU service role key (pattern cron-config existant)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!provided || (provided !== cronSecret && provided !== serviceKey)) {
    return c.json({ error: 'Unauthorized - cron secret invalide' }, 401);
  }

  try {
    const results = await runNightlyRecalc();
    return c.json({ success: true, ...results });
  } catch (e) {
    console.error('[OBSERVANCE] nightly failed:', e);
    return c.json({ error: e instanceof Error ? e.message : 'nightly failed' }, 500);
  }
});

// ------------------------------------------------------------------
// Routes back-office (admin / prestataire)
// ------------------------------------------------------------------

const pro = new Hono<TenantEnv>();
pro.use('*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

pro.post('/observance/run/:patientId', async (c) => {
  try {
    const result = await runForPatient(c.req.param('patientId'), c.get('tenantId'));
    return c.json({ success: true, result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'run failed' }, 500);
  }
});

pro.get('/observance/patient/:patientId', async (c) => {
  const limit = Number(c.req.query('limit') ?? 30);
  const { data, error } = await supabase
    .from('observance_periods')
    .select('*')
    .eq('patient_id', c.req.param('patientId'))
    .eq('tenant_id', c.get('tenantId'))
    .order('window_end', { ascending: false })
    .limit(limit);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ periods: data ?? [] });
});

pro.get('/observance/fleet', async (c) => {
  const tenantId = c.get('tenantId');

  // Dernière fenêtre par patient = statut courant + code LPPR
  const { data: statuses, error } = await supabase
    .from('patient_therapy_status')
    .select('patient_id, phase, telesuivi_consent, current_lppr_code_id, lppr_codes(short_code, label)')
    .eq('tenant_id', tenantId);

  if (error) return c.json({ error: error.message }, 500);

  const { data: latestPeriods, error: opError } = await supabase
    .from('observance_periods')
    .select('patient_id, compliance_band, total_hours, window_end')
    .eq('tenant_id', tenantId)
    .order('window_end', { ascending: false })
    .limit(5000);

  if (opError) return c.json({ error: opError.message }, 500);

  // Première occurrence par patient = fenêtre la plus récente
  const latestByPatient = new Map<string, { compliance_band: string; total_hours: number; window_end: string }>();
  for (const p of latestPeriods ?? []) {
    if (!latestByPatient.has(p.patient_id)) latestByPatient.set(p.patient_id, p);
  }

  const bands: Record<string, number> = { full: 0, partial: 0, low: 0, none: 0 };
  const belowThreshold: Array<{ patient_id: string; total_hours: number; band: string }> = [];

  for (const [patientId, period] of latestByPatient) {
    bands[period.compliance_band] = (bands[period.compliance_band] ?? 0) + 1;
    if (period.compliance_band !== 'full') {
      belowThreshold.push({
        patient_id: patientId,
        total_hours: period.total_hours,
        band: period.compliance_band,
      });
    }
  }

  return c.json({
    total_patients: statuses?.length ?? 0,
    patients_with_data: latestByPatient.size,
    bands,
    below_threshold: belowThreshold.sort((a, b) => a.total_hours - b.total_hours),
    statuses: statuses ?? [],
  });
});

// ------------------------------------------------------------------
// Facturation
// ------------------------------------------------------------------

pro.get('/billing/lines', async (c) => {
  const status = c.req.query('status');
  const limit = Number(c.req.query('limit') ?? 200);

  let query = supabase
    .from('billing_lines')
    .select('*, lppr_codes(short_code, code_lpp, label)')
    .eq('tenant_id', c.get('tenantId'))
    .order('period_start', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  // Agrégat pour le dashboard finance
  const totals: Record<string, { count: number; amount: number }> = {};
  for (const line of data ?? []) {
    const s = line.status as string;
    totals[s] = totals[s] ?? { count: 0, amount: 0 };
    totals[s].count++;
    totals[s].amount += Number(line.amount_ttc) || 0;
  }

  return c.json({ lines: data ?? [], totals });
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['ready', 'cancelled'],
  ready: ['transmitted', 'draft', 'cancelled'],
  transmitted: ['paid', 'rejected'],
  rejected: ['ready', 'cancelled'], // re-présentation après correction
  paid: [],
  cancelled: [],
};

/**
 * Transmet toutes les lignes 'ready' via le transmitter FSE configuré.
 * Aujourd'hui : MockFseTransmitter (réfs MOCK-*, mode retourné au front).
 * Demain : SDK agréé Area Santé, même endpoint.
 */
pro.post('/billing/transmit', async (c) => {
  try {
    const result = await transmitReadyLines(c.get('tenantId'));
    return c.json({ success: true, ...result });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'transmit failed' }, 500);
  }
});

pro.patch('/billing/lines/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const nextStatus = body.status as string;
  const tenantId = c.get('tenantId');

  if (!nextStatus || !(nextStatus in ALLOWED_TRANSITIONS)) {
    return c.json({ error: `status invalide: ${nextStatus}` }, 400);
  }

  const { data: line, error: readError } = await supabase
    .from('billing_lines')
    .select('id, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (readError) return c.json({ error: readError.message }, 500);
  if (!line) return c.json({ error: 'Ligne introuvable' }, 404);

  if (!ALLOWED_TRANSITIONS[line.status]?.includes(nextStatus)) {
    return c.json(
      { error: `Transition interdite : ${line.status} → ${nextStatus}` },
      409,
    );
  }

  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === 'transmitted' && body.fse_reference) patch.fse_reference = body.fse_reference;
  if (nextStatus === 'rejected' && body.rejection_reason) patch.rejection_reason = body.rejection_reason;

  const { data: updated, error: updError } = await supabase
    .from('billing_lines')
    .update(patch)
    .eq('id', line.id)
    .select('*')
    .single();

  if (updError) return c.json({ error: updError.message }, 500);
  return c.json({ success: true, line: updated });
});

app.route('/', pro);

export default app;
