/**
 * PORTAIL MÉDECIN — types et référentiels d'affichage partagés.
 *
 * Bandes d'observance réglementaires (fenêtre 28 jours glissante) :
 *   full ≥ 112 h | partial 56-112 h | low < 56 h | none = sans relevé
 */

export type ComplianceBand = 'full' | 'partial' | 'low' | 'none';

export interface ObservanceWindow {
  window_start: string;
  window_end: string;
  total_hours: number;
  nights_with_data: number;
  nights_over_4h: number;
  avg_hours_per_night: number | null;
  compliance_band: ComplianceBand;
}

export interface CohortPatient {
  patient_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  treatment_start_date: string | null;
  last_window: ObservanceWindow | null;
  compliance_band: ComplianceBand;
  phase: 'initial' | 'maintenance' | 'stopped' | null;
  telesuivi_consent: boolean | null;
  initial_phase_end_date: string | null;
  prior_agreement_ref: string | null;
  lppr_code: { short_code: string; label: string } | null;
  last_iah: number | null;
  last_sync: string | null;
  active_alerts: number;
  max_alert_severity: string | null;
}

export interface CohortSummary {
  total: number;
  bands: Record<ComplianceBand, number>;
  active_alerts: number;
}

export interface DoctorAlert {
  id: string;
  patient_id: string;
  patient_name?: string;
  type?: string;
  alert_type?: string;
  severity: string;
  message?: string;
  title?: string;
  details?: string;
  status: string;
  created_at: string;
}

export interface ObservanceNight {
  date: string;
  usage_hours: number | null;
  iah: number | null;
  leaks: number | null;
}

export interface DoctorNote {
  id: string;
  patient_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PatientDetail {
  patient: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    diagnosis_date: string | null;
    treatment_start_date: string | null;
    device_installed: boolean | null;
  };
  observance_data: ObservanceNight[];
  observance_periods: Array<{
    window_start: string;
    window_end: string;
    total_hours: number;
    nights_with_data: number;
    nights_over_4h: number;
    avg_hours_per_night: number | null;
    compliance_band: ComplianceBand;
    computed_at: string;
  }>;
  therapy_status: {
    phase: 'initial' | 'maintenance' | 'stopped';
    telesuivi_consent: boolean;
    therapy_start_date: string;
    initial_phase_end_date: string;
    prior_agreement_ref: string | null;
    last_engine_run: string | null;
    lppr_codes: { short_code: string; label: string; code_lpp: string } | null;
  } | null;
  alerts: DoctorAlert[];
  notes: DoctorNote[];
}

// ------------------------------------------------------------------
// Référentiels d'affichage
// ------------------------------------------------------------------

export const BAND_META: Record<
  ComplianceBand,
  { label: string; range: string; dot: string; text: string }
> = {
  full: { label: 'Observant', range: '≥ 112 h / 28 j', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  partial: { label: 'Partiel', range: '56-112 h / 28 j', dot: 'bg-amber-500', text: 'text-amber-700' },
  low: { label: 'Non observant', range: '< 56 h / 28 j', dot: 'bg-red-500', text: 'text-red-700' },
  none: { label: 'Sans relevé', range: 'aucune donnée', dot: 'bg-gray-300', text: 'text-muted-foreground' },
};

export const BAND_ORDER: ComplianceBand[] = ['low', 'none', 'partial', 'full'];

export const SEVERITY_META: Record<string, { label: string; className: string; rank: number }> = {
  critical: { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-200', rank: 0 },
  high: { label: 'Haute', className: 'bg-red-100 text-red-700 border-red-200', rank: 1 },
  medium: { label: 'Moyenne', className: 'bg-amber-100 text-amber-700 border-amber-200', rank: 2 },
  low: { label: 'Faible', className: 'bg-gray-100 text-gray-600 border-gray-200', rank: 3 },
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  disconnect: 'Absence de données',
  mask_old: 'Masque à renouveler',
  leak: 'Fuites élevées',
  iah_high: 'IAH résiduel élevé',
  no_data: 'Absence de relevé',
  follow_up: 'Suivi à planifier',
  observance_threshold: "Franchissement de seuil d'observance",
};

// ------------------------------------------------------------------
// Formatage
// ------------------------------------------------------------------

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function formatHours(value: number | null | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals).replace('.', ',')} h`;
}

export function formatIah(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1).replace('.', ',')}/h`;
}

export function severityRank(severity: string | null | undefined): number {
  if (!severity) return 9;
  return SEVERITY_META[severity]?.rank ?? 9;
}

export function alertTypeLabel(alert: Pick<DoctorAlert, 'type' | 'alert_type'>): string {
  const key = alert.type ?? alert.alert_type ?? '';
  return ALERT_TYPE_LABELS[key] ?? key ?? 'Alerte';
}
