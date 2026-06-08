/**
 * SUIVI PATIENTS — check-ins signalés (back-office PSAD).
 *
 * - Les check-ins préoccupants (humeur ou confort masque faibles) remontent
 *   ici pour déclencher un rappel HUMAIN — c'est un outil de bienveillance,
 *   pas de surveillance : on rappelle pour aider, jamais pour reprocher.
 * - Bouton "Pris en charge" : trace qui a traité le signalement et quand.
 * - Stats simples (agrégats uniquement) : volume 7 jours, moyennes, en attente.
 *
 * Données réelles via src/utils/api.ts → routes /pro-checkin/*
 * (checkin-newsletter.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HeartHandshake, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
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

interface FlaggedCheckin {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  checkin_date: string;
  day_index: number;
  mood: number;
  mask_comfort: number;
  sleep_feeling: number;
  free_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

interface CheckinStats {
  total_checkins: number;
  flagged_pending: number;
  last_7_days: {
    count: number;
    avg_mood: number | null;
    avg_mask_comfort: number | null;
    avg_sleep_feeling: number | null;
  };
}

const LEVEL_LABELS = ['Difficile', 'Plutôt difficile', 'Moyen', 'Plutôt bien', 'Très bien'];

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'À suivre' },
  { value: 'handled', label: 'Pris en charge' },
  { value: 'all', label: 'Tous les signalements' },
];

function levelLabel(v: number): string {
  return LEVEL_LABELS[v - 1] ?? '—';
}

function formatDateFr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso.split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Réponse faible (1-2) mise en évidence — c'est le motif du signalement. */
function AnswerCell({ value }: { value: number }) {
  const low = value <= 2;
  return (
    <span className={low ? 'text-amber-700 font-medium' : 'text-muted-foreground'}>
      {levelLabel(value)}
    </span>
  );
}

export function SuiviPatients() {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<FlaggedCheckin[]>([]);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [flaggedRes, statsRes] = await Promise.allSettled([
        api.get(`/pro-checkin/flagged?status=${statusFilter}`),
        api.get('/pro-checkin/stats'),
      ]);
      if (flaggedRes.status === 'fulfilled') setCheckins(flaggedRes.value.checkins ?? []);
      else toast.error('Erreur lors du chargement des signalements', { description: flaggedRes.reason?.message });
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markHandled = async (checkin: FlaggedCheckin) => {
    setActingId(checkin.id);
    try {
      await api.patch(`/pro-checkin/${checkin.id}/handled`, {});
      toast.success('Signalement pris en charge');
      fetchData();
    } catch (e: any) {
      toast.error('Opération impossible', { description: e.message });
    } finally {
      setActingId(null);
    }
  };

  const statCards: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: 'À suivre',
      value: String(stats?.flagged_pending ?? '—'),
      hint: 'Signalements en attente de prise en charge',
    },
    {
      label: 'Check-ins (7 derniers jours)',
      value: String(stats?.last_7_days?.count ?? '—'),
    },
    {
      label: 'Humeur moyenne (7 j)',
      value: stats?.last_7_days?.avg_mood != null ? `${stats.last_7_days.avg_mood} / 5` : '—',
    },
    {
      label: 'Confort masque moyen (7 j)',
      value:
        stats?.last_7_days?.avg_mask_comfort != null
          ? `${stats.last_7_days.avg_mask_comfort} / 5`
          : '—',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Suivi patients</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Check-ins signalés (humeur ou confort masque faibles) — l'objectif est
              un rappel humain pour aider, jamais un reproche d'observance
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats (agrégats uniquement) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{s.value}</p>
                {s.hint && <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>}
              </CardContent>
            </Card>
          ))}
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

        {/* Tableau des signalements */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Jour de thérapie</TableHead>
                  <TableHead>Humeur</TableHead>
                  <TableHead>Confort masque</TableHead>
                  <TableHead>Sommeil</TableHead>
                  <TableHead>Mot du patient</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Chargement des signalements...
                    </TableCell>
                  </TableRow>
                ) : checkins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      <HeartHandshake className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      Aucun signalement pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : (
                  checkins.map((ck) => (
                    <TableRow key={ck.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateFr(ck.checkin_date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{ck.patient_name ?? 'Patient inconnu'}</div>
                        {ck.patient_email && (
                          <div className="text-xs text-muted-foreground">{ck.patient_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {ck.day_index > 0 ? `J${ck.day_index}` : '—'}
                      </TableCell>
                      <TableCell>
                        <AnswerCell value={ck.mood} />
                      </TableCell>
                      <TableCell>
                        <AnswerCell value={ck.mask_comfort} />
                      </TableCell>
                      <TableCell>
                        <AnswerCell value={ck.sleep_feeling} />
                      </TableCell>
                      <TableCell className="max-w-56">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {ck.free_note ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ck.handled_at ? (
                          <div>
                            <Badge variant="outline">Pris en charge</Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              le {formatDateFr(ck.handled_at)}
                            </div>
                          </div>
                        ) : (
                          <Badge>À suivre</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ck.handled_at ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={actingId === ck.id}
                            onClick={() => markHandled(ck)}
                          >
                            {actingId === ck.id ? 'En cours...' : 'Pris en charge'}
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
      </div>
    </div>
  );
}
