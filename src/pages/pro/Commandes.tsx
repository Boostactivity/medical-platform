/**
 * COMMANDES PATIENT — file de traitement back-office (PSAD).
 *
 * - File des commandes de consommables passées par les patients via
 *   leur espace, filtrable par statut.
 * - Transitions de statut : confirmée → en préparation → expédiée →
 *   livrée ; annulation possible jusqu'à la préparation incluse.
 *
 * Données réelles via src/utils/api.ts → routes /pro-services/commandes
 * (patient-services.ts).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Package, RefreshCw } from 'lucide-react';
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

interface OrderItem {
  id: string;
  item_label: string;
  quantity: number;
  covered_by_insurance: boolean;
}

interface PatientOrder {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  status: string;
  note: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_META: Record<string, { label: string; badge: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', badge: 'outline' },
  confirmed: { label: 'Confirmée', badge: 'default' },
  preparing: { label: 'En préparation', badge: 'secondary' },
  shipped: { label: 'Expédiée', badge: 'secondary' },
  delivered: { label: 'Livrée', badge: 'outline' },
  cancelled: { label: 'Annulée', badge: 'outline' },
};

// Prochaine action proposée par statut (transitions du serveur)
const NEXT_ACTIONS: Record<string, Array<{ to: string; label: string; variant: 'default' | 'ghost' }>> = {
  confirmed: [
    { to: 'preparing', label: 'Préparer', variant: 'default' },
    { to: 'cancelled', label: 'Annuler', variant: 'ghost' },
  ],
  preparing: [
    { to: 'shipped', label: 'Expédier', variant: 'default' },
    { to: 'cancelled', label: 'Annuler', variant: 'ghost' },
  ],
  shipped: [{ to: 'delivered', label: 'Marquer livrée', variant: 'default' }],
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
];

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommandesPro() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PatientOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/pro-services/commandes${qs}`);
      setOrders(res.orders ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement des commandes', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const counters = useMemo(() => {
    const active = orders.filter((o) => ['confirmed', 'preparing', 'shipped'].includes(o.status));
    return { active: active.length, total: orders.length };
  }, [orders]);

  const transition = async (order: PatientOrder, to: string) => {
    setActingId(order.id);
    try {
      await api.patch(`/pro-services/commandes/${order.id}`, { status: to });
      toast.success(`Commande ${STATUS_META[to]?.label.toLowerCase() ?? to}`);
      fetchData();
    } catch (e: any) {
      toast.error('Transition impossible', { description: e.message });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Commandes patient</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consommables commandés depuis l'espace patient — {counters.active} en cours
              sur {counters.total} affichées
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
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Note patient</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Chargement des commandes...
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      Aucune commande pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const meta = STATUS_META[order.status] ?? {
                      label: order.status,
                      badge: 'outline' as const,
                    };
                    const actions = NEXT_ACTIONS[order.status] ?? [];
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTimeFr(order.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.patient_name ?? 'Patient inconnu'}</div>
                          {order.patient_email && (
                            <div className="text-xs text-muted-foreground">{order.patient_email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-0.5">
                            {order.items.map((item) => (
                              <li key={item.id} className="text-sm">
                                {item.item_label}{' '}
                                <span className="text-muted-foreground">× {item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell className="max-w-56">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {order.note ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.badge}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {actions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex justify-end gap-1">
                              {actions.map((action) => (
                                <Button
                                  key={action.to}
                                  variant={action.variant}
                                  size="sm"
                                  disabled={actingId === order.id}
                                  onClick={() => transition(order, action.to)}
                                >
                                  {action.label}
                                </Button>
                              ))}
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
    </div>
  );
}
