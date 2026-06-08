/**
 * COMPARAISON AGENCES — tableau + graphique comparant les agences du tenant.
 *
 * Métriques réelles (crm-exports.ts → GET /pro/agences/comparaison) :
 *   - nb patients rattachés (via machines installées → agency_id)
 *   - observance moyenne (dernière fenêtre 28j des patients de l'agence)
 *   - nb interventions sur la période
 *   - CA LPPR (somme des lignes payées / transmises)
 *
 * Honnêteté des chiffres : le schéma n'a pas de lien direct patient ↔ agence.
 * Le rattachement est dérivé des machines installées ; les patients non
 * rattachables apparaissent dans une ligne "Non rattaché" et l'observance
 * moyenne est NULL si aucun patient n'est rattachable à l'agence.
 *
 * États vides honnêtes : une seule agence ou aucune donnée → message clair.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Info, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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

interface AgencyRow {
  agency_id: string | null;
  agency_name: string;
  city: string | null;
  patients_count: number;
  observance_avg: number | null;
  observance_patients: number;
  interventions_count: number;
  ca_lppr: number;
  ca_lines: number;
}

interface ComparisonResponse {
  agencies: AgencyRow[];
  period: { start: string; end: string };
  tenant_observance_avg: number | null;
  agencies_count: number;
  attachment_available: boolean;
}

type Metric = 'patients_count' | 'observance_avg' | 'interventions_count' | 'ca_lppr';

const METRIC_CONFIG: Record<Metric, { label: string; color: string; unit?: string }> = {
  patients_count: { label: 'Patients', color: '#007AFF' },
  observance_avg: { label: 'Observance moyenne (h/28j)', color: '#34C759' },
  interventions_count: { label: 'Interventions', color: '#FF9500' },
  ca_lppr: { label: 'CA LPPR (€)', color: '#AF52DE' },
};

function formatEuro(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function ComparaisonAgences() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [metric, setMetric] = useState<Metric>('patients_count');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pro/agences/comparaison');
      setData(res);
    } catch (e: any) {
      toast.error('Échec du chargement de la comparaison', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agences réelles uniquement (hors "Non rattaché") pour le graphique
  const realAgencies = (data?.agencies ?? []).filter((a) => a.agency_id !== null);
  const chartData = realAgencies
    .map((a) => ({
      name: a.agency_name,
      patients_count: a.patients_count,
      observance_avg: a.observance_avg ?? 0,
      interventions_count: a.interventions_count,
      ca_lppr: a.ca_lppr,
    }))
    .filter((d) => metric !== 'observance_avg' || realAgencies.some((a) => a.observance_avg !== null));

  const hasMultipleAgencies = realAgencies.length >= 2;
  const hasAnyData = (data?.agencies ?? []).some(
    (a) =>
      a.patients_count > 0 ||
      a.interventions_count > 0 ||
      a.ca_lppr > 0 ||
      a.observance_avg !== null,
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Comparaison des agences</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Patients, observance, interventions et CA LPPR par agence
              {data?.period ? ` — interventions du ${data.period.start} au ${data.period.end}` : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Bandeau honnêteté rattachement */}
        {data && !data.attachment_available && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-3 flex items-start gap-2 text-sm text-blue-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Aucun rattachement patient ↔ agence n’a pu être établi (les machines installées ne
                sont pas affectées à une agence). Les métriques par agence restent à 0 ; la moyenne
                d’observance du parc global est de{' '}
                {data.tenant_observance_avg !== null
                  ? `${data.tenant_observance_avg} h / 28j`
                  : 'non disponible'}
                .
              </span>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Chargement de la comparaison...
            </CardContent>
          </Card>
        ) : !data || data.agencies_count === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucune agence enregistrée. Créez au moins une agence pour activer la comparaison.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Graphique */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-sm font-medium">Comparaison visuelle</CardTitle>
                <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                  <SelectTrigger className="w-64" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {METRIC_CONFIG[m].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {!hasMultipleAgencies ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Une seule agence : la comparaison visuelle nécessite au moins deux agences.
                  </div>
                ) : !hasAnyData ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Aucune donnée à comparer pour le moment.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" allowDecimals={false} />
                        <Tooltip
                          formatter={(value: number) =>
                            metric === 'ca_lppr' ? formatEuro(value) : value
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey={metric}
                          name={METRIC_CONFIG[metric].label}
                          fill={METRIC_CONFIG[metric].color}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={64}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tableau */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agence</TableHead>
                      <TableHead className="text-right">Patients</TableHead>
                      <TableHead className="text-right">Observance moy.</TableHead>
                      <TableHead className="text-right">Interventions</TableHead>
                      <TableHead className="text-right">CA LPPR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.agencies.map((a) => (
                      <TableRow key={a.agency_id ?? '__none__'}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            {a.agency_id !== null && (
                              <Building2 className="w-4 h-4 text-[#007AFF]" />
                            )}
                            {a.agency_name}
                            {a.agency_id === null && (
                              <Badge variant="outline" className="ml-1">
                                Hors agence
                              </Badge>
                            )}
                          </div>
                          {a.city && (
                            <div className="text-xs text-muted-foreground">{a.city}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{a.patients_count}</TableCell>
                        <TableCell className="text-right">
                          {a.observance_avg !== null ? (
                            <span>
                              {a.observance_avg} h
                              <span className="text-xs text-muted-foreground">
                                {' '}
                                ({a.observance_patients})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{a.interventions_count}</TableCell>
                        <TableCell className="text-right">
                          {a.ca_lines > 0 ? (
                            formatEuro(a.ca_lppr)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {data.tenant_observance_avg !== null && (
              <p className="text-xs text-muted-foreground">
                Référence parc global : observance moyenne de {data.tenant_observance_avg} h / 28j
                (dernière fenêtre par patient). La colonne « Observance moy. » indique entre
                parenthèses le nombre de patients rattachés ayant un relevé.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
