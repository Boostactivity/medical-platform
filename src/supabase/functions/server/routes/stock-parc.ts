/**
 * Routes STOCK / PARC MACHINES / PLANNING TECHNICIENS (back-office PSAD).
 * À monter dans index.tsx : `app.route(prefix, stockParcRoutes);`
 * (les chemins publics deviennent ${prefix}/stock/*, ${prefix}/parc/*,
 *  ${prefix}/planning/*).
 *
 * - GET   /stock/overview        : stock par agence + items sous seuil de rupture
 * - GET   /stock/items           : lignes de stock (?agency_id=&category=)
 * - POST  /stock/items           : entrée stock (ligne existante ou nouvel article)
 * - PATCH /stock/items/:id       : sortie / ajustement / mise à jour (traçé dans stock_movements)
 * - GET   /parc/overview         : compteurs parc + machines orphelines
 * - GET   /parc/machines         : machines + patient + masque (âge vs 90 j) (?status=)
 * - GET   /planning/day          : interventions planifiées du jour (?date=&technician_id=)
 * - GET   /planning/week         : vue semaine par technicien (?start=)
 * - GET   /planning/technicians  : techniciens assignables
 * - POST  /planning/assign       : assigner une intervention à un technicien/créneau
 *
 * Schéma : migrations 002 (devices, device_assignments, consumables),
 * URGENT_FIX (equipment_inventory), 100 (tenants/agencies + tenant_id),
 * 103 (agency_id, traçabilité lot/série, stock_movements, technician_schedules).
 *
 * Pattern identique à observance-billing.ts : Hono sub-app,
 * requireAuth + requireRole('admin','prestataire') + requireTenant,
 * toutes les requêtes scopées .eq('tenant_id', c.get('tenantId')).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();
// technicien : accès lecture planning + stock depuis l'app mobile terrain.
// Scopé par chemin (PAS '*' nu) : monté au préfixe racine, un '*' nu
// intercepterait /patient/* et les autres sub-apps (bug Hono).
const stockGuard = [requireAuth, requireRole('admin', 'prestataire', 'technicien'), requireTenant] as const;
app.use('/stock/*', ...stockGuard);
app.use('/parc/*', ...stockGuard);
app.use('/planning/*', ...stockGuard);

const MASK_LIFESPAN_DAYS = 90;
const TECHNICIAN_ROLES = ['technicien', 'technician', 'prestataire'];

function daysSince(date: string | null): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

async function fetchAgenciesMap(tenantId: string): Promise<Map<string, { id: string; name: string; city: string | null }>> {
  const { data } = await supabase
    .from('agencies')
    .select('id, name, city')
    .eq('tenant_id', tenantId);
  return new Map((data ?? []).map((a) => [a.id, a]));
}

// ------------------------------------------------------------------
// STOCK
// ------------------------------------------------------------------

// GET /stock/overview — stock agrégé par agence + alertes sous seuil
app.get('/stock/overview', async (c) => {
  const tenantId = c.get('tenantId');

  const [{ data: items, error }, agencies] = await Promise.all([
    supabase
      .from('consumables')
      .select('id, type, name, size, manufacturer, reference, stock_quantity, reorder_threshold, unit_price_ht, agency_id, lot_number')
      .eq('tenant_id', tenantId),
    fetchAgenciesMap(tenantId),
  ]);

  if (error) return c.json({ error: error.message }, 500);

  type AgencyBucket = {
    agency_id: string | null;
    agency_name: string;
    items_count: number;
    total_quantity: number;
    below_threshold_count: number;
    stock_value_ht: number;
  };

  const byAgency = new Map<string, AgencyBucket>();
  const belowThreshold: any[] = [];

  for (const item of items ?? []) {
    const key = item.agency_id ?? 'none';
    if (!byAgency.has(key)) {
      byAgency.set(key, {
        agency_id: item.agency_id,
        agency_name: item.agency_id
          ? agencies.get(item.agency_id)?.name ?? 'Agence inconnue'
          : 'Non affecté',
        items_count: 0,
        total_quantity: 0,
        below_threshold_count: 0,
        stock_value_ht: 0,
      });
    }
    const bucket = byAgency.get(key)!;
    bucket.items_count++;
    bucket.total_quantity += item.stock_quantity ?? 0;
    bucket.stock_value_ht += (item.stock_quantity ?? 0) * (Number(item.unit_price_ht) || 0);

    const threshold = item.reorder_threshold ?? 0;
    if ((item.stock_quantity ?? 0) <= threshold) {
      bucket.below_threshold_count++;
      belowThreshold.push({
        ...item,
        agency_name: item.agency_id
          ? agencies.get(item.agency_id)?.name ?? 'Agence inconnue'
          : 'Non affecté',
      });
    }
  }

  return c.json({
    agencies: [...byAgency.values()].sort((a, b) => a.agency_name.localeCompare(b.agency_name)),
    below_threshold: belowThreshold.sort(
      (a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0),
    ),
    total_items: items?.length ?? 0,
  });
});

// GET /stock/items?agency_id=&category= — lignes de stock filtrées
app.get('/stock/items', async (c) => {
  const tenantId = c.get('tenantId');
  const agencyId = c.req.query('agency_id');
  const category = c.req.query('category');

  let query = supabase
    .from('consumables')
    .select('id, type, name, size, manufacturer, reference, stock_quantity, reorder_threshold, unit_price_ht, agency_id, lot_number, updated_at')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (agencyId === 'none') query = query.is('agency_id', null);
  else if (agencyId) query = query.eq('agency_id', agencyId);
  if (category) query = query.eq('type', category);

  const [{ data, error }, agencies] = await Promise.all([query, fetchAgenciesMap(tenantId)]);
  if (error) return c.json({ error: error.message }, 500);

  const items = (data ?? []).map((item) => ({
    ...item,
    agency_name: item.agency_id
      ? agencies.get(item.agency_id)?.name ?? 'Agence inconnue'
      : 'Non affecté',
    below_threshold: (item.stock_quantity ?? 0) <= (item.reorder_threshold ?? 0),
  }));

  return c.json({ items, agencies: [...agencies.values()] });
});

// POST /stock/items — entrée stock
// Body : { consumable_id, quantity, lot_number?, serial_number?, reason? }  (ligne existante)
//   ou  { type, name, quantity, size?, manufacturer?, reference?, agency_id?,
//          reorder_threshold?, unit_price_ht?, lot_number?, serial_number? } (nouvel article)
app.post('/stock/items', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ error: 'quantity doit être un entier positif' }, 400);
  }

  let consumable: any;

  if (body.consumable_id) {
    // Entrée sur une ligne existante
    const { data: existing, error: readError } = await supabase
      .from('consumables')
      .select('id, stock_quantity, agency_id')
      .eq('id', body.consumable_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (readError) return c.json({ error: readError.message }, 500);
    if (!existing) return c.json({ error: 'Article introuvable' }, 404);

    const patch: Record<string, unknown> = {
      stock_quantity: (existing.stock_quantity ?? 0) + quantity,
    };
    if (body.lot_number) patch.lot_number = body.lot_number;

    const { data: updated, error: updError } = await supabase
      .from('consumables')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updError) return c.json({ error: updError.message }, 500);
    consumable = updated;
  } else {
    // Nouvel article
    if (!body.type || !body.name) {
      return c.json({ error: 'type et name sont requis pour un nouvel article' }, 400);
    }

    const { data: created, error: insError } = await supabase
      .from('consumables')
      .insert({
        tenant_id: tenantId,
        type: body.type,
        name: body.name,
        size: body.size ?? null,
        manufacturer: body.manufacturer ?? null,
        reference: body.reference ?? null,
        stock_quantity: quantity,
        reorder_threshold: Number.isInteger(Number(body.reorder_threshold))
          ? Number(body.reorder_threshold)
          : 10,
        unit_price_ht: body.unit_price_ht ?? null,
        agency_id: body.agency_id ?? null,
        lot_number: body.lot_number ?? null,
      })
      .select('*')
      .single();

    if (insError) return c.json({ error: insError.message }, 500);
    consumable = created;
  }

  // Traçabilité : journal du mouvement (best effort, n'invalide pas l'entrée)
  const { error: mvError } = await supabase.from('stock_movements').insert({
    tenant_id: tenantId,
    consumable_id: consumable.id,
    agency_id: consumable.agency_id ?? null,
    direction: 'in',
    quantity,
    resulting_quantity: consumable.stock_quantity,
    lot_number: body.lot_number ?? null,
    serial_number: body.serial_number ?? null,
    reason: body.reason ?? 'Entrée stock',
    performed_by: user.id,
  });
  if (mvError) console.error('[STOCK-PARC] mouvement non journalisé:', mvError.message);

  return c.json({ success: true, item: consumable });
});

// PATCH /stock/items/:id — sortie / ajustement / mise à jour de la ligne
// Body : { movement: 'out'|'adjust', quantity, lot_number?, serial_number?, reason? }
//   et/ou champs de mise à jour : { reorder_threshold?, agency_id?, unit_price_ht? }
app.patch('/stock/items/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { data: item, error: readError } = await supabase
    .from('consumables')
    .select('id, stock_quantity, agency_id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (readError) return c.json({ error: readError.message }, 500);
  if (!item) return c.json({ error: 'Article introuvable' }, 404);

  const patch: Record<string, unknown> = {};
  let movement: { direction: 'out' | 'adjust'; quantity: number } | null = null;

  if (body.movement) {
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return c.json({ error: 'quantity doit être un entier positif ou nul' }, 400);
    }
    if (body.movement === 'out') {
      if (quantity <= 0) return c.json({ error: 'quantity doit être > 0 pour une sortie' }, 400);
      const next = (item.stock_quantity ?? 0) - quantity;
      if (next < 0) {
        return c.json({ error: `Stock insuffisant (disponible : ${item.stock_quantity ?? 0})` }, 409);
      }
      patch.stock_quantity = next;
      movement = { direction: 'out', quantity };
    } else if (body.movement === 'adjust') {
      patch.stock_quantity = quantity;
      movement = { direction: 'adjust', quantity };
    } else {
      return c.json({ error: `movement invalide : ${body.movement}` }, 400);
    }
  }

  // Champs de mise à jour simples
  if (body.reorder_threshold !== undefined) {
    const t = Number(body.reorder_threshold);
    if (!Number.isInteger(t) || t < 0) return c.json({ error: 'reorder_threshold invalide' }, 400);
    patch.reorder_threshold = t;
  }
  if (body.agency_id !== undefined) patch.agency_id = body.agency_id || null;
  if (body.unit_price_ht !== undefined) patch.unit_price_ht = body.unit_price_ht;
  if (body.lot_number !== undefined) patch.lot_number = body.lot_number || null;

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'Aucune modification fournie' }, 400);
  }

  const { data: updated, error: updError } = await supabase
    .from('consumables')
    .update(patch)
    .eq('id', item.id)
    .select('*')
    .single();

  if (updError) return c.json({ error: updError.message }, 500);

  if (movement) {
    const { error: mvError } = await supabase.from('stock_movements').insert({
      tenant_id: tenantId,
      consumable_id: item.id,
      agency_id: updated.agency_id ?? null,
      direction: movement.direction,
      quantity: movement.quantity,
      resulting_quantity: updated.stock_quantity,
      lot_number: body.lot_number ?? null,
      serial_number: body.serial_number ?? null,
      reason: body.reason ?? (movement.direction === 'out' ? 'Sortie stock' : 'Ajustement inventaire'),
      performed_by: user.id,
    });
    if (mvError) console.error('[STOCK-PARC] mouvement non journalisé:', mvError.message);
  }

  return c.json({ success: true, item: updated });
});

// ------------------------------------------------------------------
// PARC MACHINES
// ------------------------------------------------------------------

/** Devices du tenant + assignations actives + noms patients (3 requêtes). */
async function fetchParc(tenantId: string, statusFilter?: string) {
  let deviceQuery = supabase
    .from('devices')
    .select('id, manufacturer, model, serial_number, lot_number, status, agency_id, purchase_date, last_maintenance_date, next_maintenance_due, connectivity_type')
    .eq('tenant_id', tenantId)
    .order('serial_number', { ascending: true });

  if (statusFilter) deviceQuery = deviceQuery.eq('status', statusFilter);

  const { data: devices, error } = await deviceQuery;
  if (error) throw new Error(error.message);
  if (!devices || devices.length === 0) return { devices: [], assignments: [], users: new Map() };

  const { data: assignments, error: aError } = await supabase
    .from('device_assignments')
    .select('id, device_id, patient_id, assigned_at, is_active, mask_model, mask_size, mask_assigned_at, filter_changed_at, tubing_changed_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('device_id', devices.map((d) => d.id));
  if (aError) throw new Error(aError.message);

  const patientIds = [...new Set((assignments ?? []).map((a) => a.patient_id).filter(Boolean))];
  const users = new Map<string, { id: string; name: string | null; email: string | null }>();
  if (patientIds.length > 0) {
    const { data: userRows, error: uError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', patientIds);
    if (uError) throw new Error(uError.message);
    for (const u of userRows ?? []) users.set(u.id, u);
  }

  return { devices, assignments: assignments ?? [], users };
}

// GET /parc/overview — compteurs + machines orphelines
app.get('/parc/overview', async (c) => {
  const tenantId = c.get('tenantId');

  try {
    const [{ devices, assignments, users }, agencies] = await Promise.all([
      fetchParc(tenantId),
      fetchAgenciesMap(tenantId),
    ]);

    const assignedDeviceIds = new Set(assignments.map((a) => a.device_id));

    const counters = {
      total: devices.length,
      en_stock: 0,
      installees: 0,
      en_panne: 0,
      a_retourner: 0,
    };
    const orphans: any[] = [];

    for (const d of devices) {
      switch (d.status) {
        case 'stock':
          counters.en_stock++;
          break;
        case 'active':
          counters.installees++;
          break;
        case 'maintenance':
        case 'defective':
          counters.en_panne++;
          break;
        case 'retired':
          counters.a_retourner++;
          break;
      }
      // Orpheline : déclarée active mais sans assignation patient vivante
      if (d.status === 'active' && !assignedDeviceIds.has(d.id)) {
        orphans.push({
          ...d,
          agency_name: d.agency_id ? agencies.get(d.agency_id)?.name ?? 'Agence inconnue' : 'Non affecté',
        });
      }
    }

    return c.json({ counters, orphans, orphans_count: orphans.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'parc overview failed' }, 500);
  }
});

// GET /parc/machines?status= — liste machines + patient + masque + consommables
app.get('/parc/machines', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');

  try {
    const [{ devices, assignments, users }, agencies] = await Promise.all([
      fetchParc(tenantId, status && status !== 'all' ? status : undefined),
      fetchAgenciesMap(tenantId),
    ]);

    const assignmentByDevice = new Map(assignments.map((a) => [a.device_id, a]));

    const machines = devices.map((d) => {
      const assignment = assignmentByDevice.get(d.id) ?? null;
      const patient = assignment ? users.get(assignment.patient_id) ?? null : null;
      const maskAge = assignment ? daysSince(assignment.mask_assigned_at) : null;

      return {
        id: d.id,
        serial_number: d.serial_number,
        lot_number: d.lot_number,
        manufacturer: d.manufacturer,
        model: d.model,
        status: d.status,
        connectivity_type: d.connectivity_type,
        agency_id: d.agency_id,
        agency_name: d.agency_id ? agencies.get(d.agency_id)?.name ?? 'Agence inconnue' : 'Non affecté',
        next_maintenance_due: d.next_maintenance_due,
        assignment: assignment
          ? {
              id: assignment.id,
              assigned_at: assignment.assigned_at,
              patient_id: assignment.patient_id,
              patient_name: patient?.name ?? null,
              patient_email: patient?.email ?? null,
              mask_model: assignment.mask_model,
              mask_size: assignment.mask_size,
              mask_assigned_at: assignment.mask_assigned_at,
              mask_age_days: maskAge,
              mask_overdue: maskAge !== null && maskAge > MASK_LIFESPAN_DAYS,
              filter_changed_at: assignment.filter_changed_at,
              filter_age_days: daysSince(assignment.filter_changed_at),
              tubing_changed_at: assignment.tubing_changed_at,
              tubing_age_days: daysSince(assignment.tubing_changed_at),
            }
          : null,
      };
    });

    return c.json({ machines, mask_lifespan_days: MASK_LIFESPAN_DAYS });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'parc machines failed' }, 500);
  }
});

