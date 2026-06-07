/**
 * Types du module Certification PSDM HAS 2026.
 * Miroir des payloads de src/supabase/functions/server/routes/psdm.ts.
 */

export type AssessmentStatus = 'conforme' | 'non_conforme' | 'partiel' | 'non_evalue';
export type ActionStatus = 'todo' | 'in_progress' | 'done';
export type DocType =
  | 'procedure'
  | 'fiche_technique'
  | 'attestation_formation'
  | 'enregistrement_qualite'
  | 'contrat'
  | 'rapport_audit'
  | 'autre';

export interface PsdmChapter {
  chapter_number: number;
  label: string;
  source: string;
}

export interface PsdmAssessment {
  id: string;
  criterion_id: string;
  status: AssessmentStatus;
  score: number | null;
  evidence_note: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
}

export interface PsdmAction {
  id: string;
  criterion_id: string;
  description: string;
  owner: string | null;
  due_date: string | null;
  status: ActionStatus;
  proof_document_id: string | null;
  psdm_criteria?: { code: string; label: string; chapter_number: number; criticality: string } | null;
}

export interface PsdmDocument {
  id: string;
  title: string;
  doc_type: DocType;
  storage_path: string | null;
  criterion_id: string | null;
  expires_at: string | null;
  created_at: string;
  psdm_criteria?: { code: string; label: string; chapter_number: number } | null;
}

export interface PsdmCriterion {
  id: string;
  code: string;
  chapter_number: number;
  domain: string | null;
  label: string;
  description: string | null;
  expected_evidence: string | null;
  criticality: 'standard' | 'critique';
  source: string;
  assessment: PsdmAssessment | null;
  actions: PsdmAction[];
}

export interface ChapterScore {
  total: number;
  conforme: number;
  partiel: number;
  non_conforme: number;
  non_evalue: number;
  score_pct: number | null;
}

export interface PsdmDashboard {
  referentiel: {
    name: string;
    published: string;
    expected_criteria_count: number;
    chapters_count: number;
    validity_years: number;
    accreditation: string;
    decree: string;
    compliance_deadline: string;
    sanction: string;
    source: string;
    imported_criteria_count: number;
    is_imported: boolean;
  };
  chapters: PsdmChapter[];
  score_global_pct: number | null;
  counts: ChapterScore;
  by_chapter: Record<string, ChapterScore>;
  critical_non_conforme_count: number;
  deconventionnement_risk: {
    at_risk: boolean;
    uncovered_critical_criteria: string[];
  };
  open_actions_count: number;
  overdue_actions_count: number;
}

export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  conforme: 'Conforme',
  partiel: 'Partiellement conforme',
  non_conforme: 'Non conforme',
  non_evalue: 'Non évalué',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminée',
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  procedure: 'Procédure',
  fiche_technique: 'Fiche technique',
  attestation_formation: 'Attestation de formation',
  enregistrement_qualite: 'Enregistrement qualité',
  contrat: 'Contrat',
  rapport_audit: 'Rapport d’audit',
  autre: 'Autre',
};

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function isOverdue(dueDate: string | null, status: ActionStatus): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}
