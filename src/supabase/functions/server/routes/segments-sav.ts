/**
 * Routes SEGMENTATION PATIENTS + GESTION SAV / SLA (back-office PSAD).
 * À monter dans index.tsx : `app.route(prefix, segmentsSavRoutes);`
 * (les chemins publics deviennent ${prefix}/pro/segments/* et ${prefix}/pro/sav/*).
 *
 * SEGMENTS (cohortes dynamiques, rules évaluées en live)
 *  - GET    /pro/segments                 : liste + compteur patients matchant
 *  - GET    /pro/segments/:id/patients    : patients du segment (+ nom, band, phase)
 *  - POST   /pro/segments                 : créer un segment
 *  - PATCH  /pro/segments/:id             : modifier (nom/desc/couleur/rules)
 *  - DELETE /pro/segments/:id             : supprimer
 *
 * SAV (gestion pro par-dessus les déclarations patient_tickets)
 *  - GET    /pro/sav/tickets              : file triée par SLA (?status=&priority=&assigned=)
 *  - POST   /pro/sav/tickets              : créer + calcul sla_due_at selon priorité
 *  - PATCH  /pro/sav/tickets/:id          : statut / assignation / priorité (journalisé)
 *  - POST   /pro/sav/tickets/:id/events   : ajouter une note
 *  - GET    /pro/sav/stats                : ouverts, en retard SLA, résolus 7j, délai moyen
 *  - GET    /pro/sav/assignees            : staff assignables (admin/prestataire)
 *  - POST   /pro/sav/from-patient-ticket/:patientTicketId
 *                                         : convertir une déclaration patient en ticket SAV
 *
 * Pattern : Hono sub-app, middleware scopé par chemin /pro/*
 * (requireAuth + requireRole('admin','prestataire') + requireTenant),
 * toutes les requêtes scopées .eq('tenant_id', c.get('tenantId')).
 * Schéma : migration 113 (patient_segments, sav_tickets, sav_ticket_events).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Middleware scopé PAR CHEMIN (jamais use('*') global) : tout /pro/* est staff-only.
app.use('/pro/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// ------------------------------------------------------------------
// SLA : délai cible par priorité (heures)
// ------------------------------------------------------------------
const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 24, // 1 jour
  medium: 72, // 3 jours
  low: 168, // 7 jours
};

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_CATEGORIES = ['panne', 'masque', 'consommable', 'administratif', 'autre'];
const VALID_STATUS = ['new', 'assigned', 'in_progress', 'waiting', 'resolved', 'closed'];
const OPEN_STATUS = ['new', 'assigned', 'in_progress', 'waiting'];

function slaDueFrom(base: Date, priority: string): string {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.medium;
  return new Date(base.getTime() + hours * 3600 * 1000).toISOString();
}

// ------------------------------------------------------------------
// Identités patients (patients.id → users(name,email)) — pattern partagé
// ------------------------------------------------------------------
async function fetchPatientIdentities(patientIds: string[]) {
  const identity = new Map<string, { name: string | null; email: string | null }>();
  const ids = [...new Set(patientIds.filter(Boolean))];
  if (ids.length === 0) return identity;

  const { data: patients } = await supabase
    .from('patients')
    .select('id, user_id')
    .in('id', ids);

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

// ==================================================================
// SEGMENTS — évaluation dynamique des rules
// ==================================================================

type PatientState = {
  patient_id: string;
  phase: string | null;
  therapy_start_date: string | null;
  therapy_days: number | null; // ancienneté en jours
  compliance_band: string | null; // dernière fenêtre 28j
};

/**
 * Construit l'état courant de chaque patient du tenant :
 * phase + ancienneté thérapie (patient_therapy_status) + dernière bande
 * d'observance (observance_periods, fenêtre la plus récente).
 */
