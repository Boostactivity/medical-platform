/**
 * CRM PRESCRIPTEURS + EXPORTS CPAM + COMPARAISON AGENCES (back-office PSAD).
 * À monter dans index.tsx : `app.route(prefix, crmExportsRoutes);`
 * (chemins publics : ${prefix}/pro/prescripteurs/*, ${prefix}/pro/exports/*,
 *  ${prefix}/pro/agences/comparaison).
 *
 * Pattern identique à observance-billing.ts / stock-parc.ts :
 *   Hono sub-app, requireAuth + requireRole('admin','prestataire') + requireTenant,
 *   toutes les requêtes scopées .eq('tenant_id', c.get('tenantId')).
 *
 * RÈGLE CHIFFRES : on n'agrège QUE des données réelles présentes en base.
 *   - CRM : nb patients rattachés = patients.assigned_doctor_id = doctor_id
 *           (doctor_id = auth.users.id du médecin, convention 105).
 *   - Exports CPAM : observance_periods + patient_therapy_status + lppr_codes,
 *           100% réel. Aucun tarif/heure inventé (NULL si absent).
 *   - Comparaison agences : pas de patients.agency_id dans le schéma. Le
 *           rattachement patient ↔ agence est dérivé des device_assignments
 *           actives → devices.agency_id (lien réel : la machine installée
 *           appartient à une agence). Patients non rattachables → bucket
 *           "Non rattaché", agrégats NULL/0 honnêtes.
 *
 * Conventions d'id (vérifiées dans le repo) :
 *   - observance_periods.patient_id / billing_lines.patient_id /
 *     interventions.patient_id / patient_therapy_status.patient_id = patients.id
 *   - device_assignments.patient_id = auth.users.id (cf. stock-parc.ts).
 *     On résout les deux conventions défensivement pour la carte agence.
 *   - patients.assigned_doctor_id = doctors.user_id = auth.users.id du médecin.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const pro = new Hono<TenantEnv>();
pro.use('/pro/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Échappe une valeur pour une cellule CSV (RFC 4180, séparateur ;). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Construit un CSV (séparateur ;, BOM UTF-8 pour Excel FR) depuis colonnes + lignes. */
function buildCsv(columns: Array<{ key: string; label: string }>, rows: any[]): string {
  const header = columns.map((col) => csvCell(col.label)).join(';');
  const body = rows
    .map((row) => columns.map((col) => csvCell(row[col.key])).join(';'))
    .join('\n');
  return `﻿${header}\n${body}`;
}

/**
 * Mappe patients.id → noms lisibles (via patients.user_id → users).
 * Retourne aussi le mapping id → user_id (utile pour la carte agence).
 */
async function fetchPatientDirectory(tenantId: string) {
  const { data: patients } = await supabase
    .from('patients')
    .select('id, user_id')
    .eq('tenant_id', tenantId);

  const idToUserId = new Map<string, string>();
  const userIds: string[] = [];
  for (const p of patients ?? []) {
    if (p.user_id) {
      idToUserId.set(p.id, p.user_id);
      userIds.push(p.user_id);
    }
  }

  const userInfo = new Map<string, { name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    for (const u of users ?? []) userInfo.set(u.id, { name: u.name, email: u.email });
  }

  const label = (patientId: string): string => {
    const uid = idToUserId.get(patientId);
    const info = uid ? userInfo.get(uid) : null;
    return info?.name ?? info?.email ?? patientId;
  };

  return { patients: patients ?? [], idToUserId, label };
}

// ==================================================================
// 1. CRM PRESCRIPTEURS
// ==================================================================

