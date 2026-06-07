/**
 * Badges de statut du module PSDM (auto-évaluation + actions).
 * Couleurs sobres, pas de shame pattern : le non-conforme est un état
 * de travail, pas une faute.
 */

import { Badge } from '../ui/badge';
import {
  ACTION_STATUS_LABELS,
  ASSESSMENT_STATUS_LABELS,
  type ActionStatus,
  type AssessmentStatus,
} from './types';

const ASSESSMENT_CLASSES: Record<AssessmentStatus, string> = {
  conforme: 'border-transparent bg-emerald-100 text-emerald-800',
  partiel: 'border-transparent bg-amber-100 text-amber-800',
  non_conforme: 'border-transparent bg-red-100 text-red-800',
  non_evalue: 'border-border bg-muted text-muted-foreground',
};

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return (
    <Badge variant="outline" className={ASSESSMENT_CLASSES[status]}>
      {ASSESSMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const ACTION_CLASSES: Record<ActionStatus, string> = {
  todo: 'border-border bg-muted text-muted-foreground',
  in_progress: 'border-transparent bg-blue-100 text-blue-800',
  done: 'border-transparent bg-emerald-100 text-emerald-800',
};

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  return (
    <Badge variant="outline" className={ACTION_CLASSES[status]}>
      {ACTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function CriticalityBadge({ criticality }: { criticality: 'standard' | 'critique' }) {
  if (criticality !== 'critique') return null;
  return (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
      Critique
    </Badge>
  );
}
