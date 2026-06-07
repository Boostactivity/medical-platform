/**
 * MOTEUR OBSERVANCE / LPPR — cœur revenue du back-office PSAD.
 *
 * Règles réglementaires (research/05_REGLEMENTAIRE_FRANCE.md) :
 *  - Fenêtre GLISSANTE de 28 jours sur les heures d'utilisation PPC.
 *  - Bandes : ≥112h → full | 56-112h → partial | <56h → low | aucun relevé → none
 *  - Phase initiale 9.INI limitée à 13 semaines (91 j), puis switch AUTO :
 *      télésuivi consenti → 9.TL1/2/3 selon bande
 *      télésuivi refusé   → 9.NT1/2/3 selon bande
 *      aucun relevé       → 9.SRO
 *  - Forfaits HEBDOMADAIRES → 1 billing_line par semaine civile complète.
 *  - Franchissement de seuil (112h / 56h) → alerte + notification prescripteur.
 *
 * Données d'entrée : observance_data (patient_id, date, usage_hours) —
 * alimentée par universal-adapter (cartes SD / connecteurs fabricants).
 */

import { supabase } from './lib/supabase.ts';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type ComplianceBand = 'full' | 'partial' | 'low' | 'none';

export interface ObservanceWindow {
  windowStart: string; // YYYY-MM-DD
  windowEnd: string;
  totalHours: number;
  nightsWithData: number;
  nightsOver4h: number;
  avgHoursPerNight: number | null;
  band: ComplianceBand;
}

interface TherapyStatus {
  id: string;
  tenant_id: string;
  patient_id: string;
  therapy_start_date: string;
  initial_phase_end_date: string;
  phase: 'initial' | 'maintenance' | 'stopped';
  telesuivi_consent: boolean;
  has_observance_data: boolean;
  current_lppr_code_id: string | null;
}

// ------------------------------------------------------------------
// Helpers dates (UTC, jamais d'heure locale serveur)
// ------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(date: string, days: number): string {
  return isoDate(new Date(new Date(date + 'T00:00:00Z').getTime() + days * DAY_MS));
}

/** Lundi de la semaine ISO contenant `date`. */
function mondayOf(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0 = dimanche
  const delta = dow === 0 ? -6 : 1 - dow;
  return isoDate(new Date(d.getTime() + delta * DAY_MS));
}

// ------------------------------------------------------------------
// 1. Calcul d'une fenêtre 28 j
// ------------------------------------------------------------------

export async function computeObservanceWindow(
  patientId: string,
  windowEnd: string,
): Promise<ObservanceWindow> {
  const windowStart = addDays(windowEnd, -27);

  // Dialecte historique incohérent : selon la version du schéma, la colonne
  // s'appelle usage_hours OU hours_used. select('*') + coalesce JS = robuste
  // aux deux (un select nominatif planterait sur la colonne absente).
  const { data: nights, error } = await supabase
    .from('observance_data')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', windowStart)
    .lte('date', windowEnd);

  if (error) throw new Error(`observance_data query failed: ${error.message}`);

  const hoursOf = (n: Record<string, unknown>): number | null => {
    const v = n.usage_hours ?? n.hours_used;
    return v == null ? null : Number(v);
  };

  const rows = nights ?? [];
  const totalHours = rows.reduce((s, n) => s + (hoursOf(n) || 0), 0);
  const nightsWithData = rows.filter((n) => hoursOf(n) != null).length;
  const nightsOver4h = rows.filter((n) => (hoursOf(n) || 0) >= 4).length;

  let band: ComplianceBand;
  if (nightsWithData === 0) band = 'none';
  else if (totalHours >= 112) band = 'full';
  else if (totalHours >= 56) band = 'partial';
  else band = 'low';

  return {
    windowStart,
    windowEnd,
    totalHours: Math.round(totalHours * 100) / 100,
    nightsWithData,
    nightsOver4h,
    avgHoursPerNight: nightsWithData > 0 ? Math.round((totalHours / nightsWithData) * 100) / 100 : null,
    band,
  };
}

// ------------------------------------------------------------------
// 2. Détermination du code LPPR applicable
// ------------------------------------------------------------------

