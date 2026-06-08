/**
 * MODÉRATION COMMUNAUTÉ — file de traitement back-office (PSAD).
 *
 * - File des messages patients (discussions + réponses) en attente :
 *   tout contenu naît 'pending' et n'est visible des autres patients
 *   qu'après approbation ici (modération a priori, playbook santé).
 * - Approuver / Rejeter (raison visible par l'auteur uniquement).
 * - Onglet signalements : contenus publiés signalés par les membres,
 *   à traiter (avec retrait optionnel du contenu).
 *
 * Données réelles via src/utils/api.ts → routes /pro-community/*
 * (community.ts, migration 111).
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Flag, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
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

interface ModerationItem {
  kind: 'post' | 'reply';
  id: string;
  title: string | null;
  body: string;
  status: string;
  reject_reason: string | null;
  moderated_at: string | null;
  created_at: string;
  post_title: string | null;
  pseudonym: string;
  patient_name: string | null;
  patient_email: string | null;
}

interface Report {
  id: string;
  target_kind: 'post' | 'reply';
  target_id: string;
  target_excerpt: string | null;
  target_status: string | null;
  reporter_pseudonym: string;
  reason: string;
  status: 'open' | 'handled';
  handled_at: string | null;
  created_at: string;
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Publiés' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'removed', label: 'Retirés' },
];

const STATUS_META: Record<string, { label: string; badge: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', badge: 'default' },
  approved: { label: 'Publié', badge: 'secondary' },
  rejected: { label: 'Rejeté', badge: 'outline' },
  removed: { label: 'Retiré', badge: 'outline' },
};

function formatDateTimeFr(iso: string | null): string {
  if (!iso) return '—';
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

export function Moderation() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reportFilter, setReportFilter] = useState('open');
  const [submitting, setSubmitting] = useState(false);

  // Dialog de rejet (raison obligatoire)
  const [rejectTarget, setRejectTarget] = useState<ModerationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Dialog de traitement de signalement
  const [handleTarget, setHandleTarget] = useState<Report | null>(null);
  const [removeContent, setRemoveContent] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [moderationRes, reportsRes] = await Promise.allSettled([
        api.get(`/pro-community/moderation?status=${statusFilter}`),
        api.get(`/pro-community/reports?status=${reportFilter}`),
      ]);
      if (moderationRes.status === 'fulfilled') setItems(moderationRes.value.items ?? []);
      else toast.error('Erreur lors du chargement de la file', { description: moderationRes.reason?.message });
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.reports ?? []);
      else toast.error('Erreur lors du chargement des signalements', { description: reportsRes.reason?.message });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reportFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approve = async (item: ModerationItem) => {
    setSubmitting(true);
    try {
      await api.patch(`/pro-community/moderation/${item.kind}/${item.id}`, { action: 'approve' });
      toast.success('Message publié dans la communauté');
      fetchData();
    } catch (e: any) {
      toast.error('Approbation impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('Indiquez la raison du rejet');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/pro-community/moderation/${rejectTarget.kind}/${rejectTarget.id}`, {
        action: 'reject',
        reason: rejectReason.trim(),
      });
      toast.success('Message rejeté — la raison est visible par son auteur');
      setRejectTarget(null);
      setRejectReason('');
      fetchData();
    } catch (e: any) {
      toast.error('Rejet impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: ModerationItem) => {
    setSubmitting(true);
    try {
      await api.patch(`/pro-community/moderation/${item.kind}/${item.id}`, { action: 'remove' });
      toast.success('Message retiré de la communauté');
      fetchData();
    } catch (e: any) {
      toast.error('Retrait impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitHandle = async () => {
    if (!handleTarget) return;
    setSubmitting(true);
    try {
      await api.patch(`/pro-community/reports/${handleTarget.id}`, {
        action: 'handle',
        remove_target: removeContent,
      });
      toast.success(
        removeContent
          ? 'Signalement traité — le contenu a été retiré'
          : 'Signalement traité — le contenu reste publié',
      );
      setHandleTarget(null);
      setRemoveContent(false);
      fetchData();
    } catch (e: any) {
      toast.error('Traitement impossible', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = statusFilter === 'pending' ? items.length : null;
  const openReportsCount = reportFilter === 'open' ? reports.length : null;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Modération de la communauté</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tout message patient est publié uniquement après votre validation — les
              auteurs apparaissent sous pseudonyme côté communauté
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <Tabs defaultValue="moderation">
          <TabsList>
            <TabsTrigger value="moderation">
              File de modération
              {pendingCount !== null && pendingCount > 0 && (
                <Badge variant="default" className="ml-1.5">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">
              Signalements
              {openReportsCount !== null && openReportsCount > 0 && (
                <Badge variant="default" className="ml-1.5">{openReportsCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- File de modération ---- */}
          <TabsContent value="moderation" className="space-y-4 mt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56" size="sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loading ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Chargement de la file...
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  {statusFilter === 'pending'
                    ? 'Aucun message en attente de validation.'
                    : 'Aucun message pour ce filtre.'}
                </CardContent>
              </Card>
            ) : (
              items.map((item) => {
                const meta = STATUS_META[item.status] ?? { label: item.status, badge: 'outline' as const };
                return (
                  <Card key={`${item.kind}-${item.id}`}>
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">
                              {item.kind === 'post' ? 'Discussion' : 'Réponse'}
                            </Badge>
                            <Badge variant={meta.badge}>{meta.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Reçu le {formatDateTimeFr(item.created_at)}
                            </span>
                          </div>
                          {item.kind === 'post' ? (
                            <div className="font-medium">{item.title}</div>
                          ) : (
                            item.post_title && (
                              <div className="text-sm text-muted-foreground">
                                Réponse dans : <span className="text-foreground">{item.post_title}</span>
                              </div>
                            )
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{item.pseudonym}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.patient_name ?? 'Patient inconnu'}
                            {item.patient_email ? ` · ${item.patient_email}` : ''}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3">
                        {item.body}
                      </p>

                      {item.status === 'rejected' && item.reject_reason && (
                        <p className="text-xs text-muted-foreground">
                          Raison du rejet : {item.reject_reason}
                        </p>
                      )}

                      {item.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={() => {
                              setRejectReason('');
                              setRejectTarget(item);
                            }}
                          >
                            Rejeter
                          </Button>
                          <Button size="sm" disabled={submitting} onClick={() => approve(item)}>
                            Approuver
                          </Button>
                        </div>
                      )}
                      {item.status === 'approved' && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={submitting}
                            onClick={() => remove(item)}
                          >
                            Retirer de la communauté
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ---- Signalements ---- */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            <Select value={reportFilter} onValueChange={setReportFilter}>
              <SelectTrigger className="w-56" size="sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">À traiter</SelectItem>
                <SelectItem value="handled">Traités</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>

            {loading ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Chargement des signalements...
                </CardContent>
              </Card>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Flag className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Aucun signalement pour ce filtre.
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {report.target_kind === 'post' ? 'Discussion' : 'Réponse'}
                        </Badge>
                        <Badge variant={report.status === 'open' ? 'default' : 'outline'}>
                          {report.status === 'open' ? 'À traiter' : 'Traité'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Signalé le {formatDateTimeFr(report.created_at)} par {report.reporter_pseudonym}
                        </span>
                      </div>
                      {report.target_status && report.target_status !== 'approved' && (
                        <Badge variant="outline">
                          Contenu {STATUS_META[report.target_status]?.label.toLowerCase() ?? report.target_status}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Motif : </span>
                      {report.reason}
                    </div>

                    {report.target_excerpt && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-3">
                        {report.target_excerpt}
                      </p>
                    )}

                    {report.status === 'open' && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => {
                            setRemoveContent(false);
                            setHandleTarget(report);
                          }}
                        >
                          Traiter ce signalement
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog : rejeter avec raison */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter ce message</DialogTitle>
            <DialogDescription>
              Le message ne sera pas publié. La raison est visible uniquement par son
              auteur ({rejectTarget?.pseudonym}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Raison du rejet</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Par exemple : contient un conseil médical — orientez le patient vers son équipe"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitReject} disabled={submitting || !rejectReason.trim()}>
              {submitting ? 'Envoi...' : 'Rejeter le message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : traiter un signalement */}
      <Dialog open={!!handleTarget} onOpenChange={(open) => !open && setHandleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Traiter ce signalement</DialogTitle>
            <DialogDescription>
              Marque le signalement comme traité. Vous pouvez aussi retirer le contenu
              signalé de la communauté.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2">
            <Checkbox
              id="remove-content"
              checked={removeContent}
              onCheckedChange={(v) => setRemoveContent(v === true)}
              disabled={handleTarget?.target_status !== 'approved'}
            />
            <Label htmlFor="remove-content" className="leading-snug">
              Retirer le contenu signalé de la communauté
              {handleTarget?.target_status !== 'approved' && (
                <span className="block text-xs text-muted-foreground font-normal">
                  Ce contenu n'est plus publié.
                </span>
              )}
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandleTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submitHandle} disabled={submitting}>
              {submitting ? 'Traitement...' : 'Marquer comme traité'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