async function buildPatientStates(tenantId: string): Promise<Map<string, PatientState>> {
  const states = new Map<string, PatientState>();

  const { data: statuses, error: stError } = await supabase
    .from('patient_therapy_status')
    .select('patient_id, phase, therapy_start_date')
    .eq('tenant_id', tenantId);
  if (stError) throw new Error(stError.message);

  const now = Date.now();
  for (const s of statuses ?? []) {
    const days = s.therapy_start_date
      ? Math.floor((now - new Date(s.therapy_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    states.set(s.patient_id, {
      patient_id: s.patient_id,
      phase: s.phase ?? null,
      therapy_start_date: s.therapy_start_date ?? null,
      therapy_days: days,
      compliance_band: null,
    });
  }

  // Dernière fenêtre d'observance par patient (window_end DESC, 1re occurrence)
  const { data: periods, error: opError } = await supabase
    .from('observance_periods')
    .select('patient_id, compliance_band, window_end')
    .eq('tenant_id', tenantId)
    .order('window_end', { ascending: false })
    .limit(5000);
  if (opError) throw new Error(opError.message);

  const seen = new Set<string>();
  for (const p of periods ?? []) {
    if (seen.has(p.patient_id)) continue;
    seen.add(p.patient_id);
    const existing = states.get(p.patient_id);
    if (existing) {
      existing.compliance_band = p.compliance_band;
    } else {
      // patient avec observance mais sans therapy_status : on le garde quand même
      states.set(p.patient_id, {
        patient_id: p.patient_id,
        phase: null,
        therapy_start_date: null,
        therapy_days: null,
        compliance_band: p.compliance_band,
      });
    }
  }

  return states;
}

/** Un patient matche-t-il les rules d'un segment ? */
function matchesRules(state: PatientState, rules: any): boolean {
  if (!rules || typeof rules !== 'object') return false;

  if (Array.isArray(rules.compliance_band) && rules.compliance_band.length > 0) {
    if (!state.compliance_band || !rules.compliance_band.includes(state.compliance_band)) {
      return false;
    }
  }
  if (Array.isArray(rules.phase) && rules.phase.length > 0) {
    if (!state.phase || !rules.phase.includes(state.phase)) return false;
  }
  if (typeof rules.therapy_max_days === 'number') {
    if (state.therapy_days === null || state.therapy_days > rules.therapy_max_days) return false;
  }
  if (typeof rules.therapy_min_days === 'number') {
    if (state.therapy_days === null || state.therapy_days < rules.therapy_min_days) return false;
  }

  // Un segment sans aucun critère ne matche personne (évite "tout le monde")
  const hasCriterion =
    (Array.isArray(rules.compliance_band) && rules.compliance_band.length > 0) ||
    (Array.isArray(rules.phase) && rules.phase.length > 0) ||
    typeof rules.therapy_max_days === 'number' ||
    typeof rules.therapy_min_days === 'number';
  return hasCriterion;
}

function sanitizeRules(input: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== 'object') return out;
  const BANDS = ['full', 'partial', 'low', 'none'];
  const PHASES = ['initial', 'maintenance', 'stopped'];
  if (Array.isArray(input.compliance_band)) {
    const v = input.compliance_band.filter((b: unknown) => BANDS.includes(b as string));
    if (v.length) out.compliance_band = v;
  }
  if (Array.isArray(input.phase)) {
    const v = input.phase.filter((p: unknown) => PHASES.includes(p as string));
    if (v.length) out.phase = v;
  }
  if (input.therapy_max_days !== undefined && input.therapy_max_days !== null && input.therapy_max_days !== '') {
    const n = Number(input.therapy_max_days);
    if (Number.isFinite(n) && n >= 0) out.therapy_max_days = Math.floor(n);
  }
  if (input.therapy_min_days !== undefined && input.therapy_min_days !== null && input.therapy_min_days !== '') {
    const n = Number(input.therapy_min_days);
    if (Number.isFinite(n) && n >= 0) out.therapy_min_days = Math.floor(n);
  }
  return out;
}

// GET /pro/segments — liste + compteur patients matchant (évaluation live)
app.get('/pro/segments', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: segments, error } = await supabase
    .from('patient_segments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  if (error) return c.json({ error: error.message }, 500);

  try {
    const states = [...(await buildPatientStates(tenantId)).values()];
    const enriched = (segments ?? []).map((seg) => ({
      ...seg,
      patient_count: states.filter((s) => matchesRules(s, seg.rules)).length,
    }));
    return c.json({ segments: enriched, total_patients: states.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'segments failed' }, 500);
  }
});

// GET /pro/segments/:id/patients — patients du segment, enrichis
app.get('/pro/segments/:id/patients', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: segment, error } = await supabase
    .from('patient_segments')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!segment) return c.json({ error: 'Segment introuvable' }, 404);

  try {
    const states = [...(await buildPatientStates(tenantId)).values()].filter((s) =>
      matchesRules(s, segment.rules),
    );
    const identities = await fetchPatientIdentities(states.map((s) => s.patient_id));

    const patients = states
      .map((s) => ({
        patient_id: s.patient_id,
        patient_name: identities.get(s.patient_id)?.name ?? null,
        patient_email: identities.get(s.patient_id)?.email ?? null,
        phase: s.phase,
        compliance_band: s.compliance_band,
        therapy_days: s.therapy_days,
      }))
      .sort((a, b) => String(a.patient_name ?? '').localeCompare(String(b.patient_name ?? ''), 'fr'));

    return c.json({ segment, patients, count: patients.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'segment patients failed' }, 500);
  }
});

