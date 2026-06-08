/**
 * SEGMENTS PATIENTS — cohortes dynamiques (back-office PSAD).
 *
 * - Liste des segments avec compteur de patients matchant (évalué en live
 *   côté serveur sur observance + statut thérapie).
 * - Clic sur un segment → liste des patients (lien vers la fiche).
 * - Création d'un segment via règles simples (selects) : bande d'observance,
 *   phase de traitement, ancienneté thérapie.
 *
 * Données réelles via src/utils/api.ts → routes /pro/segments/*
 * (segments-sav.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layers, Plus, RefreshCw, Trash2, Users, ChevronRight } from 'lucide-react';
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

interface SegmentRules {
  compliance_band?: string[];
  phase?: string[];
  therapy_max_days?: number;
  therapy_min_days?: number;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  color: string;
  rules: SegmentRules;
  is_dynamic: boolean;
  patient_count: number;
}

interface SegmentPatient {
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  phase: string | null;
  compliance_band: string | null;
  therapy_days: number | null;
}

const BAND_LABELS: Record<string, string> = {
  full: 'Observance complète',
  partial: 'Observance partielle',
  low: 'Observance faible',
  none: 'Aucun relevé',
};

const BAND_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  full: 'default',
  partial: 'secondary',
  low: 'destructive',
  none: 'outline',
};

const PHASE_LABELS: Record<string, string> = {
  initial: 'Phase initiale',
  maintenance: 'Entretien',
  stopped: 'Arrêté',
};

function rulesSummary(rules: SegmentRules): string {
  const parts: string[] = [];
  if (rules.compliance_band?.length) {
    parts.push(`Observance : ${rules.compliance_band.map((b) => BAND_LABELS[b] ?? b).join(', ')}`);
  }
  if (rules.phase?.length) {
    parts.push(`Phase : ${rules.phase.map((p) => PHASE_LABELS[p] ?? p).join(', ')}`);
  }
  if (typeof rules.therapy_max_days === 'number') {
    parts.push(`Thérapie ≤ ${rules.therapy_max_days} j`);
  }
  if (typeof rules.therapy_min_days === 'number') {
    parts.push(`Thérapie ≥ ${rules.therapy_min_days} j`);
  }
  return parts.length ? parts.join(' · ') : 'Aucun critère';
}

export function Segments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);

  // Détail (patients d'un segment)
  const [selected, setSelected] = useState<Segment | null>(null);
  const [patients, setPatients] = useState<SegmentPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#007AFF',
    band: 'any',
    phase: 'any',
    therapyMaxDays: '',
  });

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pro/segments');
      setSegments(res.segments ?? []);
      setTotalPatients(res.total_patients ?? 0);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des segments', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const openSegment = async (segment: Segment) => {
    setSelected(segment);
    setPatients([]);
    setPatientsLoading(true);
    try {
      const res = await api.get(`/pro/segments/${segment.id}/patients`);
      setPatients(res.patients ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des patients', { description: e.message });
    } finally {
      setPatientsLoading(false);
    }
  };

  const submitCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Veuillez saisir un nom de segment');
      return;
    }
    const rules: SegmentRules = {};
    if (form.band !== 'any') rules.compliance_band = [form.band];
    if (form.phase !== 'any') rules.phase = [form.phase];
    if (form.therapyMaxDays.trim()) {
      const n = parseInt(form.therapyMaxDays, 10);
      if (Number.isInteger(n) && n >= 0) rules.therapy_max_days = n;
    }
    if (Object.keys(rules).length === 0) {
      toast.error('Veuillez choisir au moins un critère (observance, phase ou ancienneté)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pro/segments', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        rules,
      });
      toast.success('Segment créé');
      setCreateOpen(false);
      setForm({ name: '', description: '', color: '#007AFF', band: 'any', phase: 'any', therapyMaxDays: '' });
      fetchSegments();
    } catch (e: any) {
      toast.error('Erreur lors de la création', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSegment = async (segment: Segment) => {
    if (!confirm(`Supprimer le segment « ${segment.name} » ?`)) return;
    try {
      await api.delete(`/pro/segments/${segment.id}`);
      toast.success('Segment supprimé');
      if (selected?.id === segment.id) setSelected(null);
      fetchSegments();
    } catch (e: any) {
      toast.error('Erreur lors de la suppression', { description: e.message });
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Segments patients</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cohortes dynamiques recalculées en continu sur l'observance et le statut de traitement
              {totalPatients > 0 ? ` — ${totalPatients} patients suivis` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSegments} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Nouveau segment
            </Button>
          </div>
        </div>

        {/* Cartes segments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <Card className="col-span-full">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Chargement des segments...
              </CardContent>
            </Card>
          ) : segments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucun segment. Créez votre premier segment pour cibler des cohortes de patients.
              </CardContent>
            </Card>
          ) : (
            segments.map((segment) => (
              <Card
                key={segment.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selected?.id === segment.id ? 'ring-2 ring-[#007AFF]' : ''
                }`}
                onClick={() => openSegment(segment)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="truncate">{segment.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{segment.patient_count}</span>
                    <span className="text-xs text-muted-foreground">
                      patient{segment.patient_count > 1 ? 's' : ''}
                    </span>
                  </div>
                  {segment.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {segment.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{rulesSummary(segment.rules)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[#007AFF] flex items-center gap-1">
                      Voir les patients <ChevronRight className="w-3 h-3" />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSegment(segment);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Patients du segment sélectionné */}
        {selected && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-[#007AFF]" />
                {selected.name}
                <Badge variant="secondary" className="ml-1">
                  {patients.length} patient{patients.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Observance (28 j)</TableHead>
                    <TableHead className="text-right">Ancienneté</TableHead>
                    <TableHead className="text-right">Fiche</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Chargement des patients...
                      </TableCell>
                    </TableRow>
                  ) : patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Aucun patient ne correspond actuellement à ce segment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    patients.map((p) => (
                      <TableRow key={p.patient_id}>
                        <TableCell>
                          <div className="font-medium">{p.patient_name ?? 'Patient'}</div>
                          {p.patient_email && (
                            <div className="text-xs text-muted-foreground">{p.patient_email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.phase ? (
                            <Badge variant="outline">{PHASE_LABELS[p.phase] ?? p.phase}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.compliance_band ? (
                            <Badge variant={BAND_VARIANT[p.compliance_band] ?? 'outline'}>
                              {BAND_LABELS[p.compliance_band] ?? p.compliance_band}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.therapy_days !== null ? `${p.therapy_days} j` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/pro/patients/${p.patient_id}`)}
                          >
                            Ouvrir <ChevronRight className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau segment</DialogTitle>
            <DialogDescription>
              Définissez une cohorte par règles. Le compteur se recalcule automatiquement à chaque
              consultation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="seg-name">Nom du segment</Label>
              <Input
                id="seg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Observance fragile en phase initiale"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seg-desc">Description (optionnelle)</Label>
              <Textarea
                id="seg-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="À quoi sert ce segment, comment l'utiliser..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bande d'observance</Label>
                <Select value={form.band} onValueChange={(v) => setForm((f) => ({ ...f, band: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Indifférente</SelectItem>
                    <SelectItem value="full">Complète (≥ 112 h)</SelectItem>
                    <SelectItem value="partial">Partielle (56-112 h)</SelectItem>
                    <SelectItem value="low">Faible (&lt; 56 h)</SelectItem>
                    <SelectItem value="none">Aucun relevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phase de traitement</Label>
                <Select value={form.phase} onValueChange={(v) => setForm((f) => ({ ...f, phase: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Indifférente</SelectItem>
                    <SelectItem value="initial">Phase initiale</SelectItem>
                    <SelectItem value="maintenance">Entretien</SelectItem>
                    <SelectItem value="stopped">Arrêté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="seg-days">Ancienneté max (jours)</Label>
                <Input
                  id="seg-days"
                  type="number"
                  min={0}
                  value={form.therapyMaxDays}
                  onChange={(e) => setForm((f) => ({ ...f, therapyMaxDays: e.target.value }))}
                  placeholder="ex. 30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seg-color">Couleur</Label>
                <Input
                  id="seg-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 p-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Laissez « Indifférente » et vide les critères non pertinents. Au moins un critère est
              requis.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitCreate} disabled={submitting}>
              {submitting ? 'Création...' : 'Créer le segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
