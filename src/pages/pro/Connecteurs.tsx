/**
 * /pro/connecteurs — Connecteurs d'extraction télésuivi.
 *
 * Idée produit : le PSAD possède DÉJÀ ses identifiants sur les portails
 * fabricants (ResMed AirView, Philips Care Orchestrator, Löwenstein
 * prisma CLOUD). Le worker (apps/connector-worker, installé chez le
 * PSAD ou sur son serveur) extrait ces données avec SES identifiants
 * plusieurs fois par jour et les pousse vers la plateforme — qui ne
 * voit jamais les credentials en clair (chiffrés AES-256-GCM avec une
 * clé locale au worker).
 *
 * Cette page : liste des connecteurs (statut dernier run), toggle
 * actif, ajout (provider + label + horaires), historique des runs,
 * encart pédagogique 3 étapes.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Cable,
  CheckCircle2,
  Clock,
  Download,
  FolderOpen,
  KeyRound,
  Plus,
  RefreshCw,
  Satellite,
  XCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';

// ----------------------------------------------------------------------
// Types & libellés
// ----------------------------------------------------------------------

type Provider = 'airview' | 'care_orchestrator' | 'prisma_cloud' | 'csv_watch';
type RunStatus = 'running' | 'success' | 'partial' | 'failed';

interface ConnectorConfig {
  id: string;
  provider: Provider;
  label: string;
  schedule_times: string[];
  options: Record<string, unknown> | null;
  enabled: boolean;
  has_credentials: boolean;
  last_run_at: string | null;
  last_run_status: RunStatus | null;
  last_run_detail: string | null;
  created_at: string;
}

interface ConnectorRun {
  id: string;
  config_id: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  records_ingested: number;
  error: string | null;
  connector_configs: { label: string; provider: Provider } | null;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  airview: 'ResMed AirView',
  care_orchestrator: 'Philips Care Orchestrator',
  prisma_cloud: 'Löwenstein prisma CLOUD',
  csv_watch: 'Dossier local (CSV / exports)',
};

const PROVIDER_HINTS: Record<Provider, string> = {
  airview:
    'Extraction automatisée du portail AirView avec vos identifiants prestataire. Flow à calibrer lors de la première mise en service avec vous.',
  care_orchestrator:
    'Plugin en préparation — utilisez le connecteur « Dossier local » avec l’auto-export Care Orchestrator en attendant.',
  prisma_cloud:
    'Plugin en préparation — utilisez le connecteur « Dossier local » avec vos exports prisma CLOUD en attendant.',
  csv_watch:
    'Le worker surveille un dossier de votre machine : déposez-y vos exports portail (CSV, JSON, XML), ils sont ingérés automatiquement. Opérationnel immédiatement.',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RunStatusBadge({ status }: { status: RunStatus | null }) {
  if (!status) {
    return <Badge variant="outline" className="text-muted-foreground">Jamais exécuté</Badge>;
  }
  switch (status) {
    case 'success':
      return (
        <Badge className="border-transparent bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="size-3" /> Succès
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-800">Partiel</Badge>
      );
    case 'failed':
      return (
        <Badge className="border-transparent bg-red-100 text-red-800">
          <XCircle className="size-3" /> Échec
        </Badge>
      );
    case 'running':
      return (
        <Badge className="border-transparent bg-blue-100 text-blue-800">
          <RefreshCw className="size-3" /> En cours
        </Badge>
      );
  }
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export function Connecteurs() {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [runs, setRuns] = useState<ConnectorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire d'ajout
  const [newProvider, setNewProvider] = useState<Provider>('csv_watch');
  const [newLabel, setNewLabel] = useState('');
  const [newSchedule, setNewSchedule] = useState('06:00, 12:00, 18:00');
  const [newWatchDir, setNewWatchDir] = useState('');

  const load = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [cfg, history] = await Promise.all([
        api.get('/connectors'),
        api.get('/connectors/runs?limit=30'),
      ]);
      setConnectors(cfg.connectors ?? []);
      setRuns(history.runs ?? []);
    } catch (e: any) {
      console.error('[Connecteurs] load failed:', e);
      toast.error('Échec du chargement des connecteurs', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const toggleConnector = async (connector: ConnectorConfig) => {
    const next = !connector.enabled;
    // Optimiste
    setConnectors((prev) =>
      prev.map((c) => (c.id === connector.id ? { ...c, enabled: next } : c)),
    );
    try {
      await api.patch(`/connectors/${connector.id}`, { enabled: next });
      toast.success(next ? 'Connecteur activé' : 'Connecteur désactivé');
    } catch (e: any) {
      setConnectors((prev) =>
        prev.map((c) => (c.id === connector.id ? { ...c, enabled: !next } : c)),
      );
      toast.error('Échec de la mise à jour', { description: e.message });
    }
  };

  const createConnector = async () => {
    const scheduleTimes = newSchedule
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!newLabel.trim()) {
      toast.error('Donnez un nom à ce connecteur');
      return;
    }
    if (scheduleTimes.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
      toast.error('Horaires invalides', { description: 'Format attendu : HH:MM, HH:MM (ex. 06:00, 12:00, 18:00)' });
      return;
    }

    try {
      setSaving(true);
      const options: Record<string, unknown> = {};
      if (newProvider === 'csv_watch' && newWatchDir.trim()) {
        options.watchDir = newWatchDir.trim();
      }
      await api.post('/connectors', {
        provider: newProvider,
        label: newLabel.trim(),
        schedule_times: scheduleTimes,
        options,
      });
      toast.success('Connecteur créé');
      setAddOpen(false);
      setNewLabel('');
      setNewWatchDir('');
      setNewSchedule('06:00, 12:00, 18:00');
      await load();
    } catch (e: any) {
      toast.error('Échec de la création', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* En-tête */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cable className="size-6 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                Connecteurs télésuivi
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Vos données d’observance arrivent automatiquement depuis les portails
              fabricants, plusieurs fois par jour, avec vos propres identifiants
              prestataire. Vos accès restent chiffrés sur votre machine — la
              plateforme ne les voit jamais en clair.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="size-4" />
            Ajouter un connecteur
          </Button>
        </div>

        {/* Encart pédagogique — 3 étapes */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Comment ça marche
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 pb-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Download className="size-4 text-primary" /> Installez le worker
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Un petit programme à installer sur votre poste ou serveur
                  (<code className="rounded bg-muted px-1 text-xs">apps/connector-worker</code> —
                  guide d’installation fourni, 10 minutes).
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <KeyRound className="size-4 text-primary" /> Configurez vos accès portail
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vos identifiants AirView / Care Orchestrator / prisma CLOUD sont
                  chiffrés localement sur votre machine, avec une clé qui ne nous
                  est jamais transmise.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Satellite className="size-4 text-primary" /> Les données arrivent toutes seules
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Le worker tourne aux horaires choisis (par défaut 3 fois par jour) :
                  observance, fuites, IAH alimentent directement le suivi et la
                  facturation LPPR.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des connecteurs */}
        {connectors.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <FolderOpen className="size-10 text-muted-foreground" />
              <div className="max-w-md space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  Aucun connecteur configuré
                </h2>
                <p className="text-sm text-muted-foreground">
                  Commencez par le connecteur « Dossier local » : déposez vos exports
                  portail dans un dossier, ils sont ingérés automatiquement. C’est
                  opérationnel en quelques minutes, sans attendre la mise en service
                  des connecteurs portail.
                </p>
              </div>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Ajouter mon premier connecteur
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {connectors.map((connector) => (
              <Card key={connector.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{connector.label}</h3>
                        <Badge variant="outline" className="text-muted-foreground">
                          {PROVIDER_LABELS[connector.provider]}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        {(connector.schedule_times ?? []).join(' · ') || 'Horaires non définis'}
                      </p>
                    </div>
                    <Switch
                      checked={connector.enabled}
                      onCheckedChange={() => toggleConnector(connector)}
                      aria-label={`Activer ${connector.label}`}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                    <RunStatusBadge status={connector.last_run_status} />
                    <span className="text-sm text-muted-foreground">
                      Dernier passage : {formatDateTime(connector.last_run_at)}
                    </span>
                  </div>
                  {connector.last_run_detail && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {connector.last_run_detail}
                    </p>
                  )}
                  {connector.provider !== 'csv_watch' && !connector.has_credentials && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                      <KeyRound className="size-3.5 shrink-0" />
                      Identifiants portail non configurés — à chiffrer côté worker
                      (<code className="rounded bg-muted px-1 text-xs">npm run encrypt-creds</code>).
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Historique des runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Historique des extractions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {runs.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aucune extraction pour l’instant. Elles apparaîtront ici dès que le
                worker aura tourné une première fois.
              </p>
            ) : (
              <div className="divide-y">
                {runs.map((run) => (
                  <div key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3">
                    <span className="w-28 shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatDateTime(run.started_at)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {run.connector_configs?.label ?? 'Connecteur supprimé'}
                      {run.connector_configs && (
                        <span className="text-muted-foreground">
                          {' '}— {PROVIDER_LABELS[run.connector_configs.provider]}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {run.records_ingested} enregistrement{run.records_ingested > 1 ? 's' : ''}
                    </span>
                    <RunStatusBadge status={run.status} />
                    {run.error && (
                      <p className="w-full truncate text-xs text-red-700" title={run.error}>
                        {run.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'ajout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un connecteur</DialogTitle>
            <DialogDescription>
              Choisissez la source et les horaires d’extraction. Les identifiants
              portail ne se saisissent pas ici : ils sont chiffrés sur votre machine
              par le worker et ne transitent jamais en clair.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connector-provider">Source</Label>
              <Select value={newProvider} onValueChange={(v) => setNewProvider(v as Provider)}>
                <SelectTrigger id="connector-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{PROVIDER_HINTS[newProvider]}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connector-label">Nom du connecteur</Label>
              <Input
                id="connector-label"
                placeholder="Ex. AirView — agence de Lyon"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connector-schedule">Horaires d’extraction</Label>
              <Input
                id="connector-schedule"
                placeholder="06:00, 12:00, 18:00"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Indicatif — le déclenchement réel est planifié sur la machine du
                worker (Planificateur de tâches / cron), à aligner sur ces horaires.
              </p>
            </div>

            {newProvider === 'csv_watch' && (
              <div className="space-y-2">
                <Label htmlFor="connector-watchdir">Dossier surveillé (sur la machine du worker)</Label>
                <Input
                  id="connector-watchdir"
                  placeholder="C:\exports\telesuivi"
                  value={newWatchDir}
                  onChange={(e) => setNewWatchDir(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={createConnector} disabled={saving}>
              {saving ? 'Création…' : 'Créer le connecteur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