// ------------------------------------------------------------------
// PLANNING TECHNICIENS
// ------------------------------------------------------------------

/** Enrichit des lignes technician_schedules avec intervention + patient + technicien. */
async function enrichSchedules(tenantId: string, schedules: any[]) {
  if (schedules.length === 0) return [];

  const interventionIds = [...new Set(schedules.map((s) => s.intervention_id).filter(Boolean))];
  const { data: interventions, error: iError } = await supabase
    .from('interventions')
    .select('id, patient_id, type, status, date, notes')
    .in('id', interventionIds);
  if (iError) throw new Error(iError.message);
  const interventionById = new Map((interventions ?? []).map((i) => [i.id, i]));

  // interventions.patient_id → patients(id) → users(name)
  const patientIds = [...new Set((interventions ?? []).map((i) => i.patient_id).filter(Boolean))];
  const patientName = new Map<string, string | null>();
  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from('patients')
      .select('id, user_id')
      .in('id', patientIds);
    const userIds = [...new Set((patients ?? []).map((p) => p.user_id).filter(Boolean))];
    const userName = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);
      for (const u of userRows ?? []) userName.set(u.id, u.name);
    }
    for (const p of patients ?? []) patientName.set(p.id, userName.get(p.user_id) ?? null);
  }

  const technicianIds = [...new Set(schedules.map((s) => s.technician_id).filter(Boolean))];
  const technicianById = new Map<string, { name: string | null; email: string | null }>();
  if (technicianIds.length > 0) {
    const { data: techs } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', technicianIds);
    for (const t of techs ?? []) technicianById.set(t.id, t);
  }

  const slotOrder: Record<string, number> = { morning: 0, afternoon: 1 };

  return schedules
    .map((s) => {
      const intervention = interventionById.get(s.intervention_id) ?? null;
      return {
        ...s,
        technician_name: technicianById.get(s.technician_id)?.name ?? null,
        intervention: intervention
          ? {
              id: intervention.id,
              type: intervention.type,
              status: intervention.status,
              date: intervention.date,
              notes: intervention.notes,
              patient_id: intervention.patient_id,
              patient_name: patientName.get(intervention.patient_id) ?? null,
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        a.scheduled_date.localeCompare(b.scheduled_date) ||
        (slotOrder[a.time_slot] ?? 9) - (slotOrder[b.time_slot] ?? 9),
    );
}

// GET /planning/technicians — techniciens assignables
app.get('/planning/technicians', async (c) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('tenant_id', c.get('tenantId'))
    .in('role', TECHNICIAN_ROLES)
    .order('name', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ technicians: data ?? [] });
});

