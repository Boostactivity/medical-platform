/**
 * Routes connecteurs d'extraction télésuivi (back-office PSAD).
 * Montées sur `${prefix}` dans index.tsx (pattern observance-billing).
 *
 * Idée produit : le PSAD possède DÉJÀ ses identifiants sur les portails
 * fabricants (AirView, Care Orchestrator, prisma CLOUD). Le worker
 * apps/connector-worker extrait SES données avec SES identifiants et
 * les pousse ici — la plateforme ne voit JAMAIS les credentials en
 * clair (blob AES-256-GCM chiffré côté worker, clé locale).
 *
 * - GET   /connectors          : configs du tenant (SANS credentials)
 * - POST  /connectors          : créer / mettre à jour une config
 * - PATCH /connectors/:id      : enable/disable, label, horaires, options
 * - GET   /connectors/runs     : historique des exécutions (?limit=)
 * - POST  /connectors/ingest   : réception worker (service key ou
 *   x-connector-secret) → parseUniversalData → saveSleepData
 *   (observance_data → moteur LPPR) + compteur connector_runs
 *
 * Middlewares appliqués route par route (PAS de use('*')) : la route
 * /connectors/ingest est authentifiée machine-à-machine, pas par
 * session utilisateur.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';
import { parseUniversalData, saveSleepData } from '../universal-adapter.ts';

const app = new Hono<TenantEnv>();

const PROVIDERS = ['airview', 'care_orchestrator', 'prisma_cloud', 'csv_watch', 'sd_card'] as const;
type Provider = (typeof PROVIDERS)[number];

// Colonnes exposées au front — credentials_encrypted JAMAIS renvoyé.
const SAFE_COLUMNS =
  'id, provider, label, schedule_times, options, enabled, last_run_at, last_run_status, last_run_detail, created_at, updated_at';

const proGuards = [requireAuth, requireRole('admin', 'prestataire'), requireTenant] as const;

// ------------------------------------------------------------------
// GET /connectors — configs du tenant (sans credentials)
// ------------------------------------------------------------------

app.get('/connectors', ...proGuards, async (c) => {
  const { data, error } = await supabase
    .from('connector_configs')
    .select(SAFE_COLUMNS)
    .eq('tenant_id', c.get('tenantId'))
    .order('created_at', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  // Indique si des credentials sont enregistrés, sans jamais les exposer.
  const { data: credFlags } = await supabase
    .from('connector_configs')
    .select('id, credentials_encrypted')
    .eq('tenant_id', c.get('tenantId'));
  const hasCreds = new Set(
    (credFlags ?? []).filter((r) => !!r.credentials_encrypted).map((r) => r.id),
  );

  return c.json({
    connectors: (data ?? []).map((row: any) => ({
      ...row,
      has_credentials: hasCreds.has(row.id),
    })),
  });
});

// ------------------------------------------------------------------
// GET /connectors/runs — historique des exécutions
// (déclaré AVANT les routes :id pour éviter la capture par /connectors/:id)
// ------------------------------------------------------------------

app.get('/connectors/runs', ...proGuards, async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 500);

  const { data, error } = await supabase
    .from('connector_runs')
    .select('id, config_id, started_at, finished_at, status, records_ingested, error, connector_configs(label, provider)')
    .eq('tenant_id', c.get('tenantId'))
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ runs: data ?? [] });
});

// ------------------------------------------------------------------
// POST /connectors — créer ou mettre à jour (body.id présent = MAJ)
// ------------------------------------------------------------------

app.post('/connectors', ...proGuards, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const tenantId = c.get('tenantId');

  const provider = body.provider as Provider | undefined;
  if (!body.id && (!provider || !PROVIDERS.includes(provider))) {
    return c.json({ error: `provider invalide. Valeurs : ${PROVIDERS.join(', ')}` }, 400);
  }
  if (!body.id && !body.label?.trim()) {
    return c.json({ error: 'label requis' }, 400);
  }
  if (body.schedule_times !== undefined) {
    const ok =
      Array.isArray(body.schedule_times) &&
      body.schedule_times.every((t: unknown) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t));
    if (!ok) return c.json({ error: 'schedule_times : tableau de "HH:MM" attendu' }, 400);
  }

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) patch.label = String(body.label).trim();
  if (body.schedule_times !== undefined) patch.schedule_times = body.schedule_times;
  if (body.options !== undefined) patch.options = body.options;
  if (body.enabled !== undefined) patch.enabled = !!body.enabled;
  // Blob déjà chiffré par le worker (encrypt-creds) — stocké tel quel,
  // la plateforme ne peut pas le déchiffrer.
  if (body.credentials_encrypted !== undefined) {
    patch.credentials_encrypted = body.credentials_encrypted || null;
  }

  if (body.id) {
    const { data, error } = await supabase
      .from('connector_configs')
      .update(patch)
      .eq('id', body.id)
      .eq('tenant_id', tenantId)
      .select(SAFE_COLUMNS)
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'Connecteur introuvable' }, 404);
    return c.json({ success: true, connector: data });
  }

  const { data, error } = await supabase
    .from('connector_configs')
    .insert({ tenant_id: tenantId, provider, ...patch })
    .select(SAFE_COLUMNS)
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, connector: data }, 201);
});

// ------------------------------------------------------------------
// PATCH /connectors/:id — enable/disable (+ label/horaires/options)
// ------------------------------------------------------------------

app.patch('/connectors/:id', ...proGuards, async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (body.enabled !== undefined) patch.enabled = !!body.enabled;
  if (body.label !== undefined) patch.label = String(body.label).trim();
  if (body.schedule_times !== undefined) patch.schedule_times = body.schedule_times;
  if (body.options !== undefined) patch.options = body.options;

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'Aucun champ à mettre à jour' }, 400);
  }

  const { data, error } = await supabase
    .from('connector_configs')
    .update(patch)
    .eq('id', c.req.param('id'))
    .eq('tenant_id', c.get('tenantId'))
    .select(SAFE_COLUMNS)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: 'Connecteur introuvable' }, 404);
  return c.json({ success: true, connector: data });
});

// ------------------------------------------------------------------
// POST /connectors/ingest — réception des données extraites par le
// worker. Auth machine-à-machine : service role key (Bearer) OU
// secret partagé CONNECTOR_INGEST_SECRET (x-connector-secret) —
// pattern observance/run-nightly.
// ------------------------------------------------------------------

app.post('/connectors/ingest', async (c) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const connectorSecret = Deno.env.get('CONNECTOR_INGEST_SECRET');
  const bearer = c.req.header('Authorization')?.split(' ')[1];
  const secretHeader = c.req.header('x-connector-secret');

  const authorized =
    (!!serviceKey && bearer === serviceKey) ||
    (!!connectorSecret && secretHeader === connectorSecret);

  if (!authorized) {
    return c.json({ error: 'Unauthorized - service key ou x-connector-secret requis' }, 401);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Corps JSON invalide' }, 400);

  const { configId, runId, patientId, fileContent, filename, format } = body;
  if (!configId || !patientId || !fileContent) {
    return c.json({ error: 'configId, patientId et fileContent requis' }, 400);
  }

  // Le tenant vient de la config en DB — jamais du payload client.
  const { data: config, error: cfgError } = await supabase
    .from('connector_configs')
    .select('id, tenant_id, provider')
    .eq('id', configId)
    .maybeSingle();

  if (cfgError) return c.json({ error: cfgError.message }, 500);
  if (!config) return c.json({ error: 'Connecteur inconnu' }, 404);

  try {
    // 1. Parse multi-constructeurs (CSV Philips / JSON ResMed / XML Löwenstein)
    const parsed = await parseUniversalData(fileContent, patientId, format);
    console.log(`[CONNECTOR INGEST] ${filename ?? 'fichier'} → ${parsed.length} session(s) (config ${configId})`);

    // 2. Écriture observance_data (alimente le moteur LPPR)
    await saveSleepData(parsed);

    // 3. Scoping tenant des lignes écrites : saveSleepData (non modifié)
    //    n'écrit pas tenant_id → la colonne retombe sur le DEFAULT de la
    //    migration 100. On la corrige avec le tenant de la config.
    const dates = parsed.map((p) => p.session_date);
    if (dates.length > 0) {
      const { error: scopeError } = await supabase
        .from('observance_data')
        .update({ tenant_id: config.tenant_id })
        .eq('patient_id', patientId)
        .in('date', dates);
      if (scopeError) {
        console.error('[CONNECTOR INGEST] scoping tenant_id échoué:', scopeError.message);
      }
    }

    // 4. Compteur du run (best effort — le worker clôture le run lui-même)
    if (runId) {
      const { data: run } = await supabase
        .from('connector_runs')
        .select('id, records_ingested')
        .eq('id', runId)
        .eq('config_id', configId)
        .maybeSingle();
      if (run) {
        await supabase
          .from('connector_runs')
          .update({ records_ingested: (run.records_ingested ?? 0) + parsed.length })
          .eq('id', run.id);
      }
    }

    return c.json({
      success: true,
      sessionsProcessed: parsed.length,
      manufacturer: parsed[0]?.manufacturer,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ingestion échouée';
    console.error('[CONNECTOR INGEST] Error:', message);
    return c.json({ error: message }, 400);
  }
});

// ------------------------------------------------------------------
// POST /connectors/ingest-observance — réception de lignes d'observance
// DÉJÀ NORMALISÉES par le worker (provider sd_card / EDF).
//
// Pourquoi un endpoint distinct de /connectors/ingest :
//   Le format EDF/EDF+ est BINAIRE (int16 little-endian). Le faire transiter
//   dans `fileContent` (string JSON) le corromprait, et parseUniversalData ne
//   sait pas lire du binaire. Le parsing lourd se fait donc côté worker, qui a
//   accès au Buffer brut de la carte SD ; le serveur reçoit ici du JSON propre.
//   C'est le choix le plus sûr : universal-adapter.ts reste inchangé.
//
// Auth machine-à-machine identique à /connectors/ingest (service key OU
// x-connector-secret). tenant_id résolu depuis la config en DB, jamais du
// payload. Écriture directe observance_data AVEC tenant_id (pas de scope-after
// comme l'ancien endpoint) → upsert idempotent sur (patient_id, date).
// ------------------------------------------------------------------

interface ObservanceLine {
  patient_id?: string;
  date?: string;
  usage_hours?: number;
  ahi?: number;
  leak_95?: number;
  pressure_95?: number;
  pressure_median?: number;
  leak_median?: number;
  leak_max?: number;
  mask_events?: number;
  compliance_score?: number;
  total_sleep_time?: number;
  device_serial?: string;
  manufacturer?: string;
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

app.post('/connectors/ingest-observance', async (c) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const connectorSecret = Deno.env.get('CONNECTOR_INGEST_SECRET');
  const bearer = c.req.header('Authorization')?.split(' ')[1];
  const secretHeader = c.req.header('x-connector-secret');

  const authorized =
    (!!serviceKey && bearer === serviceKey) ||
    (!!connectorSecret && secretHeader === connectorSecret);

  if (!authorized) {
    return c.json({ error: 'Unauthorized - service key ou x-connector-secret requis' }, 401);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Corps JSON invalide' }, 400);

  const { configId, runId, patientId, filename } = body;
  const rows = body.rows as ObservanceLine[] | undefined;
  if (!configId || !patientId || !Array.isArray(rows)) {
    return c.json({ error: 'configId, patientId et rows[] requis' }, 400);
  }
  if (rows.length === 0) {
    return c.json({ success: true, sessionsProcessed: 0 });
  }

  // tenant_id vient de la config en DB — jamais du payload.
  const { data: config, error: cfgError } = await supabase
    .from('connector_configs')
    .select('id, tenant_id, provider')
    .eq('id', configId)
    .maybeSingle();

  if (cfgError) return c.json({ error: cfgError.message }, 500);
  if (!config) return c.json({ error: 'Connecteur inconnu' }, 404);

  try {
    // Normalisation + clamps défensifs (le worker a déjà arrondi, on re-borne
    // côté serveur : ne jamais faire confiance à un payload machine).
    const cleanRows = rows
      .filter((r) => typeof r.date === 'string' && ISO_DATE_RE.test(r.date))
      .map((r) => {
        const usage = clamp(num(r.usage_hours), 0, 24);
        return {
          tenant_id: config.tenant_id,
          patient_id: patientId, // patient résolu = source de vérité
          date: (r.date as string).slice(0, 10),
          usage_hours: usage,
          ahi: Math.max(0, num(r.ahi)),
          leak_95: Math.max(0, num(r.leak_95)),
          pressure_95: clamp(num(r.pressure_95), 0, 30),
          pressure_median: clamp(num(r.pressure_median), 0, 30),
          leak_median: Math.max(0, num(r.leak_median)),
          mask_events: Math.max(0, Math.round(num(r.mask_events))),
          compliance_score: clamp(num(r.compliance_score, usage >= 4 ? 100 : (usage / 4) * 100), 0, 100),
          total_sleep_time: Math.max(0, num(r.total_sleep_time, usage)),
          device_serial: String(r.device_serial ?? 'EDF-SDCARD').slice(0, 128),
          manufacturer: String(r.manufacturer ?? 'other').slice(0, 32),
        };
      });

    if (cleanRows.length === 0) {
      return c.json({ error: 'Aucune ligne valide (date YYYY-MM-DD requise)' }, 400);
    }

    const { error: upsertError } = await supabase
      .from('observance_data')
      .upsert(cleanRows, { onConflict: 'patient_id,date' });

    if (upsertError) return c.json({ error: upsertError.message }, 400);

    console.log(
      `[CONNECTOR INGEST-OBS] ${filename ?? 'EDF'} → ${cleanRows.length} ligne(s) observance (config ${configId})`,
    );

    // Compteur du run (best effort — le worker clôture le run lui-même).
    if (runId) {
      const { data: run } = await supabase
        .from('connector_runs')
        .select('id, records_ingested')
        .eq('id', runId)
        .eq('config_id', configId)
        .maybeSingle();
      if (run) {
        await supabase
          .from('connector_runs')
          .update({ records_ingested: (run.records_ingested ?? 0) + cleanRows.length })
          .eq('id', run.id);
      }
    }

    return c.json({ success: true, sessionsProcessed: cleanRows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ingestion observance échouée';
    console.error('[CONNECTOR INGEST-OBS] Error:', message);
    return c.json({ error: message }, 400);
  }
});

export default app;
