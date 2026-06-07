/**
 * DEMANDES DE RDV PATIENT — file de traitement back-office (PSAD).
 *
 * - File des demandes de rendez-vous envoyées depuis l'espace patient,
 *   filtrable par statut (disponibilités du patient affichées).
 * - "Proposer un créneau" : date + matin/après-midi → le patient confirme
 *   depuis son espace.
 * - "Confirmer et planifier" : crée l'intervention (type mappé côté
 *   serveur) et, si un technicien est choisi, la ligne de planning
 *   technician_schedules.
 *
 * Données réelles via src/utils/api.ts → routes /pro-services/rdv
 * (patient-services.ts) + /planning/technicians (stock-parc.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

interface PreferredDate {
  date: string;
  time_slot: 'matin' | 'apres_midi' | 'indifferent';
}

interface AppointmentRequest {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  type: string;
  preferred_dates: PreferredDate[];
  message: string | null;
  status: string;
  proposed_slot: { date: string; time_slot: 'morning' | 'afternoon' } | null;
  intervention_id: string | null;
  created_at: string;
}

interface Technician {
  id: string;
  name: string | null;
  email: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  install: 'Installation',
  controle: 'Contrôle',
  depannage: 'Dépannage',
  renouvellement: 'Renouvellement',
  autre: 'Autre',
};

const STATUS_META: Record<string, { label: string; badge: 'default' | 'secondary' | 'outline' }> = {
  requested: { label: 'À traiter', badge: 'default' },
  proposed: { label: 'Créneau proposé', badge: 'secondary' },
  confirmed: { label: 'Confirmée', badge: 'outline' },
  declined: { label: 'Refusée', badge: 'outline' },
  cancelled: { label: 'Annulée par le patient', badge: 'outline' },
};

const PATIENT_SLOT_LABELS: Record<string, string> = {
  matin: 'matin',
  apres_midi: 'après-midi',
  indifferent: 'indifférent',
};

const SLOT_LABELS: Record<string, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'requested', label: 'À traiter' },
  { value: 'proposed', label: 'Créneau proposé' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'declined', label: 'Refusées' },
  { value: 'cancelled', label: 'Annulées' },
];

function formatDateFr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso.split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DemandesRdv() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // Dialogs : proposer / confirmer-planifier
  const [proposeTarget, setProposeTarget] = useState<AppointmentRequest | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AppointmentRequest | null>(null);
  const [form, setForm] = useState({
    date: '',
    time_slot: 'morning' as 'morning' | 'afternoon',
    technician_id: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [rdvRes, techRes] = await Promise.allSettled([
        api.get(`/pro-services/rdv${qs}`),
        api.get('/planning/technicians'),
      ]);
      if (rdvRes.status === 'fulfilled') setRequests(rdvRes.value.requests ?? []);
      else toast.error('Erreur lors du chargement des demandes', { description: rdvRes.reason?.message });
      if (techRes.status === 'fulfilled') setTechnicians(techRes.value.technicians ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPropose = (request: AppointmentRequest) => {
    setForm({
      date: request.proposed_slot?.date ?? request.preferred_dates?.[0]?.date ?? '',
      time_slot: request.proposed_slot?.time_slot ?? 'morning',
      technician_id: '',
    });
    setProposeTarget(request);
  };

  const openConfirm = (request: AppointmentRequest) => {
    setForm({
      date: request.proposed_slot?.date ?? request.preferred_dates?.[0]?.date ?? '',
      time_slot: request.proposed_slot?.time_slot ?? 'morning',
      technician_id: '',
    });
    setConfirmTarget(request);
  };

  const submitPropose = async () => {
    if (!proposeTarget) return;
    if (!form.date) {
      toast.error('Choisissez une date');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/pro-services/rdv/${proposeTarget.id}`, {
        action: 'propose',
        proposed_slot: { date: form.date, time_slot: form.time_slot },
      });
      toast.success('Créneau proposé au patient');
      setProposeTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error('Proposition impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    if (!form.date) {
      toast.error('Choisissez une date');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/pro-services/rdv/${confirmTarget.id}`, {
        action: 'confirm',
        proposed_slot: { date: form.date, time_slot: form.time_slot },
        create_intervention: true,
        technician_id: form.technician_id || undefined,
      });
      toast.success(
        form.technician_id
          ? 'Rendez-vous confirmé : intervention créée et planifiée'
          : 'Rendez-vous confirmé : intervention créée (technicien à assigner dans Planning)',
      );
      setConfirmTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error('Confirmation impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async (request: AppointmentRequest) => {
    setSubmitting(true);
    try {
      await api.patch(`/pro-services/rdv/${request.id}`, { action: 'decline' });
      toast.success('Demande refusée — le patient en est informé dans son espace');
      fetchData();
    } catch (e: any) {
      toast.error('Refus impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const slotDialog = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rdv-date">Date</Label>
          <Input
            id="rdv-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Créneau</Label>
          <Select
            value={form.time_slot}
            onValueChange={(v) => setForm((f) => ({ ...f, time_slot: v as 'morning' | 'afternoon' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Matin</SelectItem>
              <SelectItem value="afternoon">Après-midi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Demandes de rendez-vous</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Demandes envoyées depuis l'espace patient — proposez un créneau ou planifiez
              directement l'intervention
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Filtre */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56" size="sm">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tableau */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçue le</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Disponibilités patient</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Chargement des demandes...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <CalendarDays className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      Aucune demande pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => {
                    const meta = STATUS_META[req.status] ?? {
                      label: req.status,
                      badge: 'outline' as const,
                    };
                    const actionable = ['requested', 'proposed'].includes(req.status);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateFr(req.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{req.patient_name ?? 'Patient inconnu'}</div>
                          {req.patient_email && (
                            <div className="text-xs text-muted-foreground">{req.patient_email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{TYPE_LABELS[req.type] ?? req.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-0.5 text-sm">
                            {(req.preferred_dates ?? []).map((d, i) => (
                              <li key={i}>
                                {formatDateFr(d.date)}{' '}
                                <span className="text-muted-foreground">
                                  ({PATIENT_SLOT_LABELS[d.time_slot] ?? d.time_slot})
                                </span>
                              </li>
                            ))}
                          </ul>
                          {req.proposed_slot && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Proposé : {formatDateFr(req.proposed_slot.date)} (
                              {SLOT_LABELS[req.proposed_slot.time_slot]?.toLowerCase()})
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-56">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {req.message ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.badge}>{meta.label}</Badge>
                          {req.intervention_id && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Intervention créée
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!actionable ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={submitting}
                                onClick={() => openPropose(req)}
                              >
                                Proposer un créneau
                              </Button>
                              <Button
                                size="sm"
                                disabled={submitting}
                                onClick={() => openConfirm(req)}
                              >
                                Confirmer et planifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={submitting}
                                onClick={() => decline(req)}
                              >
                                Refuser
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog : proposer un créneau */}
      <Dialog open={!!proposeTarget} onOpenChange={(open) => !open && setProposeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Proposer un créneau — {proposeTarget?.patient_name ?? 'Patient'}
            </DialogTitle>
            <DialogDescription>
              Le patient recevra ce créneau dans son espace et pourra le confirmer.
            </DialogDescription>
          </DialogHeader>
          {slotDialog}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitPropose} disabled={submitting}>
              {submitting ? 'Envoi...' : 'Proposer ce créneau'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : confirmer et planifier */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirmer et planifier — {confirmTarget?.patient_name ?? 'Patient'}
            </DialogTitle>
            <DialogDescription>
              Confirme le rendez-vous et crée l'intervention
              {confirmTarget ? ` (${TYPE_LABELS[confirmTarget.type]?.toLowerCase() ?? confirmTarget.type})` : ''}.
              Choisissez un technicien pour l'ajouter directement au planning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {slotDialog}
            <div className="space-y-1.5">
              <Label>Technicien (facultatif)</Label>
              <Select
                value={form.technician_id || 'none'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, technician_id: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">À assigner plus tard</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name ?? t.email ?? t.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitConfirm} disabled={submitting}>
              {submitting ? 'Planification...' : 'Confirmer et planifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
