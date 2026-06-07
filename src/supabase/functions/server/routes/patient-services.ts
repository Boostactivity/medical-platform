/**
 * Routes SERVICES PATIENT — marketplace consommables, demandes de RDV,
 * documents (attestation de voyage générée).
 * À monter dans index.tsx : `app.route(prefix, patientServicesRoutes);`
 * (paths /patient/marketplace/*, /patient/rdv*, /patient/documents*,
 *  /pro-services/*).
 *
 * Règles dures :
 *   - Middlewares scopés PAR CHEMIN (jamais use('*')) : monté au préfixe
 *     racine, un '*' avalerait les routes des sub-apps montées après.
 *   - Le patient n'accède QU'À ses propres données :
 *     user.id (auth) → patients.user_id → patients.id, filtré tenant.
 *   - TRANSPARENCE SÉCU : les consommables PPC relèvent du forfait LPP.
 *     Les prix sont INDICATIFS (covered_by_insurance), rien n'est
 *     facturé au patient via ces routes. Aucune pression commerciale.
 *
 * Côté patient (requireRole('patient')) :
 * - GET   /patient/marketplace/catalogue       : consommables du tenant + prise en charge
 * - GET   /patient/marketplace/renouvellements : calendrier de remplacement du patient
 * - POST  /patient/marketplace/commandes       : passer une commande
 * - GET   /patient/marketplace/commandes       : commandes du patient + statuts
 * - POST  /patient/rdv                         : demande de RDV (type + disponibilités)
 * - GET   /patient/rdv                         : demandes du patient
 * - PATCH /patient/rdv/:id                     : annuler / accepter le créneau proposé
 * - GET   /patient/documents                   : documents du patient
 * - POST  /patient/documents/attestation-voyage: génère l'attestation (payload JSON)
 *
 * Côté pro (requireRole('admin','prestataire')) :
 * - GET   /pro-services/commandes?status=      : file des commandes du tenant
 * - PATCH /pro-services/commandes/:id          : transition de statut
 * - GET   /pro-services/rdv?status=            : file des demandes de RDV
 * - PATCH /pro-services/rdv/:id                : proposer / refuser / confirmer
 *                                                (+ create_intervention=true →
 *                                                interventions + technician_schedules)
 *
 * Schéma : migration 108 (patient_orders, patient_order_items,
 * appointment_requests, patient_documents), 002 (consumables,
 * device_assignments), URGENT_FIX (equipment_inventory), 103
 * (technician_schedules), prestataire-tables (interventions).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

// Scopé par chemin (pas '*') : monté au préfixe racine, un '*' avalerait
// les routes des sub-apps montées après (bug connu d'interception).
app.use('/patient/marketplace/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/patient/rdv', requireAuth, requireRole('patient'), requireTenant);
app.use('/patient/rdv/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/patient/documents', requireAuth, requireRole('patient'), requireTenant);
app.use('/patient/documents/*', requireAuth, requireRole('patient'), requireTenant);
app.use('/pro-services/*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

// ------------------------------------------------------------------
// Constantes métier
// ------------------------------------------------------------------

const RDV_TYPES = ['install', 'controle', 'depannage', 'renouvellement', 'autre'] as const;

// Mapping demande patient → type d'intervention (CHECK de prestataire-tables)
const INTERVENTION_TYPE_BY_RDV: Record<string, string> = {
  install: 'installation',
  controle: 'maintenance',
  depannage: 'repair',
  renouvellement: 'mask_delivery',
  autre: 'maintenance',
};

// Transitions de statut autorisées pour une commande
const ORDER_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const PATIENT_SLOTS = ['matin', 'apres_midi', 'indifferent'];
const PRO_SLOTS = ['morning', 'afternoon'];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

interface PatientRow {
  id: string;
  user_id: string;
}

/**
 * Résout la ligne patients de l'utilisateur connecté (scopée tenant,
 * fallback legacy sans tenant — même pattern que patient-portal.ts).
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

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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

// ==================================================================
// PATIENT — MARKETPLACE
// ==================================================================

// GET /patient/marketplace/catalogue — consommables du tenant.
// Les consommables PPC (masques, filtres, tubulures…) relèvent du
// forfait LPP : covered_by_insurance = true, prix INDICATIF seulement.
app.get('/patient/marketplace/catalogue', async (c) => {
  const { data, error } = await supabase
    .from('consumables')
    .select('id, type, name, size, manufacturer, replacement_frequency_days, unit_price_ht, stock_quantity')
    .eq('tenant_id', c.get('tenantId'))
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    items: (data ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      size: item.size,
      manufacturer: item.manufacturer,
      replacement_frequency_days: item.replacement_frequency_days,
      unit_price_indicatif: item.unit_price_ht != null ? Number(item.unit_price_ht) : null,
      covered_by_insurance: true,
      available: (item.stock_quantity ?? 0) > 0,
    })),
  });
});

// GET /patient/marketplace/renouvellements — calendrier de remplacement
// du patient (equipment_inventory : renewal_due_at calculé par trigger).
app.get('/patient/marketplace/renouvellements', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data, error } = await supabase
    .from('equipment_inventory')
    .select('id, item_type, model_ref, size, installed_at, renewal_due_at, lifespan_days, status')
    .eq('patient_id', patient.id)
    .eq('status', 'active')
    .order('renewal_due_at', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    items: (data ?? []).map((item) => ({
      id: item.id,
      item_type: item.item_type,
      model_ref: item.model_ref,
      size: item.size,
      installed_at: item.installed_at,
      renewal_due_at: item.renewal_due_at,
      lifespan_days: item.lifespan_days,
      days_until_renewal: daysUntil(item.renewal_due_at),
    })),
  });
});

// POST /patient/marketplace/commandes — passer une commande.
// Body : { items: [{ consumable_id, quantity }], note? }
app.post('/patient/marketplace/commandes', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0 || rawItems.length > 20) {
    return c.json({ error: 'Votre commande doit contenir entre 1 et 20 articles' }, 400);
  }
  for (const item of rawItems) {
    const qty = Number(item?.quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 10) {
      return c.json({ error: 'Chaque quantité doit être un entier entre 1 et 10' }, 400);
    }
    if (!item.consumable_id || typeof item.consumable_id !== 'string') {
      return c.json({ error: 'Chaque article doit référencer un consommable du catalogue' }, 400);
    }
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : null;

  // Photo du catalogue : libellé + prix indicatif au moment de la commande
  const consumableIds = [...new Set(rawItems.map((i: any) => i.consumable_id))];
  const { data: consumables, error: consError } = await supabase
    .from('consumables')
    .select('id, name, size, unit_price_ht')
    .eq('tenant_id', tenantId)
    .in('id', consumableIds);
  if (consError) return c.json({ error: consError.message }, 500);

  const consumableById = new Map((consumables ?? []).map((cons) => [cons.id, cons]));
  for (const item of rawItems) {
    if (!consumableById.has(item.consumable_id)) {
      return c.json({ error: 'Un article de votre commande n\'est plus au catalogue' }, 400);
    }
  }

  const { data: order, error: orderError } = await supabase
    .from('patient_orders')
    .insert({
      tenant_id: tenantId,
      patient_id: patient.id,
      status: 'confirmed',
      note: note || null,
    })
    .select('*')
    .single();
  if (orderError) {
    console.error('[PATIENT SERVICES] order insert error:', orderError.message);
    return c.json({ error: 'Impossible d\'enregistrer votre commande, réessayez' }, 500);
  }

  const itemRows = rawItems.map((item: any) => {
    const cons = consumableById.get(item.consumable_id)!;
    return {
      tenant_id: tenantId,
      order_id: order.id,
      consumable_id: cons.id,
      item_label: cons.size ? `${cons.name} (${cons.size})` : cons.name,
      quantity: Number(item.quantity),
      unit_price_indicatif: cons.unit_price_ht ?? null,
      covered_by_insurance: true,
    };
  });

  const { data: items, error: itemsError } = await supabase
    .from('patient_order_items')
    .insert(itemRows)
    .select('*');
  if (itemsError) {
    console.error('[PATIENT SERVICES] order items insert error:', itemsError.message);
    // Rollback best effort : pas de commande vide visible
    await supabase.from('patient_orders').delete().eq('id', order.id);
    return c.json({ error: 'Impossible d\'enregistrer votre commande, réessayez' }, 500);
  }

  return c.json({ success: true, order: { ...order, items: items ?? [] } });
});

// GET /patient/marketplace/commandes — commandes du patient + items + statuts
app.get('/patient/marketplace/commandes', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data: orders, error } = await supabase
    .from('patient_orders')
    .select('id, status, note, created_at, updated_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return c.json({ error: error.message }, 500);

  const orderIds = (orders ?? []).map((o) => o.id);
  let itemsByOrder = new Map<string, any[]>();
  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('patient_order_items')
      .select('id, order_id, item_label, quantity, unit_price_indicatif, covered_by_insurance')
      .in('order_id', orderIds);
    if (itemsError) return c.json({ error: itemsError.message }, 500);
    itemsByOrder = new Map();
    for (const item of items ?? []) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id)!.push(item);
    }
  }

  return c.json({
    orders: (orders ?? []).map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })),
  });
});

// ==================================================================
// PATIENT — RENDEZ-VOUS
// ==================================================================

// POST /patient/rdv — demande de RDV.
// Body : { type, preferred_dates: [{ date, time_slot? }] (1 à 3), message? }
app.post('/patient/rdv', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));

  if (!RDV_TYPES.includes(body.type)) {
    return c.json({ error: `Type de rendez-vous invalide (${RDV_TYPES.join(', ')})` }, 400);
  }

  const rawDates = Array.isArray(body.preferred_dates) ? body.preferred_dates : [];
  if (rawDates.length === 0 || rawDates.length > 3) {
    return c.json({ error: 'Indiquez 1 à 3 disponibilités' }, 400);
  }

  const today = new Date().toISOString().split('T')[0];
  const preferredDates: Array<{ date: string; time_slot: string }> = [];
  for (const entry of rawDates) {
    const date = typeof entry === 'string' ? entry : entry?.date;
    const slot = typeof entry === 'object' && entry?.time_slot ? entry.time_slot : 'indifferent';
    if (!isValidDate(date)) {
      return c.json({ error: 'Chaque disponibilité doit avoir une date valide (YYYY-MM-DD)' }, 400);
    }
    if (date < today) {
      return c.json({ error: 'Les disponibilités doivent être à venir' }, 400);
    }
    if (!PATIENT_SLOTS.includes(slot)) {
      return c.json({ error: 'Créneau invalide (matin, apres_midi ou indifferent)' }, 400);
    }
    preferredDates.push({ date, time_slot: slot });
  }

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : null;

  const { data, error } = await supabase
    .from('appointment_requests')
    .insert({
      tenant_id: c.get('tenantId'),
      patient_id: patient.id,
      type: body.type,
      preferred_dates: preferredDates,
      message: message || null,
      status: 'requested',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[PATIENT SERVICES] rdv insert error:', error.message);
    return c.json({ error: 'Impossible d\'envoyer votre demande, réessayez' }, 500);
  }

  return c.json({ success: true, request: data });
});

// GET /patient/rdv — demandes du patient avec statuts
app.get('/patient/rdv', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data, error } = await supabase
    .from('appointment_requests')
    .select('id, type, preferred_dates, message, status, proposed_slot, intervention_id, created_at, updated_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ requests: data ?? [] });
});

// PATCH /patient/rdv/:id — Body : { action: 'cancel' | 'accept' }
//   cancel : requested|proposed → cancelled
//   accept : proposed → confirmed (le patient accepte le créneau proposé)
app.patch('/patient/rdv/:id', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const action = body.action;
  if (!['cancel', 'accept'].includes(action)) {
    return c.json({ error: 'action invalide (cancel ou accept)' }, 400);
  }

  const { data: request, error: readError } = await supabase
    .from('appointment_requests')
    .select('id, status, proposed_slot')
    .eq('id', c.req.param('id'))
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!request) return c.json({ error: 'Demande introuvable' }, 404);

  let nextStatus: string;
  if (action === 'cancel') {
    if (!['requested', 'proposed'].includes(request.status)) {
      return c.json({ error: 'Cette demande ne peut plus être annulée' }, 409);
    }
    nextStatus = 'cancelled';
  } else {
    if (request.status !== 'proposed' || !request.proposed_slot) {
      return c.json({ error: 'Aucun créneau proposé à confirmer' }, 409);
    }
    nextStatus = 'confirmed';
  }

  const { data: updated, error: updError } = await supabase
    .from('appointment_requests')
    .update({ status: nextStatus })
    .eq('id', request.id)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, request: updated });
});

// ==================================================================
// PATIENT — DOCUMENTS
// ==================================================================

// GET /patient/documents — documents du patient (générés + déposés)
app.get('/patient/documents', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const { data, error } = await supabase
    .from('patient_documents')
    .select('id, doc_type, title, storage_path, generated, payload, created_at')
    .eq('patient_id', patient.id)
    .eq('tenant_id', c.get('tenantId'))
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ documents: data ?? [] });
});

// POST /patient/documents/attestation-voyage — génère l'attestation.
// Body : { departure_date, return_date, destination? }
// Payload structuré (le PDF réutilisera pdf-generator plus tard).
app.post('/patient/documents/attestation-voyage', async (c) => {
  const patient = await resolvePatient(c);
  if (!patient) return c.json({ error: 'Dossier patient introuvable' }, 404);

  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { departure_date, return_date } = body;
  if (!isValidDate(departure_date) || !isValidDate(return_date)) {
    return c.json({ error: 'Dates de voyage invalides (format YYYY-MM-DD)' }, 400);
  }
  if (return_date < departure_date) {
    return c.json({ error: 'La date de retour doit être après la date de départ' }, 400);
  }
  const destination =
    typeof body.destination === 'string' ? body.destination.trim().slice(0, 200) : null;

  // Nom du patient : users.name (fallback metadata de session)
  let patientName: string | null = user.user_metadata?.name ?? null;
  const { data: userRow } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle();
  if (userRow?.name) patientName = userRow.name;

  // Appareil PPC actif du patient (002 : device_assignments.patient_id = users.id)
  let device: { manufacturer: string | null; model: string | null; serial_number: string | null } | null = null;
  const { data: assignment } = await supabase
    .from('device_assignments')
    .select('device_id')
    .eq('patient_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (assignment?.device_id) {
    const { data: deviceRow } = await supabase
      .from('devices')
      .select('manufacturer, model, serial_number')
      .eq('id', assignment.device_id)
      .maybeSingle();
    if (deviceRow) {
      device = {
        manufacturer: deviceRow.manufacturer ?? null,
        model: deviceRow.model ?? null,
        serial_number: deviceRow.serial_number ?? null,
      };
    }
  }

  // Texte réglementaire FR standard — factuel, sans données cliniques
  const payload = {
    document: 'attestation_voyage',
    issued_at: new Date().toISOString(),
    patient: {
      name: patientName,
      email: userRow?.email ?? user.email ?? null,
    },
    device,
    travel: {
      departure_date,
      return_date,
      destination,
    },
    regulatory_text: [
      'Le patient désigné ci-dessus bénéficie d\'un traitement par pression positive continue (PPC) pour un syndrome d\'apnées du sommeil, délivré par son prestataire de santé à domicile.',
      'L\'appareil de PPC est un dispositif médical indispensable à la poursuite du traitement. Il doit accompagner le patient pendant son voyage et être transporté en cabine : il ne doit pas être placé en soute.',
      'Conformément aux pratiques des compagnies aériennes concernant les dispositifs médicaux, cet appareil est accepté en cabine en complément de la franchise bagages habituelle.',
      'La présente attestation est délivrée pour faire valoir ce que de droit auprès des compagnies de transport.',
    ],
  };

  const formatFr = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const { data: doc, error } = await supabase
    .from('patient_documents')
    .insert({
      tenant_id: c.get('tenantId'),
      patient_id: patient.id,
      doc_type: 'attestation_voyage',
      title: `Attestation de voyage — du ${formatFr(departure_date)} au ${formatFr(return_date)}`,
      generated: true,
      payload,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[PATIENT SERVICES] attestation insert error:', error.message);
    return c.json({ error: 'Impossible de générer votre attestation, réessayez' }, 500);
  }

  return c.json({ success: true, document: doc });
});

// ==================================================================
// PRO — COMMANDES PATIENT
// ==================================================================

// GET /pro-services/commandes?status= — file des commandes du tenant
app.get('/pro-services/commandes', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');

  let query = supabase
    .from('patient_orders')
    .select('id, patient_id, status, note, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && status !== 'all') query = query.eq('status', status);

  const { data: orders, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const orderIds = (orders ?? []).map((o) => o.id);
  const itemsByOrder = new Map<string, any[]>();
  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('patient_order_items')
      .select('id, order_id, item_label, quantity, unit_price_indicatif, covered_by_insurance')
      .in('order_id', orderIds);
    if (itemsError) return c.json({ error: itemsError.message }, 500);
    for (const item of items ?? []) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id)!.push(item);
    }
  }

  const identities = await fetchPatientIdentities(
    [...new Set((orders ?? []).map((o) => o.patient_id))],
  );

  return c.json({
    orders: (orders ?? []).map((o) => ({
      ...o,
      patient_name: identities.get(o.patient_id)?.name ?? null,
      patient_email: identities.get(o.patient_id)?.email ?? null,
      items: itemsByOrder.get(o.id) ?? [],
    })),
  });
});

// PATCH /pro-services/commandes/:id — Body : { status }
// Transitions : confirmed → preparing → shipped → delivered,
// annulation possible jusqu'à preparing incluse.
app.patch('/pro-services/commandes/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));
  const nextStatus = body.status;

  if (!Object.keys(ORDER_TRANSITIONS).includes(nextStatus)) {
    return c.json({ error: `status invalide : ${nextStatus}` }, 400);
  }

  const { data: order, error: readError } = await supabase
    .from('patient_orders')
    .select('id, status')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!order) return c.json({ error: 'Commande introuvable' }, 404);

  if (!ORDER_TRANSITIONS[order.status]?.includes(nextStatus)) {
    return c.json(
      { error: `Transition impossible : ${order.status} → ${nextStatus}` },
      409,
    );
  }

  const { data: updated, error: updError } = await supabase
    .from('patient_orders')
    .update({ status: nextStatus })
    .eq('id', order.id)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, order: updated });
});

// ==================================================================
// PRO — DEMANDES DE RDV
// ==================================================================

// GET /pro-services/rdv?status= — file des demandes du tenant
app.get('/pro-services/rdv', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');

  let query = supabase
    .from('appointment_requests')
    .select('id, patient_id, type, preferred_dates, message, status, proposed_slot, intervention_id, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && status !== 'all') query = query.eq('status', status);

  const { data: requests, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const identities = await fetchPatientIdentities(
    [...new Set((requests ?? []).map((r) => r.patient_id))],
  );

  return c.json({
    requests: (requests ?? []).map((r) => ({
      ...r,
      patient_name: identities.get(r.patient_id)?.name ?? null,
      patient_email: identities.get(r.patient_id)?.email ?? null,
    })),
  });
});

// PATCH /pro-services/rdv/:id
// Body : { action: 'propose', proposed_slot: { date, time_slot } }
//      | { action: 'decline' }
//      | { action: 'confirm', proposed_slot?, create_intervention?: true, technician_id? }
// confirm + create_intervention=true : crée l'intervention (type mappé)
// et, si technician_id fourni, la ligne technician_schedules associée.
app.patch('/pro-services/rdv/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const action = body.action;

  if (!['propose', 'decline', 'confirm'].includes(action)) {
    return c.json({ error: 'action invalide (propose, decline ou confirm)' }, 400);
  }

  const { data: request, error: readError } = await supabase
    .from('appointment_requests')
    .select('id, patient_id, type, status, proposed_slot, intervention_id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!request) return c.json({ error: 'Demande introuvable' }, 404);

  if (!['requested', 'proposed', 'confirmed'].includes(request.status)) {
    return c.json({ error: `Demande déjà ${request.status}` }, 409);
  }

  const validateSlot = (slot: any): { date: string; time_slot: string } | null => {
    if (!slot || !isValidDate(slot.date) || !PRO_SLOTS.includes(slot.time_slot)) return null;
    return { date: slot.date, time_slot: slot.time_slot };
  };

  // ---- decline -------------------------------------------------
  if (action === 'decline') {
    if (request.status === 'confirmed') {
      return c.json({ error: 'Demande déjà confirmée' }, 409);
    }
    const { data: updated, error } = await supabase
      .from('appointment_requests')
      .update({ status: 'declined' })
      .eq('id', request.id)
      .select('*')
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, request: updated });
  }

  // ---- propose -------------------------------------------------
  if (action === 'propose') {
    if (request.status === 'confirmed') {
      return c.json({ error: 'Demande déjà confirmée' }, 409);
    }
    const slot = validateSlot(body.proposed_slot);
    if (!slot) {
      return c.json(
        { error: 'proposed_slot requis : { date: YYYY-MM-DD, time_slot: morning|afternoon }' },
        400,
      );
    }
    const { data: updated, error } = await supabase
      .from('appointment_requests')
      .update({ status: 'proposed', proposed_slot: slot })
      .eq('id', request.id)
      .select('*')
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, request: updated });
  }

  // ---- confirm (+ planification optionnelle) -------------------
  const slot = validateSlot(body.proposed_slot) ?? validateSlot(request.proposed_slot);
  if (!slot) {
    return c.json(
      { error: 'Aucun créneau : fournissez proposed_slot ou proposez un créneau d\'abord' },
      400,
    );
  }

  let interventionId: string | null = request.intervention_id;

  if (body.create_intervention === true && !interventionId) {
    const interventionDate = `${slot.date}T${slot.time_slot === 'morning' ? '09:00:00' : '14:00:00'}Z`;
    const { data: intervention, error: insError } = await supabase
      .from('interventions')
      .insert({
        tenant_id: tenantId,
        patient_id: request.patient_id,
        technician_id: body.technician_id ?? null,
        type: INTERVENTION_TYPE_BY_RDV[request.type] ?? 'maintenance',
        status: 'scheduled',
        date: interventionDate,
        notes: `Demande patient (${request.type}) via le portail — RDV ${request.id}`,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (insError) {
      console.error('[PATIENT SERVICES] intervention insert error:', insError.message);
      return c.json({ error: `Création de l'intervention impossible : ${insError.message}` }, 500);
    }
    interventionId = intervention.id;

    // Planning technicien : seulement si un technicien est désigné
    if (body.technician_id) {
      const { error: schedError } = await supabase.from('technician_schedules').insert({
        tenant_id: tenantId,
        technician_id: body.technician_id,
        intervention_id: interventionId,
        scheduled_date: slot.date,
        time_slot: slot.time_slot,
        status: 'planned',
        notes: 'Planifié depuis une demande de RDV patient',
        created_by: user.id,
      });
      if (schedError) {
        // L'intervention existe : on n'échoue pas la confirmation pour le planning
        console.error('[PATIENT SERVICES] schedule insert error:', schedError.message);
      }
    }
  }

  const { data: updated, error: updError } = await supabase
    .from('appointment_requests')
    .update({
      status: 'confirmed',
      proposed_slot: slot,
      intervention_id: interventionId,
    })
    .eq('id', request.id)
    .select('*')
    .single();
  if (updError) return c.json({ error: updError.message }, 500);

  return c.json({ success: true, request: updated, intervention_id: interventionId });
});

export default app;
