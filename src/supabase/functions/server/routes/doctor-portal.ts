/**
 * PORTAIL MÉDECIN — routes prescripteur (pneumologue / médecin du sommeil).
 * Monté à la racine du prefix via routes/dashboards.ts (index.tsx inchangé).
 *
 * Périmètre strict : le médecin ne voit QUE les patients qui lui sont
 * assignés (patients.assigned_doctor_id = auth user id du médecin —
 * convention confirmée par dashboards.ts et les policies RLS de
 * 003_security_hardening.sql / prestataire-tables.sql).
 *
 * - GET    /doctor/cohort          : cohorte enrichie (fenêtre 28j, phase,
 *                                    code LPPR, IAH, alertes), tri clinique
 * - GET    /doctor/patients/:id    : fiche complète (courbe 90j, historique
 *                                    fenêtres, alertes, statut, notes)
 * - POST   /doctor/notes           : crée/actualise le bloc-notes privé
 * - PATCH  /doctor/notes/:id       : met à jour une note (owner only)
 * - DELETE /doctor/notes/:id       : supprime une note (owner only)
 * - GET    /doctor/alerts          : alertes actives de la cohorte,
 *                                    triées par sévérité décroissante
 *
 * NOTE schéma observance_data : deux dialectes coexistent dans le repo
 * (hours_used/events/leakage vs usage_hours/ahi/leakage_rate). On lit `*`
 * et on normalise ici pour fonctionner avec l'un ou l'autre.
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();

app.use('/doctor/*', requireAuth, requireRole('doctor'), requireTenant);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

type Band = 'full' | 'partial' | 'low' | 'none';

/** Priorité clinique : low (<56h, risque arrêt prise en charge) et none d'abord. */
const BAND_PRIORITY: Record<Band, number> = { low: 0, none: 1, partial: 2, full: 3 };

const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Normalise une nuit observance_data quel que soit le dialecte de colonnes. */
function normalizeNight(row: Record<string, unknown>) {
  const usage = row.usage_hours ?? row.hours_used;
  const iah = row.ahi ?? row.events;
  const leaks = row.leakage_rate ?? row.leakage;
  return {
    date: (row.date ?? row.measurement_date) as string,
    usage_hours: usage != null ? Number(usage) : null,
    iah: iah != null ? Number(iah) : null,
    leaks: leaks != null ? Number(leaks) : null,
  };
}

/** Patients assignés au médecin connecté (scopés tenant). */
async function fetchAssignedPatients(doctorUserId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, users!patients_user_id_fkey(id, name, email, phone)')
    .eq('assigned_doctor_id', doctorUserId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`patients query failed: ${error.message}`);
  return data ?? [];
}