// POST /pro/segments — créer un segment
app.post('/pro/segments', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const name = String(body.name ?? '').trim();
  if (!name) return c.json({ error: 'name est requis' }, 400);

  const rules = sanitizeRules(body.rules);
  if (Object.keys(rules).length === 0) {
    return c.json({ error: 'Au moins un critère est requis (bande, phase ou ancienneté)' }, 400);
  }

  const { data, error } = await supabase
    .from('patient_segments')
    .insert({
      tenant_id: tenantId,
      name,
      description: body.description ?? null,
      color: typeof body.color === 'string' && body.color ? body.color : '#007AFF',
      rules,
      is_dynamic: true,
    })
    .select('*')
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, segment: data });
});

// PATCH /pro/segments/:id — modifier
app.patch('/pro/segments/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return c.json({ error: 'name ne peut pas être vide' }, 400);
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description || null;
  if (body.color !== undefined && body.color) patch.color = body.color;
  if (body.rules !== undefined) {
    const rules = sanitizeRules(body.rules);
    if (Object.keys(rules).length === 0) {
      return c.json({ error: 'Au moins un critère est requis' }, 400);
    }
    patch.rules = rules;
  }
  if (Object.keys(patch).length === 0) return c.json({ error: 'Aucune modification fournie' }, 400);

  const { data, error } = await supabase
    .from('patient_segments')
    .update(patch)
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: 'Segment introuvable' }, 404);
  return c.json({ success: true, segment: data });
});

// DELETE /pro/segments/:id — supprimer
app.delete('/pro/segments/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { error } = await supabase
    .from('patient_segments')
    .delete()
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// ==================================================================
// SAV — file, tickets, événements, stats
// ==================================================================

function authorLabel(user: any): string {
  return user?.email ?? user?.user_metadata?.name ?? user?.id ?? 'inconnu';
}

async function logEvent(
  tenantId: string,
  ticketId: string,
  eventType: string,
  detail: string,
  author: string,
) {
  const { error } = await supabase.from('sav_ticket_events').insert({
    ticket_id: ticketId,
    tenant_id: tenantId,
    event_type: eventType,
    detail,
    author,
  });
  if (error) console.error('[SEGMENTS-SAV] event non journalisé:', error.message);
}

// GET /pro/sav/assignees — staff assignables (admin/prestataire)
app.get('/pro/sav/assignees', async (c) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('tenant_id', c.get('tenantId'))
    .in('role', ['admin', 'prestataire'])
    .order('name', { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ assignees: data ?? [] });
});

