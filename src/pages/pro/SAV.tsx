/**
 * SAV / SLA — file des tickets service après-vente (back-office PSAD).
 *
 * - Stats en tête : ouverts, en retard SLA, résolus 7 j, délai moyen.
 * - File dense triée par échéance SLA, badge priorité + retard rouge si dépassé.
 * - Filtres statut / priorité.
 * - Dialog détail : timeline des évènements, changement statut / assignation /
 *   priorité, ajout de note, note de résolution.
 * - Nouveau ticket (création interne pro).
 * - Onglet « Déclarations patient à traiter » (patient_tickets status open)
 *   avec bouton « Convertir en ticket SAV ».
 *
 * Données réelles via src/utils/api.ts → routes /pro/sav/* (segments-sav.ts).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlarmClock,
  CheckCircle2,
  Inbox,
  Plus,
  RefreshCw,
  Timer,
  TriangleAlert,
  Wrench,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface SavTicket {
  id: string;
  patient_ticket_id: string | null;
  patient_id: string | null;
  patient_name: string | null;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  sla_due_at: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolution_note: string | null;
  is_overdue: boolean;
  created_at: string;
  resolved_at: string | null;
}

interface TicketEvent {
  id: string;
  event_type: string;
  detail: string | null;
  author: string | null;
  created_at: string;
}

interface PatientTicket {
  id: string;
  patient_id: string;
  patient_name: string | null;
  type: string;
  message: string;
  status: string;
  already_converted: boolean;
  created_at: string;
}

interface Assignee {
  id: string;
  name: string | null;
  email: string | null;
}

interface SavStats {
  open: number;
  overdue: number;
  resolved_7d: number;
  avg_resolution_hours: number | null;
  open_by_priority: Record<string, number>;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  assigned: 'Assigné',
  in_progress: 'En cours',
  waiting: 'En attente',
  resolved: 'Résolu',
  closed: 'Clôturé',
};

const CATEGORY_LABELS: Record<string, string> = {
  panne: 'Panne',
  masque: 'Masque',
  consommable: 'Consommable',
  administratif: 'Administratif',
  autre: 'Autre',
};

const PATIENT_TYPE_LABELS: Record<string, string> = {
  panne: 'Panne',
  masque: 'Masque',
  question: 'Question',
};

const STATUS_ORDER = ['new', 'assigned', 'in_progress', 'waiting', 'resolved', 'closed'];

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slaCountdown(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const label = hours >= 24 ? `${Math.floor(hours / 24)} j ${hours % 24} h` : `${hours} h ${mins} min`;
  return diff < 0 ? `Dépassé de ${label}` : `Reste ${label}`;
}

export function SAV() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SavTicket[]>([]);
  const [stats, setStats] = useState<SavStats | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Déclarations patient
  const [patientTickets, setPatientTickets] = useState<PatientTicket[]>([]);
  const [ptLoading, setPtLoading] = useState(false);

  // Détail
  const [detail, setDetail] = useState<SavTicket | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [acting, setActing] = useState(false);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: '',
    description: '',
    category: 'autre',
    priority: 'medium',
    assigned_to: 'none',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      const qs = params.toString();

      const [ticketsRes, statsRes, assigneesRes] = await Promise.allSettled([
        api.get(`/pro/sav/tickets${qs ? `?${qs}` : ''}`),
        api.get('/pro/sav/stats'),
        api.get('/pro/sav/assignees'),
      ]);
      if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value.tickets ?? []);
      else toast.error('Erreur lors du chargement des tickets', { description: ticketsRes.reason?.message });
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (assigneesRes.status === 'fulfilled') setAssignees(assigneesRes.value.assignees ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPatientTickets = useCallback(async () => {
    setPtLoading(true);
    try {
      const res = await api.get('/pro/sav/patient-tickets?status=open');
      setPatientTickets(res.tickets ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des déclarations', { description: e.message });
    } finally {
      setPtLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientTickets();
  }, [fetchPatientTickets]);

  const openDetail = async (ticket: SavTicket) => {
    setDetail(ticket);
    setNoteText('');
    setEvents([]);
    setEventsLoading(true);
    try {
      const res = await api.get(`/pro/sav/tickets/${ticket.id}/events`);
      setEvents(res.events ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement de l’historique', { description: e.message });
    } finally {
      setEventsLoading(false);
    }
  };

  const refreshDetail = async (ticketId: string) => {
    const [tk, ev] = await Promise.allSettled([
      api.get(`/pro/sav/tickets?status=all`),
      api.get(`/pro/sav/tickets/${ticketId}/events`),
    ]);
    if (ev.status === 'fulfilled') setEvents(ev.value.events ?? []);
    if (tk.status === 'fulfilled') {
      const fresh = (tk.value.tickets ?? []).find((t: SavTicket) => t.id === ticketId);
      if (fresh) setDetail(fresh);
    }
  };

  const patchTicket = async (patch: Record<string, unknown>) => {
    if (!detail) return;
    setActing(true);
    try {
      await api.patch(`/pro/sav/tickets/${detail.id}`, patch);
      toast.success('Ticket mis à jour');
      await refreshDetail(detail.id);
      fetchData();
    } catch (e: any) {
      toast.error('Erreur lors de la mise à jour', { description: e.message });
    } finally {
      setActing(false);
    }
  };

  const addNote = async () => {
    if (!detail || !noteText.trim()) return;
    setActing(true);
    try {
      await api.post(`/pro/sav/tickets/${detail.id}/events`, { detail: noteText.trim() });
      setNoteText('');
      const res = await api.get(`/pro/sav/tickets/${detail.id}/events`);
      setEvents(res.events ?? []);
      toast.success('Note ajoutée');
    } catch (e: any) {
      toast.error('Erreur lors de l’ajout de la note', { description: e.message });
    } finally {
      setActing(false);
    }
  };

  const submitCreate = async () => {
    if (!createForm.subject.trim()) {
      toast.error('Veuillez saisir un objet');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pro/sav/tickets', {
        subject: createForm.subject.trim(),
        description: createForm.description.trim() || undefined,
        category: createForm.category,
        priority: createForm.priority,
        assigned_to: createForm.assigned_to !== 'none' ? createForm.assigned_to : undefined,
      });
      toast.success('Ticket créé');
      setCreateOpen(false);
      setCreateForm({ subject: '', description: '', category: 'autre', priority: 'medium', assigned_to: 'none' });
      fetchData();
    } catch (e: any) {
      toast.error('Erreur lors de la création', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const convertPatientTicket = async (pt: PatientTicket) => {
    try {
      await api.post(`/pro/sav/from-patient-ticket/${pt.id}`, {});
      toast.success('Déclaration convertie en ticket SAV');
      fetchPatientTickets();
      fetchData();
    } catch (e: any) {
      toast.error('Erreur lors de la conversion', { description: e.message });
    }
  };

  const StatCard = ({
    icon,
    label,
    value,
    accent,
  }: {
    icon: ReactNode;
    label: string;
    value: string | number;
    accent?: string;
  }) => (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${accent ?? ''}`}>{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">SAV &amp; SLA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              File de traitement priorisée, échéances SLA et historique par ticket
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Nouveau ticket
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Inbox className="w-3.5 h-3.5" />} label="Tickets ouverts" value={stats?.open ?? '—'} />
          <StatCard
            icon={<TriangleAlert className="w-3.5 h-3.5" />}
            label="En retard SLA"
            value={stats?.overdue ?? '—'}
            accent={stats && stats.overdue > 0 ? 'text-red-600' : ''}
          />
          <StatCard
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Résolus (7 j)"
            value={stats?.resolved_7d ?? '—'}
          />
          <StatCard
            icon={<Timer className="w-3.5 h-3.5" />}
            label="Délai moyen"
            value={stats?.avg_resolution_hours != null ? `${stats.avg_resolution_hours} h` : '—'}
          />
        </div>

        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file">
              <Wrench className="w-4 h-4 mr-1.5" />
              File SAV
            </TabsTrigger>
            <TabsTrigger value="declarations">
              <Inbox className="w-4 h-4 mr-1.5" />
              Déclarations patient à traiter
              {patientTickets.filter((p) => !p.already_converted).length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {patientTickets.filter((p) => !p.already_converted).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ----- FILE SAV ----- */}
          <TabsContent value="file" className="space-y-4 mt-4">
            {/* Filtres */}
            <div className="flex gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" size="sm">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouverts</SelectItem>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48" size="sm">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  {['urgent', 'high', 'medium', 'low'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tableau */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Assigné à</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Échéance SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Chargement des tickets...
                        </TableCell>
                      </TableRow>
                    ) : tickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Aucun ticket ne correspond à ces filtres.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tickets.map((t) => (
                        <TableRow
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => openDetail(t)}
                        >
                          <TableCell>
                            <Badge variant={PRIORITY_VARIANT[t.priority] ?? 'outline'}>
                              {PRIORITY_LABELS[t.priority] ?? t.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{t.subject}</div>
                            {t.patient_ticket_id && (
                              <div className="text-xs text-muted-foreground">Origine : déclaration patient</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {CATEGORY_LABELS[t.category] ?? t.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{t.patient_name ?? '—'}</TableCell>
                          <TableCell className="text-sm">{t.assigned_to_name ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {t.is_overdue && (
                              <Badge variant="destructive" className="mb-1">
                                <AlarmClock className="w-3 h-3 mr-1" />
                                En retard
                              </Badge>
                            )}
                            <div
                              className={`text-xs ${
                                t.is_overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                              }`}
                            >
                              {slaCountdown(t.sla_due_at)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----- DÉCLARATIONS PATIENT ----- */}
          <TabsContent value="declarations" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Déclarations patient ouvertes — à convertir en ticket SAV pour un traitement
                  priorisé
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Reçue le</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ptLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Chargement des déclarations...
                        </TableCell>
                      </TableRow>
                    ) : patientTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Aucune déclaration patient en attente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      patientTickets.map((pt) => (
                        <TableRow key={pt.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              {PATIENT_TYPE_LABELS[pt.type] ?? pt.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{pt.patient_name ?? '—'}</TableCell>
                          <TableCell className="max-w-md">
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {pt.message}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTimeFr(pt.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            {pt.already_converted ? (
                              <Badge variant="outline">Déjà convertie</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertPatientTicket(pt)}
                              >
                                Convertir en ticket SAV
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog détail ticket */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.subject}
                  {detail.is_overdue && (
                    <Badge variant="destructive">
                      <AlarmClock className="w-3 h-3 mr-1" />
                      SLA dépassé
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Créé le {formatDateTimeFr(detail.created_at)}
                  {detail.patient_name ? ` · Patient : ${detail.patient_name}` : ''}
                  {' · '}Échéance SLA : {formatDateTimeFr(detail.sla_due_at)}
                </DialogDescription>
              </DialogHeader>

              {detail.description && (
                <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                  {detail.description}
                </div>
              )}

              {/* Contrôles : statut / priorité / assignation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={detail.status}
                    onValueChange={(v) => patchTicket({ status: v })}
                  >
                    <SelectTrigger disabled={acting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={detail.priority}
                    onValueChange={(v) => patchTicket({ priority: v })}
                  >
                    <SelectTrigger disabled={acting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['urgent', 'high', 'medium', 'low'].map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assigné à</Label>
                  <Select
                    value={detail.assigned_to ?? 'none'}
                    onValueChange={(v) => patchTicket({ assigned_to: v === 'none' ? null : v })}
                  >
                    <SelectTrigger disabled={acting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name ?? a.email ?? a.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Note de résolution (visible quand résolu/clôturé) */}
              {['resolved', 'closed'].includes(detail.status) && (
                <div className="space-y-1.5">
                  <Label htmlFor="sav-resolution">Note de résolution</Label>
                  <Textarea
                    id="sav-resolution"
                    defaultValue={detail.resolution_note ?? ''}
                    placeholder="Comment le ticket a été résolu..."
                    rows={2}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (detail.resolution_note ?? '')) patchTicket({ resolution_note: v });
                    }}
                  />
                </div>
              )}

              {/* Timeline */}
              <div>
                <Label className="text-sm">Historique</Label>
                <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {eventsLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Aucun évènement.
                    </p>
                  ) : (
                    events.map((ev) => (
                      <div key={ev.id} className="flex gap-3 text-sm border-l-2 border-muted pl-3 py-0.5">
                        <div className="flex-1">
                          <div>{ev.detail ?? ev.event_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTimeFr(ev.created_at)}
                            {ev.author ? ` · ${ev.author}` : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ajout de note */}
              <div className="space-y-1.5">
                <Label htmlFor="sav-note">Ajouter une note</Label>
                <Textarea
                  id="sav-note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Suivi, échange avec le patient, action terrain..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Fermer
                </Button>
                <Button onClick={addNote} disabled={acting || !noteText.trim()}>
                  Ajouter la note
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog création ticket */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau ticket SAV</DialogTitle>
            <DialogDescription>
              Création interne (appel, mail, terrain). L'échéance SLA est calculée selon la priorité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-subject">Objet</Label>
              <Input
                id="create-subject"
                value={createForm.subject}
                onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Machine ne s'allume plus"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Détails du problème signalé..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select
                  value={createForm.priority}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['urgent', 'high', 'medium', 'low'].map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assigner à (optionnel)</Label>
              <Select
                value={createForm.assigned_to}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, assigned_to: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name ?? a.email ?? a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