// GET /pro/prescripteurs — liste + nb patients rattachés + dernier contact
pro.get('/pro/prescripteurs', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: contacts, error } = await supabase
    .from('prescriber_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  const list = contacts ?? [];
  const doctorIds = [...new Set(list.map((c) => c.doctor_id).filter(Boolean))] as string[];
  const contactIds = list.map((c) => c.id);

  // Nb patients rattachés : patients.assigned_doctor_id = prescriber.doctor_id
  const patientCount = new Map<string, number>();
  if (doctorIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('assigned_doctor_id')
      .eq('tenant_id', tenantId)
      .in('assigned_doctor_id', doctorIds);
    for (const p of patients ?? []) {
      if (p.assigned_doctor_id) {
        patientCount.set(p.assigned_doctor_id, (patientCount.get(p.assigned_doctor_id) ?? 0) + 1);
      }
    }
  }

  // Dernier contact (interaction la plus récente par prescripteur)
  const lastInteraction = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: interactions } = await supabase
      .from('prescriber_interactions')
      .select('prescriber_contact_id, occurred_at')
      .eq('tenant_id', tenantId)
      .in('prescriber_contact_id', contactIds)
      .order('occurred_at', { ascending: false });
    for (const it of interactions ?? []) {
      if (!lastInteraction.has(it.prescriber_contact_id)) {
        lastInteraction.set(it.prescriber_contact_id, it.occurred_at);
      }
    }
  }

  const prescribers = list.map((contact) => ({
    ...contact,
    patients_count: contact.doctor_id ? patientCount.get(contact.doctor_id) ?? 0 : 0,
    last_interaction_at: lastInteraction.get(contact.id) ?? null,
  }));

  return c.json({ prescribers });
});

// POST /pro/prescripteurs — création d'un contact prescripteur
pro.post('/pro/prescripteurs', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  if (!body.full_name || !String(body.full_name).trim()) {
    return c.json({ error: 'full_name est requis' }, 400);
  }
  const status = body.relationship_status ?? 'prospect';
  if (!['prospect', 'actif', 'inactif'].includes(status)) {
    return c.json({ error: `relationship_status invalide : ${status}` }, 400);
  }

  const { data, error } = await supabase
    .from('prescriber_contacts')
    .insert({
      tenant_id: tenantId,
      doctor_id: body.doctor_id || null,
      full_name: String(body.full_name).trim(),
      rpps: body.rpps || null,
      specialty: body.specialty || null,
      establishment: body.establishment || null,
      email: body.email || null,
      phone: body.phone || null,
      notes: body.notes || null,
      relationship_status: status,
    })
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, prescriber: data });
});

// PATCH /pro/prescripteurs/:id — édition d'un contact
pro.patch('/pro/prescripteurs/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const { data: existing, error: readError } = await supabase
    .from('prescriber_contacts')
    .select('id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!existing) return c.json({ error: 'Prescripteur introuvable' }, 404);

  const patch: Record<string, unknown> = {};
  if (body.full_name !== undefined) {
    if (!String(body.full_name).trim()) return c.json({ error: 'full_name ne peut être vide' }, 400);
    patch.full_name = String(body.full_name).trim();
  }
  if (body.relationship_status !== undefined) {
    if (!['prospect', 'actif', 'inactif'].includes(body.relationship_status)) {
      return c.json({ error: `relationship_status invalide : ${body.relationship_status}` }, 400);
    }
    patch.relationship_status = body.relationship_status;
  }
  for (const field of ['doctor_id', 'rpps', 'specialty', 'establishment', 'email', 'phone', 'notes']) {
    if (body[field] !== undefined) patch[field] = body[field] || null;
  }

  if (Object.keys(patch).length === 0) return c.json({ error: 'Aucune modification fournie' }, 400);

  const { data, error } = await supabase
    .from('prescriber_contacts')
    .update(patch)
    .eq('id', existing.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, prescriber: data });
});