// GET /pro/sav/tickets?status=&priority=&assigned= — file triée par SLA
app.get('/pro/sav/tickets', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assigned = c.req.query('assigned');
  const limit = Number(c.req.query('limit') ?? 300);

  let query = supabase
    .from('sav_tickets')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(Number.isFinite(limit) ? limit : 300);

  if (status && status !== 'all') {
    if (status === 'open') query = query.in('status', OPEN_STATUS);
    else query = query.eq('status', status);
  }
  if (priority && priority !== 'all') query = query.eq('priority', priority);
  if (assigned && assigned !== 'all') {
    if (assigned === 'unassigned') query = query.is('assigned_to', null);
    else query = query.eq('assigned_to', assigned);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const identities = await fetchPatientIdentities(
    (data ?? []).map((t) => t.patient_id).filter(Boolean) as string[],
  );

  // Noms des agents assignés
  const assigneeIds = [...new Set((data ?? []).map((t) => t.assigned_to).filter(Boolean))] as string[];
  const assigneeById = new Map<string, string | null>();
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', assigneeIds);
    for (const u of users ?? []) assigneeById.set(u.id, u.name ?? u.email ?? null);
  }

  const now = Date.now();
  const tickets = (data ?? [])
    .map((t) => {
      const open = OPEN_STATUS.includes(t.status);
      const overdue = open && !!t.sla_due_at && new Date(t.sla_due_at).getTime() < now;
      return {
        ...t,
        patient_name: t.patient_id ? identities.get(t.patient_id)?.name ?? null : null,
        assigned_to_name: t.assigned_to ? assigneeById.get(t.assigned_to) ?? null : null,
        is_overdue: overdue,
      };
    })
    // File : retard d'abord, puis échéance SLA la plus proche, ouverts avant clos
    .sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      const ao = OPEN_STATUS.includes(a.status);
      const bo = OPEN_STATUS.includes(b.status);
      if (ao !== bo) return ao ? -1 : 1;
      const at = a.sla_due_at ? new Date(a.sla_due_at).getTime() : Infinity;
      const bt = b.sla_due_at ? new Date(b.sla_due_at).getTime() : Infinity;
      return at - bt;
    });

  return c.json({ tickets });
});

// POST /pro/sav/tickets — création + calcul sla_due_at
app.post('/pro/sav/tickets', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const subject = String(body.subject ?? '').trim();
  if (!subject) return c.json({ error: 'subject est requis' }, 400);

  const priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : 'medium';
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'autre';
  const now = new Date();

  const insert: Record<string, unknown> = {
    tenant_id: tenantId,
    subject,
    description: body.description ?? null,
    category,
    priority,
    sla_due_at: slaDueFrom(now, priority),
    status: body.assigned_to ? 'assigned' : 'new',
    assigned_to: body.assigned_to ?? null,
    patient_id: body.patient_id ?? null,
    patient_ticket_id: body.patient_ticket_id ?? null,
    created_by: user.id,
  };

  const { data, error } = await supabase.from('sav_tickets').insert(insert).select('*').single();
  if (error) return c.json({ error: error.message }, 500);

  await logEvent(tenantId, data.id, 'created', `Ticket créé (priorité ${priority}, catégorie ${category})`, authorLabel(user));
  if (body.assigned_to) {
    await logEvent(tenantId, data.id, 'assigned', 'Ticket assigné à la création', authorLabel(user));
  }

  return c.json({ success: true, ticket: data });
});

