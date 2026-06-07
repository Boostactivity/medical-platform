/**
 * Panneau d'évaluation d'un critère PSDM : statut, note de preuve,
 * actions de remédiation liées.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { Plus } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ActionStatusBadge, CriticalityBadge } from './StatusBadge';
import {
  ASSESSMENT_STATUS_LABELS,
  formatDateFr,
  isOverdue,
  type AssessmentStatus,
  type PsdmCriterion,
} from './types';

interface CriterionSheetProps {
  criterion: PsdmCriterion | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CriterionSheet({ criterion, onClose, onSaved }: CriterionSheetProps) {
  const [status, setStatus] = useState<AssessmentStatus>('non_evalue');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [showActionForm, setShowActionForm] = useState(false);
  const [actionDescription, setActionDescription] = useState('');
  const [actionOwner, setActionOwner] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');
  const [creatingAction, setCreatingAction] = useState(false);

  useEffect(() => {
    if (criterion) {
      setStatus(criterion.assessment?.status ?? 'non_evalue');
      setEvidenceNote(criterion.assessment?.evidence_note ?? '');
      setShowActionForm(false);
      setActionDescription('');
      setActionOwner('');
      setActionDueDate('');
    }
  }, [criterion?.id]);

  if (!criterion) return null;

  const saveAssessment = async () => {
    try {
      setSaving(true);
      await api.put(`/psdm/assessments/${criterion.id}`, {
        status,
        evidence_note: evidenceNote || null,
      });
      toast.success('Évaluation enregistrée');
      onSaved();
    } catch (e: any) {
      toast.error('Échec de l’enregistrement', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const createAction = async () => {
    if (!actionDescription.trim()) {
      toast.error('Veuillez décrire l’action de remédiation');
      return;
    }
    try {
      setCreatingAction(true);
      await api.post('/psdm/actions', {
        criterion_id: criterion.id,
        description: actionDescription.trim(),
        owner: actionOwner.trim() || null,
        due_date: actionDueDate || null,
      });
      toast.success('Action de remédiation créée');
      setShowActionForm(false);
      setActionDescription('');
      setActionOwner('');
      setActionDueDate('');
      onSaved();
    } catch (e: any) {
      toast.error('Échec de la création', { description: e.message });
    } finally {
      setCreatingAction(false);
    }
  };

  return (
    <Sheet open={!!criterion} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-background sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{criterion.code}</span>
            <CriticalityBadge criticality={criterion.criticality} />
          </div>
          <SheetTitle className="text-base text-foreground">{criterion.label}</SheetTitle>
          {criterion.description && (
            <SheetDescription className="text-sm">{criterion.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {criterion.expected_evidence && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground">Preuve attendue à l’audit</p>
              <p className="mt-1 text-sm text-muted-foreground">{criterion.expected_evidence}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Statut d’auto-évaluation</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AssessmentStatus)}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ASSESSMENT_STATUS_LABELS) as AssessmentStatus[]).map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {ASSESSMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Note de preuve</Label>
            <Textarea
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="Où se trouve la preuve, contexte, référence du document..."
              className="min-h-24 text-sm"
            />
          </div>

          {criterion.assessment?.assessed_at && (
            <p className="text-sm text-muted-foreground">
              Dernière évaluation le {formatDateFr(criterion.assessment.assessed_at)}
            </p>
          )}

          <Button onClick={saveAssessment} disabled={saving} className="w-full">
            {saving ? 'Enregistrement...' : 'Enregistrer l’évaluation'}
          </Button>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Actions de remédiation ({criterion.actions.length})
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowActionForm((v) => !v)}>
                <Plus className="size-4" />
                Nouvelle action
              </Button>
            </div>

            {showActionForm && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Décrivez l’action corrective à mener"
                    className="min-h-20 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Responsable</Label>
                    <Input
                      value={actionOwner}
                      onChange={(e) => setActionOwner(e.target.value)}
                      placeholder="Nom"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Échéance</Label>
                    <Input
                      type="date"
                      value={actionDueDate}
                      onChange={(e) => setActionDueDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button onClick={createAction} disabled={creatingAction} size="sm" className="w-full">
                  {creatingAction ? 'Création...' : 'Créer l’action'}
                </Button>
              </div>
            )}

            {criterion.actions.length === 0 && !showActionForm && (
              <p className="text-sm text-muted-foreground">
                Aucune action liée à ce critère.
              </p>
            )}

            {criterion.actions.map((action) => (
              <div key={action.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground">{action.description}</p>
                  <ActionStatusBadge status={action.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.owner ? `${action.owner} — ` : ''}
                  Échéance : {formatDateFr(action.due_date)}
                  {isOverdue(action.due_date, action.status) && (
                    <span className="ml-2 font-medium text-destructive">En retard</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">Source du critère : {criterion.source}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
