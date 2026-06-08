/**
 * EXPORTS CPAM — génération de l'agrégat conformité observance 112h/28j,
 * aperçu des lignes, téléchargement CSV, historique des exports générés.
 *
 * Données 100% réelles : l'agrégat est calculé côté serveur depuis
 * observance_periods + patient_therapy_status + lppr_codes (crm-exports.ts).
 * Aucun chiffre inventé : si une donnée manque, la cellule est vide.
 *
 * Téléchargement : GET /pro/exports/:id/csv (route protégée) via apiRaw →
 * Blob → ancre de téléchargement. Le CSV est régénéré depuis le payload stocké.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, History, Play, RefreshCw } from 'lucide-react';
import { api, apiRaw, ApiError } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportRun {
  id: string;
  period_start: string;
  period_end: string;
  kind: string;
  status: string;
  rows_count: number;
  generated_at: string;
}

const KIND_LABELS: Record<string, string> = {
  observance_112_28: 'Observance 112h / 28j',
  facturation: 'Facturation',
  activite: 'Activité',
};

const BAND_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  full: 'default',
  partial: 'secondary',
  low: 'destructive',
  none: 'outline',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end.getTime() - 27 * 24 * 60 * 60 * 1000); // fenêtre 28 jours
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function ExportsCpam() {
  const initial = useMemo(defaultPeriod, []);
  const [kind, setKind] = useState('observance_112_28');
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);

  const [generating, setGenerating] = useState(false);
  const [columns, setColumns] = useState<ExportColumn[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<ExportRun | null>(null);

  const [runs, setRuns] = useState<ExportRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const res = await api.get('/pro/exports/runs');
      setRuns(res.runs ?? []);
    } catch (e: any) {
      toast.error('Échec du chargement de l’historique', { description: e.message });
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const generate = async () => {
    if (kind !== 'observance_112_28') {
      toast.info('Type d’export à venir', {
        description: 'Seul l’export observance 112h / 28j est disponible pour le moment.',
      });
      return;
    }
    if (periodStart > periodEnd) {
      toast.error('La date de début doit précéder la date de fin');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/pro/exports/observance-112-28', {
        period_start: periodStart,
        period_end: periodEnd,
      });
      setColumns(res.columns ?? []);
      setRows(res.rows ?? []);
      setLastRun(res.run ?? null);
      toast.success(`Export généré : ${res.rows?.length ?? 0} ligne(s)`);
      fetchRuns();
    } catch (e: any) {
      toast.error('Échec de la génération', { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = async (runId: string, filenameHint: string) => {
    setDownloadingId(runId);
    try {
      const response = await apiRaw(`/pro/exports/${runId}/csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenameHint}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('CSV téléchargé');
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : e?.message ?? 'Erreur inconnue';
      toast.error('Échec du téléchargement', { description: msg });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Exports CPAM</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Générez l’agrégat de conformité d’observance et téléchargez le CSV. Les chiffres
              proviennent exclusivement des fenêtres d’observance enregistrées.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRuns} disabled={runsLoading}>
            <RefreshCw className={`w-4 h-4 ${runsLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Générateur */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#007AFF]" />
              Générer un export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Type d’export</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observance_112_28">Observance 112h / 28j</SelectItem>
                    <SelectItem value="facturation" disabled>
                      Facturation (à venir)
                    </SelectItem>
                    <SelectItem value="activite" disabled>
                      Activité (à venir)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-start">Période — début</Label>
                <Input
                  id="exp-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-end">Période — fin</Label>
                <Input
                  id="exp-end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button onClick={generate} disabled={generating}>
                <Play className="w-4 h-4" />
                {generating ? 'Génération...' : 'Générer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aperçu des lignes */}
        {(rows.length > 0 || lastRun) && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Aperçu — {rows.length} ligne{rows.length > 1 ? 's' : ''}
              </CardTitle>
              {lastRun && (
                <Button
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      lastRun.id,
                      `export_${lastRun.kind}_${lastRun.period_start}_${lastRun.period_end}`,
                    )
                  }
                  disabled={downloadingId === lastRun.id}
                >
                  <Download className="w-4 h-4" />
                  Télécharger le CSV
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Aucune fenêtre d’observance sur cette période. Rien à exporter — c’est un état
                  réel, pas une erreur.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={row.patient_id ?? i}>
                          {columns.map((col) => (
                            <TableCell key={col.key}>
                              {col.key === 'compliance_band' ? (
                                <Badge variant={BAND_VARIANT[row[col.key]] ?? 'outline'}>
                                  {row[col.key] ?? '—'}
                                </Badge>
                              ) : row[col.key] === null || row[col.key] === undefined || row[col.key] === '' ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                String(row[col.key])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="w-4 h-4 text-[#007AFF]" />
              Historique des exports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Lignes</TableHead>
                  <TableHead>Généré le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Chargement de l’historique...
                    </TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Aucun export généré pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant="secondary">{KIND_LABELS[run.kind] ?? run.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {run.period_start} → {run.period_end}
                      </TableCell>
                      <TableCell className="text-right">{run.rows_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(run.generated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            downloadCsv(
                              run.id,
                              `export_${run.kind}_${run.period_start}_${run.period_end}`,
                            )
                          }
                          disabled={downloadingId === run.id}
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </Button>
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
