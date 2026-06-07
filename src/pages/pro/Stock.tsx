/**
 * STOCK — Gestion du stock consommables par agence (back-office PSAD).
 *
 * - Vue agrégée par agence (cartes) + alerte items sous seuil de rupture
 * - Tableau dense triable (pattern Linear) : article, catégorie, agence,
 *   lot, quantité, seuil
 * - Entrées / sorties / ajustements via dialog (traçés côté serveur
 *   dans stock_movements)
 *
 * Données réelles via src/utils/api.ts → routes /stock/* (stock-parc.ts).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  PackagePlus,
  PackageMinus,
  Plus,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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

interface StockItem {
  id: string;
  type: string;
  name: string;
  size: string | null;
  manufacturer: string | null;
  reference: string | null;
  stock_quantity: number;
  reorder_threshold: number;
  unit_price_ht: number | null;
  agency_id: string | null;
  agency_name: string;
  lot_number: string | null;
  below_threshold: boolean;
}

interface AgencyBucket {
  agency_id: string | null;
  agency_name: string;
  items_count: number;
  total_quantity: number;
  below_threshold_count: number;
  stock_value_ht: number;
}

interface Agency {
  id: string;
  name: string;
  city: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  mask_nasal: 'Masque nasal',
  mask_facial: 'Masque facial',
  mask_narinaire: 'Masque narinaire',
  filter: 'Filtre',
  tube: 'Tubulure',
  humidifier: 'Humidificateur',
  headgear: 'Harnais',
};

type SortKey = 'name' | 'type' | 'agency_name' | 'stock_quantity' | 'reorder_threshold';

export function Stock() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buckets, setBuckets] = useState<AgencyBucket[]>([]);
  const [belowThreshold, setBelowThreshold] = useState<StockItem[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Dialogs
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryTarget, setEntryTarget] = useState<StockItem | null>(null); // null = nouvel article
  const [exitTarget, setExitTarget] = useState<StockItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formulaires
  const [form, setForm] = useState({
    name: '',
    type: 'mask_nasal',
    size: '',
    manufacturer: '',
    reference: '',
    agency_id: '',
    reorder_threshold: '10',
    quantity: '1',
    lot_number: '',
    reason: '',
    movement: 'out' as 'out' | 'adjust',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agencyFilter !== 'all') params.set('agency_id', agencyFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const qs = params.toString();

      const [overview, list] = await Promise.all([
        api.get('/stock/overview'),
        api.get(`/stock/items${qs ? `?${qs}` : ''}`),
      ]);

      setBuckets(overview.agencies ?? []);
      setBelowThreshold(overview.below_threshold ?? []);
      setItems(list.items ?? []);
      setAgencies(list.agencies ?? []);
    } catch (e: any) {
      toast.error('Erreur lors du chargement du stock', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [agencyFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'fr');
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [items, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const openEntry = (item: StockItem | null) => {
    setEntryTarget(item);
    setForm((f) => ({
      ...f,
      name: '',
      type: 'mask_nasal',
      size: '',
      manufacturer: '',
      reference: '',
      agency_id: '',
      reorder_threshold: '10',
      quantity: '1',
      lot_number: '',
      reason: '',
    }));
    setEntryOpen(true);
  };

  const openExit = (item: StockItem) => {
    setExitTarget(item);
    setForm((f) => ({ ...f, quantity: '1', lot_number: '', reason: '', movement: 'out' }));
  };

  const submitEntry = async () => {
    const quantity = parseInt(form.quantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }
    if (!entryTarget && !form.name.trim()) {
      toast.error('Veuillez saisir le nom de l’article');
      return;
    }
    setSubmitting(true);
    try {
      if (entryTarget) {
        await api.post('/stock/items', {
          consumable_id: entryTarget.id,
          quantity,
          lot_number: form.lot_number || undefined,
          reason: form.reason || undefined,
        });
      } else {
        await api.post('/stock/items', {
          type: form.type,
          name: form.name.trim(),
          size: form.size || undefined,
          manufacturer: form.manufacturer || undefined,
          reference: form.reference || undefined,
          agency_id: form.agency_id || undefined,
          reorder_threshold: parseInt(form.reorder_threshold, 10) || 10,
          quantity,
          lot_number: form.lot_number || undefined,
        });
      }
      toast.success('Entrée de stock enregistrée');
      setEntryOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error('Erreur lors de l’enregistrement', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitExit = async () => {
    if (!exitTarget) return;
    const quantity = parseInt(form.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/stock/items/${exitTarget.id}`, {
        movement: form.movement,
        quantity,
        lot_number: form.lot_number || undefined,
        reason: form.reason || undefined,
      });
      toast.success(form.movement === 'out' ? 'Sortie de stock enregistrée' : 'Ajustement enregistré');
      setExitTarget(null);
      fetchData();
    } catch (e: any) {
      toast.error('Erreur lors de l’enregistrement', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Stock</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consommables par agence, seuils de rupture et mouvements tracés
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={() => openEntry(null)}>
              <Plus className="w-4 h-4" />
              Nouvel article
            </Button>
          </div>
        </div>

        {/* Vue par agence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {buckets.length === 0 && !loading ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Aucun article en stock. Ajoutez un premier article pour démarrer le suivi.
              </CardContent>
            </Card>
          ) : (
            buckets.map((bucket) => (
              <Card key={bucket.agency_id ?? 'none'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#007AFF]" />
                    {bucket.agency_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{bucket.total_quantity}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {bucket.items_count} référence{bucket.items_count > 1 ? 's' : ''}
                  </div>
                  {bucket.below_threshold_count > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      {bucket.below_threshold_count} sous seuil
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Alertes rupture */}
        {belowThreshold.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                <TriangleAlert className="w-4 h-4" />
                {belowThreshold.length} article{belowThreshold.length > 1 ? 's' : ''} sous le seuil
                de rupture
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {belowThreshold.map((item) => (
                <Badge key={item.id} variant="outline" className="border-orange-300 text-orange-800">
                  {item.name}
                  {item.size ? ` (${item.size})` : ''} — {item.stock_quantity} restant
                  {item.stock_quantity > 1 ? 's' : ''} / seuil {item.reorder_threshold}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filtres */}
        <div className="flex gap-3 flex-wrap">
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue placeholder="Agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              <SelectItem value="none">Non affecté</SelectItem>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-56" size="sm">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
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
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort('name')}
                    >
                      Article <SortIcon column="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort('type')}
                    >
                      Catégorie <SortIcon column="type" />
                    </button>
                  </TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort('agency_name')}
                    >
                      Agence <SortIcon column="agency_name" />
                    </button>
                  </TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                      onClick={() => toggleSort('stock_quantity')}
                    >
                      Quantité <SortIcon column="stock_quantity" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1 ml-auto hover:text-foreground"
                      onClick={() => toggleSort('reorder_threshold')}
                    >
                      Seuil <SortIcon column="reorder_threshold" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Chargement du stock...
                    </TableCell>
                  </TableRow>
                ) : sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Aucun article ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        {item.reference && (
                          <div className="text-xs text-muted-foreground">
                            {item.manufacturer ? `${item.manufacturer} · ` : ''}
                            {item.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{CATEGORY_LABELS[item.type] ?? item.type}</Badge>
                      </TableCell>
                      <TableCell>{item.size ?? '—'}</TableCell>
                      <TableCell>{item.agency_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.lot_number ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.below_threshold ? 'text-red-600 font-semibold' : ''}>
                          {item.stock_quantity}
                        </span>
                        {item.below_threshold && (
                          <Badge variant="destructive" className="ml-2">
                            Sous seuil
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.reorder_threshold}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEntry(item)}>
                            <PackagePlus className="w-4 h-4" />
                            Entrée
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openExit(item)}>
                            <PackageMinus className="w-4 h-4" />
                            Sortie
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog entrée / nouvel article */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {entryTarget ? `Entrée de stock — ${entryTarget.name}` : 'Nouvel article'}
            </DialogTitle>
            <DialogDescription>
              {entryTarget
                ? 'Ajoutez une quantité au stock existant. Le mouvement sera tracé.'
                : 'Créez une référence et enregistrez sa première entrée en stock.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!entryTarget && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="stock-name">Nom de l'article</Label>
                  <Input
                    id="stock-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Masque nasal AirFit N20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Catégorie</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
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
                    <Label htmlFor="stock-size">Taille</Label>
                    <Input
                      id="stock-size"
                      value={form.size}
                      onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                      placeholder="S / M / L"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="stock-manufacturer">Fabricant</Label>
                    <Input
                      id="stock-manufacturer"
                      value={form.manufacturer}
                      onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                      placeholder="ResMed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock-reference">Référence</Label>
                    <Input
                      id="stock-reference"
                      value={form.reference}
                      onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="AF-N20-M"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Agence</Label>
                    <Select
                      value={form.agency_id || 'none'}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, agency_id: v === 'none' ? '' : v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non affecté</SelectItem>
                        {agencies.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock-threshold">Seuil de rupture</Label>
                    <Input
                      id="stock-threshold"
                      type="number"
                      min={0}
                      value={form.reorder_threshold}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, reorder_threshold: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stock-quantity">Quantité</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-lot">N° de lot</Label>
                <Input
                  id="stock-lot"
                  value={form.lot_number}
                  onChange={(e) => setForm((f) => ({ ...f, lot_number: e.target.value }))}
                  placeholder="LOT-2026-001"
                />
              </div>
            </div>
            {entryTarget && (
              <div className="space-y-1.5">
                <Label htmlFor="stock-reason">Motif</Label>
                <Input
                  id="stock-reason"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Réception commande fournisseur"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitEntry} disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer l’entrée'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sortie / ajustement */}
      <Dialog open={!!exitTarget} onOpenChange={(open) => !open && setExitTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sortie / Ajustement — {exitTarget?.name}</DialogTitle>
            <DialogDescription>
              Stock actuel : {exitTarget?.stock_quantity}. Le mouvement sera tracé avec lot et
              motif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type de mouvement</Label>
              <Select
                value={form.movement}
                onValueChange={(v) => setForm((f) => ({ ...f, movement: v as 'out' | 'adjust' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="out">Sortie (quantité retirée)</SelectItem>
                  <SelectItem value="adjust">Ajustement (nouvelle quantité totale)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exit-quantity">
                  {form.movement === 'out' ? 'Quantité sortie' : 'Nouvelle quantité'}
                </Label>
                <Input
                  id="exit-quantity"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-lot">N° de lot / série</Label>
                <Input
                  id="exit-lot"
                  value={form.lot_number}
                  onChange={(e) => setForm((f) => ({ ...f, lot_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-reason">Motif</Label>
              <Input
                id="exit-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder={
                  form.movement === 'out' ? 'Installation patient' : 'Inventaire physique'
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitExit} disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