/** Vérifie qu'un patient appartient à la cohorte du médecin. */
async function assertPatientInCohort(patientId: string, doctorUserId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, users!patients_user_id_fkey(id, name, email, phone)')
    .eq('id', patientId)
    .eq('assigned_doctor_id', doctorUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw new Error(`patient query failed: ${error.message}`);
  return data; // null = pas dans la cohorte → 404 côté appelant
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// ------------------------------------------------------------------
// GET /doctor/cohort — liste enrichie, tri par priorité clinique
// ------------------------------------------------------------------

app.get('/doctor/cohort', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');

    const patients = await fetchAssignedPatients(user.id, tenantId);
    if (patients.length === 0) {
      return c.json({
        patients: [],
        summary: { total: 0, bands: { full: 0, partial: 0, low: 0, none: 0 }, active_alerts: 0 },
      });
    }

    const ids = patients.map((p) => p.id);

    const [periodsRes, statusesRes, alertsRes, nightsRes] = await Promise.all([
      // Fenêtres 28j — la plus récente par patient (dédupliquée en JS)
      supabase
        .from('observance_periods')
        .select('patient_id, window_start, window_end, total_hours, nights_with_data, nights_over_4h, avg_hours_per_night, compliance_band')
        .in('patient_id', ids)
        .eq('tenant_id', tenantId)
        .order('window_end', { ascending: false })
        .limit(5000),
      // Statut thérapie + code LPPR courant
      supabase
        .from('patient_therapy_status')
        .select('patient_id, phase, telesuivi_consent, initial_phase_end_date, prior_agreement_ref, lppr_codes(short_code, label)')
        .in('patient_id', ids)
        .eq('tenant_id', tenantId),
      // Alertes actives
      supabase
        .from('alerts')
        .select('patient_id, severity')
        .in('patient_id', ids)
        .eq('status', 'active'),
      // Dernier relevé (IAH + dernière synchro)
      supabase
        .from('observance_data')
        .select('*')
        .in('patient_id', ids)
        .order('date', { ascending: false })
        .limit(Math.min(5000, Math.max(1000, ids.length * 40))),
    ]);

    if (periodsRes.error) return c.json({ error: periodsRes.error.message }, 500);
    if (statusesRes.error) return c.json({ error: statusesRes.error.message }, 500);
    if (alertsRes.error) return c.json({ error: alertsRes.error.message }, 500);
    if (nightsRes.error) return c.json({ error: nightsRes.error.message }, 500);

    const latestPeriod = new Map<string, (typeof periodsRes.data)[number]>();
    for (const p of periodsRes.data ?? []) {
      if (!latestPeriod.has(p.patient_id)) latestPeriod.set(p.patient_id, p);
    }

    const statusByPatient = new Map<string, (typeof statusesRes.data)[number]>();
    for (const s of statusesRes.data ?? []) statusByPatient.set(s.patient_id, s);

    const alertsByPatient = new Map<string, { count: number; max_severity: string | null }>();
    for (const a of alertsRes.data ?? []) {
      const cur = alertsByPatient.get(a.patient_id) ?? { count: 0, max_severity: null };
      cur.count++;
      if (
        cur.max_severity === null ||
        (SEVERITY_PRIORITY[a.severity] ?? 9) < (SEVERITY_PRIORITY[cur.max_severity] ?? 9)
      ) {
        cur.max_severity = a.severity;
      }
      alertsByPatient.set(a.patient_id, cur);
    }

    const latestNight = new Map<string, ReturnType<typeof normalizeNight>>();
    for (const n of nightsRes.data ?? []) {
      const pid = n.patient_id as string;
      if (!latestNight.has(pid)) latestNight.set(pid, normalizeNight(n));
    }

    const bands: Record<Band, number> = { full: 0, partial: 0, low: 0, none: 0 };
    let activeAlerts = 0;

    const cohort = patients.map((p) => {
      const period = latestPeriod.get(p.id) ?? null;
      const status = statusByPatient.get(p.id) ?? null;
      const alerts = alertsByPatient.get(p.id) ?? { count: 0, max_severity: null };
      const night = latestNight.get(p.id) ?? null;

      // Pas de fenêtre calculée = pas de relevé exploitable → bande "none"
      const band: Band = (period?.compliance_band as Band) ?? 'none';
      bands[band]++;
      activeAlerts += alerts.count;

      return {
        patient_id: p.id,
        name: p.users?.name ?? '—',
        email: p.users?.email ?? null,
        phone: p.users?.phone ?? null,
        treatment_start_date: p.treatment_start_date ?? null,
        last_window: period
          ? {
              window_start: period.window_start,
              window_end: period.window_end,
              total_hours: Number(period.total_hours),
              nights_with_data: period.nights_with_data,
              nights_over_4h: period.nights_over_4h,
              avg_hours_per_night:
                period.avg_hours_per_night != null ? Number(period.avg_hours_per_night) : null,
              compliance_band: band,
            }
          : null,
        compliance_band: band,
        phase: status?.phase ?? null,
        telesuivi_consent: status?.telesuivi_consent ?? null,
        initial_phase_end_date: status?.initial_phase_end_date ?? null,
        prior_agreement_ref: status?.prior_agreement_ref ?? null,
        lppr_code: status?.lppr_codes
          ? { short_code: status.lppr_codes.short_code, label: status.lppr_codes.label }
          : null,
        last_iah: night?.iah ?? null,
        last_sync: night?.date ?? null,
        active_alerts: alerts.count,
        max_alert_severity: alerts.max_severity,
      };
    });

    // Tri clinique : bandes low/none d'abord, puis nb d'alertes, puis heures croissantes
    cohort.sort((a, b) => {
      const byBand = BAND_PRIORITY[a.compliance_band] - BAND_PRIORITY[b.compliance_band];
      if (byBand !== 0) return byBand;
      if (b.active_alerts !== a.active_alerts) return b.active_alerts - a.active_alerts;
      return (a.last_window?.total_hours ?? 0) - (b.last_window?.total_hours ?? 0);
    });

    return c.json({
      patients: cohort,
      summary: { total: cohort.length, bands, active_alerts: activeAlerts },
    });
  } catch (e) {
    console.error('[DOCTOR PORTAL] cohort:', e);
    return c.json({ error: e instanceof Error ? e.message : 'cohort failed' }, 500);
  }
});

