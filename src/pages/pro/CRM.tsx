/**
 * CRM PRESCRIPTEURS — suivi des médecins apporteurs d'un PSAD (back-office).
 *
 * - Liste : nom, spécialité, établissement, statut relation, nb patients
 *   rattachés (réel : patients.assigned_doctor_id = doctor_id), dernier contact
 * - Fiche détail : coordonnées, patients rattachés, timeline des interactions
 *   + ajout d'interaction
 * - Création / édition d'un contact prescripteur
 *
 * Données réelles via src/utils/api.ts → routes /pro/prescripteurs/*
 * (crm-exports.ts). FR vouvoiement, aucun emoji.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Stethoscope,
  Users,
} from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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

interface Prescriber {
  id: string;
  doctor_id: string | null;
  full_name: string;
  rpps: string | null;
  specialty: string | null;
  establishment: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  relationship_status: 'prospect' | 'actif' | 'inactif';
  patients_count: number;
  last_interaction_at: string | null;
}

interface Interaction {
  id: string;
  kind: 'appel' | 'visite' | 'email' | 'autre';
  summary: string;
  occurred_at: string;
}

interface AttachedPatient {
  patient_id: string;
  name: string | null;
  email: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  actif: 'Actif',
  inactif: 'Inactif',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  actif: 'default',
  prospect: 'secondary',
  inactif: 'outline',
};

const KIND_LABELS: Record<string, string> = {
  appel: 'Appel',
  visite: 'Visite',
  email: 'E-mail',
  autre: 'Autre',
};

const EMPTY_FORM = {
  full_name: '',
  doctor_id: '',
  rpps: '',
  specialty: '',
  establishment: '',
  email: '',
  phone: '',
  notes: '',
  relationship_status: 'prospect' as Prescriber['relationship_status'],
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CRM() {
  const [loading, setLoading] = useState(true);
  const [prescribers, setPrescribers] = useState<Prescriber[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Détail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    prescriber: Prescriber;
    interactions: Interaction[];
    patients: AttachedPatient[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Prescriber | null>(null); // null = création
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    kind: 'appel' as Interaction['kind'],
    summary: '',
    occurred_at: new Date().toISOString().slice(0, 10),
  });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pro/prescripteurs');
      setPrescribers(res.prescribers ?? []);
    } catch (e: any) {
      toast.error('Échec du chargement des prescripteurs', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await api.get(`/pro/prescripteurs/${id}`);
      setDetail(res);
    } catch (e: any) {
      toast.error('Échec du chargement de la fiche', { description: e.message });
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setEditOpen(true);
  };

  const openEdit = (p: Prescriber) => {
    setEditTarget(p);
    setForm({
      full_name: p.full_name,
      doctor_id: p.doctor_id ?? '',
      rpps: p.rpps ?? '',
      specialty: p.specialty ?? '',
      establishment: p.establishment ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      notes: p.notes ?? '',
      relationship_status: p.relationship_status,
    });
    setEditOpen(true);
  };

  const submitContact = async () => {
    if (!form.full_name.trim()) {
      toast.error('Veuillez saisir le nom du prescripteur');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        doctor_id: form.doctor_id.trim() || null,
        rpps: form.rpps.trim() || null,
        specialty: form.specialty.trim() || null,
        establishment: form.establishment.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        relationship_status: form.relationship_status,
      };
      if (editTarget) {
        await api.patch(`/pro/prescripteurs/${editTarget.id}`, payload);
        toast.success('Prescripteur mis à jour');
      } else {
        await api.post('/pro/prescripteurs', payload);
        toast.success('Prescripteur créé');
      }
      setEditOpen(false);
      fetchList();
      if (editTarget && selectedId === editTarget.id) openDetail(editTarget.id);
    } catch (e: any) {
      toast.error('Échec de l’enregistrement', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitInteraction = async () => {
    if (!selectedId) return;
    if (!interactionForm.summary.trim()) {
      toast.error('Veuillez saisir un résumé');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/pro/prescripteurs/${selectedId}/interactions`, {
        kind: interactionForm.kind,
        summary: interactionForm.summary.trim(),
        occurred_at: interactionForm.occurred_at,
      });
      toast.success('Interaction enregistrée');
      setInteractionOpen(false);
      setInteractionForm({
        kind: 'appel',
        summary: '',
        occurred_at: new Date().toISOString().slice(0, 10),
      });
      openDetail(selectedId);
      fetchList();
    } catch (e: any) {
      toast.error('Échec de l’enregistrement', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered =
    statusFilter === 'all'
      ? prescribers
      : prescribers.filter((p) => p.relationship_status === statusFilter);

  // ----------------------------------------------------------------
  // Vue détail
  // ----------------------------------------------------------------
  if (selectedId) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Button>

          {detailLoading || !detail ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Chargement de la fiche...
              </CardContent>
            </Card>
          ) : (
            <>
              {/* En-tête fiche */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-[#007AFF]" />
                        {detail.prescriber.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {detail.prescriber.specialty ?? 'Spécialité non renseignée'}
                        {detail.prescriber.establishment
                          ? ` · ${detail.prescriber.establishment}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[detail.prescriber.relationship_status]}>
                        {STATUS_LABELS[detail.prescriber.relationship_status]}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => openEdit(detail.prescriber)}>
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">RPPS / ADELI</div>
                    <div className="mt-0.5">{detail.prescriber.rpps ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">E-mail</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {detail.prescriber.email ? (
                        <>
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {detail.prescriber.email}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Téléphone</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {detail.prescriber.phone ? (
                        <>
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {detail.prescriber.phone}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Patients rattachés</div>
                    <div className="mt-0.5 flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      {detail.prescriber.patients_count}
                    </div>
                  </div>
                  {detail.prescriber.notes && (
                    <div className="col-span-full">
                      <div className="text-xs text-muted-foreground">Notes</div>
                      <div className="mt-0.5 whitespace-pre-wrap">{detail.prescriber.notes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Patients rattachés */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Patients rattachés ({detail.patients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!detail.prescriber.doctor_id ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Ce prescripteur n’est pas lié à un compte médecin de la plateforme. Le
                        rattachement automatique des patients n’est pas disponible.
                      </p>
                    ) : detail.patients.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Aucun patient rattaché à ce médecin pour le moment.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {detail.patients.map((pt) => (
                          <li key={pt.patient_id} className="py-2 text-sm">
                            <div className="font-medium">{pt.name ?? 'Patient'}</div>
                            {pt.email && (
                              <div className="text-xs text-muted-foreground">{pt.email}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline interactions */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Historique des contacts ({detail.interactions.length})
                    </CardTitle>
                    <Button size="sm" onClick={() => setInteractionOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Interaction
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {detail.interactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        Aucune interaction enregistrée. Ajoutez le premier contact.
                      </p>
                    ) : (
                      <ol className="space-y-3">
                        {detail.interactions.map((it) => (
                          <li key={it.id} className="flex gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-[#007AFF] shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{KIND_LABELS[it.kind]}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(it.occurred_at)}
                                </span>
                              </div>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{it.summary}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Dialog interaction (réutilisé dans la vue détail) */}
        <InteractionDialog
          open={interactionOpen}
          onOpenChange={setInteractionOpen}
          form={interactionForm}
          setForm={setInteractionForm}
          submitting={submitting}
          onSubmit={submitInteraction}
        />
        {/* Dialog édition (réutilisé) */}
        <ContactDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editTarget={editTarget}
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={submitContact}
        />
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Vue liste
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">CRM prescripteurs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivez vos médecins apporteurs, leurs patients rattachés et l’historique des contacts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Nouveau prescripteur
            </Button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Spécialité</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Patients</TableHead>
                  <TableHead>Dernier contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Chargement des prescripteurs...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Aucun prescripteur. Créez votre premier contact pour démarrer le suivi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(p.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{p.full_name}</div>
                        {p.rpps && (
                          <div className="text-xs text-muted-foreground">RPPS {p.rpps}</div>
                        )}
                      </TableCell>
                      <TableCell>{p.specialty ?? '—'}</TableCell>
                      <TableCell>{p.establishment ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.relationship_status]}>
                          {STATUS_LABELS[p.relationship_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{p.patients_count}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(p.last_interaction_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ContactDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={editTarget}
        form={form}
        setForm={setForm}
        submitting={submitting}
        onSubmit={submitContact}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Sous-composants dialog (partagés liste / détail)
// ------------------------------------------------------------------

function ContactDialog({
  open,
  onOpenChange,
  editTarget,
  form,
  setForm,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: Prescriber | null;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? 'Modifier le prescripteur' : 'Nouveau prescripteur'}</DialogTitle>
          <DialogDescription>
            Renseignez les coordonnées du médecin apporteur. Le statut de la relation vous aide à
            prioriser le suivi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="crm-name">Nom complet</Label>
            <Input
              id="crm-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Dr Marie Lefèvre"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-specialty">Spécialité</Label>
              <Input
                id="crm-specialty"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                placeholder="Pneumologie"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-rpps">RPPS / ADELI</Label>
              <Input
                id="crm-rpps"
                value={form.rpps}
                onChange={(e) => setForm((f) => ({ ...f, rpps: e.target.value }))}
                placeholder="10001234567"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-establishment">Établissement</Label>
            <Input
              id="crm-establishment"
              value={form.establishment}
              onChange={(e) => setForm((f) => ({ ...f, establishment: e.target.value }))}
              placeholder="Clinique du Sommeil — Lyon"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-email">E-mail</Label>
              <Input
                id="crm-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="m.lefevre@exemple.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-phone">Téléphone</Label>
              <Input
                id="crm-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="04 78 00 00 00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Statut de la relation</Label>
              <Select
                value={form.relationship_status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, relationship_status: v as Prescriber['relationship_status'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-doctor">Identifiant compte médecin</Label>
              <Input
                id="crm-doctor"
                value={form.doctor_id}
                onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                placeholder="UUID (optionnel)"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            L’identifiant compte médecin relie ce prescripteur à un compte plateforme pour compter
            automatiquement ses patients. Laissez vide pour un contact externe.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="crm-notes">Notes</Label>
            <Textarea
              id="crm-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Contexte, préférences de contact, accords..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InteractionDialog({
  open,
  onOpenChange,
  form,
  setForm,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: { kind: Interaction['kind']; summary: string; occurred_at: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ kind: Interaction['kind']; summary: string; occurred_at: string }>
  >;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle interaction</DialogTitle>
          <DialogDescription>
            Consignez un échange avec ce prescripteur (appel, visite, e-mail).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v as Interaction['kind'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-date">Date</Label>
              <Input
                id="int-date"
                type="date"
                value={form.occurred_at}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-summary">Résumé</Label>
            <Textarea
              id="int-summary"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Point sur les adressages du trimestre, retour sur un patient..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