export function pickLpprShortCode(
  status: Pick<TherapyStatus, 'phase' | 'telesuivi_consent' | 'has_observance_data' | 'initial_phase_end_date'>,
  band: ComplianceBand,
  today: string,
): string {
  // Phase initiale : 9.INI tant qu'on est dans les 13 semaines
  if (status.phase === 'initial' && today <= status.initial_phase_end_date) {
    return '9.INI';
  }

  // Aucun relevé d'observance exploitable
  if (!status.has_observance_data || band === 'none') {
    return '9.SRO';
  }

  const suffix = band === 'full' ? '1' : band === 'partial' ? '2' : '3';
  return status.telesuivi_consent ? `9.TL${suffix}` : `9.NT${suffix}`;
}

// ------------------------------------------------------------------
// 3. Référentiel (cache process)
// ------------------------------------------------------------------

let codesCache: Map<string, { id: string; code_lpp: string }> | null = null;

async function lpprCodeByShort(shortCode: string): Promise<{ id: string; code_lpp: string }> {
  if (!codesCache) {
    const { data, error } = await supabase.from('lppr_codes').select('id, short_code, code_lpp');
    if (error || !data) throw new Error(`lppr_codes load failed: ${error?.message}`);
    codesCache = new Map(data.map((c) => [c.short_code, { id: c.id, code_lpp: c.code_lpp }]));
  }
  const found = codesCache.get(shortCode);
  if (!found) throw new Error(`Code LPPR inconnu dans le référentiel: ${shortCode}`);
  return found;
}