// ------------------------------------------------------------------
// GET /doctor/patients/:id — fiche complète
// ------------------------------------------------------------------

app.get('/doctor/patients/:id', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');
    const patientId = c.req.param('id');

    const patient = await assertPatientInCohort(patientId, user.id, tenantId);
    if (!patient) return c.json({ error: 'Patient introuvable dans votre cohorte' }, 404);

    const [nightsRes, periodsRes, statusRes, alertsRes, notesRes] = await Promise.all([
      // Courbe 90 jours
      supabase
        .from('observance_data')
        .select('*')
        .eq('patient_id', patientId)
        .gte('date', isoDaysAgo(90))
        .order('date', { ascending: true })
        .limit(120),
      // Historique fenêtres 28j
      supabase
        .from('observance_periods')
        .select('window_start, window_end, total_hours, nights_with_data, nights_over_4h, avg_hours_per_night, compliance_band, computed_at')
        .eq('patient_id', patientId)
        .eq('tenant_id', tenantId)
        .order('window_end', { ascending: false })
        .limit(24),
      // Statut thérapie + code LPPR
      supabase
        .from('patient_therapy_status')
        .select('phase, telesuivi_consent, therapy_start_date, initial_phase_end_date, prior_agreement_ref, last_engine_run, lppr_codes(short_code, label, code_lpp)')
        .eq('patient_id', patientId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      // Alertes actives
      supabase
        .from('alerts')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50),
      // Notes du médecin connecté UNIQUEMENT
      supabase
        .from('doctor_notes')
        .select('id, patient_id, content, created_at, updated_at')
        .eq('patient_id', patientId)
        .eq('doctor_id', user.id)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false }),
    ]);

    if (nightsRes.error) return c.json({ error: nightsRes.error.message }, 500);
    if (periodsRes.error) return c.json({ error: periodsRes.error.message }, 500);
    if (statusRes.error) return c.json({ error: statusRes.error.message }, 500);
    if (alertsRes.error) return c.json({ error: alertsRes.error.message }, 500);
    // doctor_notes peut ne pas exister si la migration 105 n'est pas appliquée :
    // non bloquant, la fiche reste exploitable.
    const notes = notesRes.error ? [] : notesRes.data ?? [];
    if (notesRes.error) {
      console.warn('[DOCTOR PORTAL] doctor_notes indisponible:', notesRes.error.message);
    }

    const sortedAlerts = (alertsRes.data ?? []).sort(
      (a, b) => (SEVERITY_PRIORITY[a.severity] ?? 9) - (SEVERITY_PRIORITY[b.severity] ?? 9),
    );

    return c.json({
      patient: {
        id: patient.id,
        name: patient.users?.name ?? '—',
        email: patient.users?.email ?? null,
        phone: patient.users?.phone ?? null,
        diagnosis_date: patient.diagnosis_date ?? null,
        treatment_start_date: patient.treatment_start_date ?? null,
        device_installed: patient.device_installed ?? null,
      },
      observance_data: (nightsRes.data ?? []).map(normalizeNight),
      observance_periods: periodsRes.data ?? [],
      therapy_status: statusRes.data ?? null,
      alerts: sortedAlerts,
      notes,
    });
  } catch (e) {
    console.error('[DOCTOR PORTAL] patient detail:', e);
    return c.json({ error: e instanceof Error ? e.message : 'patient detail failed' }, 500);
  }
});