// GET /pro/prescripteurs/:id — détail + interactions + patients rattachés
pro.get('/pro/prescripteurs/:id', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: contact, error } = await supabase
    .from('prescriber_contacts')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!contact) return c.json({ error: 'Prescripteur introuvable' }, 404);

  const { data: interactions } = await supabase
    .from('prescriber_interactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('prescriber_contact_id', contact.id)
    .order('occurred_at', { ascending: false });

  // Patients rattachés (uniquement si le prescripteur a un compte médecin lié)
  let patients: Array<{ patient_id: string; name: string | null; email: string | null }> = [];
  if (contact.doctor_id) {
    const { data: patientRows } = await supabase
      .from('patients')
      .select('id, user_id')
      .eq('tenant_id', tenantId)
      .eq('assigned_doctor_id', contact.doctor_id);

    const userIds = [...new Set((patientRows ?? []).map((p) => p.user_id).filter(Boolean))] as string[];
    const userInfo = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
      for (const u of users ?? []) userInfo.set(u.id, { name: u.name, email: u.email });
    }
    patients = (patientRows ?? []).map((p) => ({
      patient_id: p.id,
      name: p.user_id ? userInfo.get(p.user_id)?.name ?? null : null,
      email: p.user_id ? userInfo.get(p.user_id)?.email ?? null : null,
    }));
  }

  return c.json({
    prescriber: { ...contact, patients_count: patients.length },
    interactions: interactions ?? [],
    patients,
  });
});

// POST /pro/prescripteurs/:id/interactions — ajout d'une interaction
pro.post('/pro/prescripteurs/:id/interactions', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { data: contact, error: readError } = await supabase
    .from('prescriber_contacts')
    .select('id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!contact) return c.json({ error: 'Prescripteur introuvable' }, 404);

  const kind = body.kind ?? 'autre';
  if (!['appel', 'visite', 'email', 'autre'].includes(kind)) {
    return c.json({ error: `kind invalide : ${kind}` }, 400);
  }
  if (!body.summary || !String(body.summary).trim()) {
    return c.json({ error: 'summary est requis' }, 400);
  }

  const occurredAt = body.occurred_at && !Number.isNaN(Date.parse(body.occurred_at))
    ? new Date(body.occurred_at).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from('prescriber_interactions')
    .insert({
      tenant_id: tenantId,
      prescriber_contact_id: contact.id,
      kind,
      summary: String(body.summary).trim(),
      occurred_at: occurredAt,
      author: user.id,
    })
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, interaction: data });
});

// ==================================================================
// 2. EXPORTS CPAM
// ==================================================================

const OBSERVANCE_EXPORT_COLUMNS = [
  { key: 'patient_label', label: 'Patient' },
  { key: 'window_start', label: 'Début fenêtre' },
  { key: 'window_end', label: 'Fin fenêtre' },
  { key: 'total_hours', label: 'Heures / 28j' },
  { key: 'nights_with_data', label: 'Nuits relevées' },
  { key: 'nights_over_4h', label: 'Nuits ≥ 4h' },
  { key: 'avg_hours_per_night', label: 'Moy. h/nuit' },
  { key: 'compliance_band', label: 'Bande' },
  { key: 'telesuivi', label: 'Télésuivi' },
  { key: 'lppr_short_code', label: 'Code LPPR' },
  { key: 'lppr_code_lpp', label: 'Code LPP' },
];

/**
 * Construit l'agrégat conformité observance 112h/28j pour une période.
 * 100% réel : une ligne par patient = la fenêtre 28j la plus récente dont
 * window_end ∈ [period_start, period_end]. Code LPPR depuis
 * patient_therapy_status (posé par le moteur), jamais inventé.
 */