// GET /planning/day?date=&technician_id= — interventions du jour ordonnées
app.get('/planning/day', async (c) => {
  const tenantId = c.get('tenantId');
  const date = c.req.query('date') ?? new Date().toISOString().split('T')[0];
  if (!isValidDate(date)) return c.json({ error: 'date invalide (format YYYY-MM-DD)' }, 400);

  let query = supabase
    .from('technician_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('scheduled_date', date)
    .neq('status', 'cancelled');

  const technicianId = c.req.query('technician_id');
  if (technicianId) query = query.eq('technician_id', technicianId);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  try {
    const entries = await enrichSchedules(tenantId, data ?? []);
    return c.json({ date, entries });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'planning day failed' }, 500);
  }
});

// GET /planning/week?start= — 7 jours, groupés par technicien
app.get('/planning/week', async (c) => {
  const tenantId = c.get('tenantId');
  const start = c.req.query('start') ?? new Date().toISOString().split('T')[0];
  if (!isValidDate(start)) return c.json({ error: 'start invalide (format YYYY-MM-DD)' }, 400);

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 6);
  const end = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('technician_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .neq('status', 'cancelled');

  if (error) return c.json({ error: error.message }, 500);

  try {
    const entries = await enrichSchedules(tenantId, data ?? []);

    // Groupage par technicien pour les colonnes de la vue semaine
    const byTechnician = new Map<string, { technician_id: string; technician_name: string | null; entries: any[] }>();
    for (const entry of entries) {
      if (!byTechnician.has(entry.technician_id)) {
        byTechnician.set(entry.technician_id, {
          technician_id: entry.technician_id,
          technician_name: entry.technician_name,
          entries: [],
        });
      }
      byTechnician.get(entry.technician_id)!.entries.push(entry);
    }

    return c.json({ start, end, technicians: [...byTechnician.values()], entries });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'planning week failed' }, 500);
  }
});