// ------------------------------------------------------------------
// Bloc-notes privé — create-or-update, owner only
// ------------------------------------------------------------------

app.post('/doctor/notes', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');
    const body = await c.req.json().catch(() => ({}));
    const patientId = body.patient_id as string | undefined;
    const content = typeof body.content === 'string' ? body.content : undefined;

    if (!patientId || content === undefined) {
      return c.json({ error: 'patient_id et content sont requis' }, 400);
    }

    const patient = await assertPatientInCohort(patientId, user.id, tenantId);
    if (!patient) return c.json({ error: 'Patient introuvable dans votre cohorte' }, 404);

    // Un bloc-notes par (médecin, patient) : update si existant, sinon insert.
    const { data: existing, error: readErr } = await supabase
      .from('doctor_notes')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', user.id)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readErr) return c.json({ error: readErr.message }, 500);

    if (existing) {
      const { data: updated, error } = await supabase
        .from('doctor_notes')
        .update({ content })
        .eq('id', existing.id)
        .eq('doctor_id', user.id)
        .select('id, patient_id, content, created_at, updated_at')
        .single();
      if (error) return c.json({ error: error.message }, 500);
      return c.json({ success: true, note: updated });
    }

    const { data: created, error } = await supabase
      .from('doctor_notes')
      .insert({ tenant_id: tenantId, doctor_id: user.id, patient_id: patientId, content })
      .select('id, patient_id, content, created_at, updated_at')
      .single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, note: created }, 201);
  } catch (e) {
    console.error('[DOCTOR PORTAL] note create:', e);
    return c.json({ error: e instanceof Error ? e.message : 'note create failed' }, 500);
  }
});

app.patch('/doctor/notes/:id', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');
    const body = await c.req.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content : undefined;

    if (content === undefined) return c.json({ error: 'content est requis' }, 400);

    const { data: updated, error } = await supabase
      .from('doctor_notes')
      .update({ content })
      .eq('id', c.req.param('id'))
      .eq('doctor_id', user.id) // owner only
      .eq('tenant_id', tenantId)
      .select('id, patient_id, content, created_at, updated_at')
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 500);
    if (!updated) return c.json({ error: 'Note introuvable' }, 404);
    return c.json({ success: true, note: updated });
  } catch (e) {
    console.error('[DOCTOR PORTAL] note update:', e);
    return c.json({ error: e instanceof Error ? e.message : 'note update failed' }, 500);
  }
});

app.delete('/doctor/notes/:id', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');

    const { data: deleted, error } = await supabase
      .from('doctor_notes')
      .delete()
      .eq('id', c.req.param('id'))
      .eq('doctor_id', user.id) // owner only
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 500);
    if (!deleted) return c.json({ error: 'Note introuvable' }, 404);
    return c.json({ success: true });
  } catch (e) {
    console.error('[DOCTOR PORTAL] note delete:', e);
    return c.json({ error: e instanceof Error ? e.message : 'note delete failed' }, 500);
  }
});

// ------------------------------------------------------------------
// GET /doctor/alerts — alertes actives de la cohorte, sévérité décroissante
// ------------------------------------------------------------------

app.get('/doctor/alerts', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');

    const patients = await fetchAssignedPatients(user.id, tenantId);
    if (patients.length === 0) return c.json({ alerts: [] });

    const nameByPatient = new Map<string, string>(
      patients.map((p) => [p.id, p.users?.name ?? '—']),
    );

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .in('patient_id', patients.map((p) => p.id))
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return c.json({ error: error.message }, 500);

    const alerts = (data ?? [])
      .map((a) => ({ ...a, patient_name: nameByPatient.get(a.patient_id) ?? '—' }))
      .sort((a, b) => {
        const bySeverity =
          (SEVERITY_PRIORITY[a.severity] ?? 9) - (SEVERITY_PRIORITY[b.severity] ?? 9);
        if (bySeverity !== 0) return bySeverity;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    return c.json({ alerts });
  } catch (e) {
    console.error('[DOCTOR PORTAL] alerts:', e);
    return c.json({ error: e instanceof Error ? e.message : 'alerts failed' }, 500);
  }
});

export default app;