// PATCH /pro/sav/tickets/:id — statut / assignation / priorité (journalisé)
app.patch('/pro/sav/tickets/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { data: ticket, error: readError } = await supabase
    .from('sav_tickets')
    .select('*')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404);

  const patch: Record<string, unknown> = {};
  const events: Array<{ type: string; detail: string }> = [];

  if (body.priority !== undefined && body.priority !== ticket.priority) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      return c.json({ error: `priority invalide : ${body.priority}` }, 400);
    }
    patch.priority = body.priority;
    // L'échéance SLA suit la nouvelle priorité (recalcul depuis la création)
    patch.sla_due_at = slaDueFrom(new Date(ticket.created_at), body.priority);
    events.push({ type: 'priority_change', detail: `Priorité ${ticket.priority} → ${body.priority}` });
  }

  if (body.assigned_to !== undefined && body.assigned_to !== ticket.assigned_to) {
    patch.assigned_to = body.assigned_to || null;
    events.push({
      type: 'assigned',
      detail: body.assigned_to ? 'Ticket réassigné' : 'Assignation retirée',
    });
    // Première assignation d'un ticket "new" → passe en "assigned"
    if (body.assigned_to && ticket.status === 'new' && body.status === undefined) {
      patch.status = 'assigned';
      events.push({ type: 'status_change', detail: 'Statut new → assigned' });
    }
  }

  if (body.status !== undefined && body.status !== ticket.status) {
    if (!VALID_STATUS.includes(body.status)) {
      return c.json({ error: `status invalide : ${body.status}` }, 400);
    }
    patch.status = body.status;
    events.push({ type: 'status_change', detail: `Statut ${ticket.status} → ${body.status}` });

    if (['resolved', 'closed'].includes(body.status) && !ticket.resolved_at) {
      patch.resolved_at = new Date().toISOString();
    }
    if (OPEN_STATUS.includes(body.status) && ticket.resolved_at) {
      patch.resolved_at = null;
      events.push({ type: 'reopened', detail: 'Ticket rouvert' });
    }
  }

  if (body.resolution_note !== undefined) patch.resolution_note = body.resolution_note || null;
  if (body.category !== undefined && body.category !== ticket.category) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return c.json({ error: `category invalide : ${body.category}` }, 400);
    }
    patch.category = body.category;
    events.push({ type: 'note', detail: `Catégorie ${ticket.category} → ${body.category}` });
  }

  if (Object.keys(patch).length === 0) return c.json({ error: 'Aucune modification fournie' }, 400);

  const { data: updated, error: updError } = await supabase
    .from('sav_tickets')
    .update(patch)
    .eq('id', ticket.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  const author = authorLabel(user);
  for (const ev of events) await logEvent(tenantId, ticket.id, ev.type, ev.detail, author);

  return c.json({ success: true, ticket: updated });
});

// GET /pro/sav/tickets/:id/events — timeline du ticket
app.get('/pro/sav/tickets/:id/events', async (c) => {
  const tenantId = c.get('tenantId');

  const { data: ticket } = await supabase
    .from('sav_tickets')
    .select('id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404);

  const { data, error } = await supabase
    .from('sav_ticket_events')
    .select('*')
    .eq('ticket_id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ events: data ?? [] });
});

// POST /pro/sav/tickets/:id/events — ajouter une note
app.post('/pro/sav/tickets/:id/events', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const detail = String(body.detail ?? body.note ?? '').trim();
  if (!detail) return c.json({ error: 'note est requise' }, 400);

  const { data: ticket } = await supabase
    .from('sav_tickets')
    .select('id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!ticket) return c.json({ error: 'Ticket introuvable' }, 404);

  const { data, error } = await supabase
    .from('sav_ticket_events')
    .insert({
      ticket_id: ticket.id,
      tenant_id: tenantId,
      event_type: 'note',
      detail,
      author: authorLabel(user),
    })
    .select('*')
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, event: data });
});

// GET /pro/sav/stats — ouverts, en retard SLA, résolus 7j, délai moyen
app.get('/pro/sav/stats', async (c) => {
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('sav_tickets')
    .select('status, priority, sla_due_at, created_at, resolved_at')
    .eq('tenant_id', tenantId)
    .limit(5000);
  if (error) return c.json({ error: error.message }, 500);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  let open = 0;
  let overdue = 0;
  let resolved7d = 0;
  const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  let resolutionMsSum = 0;
  let resolutionCount = 0;

  for (const t of data ?? []) {
    const isOpen = OPEN_STATUS.includes(t.status);
    if (isOpen) {
      open++;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      if (t.sla_due_at && new Date(t.sla_due_at).getTime() < now) overdue++;
    }
    if (t.resolved_at) {
      const resolvedTs = new Date(t.resolved_at).getTime();
      if (resolvedTs >= sevenDaysAgo) resolved7d++;
      const createdTs = new Date(t.created_at).getTime();
      if (Number.isFinite(resolvedTs) && Number.isFinite(createdTs) && resolvedTs >= createdTs) {
        resolutionMsSum += resolvedTs - createdTs;
        resolutionCount++;
      }
    }
  }

  const avgResolutionHours =
    resolutionCount > 0 ? Math.round((resolutionMsSum / resolutionCount / 3600000) * 10) / 10 : null;

  return c.json({
    open,
    overdue,
    resolved_7d: resolved7d,
    avg_resolution_hours: avgResolutionHours,
    open_by_priority: byPriority,
    total: data?.length ?? 0,
  });
});