async function tariffFor(lpprCodeId: string, date: string) {
  const { data } = await supabase
    .from('lppr_tariffs')
    .select('id, amount_ttc')
    .eq('lppr_code_id', lpprCodeId)
    .lte('effective_from', date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null; // null = tarif non sourcé → billing_line.amount_ttc NULL
}

// ------------------------------------------------------------------
// 4. Alerte franchissement de seuil + notification prescripteur
// ------------------------------------------------------------------

async function emitThresholdAlert(
  status: TherapyStatus,
  prev: ComplianceBand | null,
  next: ComplianceBand,
  win: ObservanceWindow,
) {
  if (prev === null || prev === next) return;

  const worsened =
    (prev === 'full' && next !== 'full') || (prev === 'partial' && next === 'low');

  // Sévérité : descente sous 56h = haute, sous 112h = moyenne, amélioration = info
  const severity = next === 'low' || next === 'none' ? 'high' : worsened ? 'medium' : 'low';
  const title = worsened
    ? `Observance en baisse : ${win.totalHours}h / 28j`
    : `Observance en amélioration : ${win.totalHours}h / 28j`;

  await supabase.from('alerts').insert({
    tenant_id: status.tenant_id,
    patient_id: status.patient_id,
    alert_type: 'observance_threshold',
    severity,
    title,
    message:
      `Fenêtre ${win.windowStart} → ${win.windowEnd} : ${win.totalHours}h ` +
      `(bande ${prev} → ${next}). Seuils réglementaires : 112h / 56h par 28 jours.`,
    trigger_data: { previous_band: prev, new_band: next, total_hours: win.totalHours },
    action_required: worsened,
    status: 'active',
  });

  // Notification prescripteur obligatoire quand l'observance passe sous 112h
  if (worsened) {
    await supabase.from('notifications').insert({
      tenant_id: status.tenant_id,
      patient_id: status.patient_id,
      audience: 'doctor',
      kind: 'observance_below_112h',
      title: 'Patient sous le seuil d\'observance',
      body:
        `Observance ${win.totalHours}h / 28j (seuil plein : 112h). ` +
        `Fenêtre ${win.windowStart} → ${win.windowEnd}.`,
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      // Table notifications absente → non bloquant, l'alerte reste la source de vérité
      if (error) console.warn('[OBSERVANCE] notification prescripteur non insérée:', error.message);
    });
  }
}

// ------------------------------------------------------------------
// 5. Run par patient (idempotent — contraintes UNIQUE en DB)
// ------------------------------------------------------------------

export async function runForPatient(patientId: string, tenantId: string, today?: string) {
  const now = today ?? isoDate(new Date());
  const windowEnd = addDays(now, -1); // fenêtre close à hier

  // a. Statut thérapie (bootstrap si absent, depuis patients.treatment_start_date)
  let { data: status } = await supabase
    .from('patient_therapy_status')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle() as { data: TherapyStatus | null };

  if (!status) {
    const { data: patient } = await supabase
      .from('patients')
      .select('treatment_start_date, created_at')
      .eq('id', patientId)
      .maybeSingle();

    const startDate =
      patient?.treatment_start_date ?? isoDate(new Date(patient?.created_at ?? now));

    const { data: created, error: createErr } = await supabase
      .from('patient_therapy_status')
      .insert({
        tenant_id: tenantId,
        patient_id: patientId,
        therapy_start_date: startDate,
        phase: 'initial',
      })
      .select('*')
      .single();
    if (createErr) throw new Error(`patient_therapy_status insert failed: ${createErr.message}`);
    status = created as TherapyStatus;
  }

  if (status.phase === 'stopped') return { skipped: 'stopped' };

  // b. Fenêtre 28 j + bande précédente (pour détection franchissement)
  const win = await computeObservanceWindow(patientId, windowEnd);

  const { data: prevPeriod } = await supabase
    .from('observance_periods')
    .select('compliance_band')
    .eq('patient_id', patientId)
    .lt('window_end', windowEnd)
    .order('window_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from('observance_periods').upsert(
    {
      tenant_id: status.tenant_id,
      patient_id: patientId,
      window_start: win.windowStart,
      window_end: win.windowEnd,
      total_hours: win.totalHours,
      nights_with_data: win.nightsWithData,
      nights_over_4h: win.nightsOver4h,
      avg_hours_per_night: win.avgHoursPerNight,
      compliance_band: win.band,
      telesuivi: status.telesuivi_consent,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'patient_id,window_end' },
  );

  // c. Switch automatique de phase post-13 semaines
  let phase = status.phase;
  if (phase === 'initial' && now > status.initial_phase_end_date) {
    phase = 'maintenance';
  }

  // d. Code LPPR applicable
  const shortCode = pickLpprShortCode({ ...status, phase }, win.band, now);
  const code = await lpprCodeByShort(shortCode);

  await supabase
    .from('patient_therapy_status')
    .update({
      phase,
      current_lppr_code_id: code.id,
      last_engine_run: new Date().toISOString(),
    })
    .eq('id', status.id);

  // e. Ligne de facturation : dernière semaine civile COMPLÈTE (lundi → dimanche)
  const lastMonday = mondayOf(addDays(mondayOf(now), -1)); // lundi de la semaine précédente
  const lastSunday = addDays(lastMonday, 6);
  const tariff = await tariffFor(code.id, lastMonday);

  const { error: blError } = await supabase.from('billing_lines').upsert(
    {
      tenant_id: status.tenant_id,
      patient_id: patientId,
      lppr_code_id: code.id,
      period_start: lastMonday,
      period_end: lastSunday,
      amount_ttc: tariff?.amount_ttc ?? null,
      tariff_id: tariff?.id ?? null,
      status: 'draft',
      created_by: 'engine',
    },
    { onConflict: 'patient_id,period_start,lppr_code_id', ignoreDuplicates: true },
  );
  if (blError) console.error('[OBSERVANCE] billing_line upsert:', blError.message);

  // f. Alerte franchissement de seuil + notif prescripteur
  await emitThresholdAlert(status, (prevPeriod?.compliance_band as ComplianceBand) ?? null, win.band, win);

  return {
    patient_id: patientId,
    window: win,
    phase,
    lppr_code: shortCode,
    billing_week: { period_start: lastMonday, period_end: lastSunday, amount_ttc: tariff?.amount_ttc ?? null },
  };
}

// ------------------------------------------------------------------
// 6. Recalcul nightly (cron pg_cron → endpoint)
// ------------------------------------------------------------------

export async function runNightlyRecalc() {
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, tenant_id')
    .limit(10000);

  if (error) throw new Error(`patients load failed: ${error.message}`);

  const results = { processed: 0, errors: 0, bands: { full: 0, partial: 0, low: 0, none: 0 } as Record<string, number> };

  for (const p of patients ?? []) {
    try {
      const r = await runForPatient(p.id, p.tenant_id);
      if ('window' in r) {
        results.processed++;
        results.bands[r.window.band] = (results.bands[r.window.band] ?? 0) + 1;
      }
    } catch (e) {
      results.errors++;
      console.error(`[OBSERVANCE NIGHTLY] patient ${p.id}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log('[OBSERVANCE NIGHTLY] done:', JSON.stringify(results));
  return results;
}
