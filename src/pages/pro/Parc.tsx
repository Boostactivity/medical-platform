/**
 * PARC MACHINES — Vue du parc PPC (back-office PSAD).
 *
 * - Compteurs parc en StatCards : total / en stock / installées /
 *   en panne / à retourner
 * - Tableau machines : n° série, modèle, agence, patient assigné,
 *   masque (badge orange si âge > 90 j), consommables, statut
 * - Filtre par statut + section machines orphelines (déclarées actives
 *   sans assignation patient vivante)
 *
 * Données réelles via src/utils/api.ts → routes /parc/* (stock-parc.ts).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Archive,
  MonitorCog,
  PackageOpen,
  RefreshCw,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { api } from '../../utils/api';
import { StatCard } from '../../components/dashboard/StatCard';
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

interface ParcCounters {
  total: number;
  en_stock: number;
  installees: number;
  en_panne: number;
  a_retourner: number;
}

interface MachineAssignment {
  id: string;
  assigned_at: string | null;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  mask_model: string | null;
  mask_size: string | null;
  mask_assigned_at: string | null;
  mask_age_days: number | null;
  mask_overdue: boolean;
  filter_changed_at: string | null;
  filter_age_days: number | null;
  tubing_changed_at: string | null;
  tubing_age_days: number | null;
}

interface Machine {
  id: string;
  serial_number: string;
  lot_number: string | null;
  manufacturer: string;
  model: string;
  status: string;
  agency_id: string | null;
  agency_name: string;
  next_maintenance_due: string | null;
  assignment: MachineAssignment | null;
}

interface OrphanDevice {
  id: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  status: string;
  agency_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  stock: { label: 'En stock', className: 'bg-blue-100 text-blue-700' },
  active: { label: 'Installée', className: 'bg-green-100 text-green-700' },
  maintenance: { label: 'Maintenance', className: 'bg-orange-100 text-orange-700' },
  defective: { label: 'En panne', className: 'bg-red-100 text-red-700' },
  retired: { label: 'À retourner', className: 'bg-gray-200 text-gray-700' },
};

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR');
}

export function Parc() {
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<ParcCounters | null>(null);
  const [orphans, setOrphans] = useState<OrphanDevice[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        api.get('/parc/overview'),
        api.get(`/parc/machines${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`),
      ]);
      setCounters(overview.counters ?? null);
      setOrphans(overview.orphans ?? []);
      setMachines(list.machines ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement du parc', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Parc machines</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Machines PPC, assignations patients et suivi des consommables
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Compteurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total parc" value={counters?.total ?? 0} icon={MonitorCog} color="blue" />
          <StatCard title="En stock" value={counters?.en_stock ?? 0} icon={PackageOpen} color="blue" />
          <StatCard title="Installées" value={counters?.installees ?? 0} icon={Activity} color="green" />
          <StatCard title="En panne" value={counters?.en_panne ?? 0} icon={TriangleAlert} color="red" />
          <StatCard title="À retourner" value={counters?.a_retourner ?? 0} icon={Undo2} color="orange" />
        </div>

        {/* Machines orphelines */}
        {orphans.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                <TriangleAlert className="w-4 h-4" />
                {orphans.length} machine{orphans.length > 1 ? 's' : ''} orpheline
                {orphans.length > 1 ? 's' : ''} — statut « Installée » sans patient assigné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {orphans.map((d) => (
                  <Badge key={d.id} variant="outline" className="border-orange-300 text-orange-800">
                    {d.serial_number} · {d.manufacturer} {d.model} · {d.agency_name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-3">
                Vérifiez ces machines : réaffectez-les à un patient ou repassez-les en stock.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filtre statut */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tableau machines */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° de série</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Agence</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Masque</TableHead>
                  <TableHead>Filtre / Tubulure</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Chargement du parc...
                    </TableCell>
                  </TableRow>
                ) : machines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Aucune machine ne correspond à ce filtre.
                    </TableCell>
                  </TableRow>
                ) : (
                  machines.map((machine) => {
                    const status = STATUS_CONFIG[machine.status] ?? {
                      label: machine.status,
                      className: 'bg-gray-100 text-gray-700',
                    };
                    const a = machine.assignment;
                    return (
                      <TableRow key={machine.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{machine.serial_number}</div>
                          {machine.lot_number && (
                            <div className="text-xs text-muted-foreground">
                              Lot {machine.lot_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{machine.model}</div>
                          <div className="text-xs text-muted-foreground">{machine.manufacturer}</div>
                        </TableCell>
                        <TableCell>{machine.agency_name}</TableCell>
                        <TableCell>
                          {a ? (
                            <div>
                              <div className="font-medium">{a.patient_name ?? 'Patient inconnu'}</div>
                              <div className="text-xs text-muted-foreground">
                                Depuis le {formatDate(a.assigned_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a?.mask_model ? (
                            <div>
                              <div className="text-sm">
                                {a.mask_model}
                                {a.mask_size ? ` (${a.mask_size})` : ''}
                              </div>
                              {a.mask_age_days !== null && (
                                <Badge
                                  variant="outline"
                                  className={
                                    a.mask_overdue
                                      ? 'mt-1 border-orange-400 bg-orange-100 text-orange-800'
                                      : 'mt-1 text-muted-foreground'
                                  }
                                >
                                  {a.mask_age_days} j{a.mask_overdue ? ' — à remplacer' : ''}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a ? (
                            <>
                              <div>
                                Filtre :{' '}
                                {a.filter_age_days !== null ? `${a.filter_age_days} j` : '—'}
                              </div>
                              <div>
                                Tubulure :{' '}
                                {a.tubing_age_days !== null ? `${a.tubing_age_days} j` : '—'}
                              </div>
                            </>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {!loading && machines.length === 0 && statusFilter === 'all' && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Archive className="w-8 h-8 mx-auto mb-3 opacity-40" />
              Le parc est vide. Les machines apparaîtront ici dès leur enregistrement dans la base.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
