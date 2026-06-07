/**
 * Onglet "Plan d'action" : liste des actions de remédiation PSDM
 * (statut, échéance, retard), création d'action.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ClipboardList, Plus } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ActionStatusBadge } from './StatusBadge';
import {
  ACTION_STATUS_LABELS,
  formatDateFr,
  isOverdue,
  type ActionStatus,
  type PsdmAction,
  type PsdmCriterion,
} from './types';

interface ActionsTabProps {
  criteria: PsdmCriterion[];
  onChanged: () => void;
}

export function ActionsTab({ criteria, onChanged }: ActionsTabProps) {
  const [actions, setActions] = useState<PsdmAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [criterionId, setCriterionId] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get('/psdm/actions');
      setActions(data.actions ?? []);
    } catch (e: any) {
      toast.error('Échec du chargement du plan d’action', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (action: PsdmAction, status: ActionStatus) => {
    try {
      await api.patch(`/psdm/actions/${action.id}`, { status });
      toast.success('Action mise à jour');
      load();
      onChanged();
    } catch (e: any) {
      toast.error('Échec de la mise à jour', { description: e.message });
    }
  };

  const createAction = async () => {
    if (!criterionId || !description.trim()) {
      toast.error('Critère et description sont requis');
      return;
    }
    try {
      setCreating(true);
      await api.post('/psdm/actions', {
        criterion_id: criterionId,
        description: description.trim(),
        owner: owner.trim() || null,
        due_date: dueDate || null,
      });
      toast.success('Action créée');
      setDialogOpen(false);
      setCriterionId('');
      setDescription('');
      setOwner('');
      setDueDate('');
      load();
      onChanged();
    } catch (e: any) {
      toast.error('Échec de la création', { description: e.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {actions.length} action{actions.length > 1 ? 's' : ''} de remédiation
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={criteria.length === 0}>
          <Plus className="size-4" />
          Nouvelle action
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
      ) : actions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <p className="text-sm text-foreground">Aucune action de remédiation.</p>
            <p className="text-sm text-muted-foreground">
              Créez une action depuis un critère non conforme ou via le bouton ci-dessus.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <Card key={action.id}>
              <CardContent className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {action.psdm_criteria && (
                        <span className="font-mono text-sm text-muted-foreground">
                          {action.psdm_criteria.code}
                        </span>
                      )}
                      <ActionStatusBadge status={action.status} />
                      {isOverdue(action.due_date, action.status) && (
                        <span className="text-sm font-medium text-destructive">En retard</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground">{action.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {action.owner ? `Responsable : ${action.owner} — ` : ''}
                      Échéance : {formatDateFr(action.due_date)}
                    </p>
                  </div>
                  <Select
                    value={action.status}
                    onValueChange={(v) => updateStatus(action, v as ActionStatus)}
                  >
                    <SelectTrigger className="w-full text-sm sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-sm">
                          {ACTION_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Nouvelle action de remédiation</DialogTitle>
            <DialogDescription className="text-sm">
              Rattachez l’action à un critère du référentiel PSDM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Critère concerné</Label>
              <Select value={criterionId} onValueChange={setCriterionId}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Sélectionnez un critère" />
                </SelectTrigger>
                <SelectContent>
                  {criteria.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id} className="text-sm">
                      {cr.code} — {cr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l’action corrective à mener"
                className="min-h-20 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Responsable</Label>
                <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Nom" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Échéance</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={createAction} disabled={creating}>
              {creating ? 'Création...' : 'Créer l’action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