// POST /planning/assign — assigner une intervention à un technicien/créneau
// Body : { intervention_id, technician_id, scheduled_date, time_slot, agency_id?, notes? }
app.post('/planning/assign', async (c) => {
  const tenantId = c.get('tenantId');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));

  const { intervention_id, technician_id, scheduled_date, time_slot } = body;
  if (!intervention_id || !technician_id || !scheduled_date) {
    return c.json({ error: 'intervention_id, technician_id et scheduled_date sont requis' }, 400);
  }
  if (!isValidDate(scheduled_date)) {
    return c.json({ error: 'scheduled_date invalide (format YYYY-MM-DD)' }, 400);
  }
  const slot = time_slot ?? 'morning';
  if (!['morning', 'afternoon'].includes(slot)) {
    return c.json({ error: `time_slot invalide : ${slot}` }, 400);
  }

  // L'intervention doit exister dans le tenant
  const { data: intervention, error: iError } = await supabase
    .from('interventions')
    .select('id, status')
    .eq('id', intervention_id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (iError) return c.json({ error: iError.message }, 500);
  if (!intervention) return c.json({ error: 'Intervention introuvable' }, 404);
  if (['completed', 'cancelled'].includes(intervention.status)) {
    return c.json({ error: `Intervention déjà ${intervention.status === 'completed' ? 'terminée' : 'annulée'}` }, 409);
  }

  // Réassignation : on annule l'affectation vivante précédente (historique conservé)
  const { error: cancelError } = await supabase
    .from('technician_schedules')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('intervention_id', intervention_id)
    .neq('status', 'cancelled');
  if (cancelError) return c.json({ error: cancelError.message }, 500);

  const { data: schedule, error: insError } = await supabase
    .from('technician_schedules')
    .insert({
      tenant_id: tenantId,
      agency_id: body.agency_id ?? null,
      technician_id,
      intervention_id,
      scheduled_date,
      time_slot: slot,
      status: 'planned',
      notes: body.notes ?? null,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (insError) return c.json({ error: insError.message }, 500);

  // Cohérence avec les routes interventions existantes : on reflète
  // l'affectation sur la ligne intervention (sans toucher son workflow)
  const interventionDate = `${scheduled_date}T${slot === 'morning' ? '09:00:00' : '14:00:00'}Z`;
  const { error: syncError } = await supabase
    .from('interventions')
    .update({ technician_id, date: interventionDate })
    .eq('id', intervention_id)
    .eq('tenant_id', tenantId);
  if (syncError) console.error('[STOCK-PARC] sync intervention échouée:', syncError.message);

  return c.json({ success: true, schedule });
});

export default app;
