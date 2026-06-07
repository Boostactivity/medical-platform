/**
 * PLANNING TECHNICIENS — Vue jour / semaine des interventions (back-office PSAD).
 *
 * - Vue jour : interventions du jour ordonnées (matin / après-midi),
 *   filtrables par technicien
 * - Vue semaine : colonnes par technicien, lignes par jour
 * - Interventions colorées par type (installation, maintenance, dépannage,
 *   livraison masque, assistance téléphonique)
 * - Assignation intervention → technicien / date / créneau via dialog
 *
 * Données réelles via src/utils/api.ts → routes /planning/* (stock-parc.ts)
 * + GET /prestataire/interventions existante pour la liste des interventions
 * à planifier.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, ChevronLeft, ChevronRight, RefreshCw, UserRound } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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

interface Technician {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface PlanningIntervention {
  id: string;
  type: string;
  status: string;
  date: string | null;
  notes: string | null;
  patient_id: string;
  patient_name: string | null;
}

interface ScheduleEntry {
  id: string;
  technician_id: string;
  technician_name: string | null;
  intervention_id: string;
  scheduled_date: string;
  time_slot: 'morning' | 'afternoon';
  status: string;
  notes: string | null;
  intervention: PlanningIntervention | null;
}

interface AssignableIntervention {
  id: string;
  type: string;
  date: string | null;
  status: string;
  patient?: { user?: { name?: string | null } | null } | null;
}

const TYPE_CONFIG: Record<string, { label: string; className: string; border: string }> = {
  installation: {
    label: 'Installation',
    className: 'bg-blue-100 text-blue-700',
    border: 'border-l-blue-500',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-green-100 text-green-700',
    border: 'border-l-green-500',
  },
  repair: {
    label: 'Dépannage',
    className: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
  },
  mask_delivery: {
    label: 'Livraison masque',
    className: 'bg-purple-100 text-purple-700',
    border: 'border-l-purple-500',
  },
  phone_support: {
    label: 'Assistance téléphonique',
    className: 'bg-gray-100 text-gray-700',
    border: 'border-l-gray-400',
  },
};

const SLOT_LABELS: Record<string, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  confirmed: 'Confirmée',
  done: 'Effectuée',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Lundi de la semaine contenant la date donnée. */
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function EntryCard({ entry }: { entry: ScheduleEntry }) {
  const type = entry.intervention
    ? TYPE_CONFIG[entry.intervention.type] ?? {
        label: entry.intervention.type,
        className: 'bg-gray-100 text-gray-700',
        border: 'border-l-gray-400',
      }
    : { label: 'Intervention', className: 'bg-gray-100 text-gray-700', border: 'border-l-gray-400' };

  return (
    <div className={`border border-border border-l-4 ${type.border} rounded-md p-2.5 bg-card`}>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={type.className}>
          {type.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{SLOT_LABELS[entry.time_slot]}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium">
        {entry.intervention?.patient_name ?? 'Patient non renseigné'}
      </div>
      <div className="text-xs text-muted-foreground">
        {entry.technician_name ?? 'Technicien'} · {STATUS_LABELS[entry.status] ?? entry.status}
      </div>
      {entry.notes && <div className="text-xs text-muted-foreground mt-1">{entry.notes}</div>}
    </div>
  );
}

export function Planning() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [view, setView] = useState('day');

  // Vue jour
  const [day, setDay] = useState(todayISO());
  const [dayTechnician, setDayTechnician] = useState('all');
  const [dayEntries, setDayEntries] = useState<ScheduleEntry[]>([]);
  const [dayLoading, setDayLoading] = useState(true);

  // Vue semaine
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()));
  const [weekEntries, setWeekEntries] = useState<ScheduleEntry[]>([]);
  const [weekLoading, setWeekLoading] = useState(true);

  // Dialog assignation
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignable, setAssignable] = useState<AssignableIntervention[]>([]);
  const [assignForm, setAssignForm] = useState({
    intervention_id: '',
    technician_id: '',
    scheduled_date: todayISO(),
    time_slot: 'morning',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTechnicians = useCallback(async () => {
    try {
      const data = await api.get('/planning/technicians');
      setTechnicians(data.technicians ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des techniciens', { description: e.message });
    }
  }, []);

  const fetchDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const params = new URLSearchParams({ date: day });
      if (dayTechnician !== 'all') params.set('technician_id', dayTechnician);
      const data = await api.get(`/planning/day?${params.toString()}`);
      setDayEntries(data.entries ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement du planning', { description: e.message });
    } finally {
      setDayLoading(false);
    }
  }, [day, dayTechnician]);

  const fetchWeek = useCallback(async () => {
    setWeekLoading(true);
    try {
      const data = await api.get(`/planning/week?start=${weekStart}`);
      setWeekEntries(data.entries ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement de la semaine', { description: e.message });
    } finally {
      setWeekLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  const openAssign = async () => {
    setAssignOpen(true);
    try {
      const data = await api.get('/prestataire/interventions?status=scheduled');
      setAssignable(data.interventions ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des interventions', { description: e.message });
    }
  };

  const submitAssign = async () => {
    if (!assignForm.intervention_id || !assignForm.technician_id) {
      toast.error('Veuillez sélectionner une intervention et un technicien');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/planning/assign', {
        intervention_id: assignForm.intervention_id,
        technician_id: assignForm.technician_id,
        scheduled_date: assignForm.scheduled_date,
        time_slot: assignForm.time_slot,
        notes: assignForm.notes || undefined,
      });
      toast.success('Intervention planifiée');
      setAssignOpen(false);
      setAssignForm((f) => ({ ...f, intervention_id: '', notes: '' }));
      fetchDay();
      fetchWeek();
    } catch (e: any) {
      toast.error('Erreur lors de l’assignation', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Jour : groupé par créneau
  const morningEntries = dayEntries.filter((e) => e.time_slot === 'morning');
  const afternoonEntries = dayEntries.filter((e) => e.time_slot === 'afternoon');

  // Semaine : colonnes techniciens (ceux du référentiel + ceux présents dans les entrées)
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekColumns = useMemo(() => {
    const byTech = new Map<string, { id: string; name: string; entries: ScheduleEntry[] }>();
    for (const t of technicians) {
      byTech.set(t.id, { id: t.id, name: t.full_name ?? t.email ?? 'Technicien', entries: [] });
    }
    for (const entry of weekEntries) {
      if (!byTech.has(entry.technician_id)) {
        byTech.set(entry.technician_id, {
          id: entry.technician_id,
          name: entry.technician_name ?? 'Technicien',
          entries: [],
        });
      }
      byTech.get(entry.technician_id)!.entries.push(entry);
    }
    return [...byTech.values()];
  }, [technicians, weekEntries]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Planning techniciens</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interventions planifiées par jour et par semaine, assignation par créneau
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchDay();
                fetchWeek();
              }}
              disabled={dayLoading || weekLoading}
            >
              <RefreshCw className={`w-4 h-4 ${dayLoading || weekLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={openAssign}>
              <CalendarPlus className="w-4 h-4" />
              Planifier une intervention
            </Button>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView} defaultValue="day">
          <TabsList className="border-b border-border w-full justify-start">
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
          </TabsList>

          {/* ---- VUE JOUR ---- */}
          <TabsContent value="day" className="pt-4 space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setDay(addDays(day, -1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="date"
                  value={day}
                  onChange={(e) => e.target.value && setDay(e.target.value)}
                  className="w-44"
                />
                <Button variant="outline" size="sm" onClick={() => setDay(addDays(day, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Select value={dayTechnician} onValueChange={setDayTechnician}>
                <SelectTrigger className="w-56" size="sm">
                  <SelectValue placeholder="Technicien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les techniciens</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name ?? t.email ?? 'Technicien'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground capitalize">
                {formatDayLabel(day)} — {dayEntries.length} intervention
                {dayEntries.length > 1 ? 's' : ''}
              </span>
            </div>

            {dayLoading ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Chargement du planning...
                </CardContent>
              </Card>
            ) : dayEntries.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Aucune intervention planifiée pour cette journée.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Matin', entries: morningEntries },
                  { label: 'Après-midi', entries: afternoonEntries },
                ].map((slot) => (
                  <Card key={slot.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        {slot.label}{' '}
                        <span className="text-muted-foreground font-normal">
                          ({slot.entries.length})
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {slot.entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Aucune intervention.</p>
                      ) : (
                        slot.entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- VUE SEMAINE ---- */}
          <TabsContent value="week" className="pt-4 space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft className="w-4 h-4" />
                Semaine précédente
              </Button>
              <span className="text-sm font-medium">
                {formatDayLabel(weekStart)} — {formatDayLabel(addDays(weekStart, 6))}
              </span>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                Semaine suivante
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekStart(mondayOf(todayISO()))}
              >
                Cette semaine
              </Button>
            </div>

            {weekLoading ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Chargement de la semaine...
                </CardContent>
              </Card>
            ) : weekColumns.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Aucun technicien référencé. Les colonnes apparaîtront dès qu'un technicien sera
                  disponible.
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <div
                  className="grid gap-3 min-w-[640px]"
                  style={{
                    gridTemplateColumns: `repeat(${weekColumns.length}, minmax(220px, 1fr))`,
                  }}
                >
                  {weekColumns.map((col) => (
                    <Card key={col.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <UserRound className="w-4 h-4 text-[#007AFF]" />
                          {col.name}
                          <span className="text-muted-foreground font-normal ml-auto">
                            {col.entries.length}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {weekDays.map((d) => {
                          const entries = col.entries.filter((e) => e.scheduled_date === d);
                          if (entries.length === 0) return null;
                          return (
                            <div key={d}>
                              <div className="text-xs font-medium text-muted-foreground capitalize mb-1.5">
                                {formatDayLabel(d)}
                              </div>
                              <div className="space-y-2">
                                {entries.map((entry) => (
                                  <EntryCard key={entry.id} entry={entry} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {col.entries.length === 0 && (
                          <p className="text-sm text-muted-foreground py-2">
                            Aucune intervention cette semaine.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog assignation */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier une intervention</DialogTitle>
            <DialogDescription>
              Assignez une intervention à un technicien sur un créneau. Toute affectation
              précédente sera remplacée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Intervention</Label>
              <Select
                value={assignForm.intervention_id || undefined}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, intervention_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une intervention" />
                </SelectTrigger>
                <SelectContent>
                  {assignable.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Aucune intervention à planifier
                    </SelectItem>
                  ) : (
                    assignable.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {(TYPE_CONFIG[i.type]?.label ?? i.type) +
                          ' — ' +
                          (i.patient?.user?.name ?? 'Patient')}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Technicien</Label>
              <Select
                value={assignForm.technician_id || undefined}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, technician_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un technicien" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Aucun technicien disponible
                    </SelectItem>
                  ) : (
                    technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name ?? t.email ?? 'Technicien'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-date">Date</Label>
                <Input
                  id="assign-date"
                  type="date"
                  value={assignForm.scheduled_date}
                  onChange={(e) =>
                    e.target.value &&
                    setAssignForm((f) => ({ ...f, scheduled_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Créneau</Label>
                <Select
                  value={assignForm.time_slot}
                  onValueChange={(v) => setAssignForm((f) => ({ ...f, time_slot: v }))}
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
            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes</Label>
              <Input
                id="assign-notes"
                value={assignForm.notes}
                onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Précisions pour le technicien"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitAssign} disabled={submitting}>
              {submitting ? 'Planification...' : 'Planifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