async function buildObservance11228(tenantId: string, periodStart: string, periodEnd: string) {
  const { data: periods, error } = await supabase
    .from('observance_periods')
    .select('patient_id, window_start, window_end, total_hours, nights_with_data, nights_over_4h, avg_hours_per_night, compliance_band, telesuivi')
    .eq('tenant_id', tenantId)
    .gte('window_end', periodStart)
    .lte('window_end', periodEnd)
    .order('window_end', { ascending: false });
  if (error) throw new Error(error.message);

  // Fenêtre la plus récente par patient sur la période
  const latestByPatient = new Map<string, any>();
  for (const p of periods ?? []) {
    if (!latestByPatient.has(p.patient_id)) latestByPatient.set(p.patient_id, p);
  }

  const patientIds = [...latestByPatient.keys()];

  // Code LPPR courant par patient (patient_therapy_status → lppr_codes)
  const codeByPatient = new Map<string, { short: string | null; lpp: string | null }>();
  if (patientIds.length > 0) {
    const { data: statuses } = await supabase
      .from('patient_therapy_status')
      .select('patient_id, lppr_codes(short_code, code_lpp)')
      .eq('tenant_id', tenantId)
      .in('patient_id', patientIds);
    for (const s of statuses ?? []) {
      const code = (s as any).lppr_codes;
      codeByPatient.set(s.patient_id, {
        short: code?.short_code ?? null,
        lpp: code?.code_lpp ?? null,
      });
    }
  }

  const { label } = await fetchPatientDirectory(tenantId);

  const rows = patientIds.map((patientId) => {
    const p = latestByPatient.get(patientId);
    const code = codeByPatient.get(patientId) ?? { short: null, lpp: null };
    return {
      patient_id: patientId,
      patient_label: label(patientId),
      window_start: p.window_start,
      window_end: p.window_end,
      total_hours: p.total_hours,
      nights_with_data: p.nights_with_data,
      nights_over_4h: p.nights_over_4h,
      avg_hours_per_night: p.avg_hours_per_night,
      compliance_band: p.compliance_band,
      telesuivi: p.telesuivi ? 'oui' : 'non',
      lppr_short_code: code.short,
      lppr_code_lpp: code.lpp,
    };
  });

  return { columns: OBSERVANCE_EXPORT_COLUMNS, rows };
}

// POST /pro/exports/observance-112-28 — génère l'agrégat + trace la run
pro.post('/pro/exports/observance-112-28', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const periodStart = body.period_start;
  const periodEnd = body.period_end;
  if (!isValidDate(periodStart) || !isValidDate(periodEnd)) {
    return c.json({ error: 'period_start et period_end requis (format YYYY-MM-DD)' }, 400);
  }
  if (periodStart > periodEnd) {
    return c.json({ error: 'period_start doit précéder period_end' }, 400);
  }

  try {
    const { columns, rows } = await buildObservance11228(tenantId, periodStart, periodEnd);

    const { data: run, error } = await supabase
      .from('cpam_export_runs')
      .insert({
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        kind: 'observance_112_28',
        status: 'generated',
        rows_count: rows.length,
        generated_by: user.id,
        payload_summary: { columns, rows, period_start: periodStart, period_end: periodEnd },
      })
      .select('id, period_start, period_end, kind, status, rows_count, generated_at')
      .single();

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, run, columns, rows });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'export failed' }, 500);
  }
});

// GET /pro/exports/runs — historique des exports générés
pro.get('/pro/exports/runs', async (c) => {
  const tenantId = c.get('tenantId');
  const kind = c.req.query('kind');

  let query = supabase
    .from('cpam_export_runs')
    .select('id, period_start, period_end, kind, status, rows_count, generated_by, generated_at')
    .eq('tenant_id', tenantId)
    .order('generated_at', { ascending: false })
    .limit(200);
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ runs: data ?? [] });
});