// POST /pro/sav/from-patient-ticket/:patientTicketId — conversion déclaration → SAV
app.post('/pro/sav/from-patient-ticket/:patientTicketId', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const patientTicketId = c.req.param('patientTicketId');

  // 1. Charger la déclaration patient (scopée tenant)
  const { data: pt, error: ptError } = await supabase
    .from('patient_tickets')
    .select('*')
    .eq('id', patientTicketId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (ptError) return c.json({ error: ptError.message }, 500);
  if (!pt) return c.json({ error: 'Déclaration patient introuvable' }, 404);

  // 2. Éviter les doublons : une déclaration ne se convertit qu'une fois
  const { data: existing } = await supabase
    .from('sav_tickets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('patient_ticket_id', patientTicketId)
    .maybeSingle();
  if (existing) {
    return c.json({ error: 'Cette déclaration a déjà été convertie en ticket SAV' }, 409);
  }

  // 3. Mapper type déclaration → catégorie SAV + priorité par défaut
  const CATEGORY_MAP: Record<string, string> = {
    panne: 'panne',
    masque: 'masque',
    question: 'administratif',
  };
  const category = CATEGORY_MAP[pt.type] ?? 'autre';
  const priority = VALID_PRIORITIES.includes(body.priority)
    ? body.priority
    : pt.type === 'panne'
      ? 'high' // une panne machine est traitée en priorité
      : 'medium';

  const now = new Date();
  const subject =
    String(body.subject ?? '').trim() ||
    `Déclaration patient — ${pt.type}`;

  const { data: ticket, error: insError } = await supabase
    .from('sav_tickets')
    .insert({
      tenant_id: tenantId,
      patient_ticket_id: pt.id,
      patient_id: pt.patient_id,
      subject,
      description: pt.message,
      category,
      priority,
      sla_due_at: slaDueFrom(now, priority),
      status: body.assigned_to ? 'assigned' : 'new',
      assigned_to: body.assigned_to ?? null,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (insError) return c.json({ error: insError.message }, 500);

  await logEvent(
    tenantId,
    ticket.id,
    'created',
    `Créé depuis la déclaration patient (${pt.type}, priorité ${priority})`,
    authorLabel(user),
  );

  // 4. Passer la déclaration patient en in_progress (prise en charge actée)
  if (pt.status === 'open') {
    const { error: updError } = await supabase
      .from('patient_tickets')
      .update({ status: 'in_progress' })
      .eq('id', pt.id)
      .eq('tenant_id', tenantId);
    if (updError) console.error('[SEGMENTS-SAV] maj déclaration patient échouée:', updError.message);
  }

  return c.json({ success: true, ticket });
});

// GET /pro/sav/patient-tickets — déclarations patient à traiter (status open)
app.get('/pro/sav/patient-tickets', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status') ?? 'open';

  let query = supabase
    .from('patient_tickets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const identities = await fetchPatientIdentities(
    (data ?? []).map((t) => t.patient_id).filter(Boolean) as string[],
  );

  // Déclarations déjà converties (pour masquer le bouton côté front)
  const ids = (data ?? []).map((t) => t.id);
  const convertedSet = new Set<string>();
  if (ids.length > 0) {
    const { data: links } = await supabase
      .from('sav_tickets')
      .select('patient_ticket_id')
      .eq('tenant_id', tenantId)
      .in('patient_ticket_id', ids);
    for (const l of links ?? []) if (l.patient_ticket_id) convertedSet.add(l.patient_ticket_id);
  }

  const tickets = (data ?? []).map((t) => ({
    ...t,
    patient_name: t.patient_id ? identities.get(t.patient_id)?.name ?? null : null,
    already_converted: convertedSet.has(t.id),
  }));

  return c.json({ tickets });
});

export default app;
