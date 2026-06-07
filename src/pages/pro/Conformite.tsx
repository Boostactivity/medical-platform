/**
 * /pro/conformite — Module CERTIFICATION PSDM HAS 2026.
 *
 * La certification PSDM (référentiel HAS du 18/06/2024 : 60 critères /
 * 4 chapitres, audit Cofrac, validité 4 ans) devient obligatoire pour
 * les PSAD — décret n° 2026-178 du 11/03/2026, 18 mois de mise en
 * conformité, sanction : impossibilité de facturer l'Assurance Maladie.
 *
 * Cette page pilote l'auto-évaluation du PSAD : score de conformité,
 * critères par chapitre, plan de remédiation, coffre documentaire,
 * export du dossier d'audit.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  AlertTriangle,
  ChevronRight,
  Download,
  FileSearch,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { api } from '../../utils/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScoreGauge } from '../../components/psdm/ScoreGauge';
import { AssessmentStatusBadge, CriticalityBadge } from '../../components/psdm/StatusBadge';
import { CriterionSheet } from '../../components/psdm/CriterionSheet';
import { ActionsTab } from '../../components/psdm/ActionsTab';
import { DocumentsTab } from '../../components/psdm/DocumentsTab';
import { ImportReferentielDialog } from '../../components/psdm/ImportReferentielDialog';
import type { PsdmChapter, PsdmCriterion, PsdmDashboard } from '../../components/psdm/types';

export function Conformite() {
  const [dashboard, setDashboard] = useState<PsdmDashboard | null>(null);
  const [chapters, setChapters] = useState<PsdmChapter[]>([]);
  const [criteria, setCriteria] = useState<PsdmCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const [dash, crit] = await Promise.all([
        api.get('/psdm/dashboard'),
        api.get('/psdm/criteria'),
      ]);
      setDashboard(dash);
      setChapters(crit.chapters ?? []);
      setCriteria(crit.criteria ?? []);
    } catch (e: any) {
      console.error('[Conformite] load failed:', e);
      toast.error('Échec du chargement du module conformité', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const criteriaByChapter = useMemo(() => {
    const map = new Map<number, PsdmCriterion[]>();
    for (const cr of criteria) {
      const list = map.get(cr.chapter_number) ?? [];
      list.push(cr);
      map.set(cr.chapter_number, list);
    }
    return map;
  }, [criteria]);

  const selectedCriterion = useMemo(
    () => criteria.find((cr) => cr.id === selectedCriterionId) ?? null,
    [criteria, selectedCriterionId],
  );

  const exportAuditDossier = async () => {
    try {
      setExporting(true);
      const data = await api.get('/psdm/audit-export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dossier_audit_psdm_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Dossier d’audit exporté');
    } catch (e: any) {
      toast.error('Échec de l’export', { description: e.message });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-foreground">
              Le module conformité est momentanément indisponible.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => load(true)}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referentielVide = !dashboard.referentiel.is_imported;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* En-tête */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                Certification PSDM — HAS
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Référentiel HAS du 18 juin 2024 : {dashboard.referentiel.expected_criteria_count} critères
              répartis en {dashboard.referentiel.chapters_count} chapitres, audité par un organisme
              accrédité {dashboard.referentiel.accreditation}. Certification valable{' '}
              {dashboard.referentiel.validity_years} ans. Sans certification, votre structure ne pourra
              plus facturer l’Assurance Maladie.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Importer le référentiel
            </Button>
            <Button onClick={exportAuditDossier} disabled={exporting || referentielVide}>
              <Download className="size-4" />
              {exporting ? 'Export...' : 'Dossier d’audit'}
            </Button>
          </div>
        </div>

        {/* Bandeau risque déconventionnement */}
        {dashboard.deconventionnement_risk.at_risk && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Risque de déconventionnement
              </p>
              <p className="mt-1 text-sm text-foreground">
                {dashboard.deconventionnement_risk.uncovered_critical_criteria.length} critère(s)
                critique(s) non conforme(s) sans action de remédiation. Créez une action corrective
                pour chacun afin de sécuriser votre conventionnement.
              </p>
            </div>
          </div>
        )}

        {referentielVide ? (
          /* État vide : référentiel officiel non importé */
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <FileSearch className="size-10 text-muted-foreground" />
              <div className="max-w-xl space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  Référentiel officiel HAS à importer
                </h2>
                <p className="text-sm text-muted-foreground">
                  Les {dashboard.referentiel.expected_criteria_count} critères du référentiel de
                  certification PSDM (HAS, publié le 18 juin 2024) ne sont pas encore chargés.
                  Par rigueur réglementaire, cette plateforme n’intègre que la transcription du
                  document officiel — aucun critère n’est pré-rempli automatiquement.
                </p>
                <p className="text-sm text-muted-foreground">
                  Les {dashboard.referentiel.chapters_count} chapitres du référentiel sont déjà en
                  place : l’import (réservé administrateur) rattache chaque critère à son chapitre.
                </p>
              </div>
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                Importer le référentiel officiel
              </Button>
              <div className="mt-4 grid w-full max-w-2xl gap-2 text-left">
                {chapters.map((ch) => (
                  <div key={ch.chapter_number} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                      {ch.chapter_number}
                    </span>
                    <span className="text-sm text-foreground">{ch.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bandeau scores */}
            <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="flex items-center justify-center py-6">
                  <ScoreGauge value={dashboard.score_global_pct} label="Conformité globale" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conformité par chapitre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  {chapters.map((ch) => {
                    const score = dashboard.by_chapter[String(ch.chapter_number)];
                    return (
                      <div key={ch.chapter_number}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-foreground">
                            {ch.chapter_number}. {ch.label}
                          </span>
                          <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                            {score?.score_pct === null || score?.score_pct === undefined
                              ? '—'
                              : `${score.score_pct}%`}
                          </span>
                        </div>
                        <Progress value={score?.score_pct ?? 0} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Points de vigilance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Critères critiques non conformes</span>
                    <span className={`text-lg font-semibold tabular-nums ${dashboard.critical_non_conforme_count > 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {dashboard.critical_non_conforme_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Critères non évalués</span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {dashboard.counts.non_evalue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Actions ouvertes</span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {dashboard.open_actions_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Actions en retard</span>
                    <span className={`text-lg font-semibold tabular-nums ${dashboard.overdue_actions_count > 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {dashboard.overdue_actions_count}
                    </span>
                  </div>
                  <p className="pt-1 text-sm text-muted-foreground">
                    {dashboard.referentiel.imported_criteria_count} critères importés sur{' '}
                    {dashboard.referentiel.expected_criteria_count} attendus.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Onglets */}
            <Tabs defaultValue="criteres">
              <TabsList className="mb-6 w-fit rounded-lg border bg-muted/50 p-1">
                <TabsTrigger
                  value="criteres"
                  className="rounded-md text-sm text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Critères
                </TabsTrigger>
                <TabsTrigger
                  value="actions"
                  className="rounded-md text-sm text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Plan d’action
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="rounded-md text-sm text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Coffre documentaire
                </TabsTrigger>
              </TabsList>

              <TabsContent value="criteres">
                <div className="space-y-8">
                  {chapters.map((ch) => {
                    const chapterCriteria = criteriaByChapter.get(ch.chapter_number) ?? [];
                    if (chapterCriteria.length === 0) return null;
                    return (
                      <section key={ch.chapter_number}>
                        <h2 className="mb-3 text-base font-medium text-foreground">
                          Chapitre {ch.chapter_number} — {ch.label}
                        </h2>
                        <Card>
                          <CardContent className="divide-y p-0 [&:last-child]:pb-0">
                            {chapterCriteria.map((cr) => (
                              <button
                                key={cr.id}
                                onClick={() => setSelectedCriterionId(cr.id)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                              >
                                <span className="w-14 shrink-0 font-mono text-sm text-muted-foreground">
                                  {cr.code}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                  {cr.label}
                                </span>
                                <CriticalityBadge criticality={cr.criticality} />
                                {cr.actions.filter((a) => a.status !== 'done').length > 0 && (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    {cr.actions.filter((a) => a.status !== 'done').length} action(s)
                                  </Badge>
                                )}
                                <AssessmentStatusBadge status={cr.assessment?.status ?? 'non_evalue'} />
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                              </button>
                            ))}
                          </CardContent>
                        </Card>
                      </section>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="actions">
                <ActionsTab criteria={criteria} onChanged={() => load()} />
              </TabsContent>

              <TabsContent value="documents">
                <DocumentsTab criteria={criteria} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <CriterionSheet
        criterion={selectedCriterion}
        onClose={() => setSelectedCriterionId(null)}
        onSaved={() => load()}
      />

      <ImportReferentielDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => load(true)}
      />
    </div>
  );
}