// GET /pro/exports/:id/csv — régénère le CSV téléchargeable depuis le payload
pro.get('/pro/exports/:id/csv', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: run, error } = await supabase
    .from('cpam_export_runs')
    .select('id, kind, period_start, period_end, payload_summary')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!run) return c.json({ error: 'Export introuvable' }, 404);

  const payload = (run.payload_summary ?? {}) as any;
  const columns: Array<{ key: string; label: string }> = payload.columns ?? [];
  const rows: any[] = payload.rows ?? [];
  if (columns.length === 0) {
    return c.json({ error: 'Export sans colonnes : payload vide ou format inconnu' }, 422);
  }

  const csv = buildCsv(columns, rows);
  const filename = `export_${run.kind}_${run.period_start}_${run.period_end}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// ==================================================================
// 3. COMPARAISON AGENCES
// ==================================================================

const PAID_BILLING_STATUSES = ['paid', 'transmitted'];

// GET /pro/agences/comparaison — agrégats réels par agence (?period_start=&period_end=)
pro.get('/pro/agences/comparaison', async (c) => {
  const tenantId = c.get('tenantId');

  // Période interventions : par défaut 90 derniers jours, surchargeable
  const today = new Date();
  const defaultStart = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const periodStart = isValidDate(c.req.query('period_start')) ? c.req.query('period_start')! : defaultStart;
  const periodEnd = isValidDate(c.req.query('period_end')) ? c.req.query('period_end')! : today.toISOString().split('T')[0];

  try {
    // a. Agences du tenant
    const { data: agencies, error: aError } = await supabase
      .from('agencies')
      .select('id, name, city')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });
    if (aError) return c.json({ error: aError.message }, 500);

    // b. Carte patient(patients.id) → agency_id, dérivée des machines installées
    //    device_assignments actives → devices.agency_id. On résout l'id patient
    //    selon les deux conventions (patients.id OU users.id) pour être robuste.
    const { patients, idToUserId } = await fetchPatientDirectory(tenantId);
    const userIdToPatientId = new Map<string, string>();
    for (const [pid, uid] of idToUserId) userIdToPatientId.set(uid, pid);

    const { data: assignments } = await supabase
      .from('device_assignments')
      .select('patient_id, device_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const deviceIds = [...new Set((assignments ?? []).map((a) => a.device_id).filter(Boolean))] as string[];
    const deviceAgency = new Map<string, string | null>();
    if (deviceIds.length > 0) {
      const { data: devices } = await supabase
        .from('devices')
        .select('id, agency_id')
        .eq('tenant_id', tenantId)
        .in('id', deviceIds);
      for (const d of devices ?? []) deviceAgency.set(d.id, d.agency_id ?? null);
    }

    // patients.id → agency_id (null si non rattachable)
    const patientAgency = new Map<string, string | null>();
    for (const a of assignments ?? []) {
      const agencyId = a.device_id ? deviceAgency.get(a.device_id) ?? null : null;
      if (!agencyId) continue;
      // a.patient_id peut être patients.id OU users.id : on couvre les deux
      const resolved = userIdToPatientId.get(a.patient_id) ?? a.patient_id;
      if (!patientAgency.has(resolved)) patientAgency.set(resolved, agencyId);
    }

    const agencyOf = (patientId: string): string | null => patientAgency.get(patientId) ?? null;

    // c. Buckets par agence + bucket "Non rattaché"
    const NONE = '__none__';
    type Bucket = {
      agency_id: string | null;
      agency_name: string;
      city: string | null;
      patients_count: number;
      observance_sum: number;
      observance_n: number;
      interventions_count: number;
      ca_lppr: number;
      ca_lines: number;
    };
    const buckets = new Map<string, Bucket>();
    const ensure = (agencyId: string | null, name: string, city: string | null): Bucket => {
      const key = agencyId ?? NONE;
      if (!buckets.has(key)) {
        buckets.set(key, {
          agency_id: agencyId,
          agency_name: name,
          city,
          patients_count: 0,
          observance_sum: 0,
          observance_n: 0,
          interventions_count: 0,
          ca_lppr: 0,
          ca_lines: 0,
        });
      }
      return buckets.get(key)!;
    };
    for (const ag of agencies ?? []) ensure(ag.id, ag.name, ag.city);
    const agencyMeta = new Map((agencies ?? []).map((a) => [a.id, a]));

    // patients count par agence
    for (const p of patients) {
      const agencyId = agencyOf(p.id);
      if (!agencyId) {
        ensure(null, 'Non rattaché', null).patients_count++;
      } else {
        const meta = agencyMeta.get(agencyId);
        ensure(agencyId, meta?.name ?? 'Agence inconnue', meta?.city ?? null).patients_count++;
      }
    }

    // d. Observance moyenne : dernière fenêtre par patient → moyenne par agence
    const { data: periods } = await supabase
      .from('observance_periods')
      .select('patient_id, total_hours, window_end')
      .eq('tenant_id', tenantId)
      .order('window_end', { ascending: false })
      .limit(10000);
    const latestObs = new Map<string, number>();
    for (const p of periods ?? []) {
      if (!latestObs.has(p.patient_id)) latestObs.set(p.patient_id, Number(p.total_hours) || 0);
    }
    let tenantObsSum = 0;
    let tenantObsN = 0;
    for (const [patientId, hours] of latestObs) {
      tenantObsSum += hours;
      tenantObsN++;
      const agencyId = agencyOf(patientId);
      const meta = agencyId ? agencyMeta.get(agencyId) : null;
      const bucket = agencyId
        ? ensure(agencyId, meta?.name ?? 'Agence inconnue', meta?.city ?? null)
        : ensure(null, 'Non rattaché', null);
      bucket.observance_sum += hours;
      bucket.observance_n++;
    }
    const tenantObservanceAvg = tenantObsN > 0 ? tenantObsSum / tenantObsN : null;

    // e. Interventions sur la période → par agence
    const { data: interventions } = await supabase
      .from('interventions')
      .select('patient_id, date')
      .eq('tenant_id', tenantId)
      .gte('date', `${periodStart}T00:00:00`)
      .lte('date', `${periodEnd}T23:59:59`);
    for (const it of interventions ?? []) {
      if (!it.patient_id) continue;
      const agencyId = agencyOf(it.patient_id);
      const meta = agencyId ? agencyMeta.get(agencyId) : null;
      const bucket = agencyId
        ? ensure(agencyId, meta?.name ?? 'Agence inconnue', meta?.city ?? null)
        : ensure(null, 'Non rattaché', null);
      bucket.interventions_count++;
    }

    // f. CA LPPR (lignes payées / transmises) → par agence
    const { data: lines } = await supabase
      .from('billing_lines')
      .select('patient_id, amount_ttc, status')
      .eq('tenant_id', tenantId)
      .in('status', PAID_BILLING_STATUSES);
    for (const line of lines ?? []) {
      if (!line.patient_id) continue;
      const agencyId = agencyOf(line.patient_id);
      const meta = agencyId ? agencyMeta.get(agencyId) : null;
      const bucket = agencyId
        ? ensure(agencyId, meta?.name ?? 'Agence inconnue', meta?.city ?? null)
        : ensure(null, 'Non rattaché', null);
      bucket.ca_lines++;
      bucket.ca_lppr += Number(line.amount_ttc) || 0;
    }

    // g. Sortie : observance moyenne = NULL honnête si aucun patient rattachable
    const rows = [...buckets.values()].map((b) => ({
      agency_id: b.agency_id,
      agency_name: b.agency_name,
      city: b.city,
      patients_count: b.patients_count,
      observance_avg: b.observance_n > 0 ? Number((b.observance_sum / b.observance_n).toFixed(1)) : null,
      observance_patients: b.observance_n,
      interventions_count: b.interventions_count,
      ca_lppr: Number(b.ca_lppr.toFixed(2)),
      ca_lines: b.ca_lines,
    }));

    // Agences réelles d'abord (triées), "Non rattaché" en dernier
    rows.sort((a, b) => {
      if (a.agency_id === null) return 1;
      if (b.agency_id === null) return -1;
      return a.agency_name.localeCompare(b.agency_name, 'fr');
    });

    return c.json({
      agencies: rows,
      period: { start: periodStart, end: periodEnd },
      tenant_observance_avg: tenantObservanceAvg !== null ? Number(tenantObservanceAvg.toFixed(1)) : null,
      agencies_count: (agencies ?? []).length,
      // Honnêteté : true si aucun lien machine→agence n'a pu rattacher de patient
      attachment_available: patientAgency.size > 0,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'comparaison failed' }, 500);
  }
});

const app = new Hono<TenantEnv>();
app.route('/', pro);

export default app;
