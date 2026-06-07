/**
 * Routes CERTIFICATION PSDM HAS 2026 (back-office PSAD).
 * Montées sur `${prefix}` dans index.tsx.
 *
 * Contexte réglementaire sourcé (research/05_REGLEMENTAIRE_FRANCE.md §I.6) :
 * référentiel HAS publié le 18/06/2024 — 60 critères / 4 chapitres,
 * audit Cofrac, validité 4 ans. Décret n° 2026-178 du 11/03/2026 :
 * 18 mois de mise en conformité, au-delà les PSDM non certifiés ne
 * peuvent plus facturer l'Assurance Maladie (déconventionnement).
 *
 * ANTI-HALLUCINATION : la liste nominative des 60 critères n'est pas
 * sourcée → psdm_criteria démarre VIDE, chargement du référentiel
 * officiel via POST /psdm/import-referentiel (admin).
 *
 * - GET  /psdm/dashboard                 : score global + par chapitre + alerte déconventionnement
 * - GET  /psdm/criteria                  : référentiel + auto-évaluation du tenant jointe
 * - PUT  /psdm/assessments/:criterionId  : upsert auto-évaluation
 * - POST /psdm/actions                   : créer une action de remédiation
 * - GET  /psdm/actions                   : plan d'action (filtre status)
 * - PATCH /psdm/actions/:id              : mise à jour action
 * - POST /psdm/documents                 : métadonnées document conformité
 * - GET  /psdm/documents                 : coffre documentaire
 * - POST /psdm/import-referentiel        : (admin) upsert du référentiel officiel HAS
 * - GET  /psdm/audit-export              : JSON structuré complet pour dossier audit Cofrac
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';

const app = new Hono<TenantEnv>();
app.use('*', requireAuth, requireRole('admin', 'prestataire'), requireTenant);

const ASSESSMENT_STATUSES = ['conforme', 'non_conforme', 'partiel', 'non_evalue'] as const;
const ACTION_STATUSES = ['todo', 'in_progress', 'done'] as const;
const DOC_TYPES = [
  'procedure', 'fiche_technique', 'attestation_formation',
  'enregistrement_qualite', 'contrat', 'rapport_audit', 'autre',
] as const;
const CRITICALITIES = ['standard', 'critique'] as const;

/** Métadonnées sourcées du référentiel (research/05 §I.6) — réutilisées dashboard + export. */
const REFERENTIEL_INFO = {
  name: 'Référentiel de certification PSDM — HAS',
  published: '2024-06-18',
  expected_criteria_count: 60,
  chapters_count: 4,
  validity_years: 4,
  accreditation: 'Cofrac',
  decree: 'Décret n° 2026-178 du 11 mars 2026',
  compliance_deadline: '18 mois après promulgation des décrets',
  sanction: 'PSDM non certifiés : impossibilité de facturer à l’Assurance Maladie',
  source: 'research/05_REGLEMENTAIRE_FRANCE.md §I.6',
};

// ------------------------------------------------------------------
// Helpers de chargement scopés tenant
// ------------------------------------------------------------------

async function loadReferentiel() {
  const [{ data: chapters, error: chError }, { data: criteria, error: crError }] =
    await Promise.all([
      supabase.from('psdm_chapters').select('*').order('chapter_number'),
      supabase
        .from('psdm_criteria')
        .select('*')
        .eq('active', true)
        .order('chapter_number')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('code'),
    ]);
  if (chError) throw new Error(chError.message);
  if (crError) throw new Error(crError.message);
  return { chapters: chapters ?? [], criteria: criteria ?? [] };
}

async function loadAssessments(tenantId: string) {
  const { data, error } = await supabase
    .from('psdm_assessments')
    .select('*')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadActions(tenantId: string) {
  const { data, error } = await supabase
    .from('psdm_actions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Calcul du score de conformité.
 * Formule (produit, documentée UI) : conforme = 1 point, partiel = 0,5,
 * non_conforme / non_evalue = 0 — rapporté au nombre TOTAL de critères
 * actifs (un critère non évalué pèse comme non conforme : pas de score
 * flatteur par omission).
 */
function computeScores(
  criteria: Array<{ id: string; chapter_number: number; criticality: string }>,
  assessments: Array<{ criterion_id: string; status: string }>,
  actions: Array<{ criterion_id: string; status: string }>,
) {
  const statusByCriterion = new Map<string, string>();
  for (const a of assessments) statusByCriterion.set(a.criterion_id, a.status);

  const criteriaWithAction = new Set(actions.map((a) => a.criterion_id));

  const global = { total: 0, conforme: 0, partiel: 0, non_conforme: 0, non_evalue: 0 };
  const byChapter = new Map<number, typeof global>();
  const criticalNonConformes: Array<{ criterion_id: string; has_remediation: boolean }> = [];

  for (const criterion of criteria) {
    const status = statusByCriterion.get(criterion.id) ?? 'non_evalue';
    const bucket = byChapter.get(criterion.chapter_number) ?? {
      total: 0, conforme: 0, partiel: 0, non_conforme: 0, non_evalue: 0,
    };

    bucket.total++;
    global.total++;
    if (status === 'conforme') { bucket.conforme++; global.conforme++; }
    else if (status === 'partiel') { bucket.partiel++; global.partiel++; }
    else if (status === 'non_conforme') { bucket.non_conforme++; global.non_conforme++; }
    else { bucket.non_evalue++; global.non_evalue++; }

    byChapter.set(criterion.chapter_number, bucket);

    if (criterion.criticality === 'critique' && status === 'non_conforme') {
      criticalNonConformes.push({
        criterion_id: criterion.id,
        has_remediation: criteriaWithAction.has(criterion.id),
      });
    }
  }

  const pct = (b: typeof global) =>
    b.total === 0 ? null : Math.round(((b.conforme + 0.5 * b.partiel) / b.total) * 1000) / 10;

  return {
    global: { ...global, score_pct: pct(global) },
    by_chapter: Object.fromEntries(
      [...byChapter.entries()].map(([n, b]) => [n, { ...b, score_pct: pct(b) }]),
    ),
    critical_non_conformes: criticalNonConformes,
  };
}

// ------------------------------------------------------------------
// GET /psdm/dashboard
// ------------------------------------------------------------------

app.get('/psdm/dashboard', async (c) => {
  const tenantId = c.get('tenantId');
  try {
    const [{ chapters, criteria }, assessments, actions] = await Promise.all([
      loadReferentiel(),
      loadAssessments(tenantId),
      loadActions(tenantId),
    ]);

    const openActions = actions.filter((a) => a.status !== 'done');
    const scores = computeScores(criteria, assessments, openActions);

    // Risque déconventionnement : au moins un critère CRITIQUE non
    // conforme SANS action de remédiation ouverte.
    const uncovered = scores.critical_non_conformes.filter((x) => !x.has_remediation);

    return c.json({
      referentiel: {
        ...REFERENTIEL_INFO,
        imported_criteria_count: criteria.length,
        is_imported: criteria.length > 0,
      },
      chapters,
      score_global_pct: scores.global.score_pct,
      counts: scores.global,
      by_chapter: scores.by_chapter,
      critical_non_conforme_count: scores.critical_non_conformes.length,
      deconventionnement_risk: {
        at_risk: uncovered.length > 0,
        uncovered_critical_criteria: uncovered.map((x) => x.criterion_id),
      },
      open_actions_count: openActions.length,
      overdue_actions_count: openActions.filter(
        (a) => a.due_date && a.due_date < new Date().toISOString().slice(0, 10),
      ).length,
    });
  } catch (e) {
    console.error('[PSDM] dashboard failed:', e);
    return c.json({ error: e instanceof Error ? e.message : 'dashboard failed' }, 500);
  }
});

// ------------------------------------------------------------------
// GET /psdm/criteria — référentiel + assessment du tenant joint
// ------------------------------------------------------------------

app.get('/psdm/criteria', async (c) => {
  const tenantId = c.get('tenantId');
  try {
    const [{ chapters, criteria }, assessments, actions] = await Promise.all([
      loadReferentiel(),
      loadAssessments(tenantId),
      loadActions(tenantId),
    ]);

    const assessmentByCriterion = new Map(assessments.map((a) => [a.criterion_id, a]));
    const actionsByCriterion = new Map<string, typeof actions>();
    for (const a of actions) {
      const list = actionsByCriterion.get(a.criterion_id) ?? [];
      list.push(a);
      actionsByCriterion.set(a.criterion_id, list);
    }

    return c.json({
      chapters,
      criteria: criteria.map((cr) => ({
        ...cr,
        assessment: assessmentByCriterion.get(cr.id) ?? null,
        actions: actionsByCriterion.get(cr.id) ?? [],
      })),
    });
  } catch (e) {
    console.error('[PSDM] criteria failed:', e);
    return c.json({ error: e instanceof Error ? e.message : 'criteria failed' }, 500);
  }
});

// ------------------------------------------------------------------
// PUT /psdm/assessments/:criterionId — upsert auto-évaluation
// ------------------------------------------------------------------

app.put('/psdm/assessments/:criterionId', async (c) => {
  const tenantId = c.get('tenantId');
  const criterionId = c.req.param('criterionId');
  const body = await c.req.json().catch(() => ({}));

  const status = body.status as string;
  if (!status || !ASSESSMENT_STATUSES.includes(status as typeof ASSESSMENT_STATUSES[number])) {
    return c.json({ error: `status invalide : ${status}` }, 400);
  }
  if (body.score !== undefined && body.score !== null) {
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return c.json({ error: 'score invalide (entier 0-100 attendu)' }, 400);
    }
  }

  // Le critère doit exister dans le référentiel actif
  const { data: criterion, error: crError } = await supabase
    .from('psdm_criteria')
    .select('id')
    .eq('id', criterionId)
    .eq('active', true)
    .maybeSingle();
  if (crError) return c.json({ error: crError.message }, 500);
  if (!criterion) return c.json({ error: 'Critère introuvable' }, 404);

  const { data, error } = await supabase
    .from('psdm_assessments')
    .upsert(
      {
        tenant_id: tenantId,
        criterion_id: criterionId,
        status,
        score: body.score ?? null,
        evidence_note: body.evidence_note ?? null,
        assessed_by: c.get('user')?.id ?? null,
        assessed_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,criterion_id' },
    )
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, assessment: data });
});

// ------------------------------------------------------------------
// Actions de remédiation
// ------------------------------------------------------------------

app.post('/psdm/actions', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  if (!body.criterion_id || !body.description) {
    return c.json({ error: 'criterion_id et description sont requis' }, 400);
  }

  const { data: criterion, error: crError } = await supabase
    .from('psdm_criteria')
    .select('id')
    .eq('id', body.criterion_id)
    .maybeSingle();
  if (crError) return c.json({ error: crError.message }, 500);
  if (!criterion) return c.json({ error: 'Critère introuvable' }, 404);

  const { data, error } = await supabase
    .from('psdm_actions')
    .insert({
      tenant_id: tenantId,
      criterion_id: body.criterion_id,
      description: body.description,
      owner: body.owner ?? null,
      due_date: body.due_date ?? null,
      status: 'todo',
    })
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, action: data }, 201);
});

app.get('/psdm/actions', async (c) => {
  const tenantId = c.get('tenantId');
  const status = c.req.query('status');

  let query = supabase
    .from('psdm_actions')
    .select('*, psdm_criteria(code, label, chapter_number, criticality)')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (status) {
    if (!ACTION_STATUSES.includes(status as typeof ACTION_STATUSES[number])) {
      return c.json({ error: `status invalide : ${status}` }, 400);
    }
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ actions: data ?? [] });
});

app.patch('/psdm/actions/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  const { data: existing, error: readError } = await supabase
    .from('psdm_actions')
    .select('id')
    .eq('id', c.req.param('id'))
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (readError) return c.json({ error: readError.message }, 500);
  if (!existing) return c.json({ error: 'Action introuvable' }, 404);

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!ACTION_STATUSES.includes(body.status)) {
      return c.json({ error: `status invalide : ${body.status}` }, 400);
    }
    patch.status = body.status;
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.owner !== undefined) patch.owner = body.owner;
  if (body.due_date !== undefined) patch.due_date = body.due_date;
  if (body.proof_document_id !== undefined) {
    if (body.proof_document_id !== null) {
      // La preuve doit appartenir au tenant
      const { data: doc, error: docError } = await supabase
        .from('psdm_documents')
        .select('id')
        .eq('id', body.proof_document_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (docError) return c.json({ error: docError.message }, 500);
      if (!doc) return c.json({ error: 'Document de preuve introuvable' }, 404);
    }
    patch.proof_document_id = body.proof_document_id;
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ error: 'Aucun champ à mettre à jour' }, 400);
  }

  const { data, error } = await supabase
    .from('psdm_actions')
    .update(patch)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, action: data });
});

// ------------------------------------------------------------------
// Coffre documentaire (métadonnées — upload binaire Storage ultérieur)
// ------------------------------------------------------------------

app.post('/psdm/documents', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));

  if (!body.title) return c.json({ error: 'title est requis' }, 400);
  const docType = body.doc_type ?? 'autre';
  if (!DOC_TYPES.includes(docType)) {
    return c.json({ error: `doc_type invalide : ${docType}` }, 400);
  }
  if (body.criterion_id) {
    const { data: criterion, error: crError } = await supabase
      .from('psdm_criteria')
      .select('id')
      .eq('id', body.criterion_id)
      .maybeSingle();
    if (crError) return c.json({ error: crError.message }, 500);
    if (!criterion) return c.json({ error: 'Critère introuvable' }, 404);
  }

  const { data, error } = await supabase
    .from('psdm_documents')
    .insert({
      tenant_id: tenantId,
      title: body.title,
      doc_type: docType,
      storage_path: body.storage_path ?? null,
      criterion_id: body.criterion_id ?? null,
      uploaded_by: c.get('user')?.id ?? null,
      expires_at: body.expires_at ?? null,
    })
    .select('*')
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, document: data }, 201);
});

app.get('/psdm/documents', async (c) => {
  const tenantId = c.get('tenantId');
  const { data, error } = await supabase
    .from('psdm_documents')
    .select('*, psdm_criteria(code, label, chapter_number)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ documents: data ?? [] });
});

// ------------------------------------------------------------------
// POST /psdm/import-referentiel — admin : charge le référentiel
// officiel HAS (anti-hallucination : la base démarre vide, les 60
// critères viennent du document officiel, jamais inventés ici).
// Body : { criteria: [{ code, chapter_number, label, ... }] } ou array direct.
// ------------------------------------------------------------------

app.post('/psdm/import-referentiel', async (c) => {
  const role = c.get('user')?.user_metadata?.role;
  if (role !== 'admin') {
    return c.json({ error: 'Forbidden - import réservé au rôle admin' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const items = Array.isArray(body) ? body : body?.criteria;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Body attendu : array de critères (ou { criteria: [...] })' }, 400);
  }

  const rows: Array<Record<string, unknown>> = [];
  const errors: Array<{ index: number; error: string }> = [];

  items.forEach((item, index) => {
    const chapterNumber = Number(item.chapter_number ?? item.chapter);
    if (!item.code || typeof item.code !== 'string') {
      errors.push({ index, error: 'code manquant' });
      return;
    }
    if (!item.label || typeof item.label !== 'string') {
      errors.push({ index, error: `label manquant (code ${item.code})` });
      return;
    }
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 4) {
      errors.push({ index, error: `chapter_number invalide (code ${item.code}) : 1-4 attendu` });
      return;
    }
    const criticality = item.criticality ?? 'standard';
    if (!CRITICALITIES.includes(criticality)) {
      errors.push({ index, error: `criticality invalide (code ${item.code}) : standard|critique` });
      return;
    }
    rows.push({
      code: String(item.code).trim(),
      chapter_number: chapterNumber,
      domain: item.domain ?? null,
      label: item.label,
      description: item.description ?? null,
      expected_evidence: item.expected_evidence ?? null,
      criticality,
      source: item.source ?? 'Import référentiel officiel HAS (admin)',
      display_order: item.display_order ?? index,
      active: item.active ?? true,
    });
  });

  if (errors.length > 0) {
    return c.json({ error: 'Import refusé : critères invalides', details: errors }, 400);
  }

  const { data, error } = await supabase
    .from('psdm_criteria')
    .upsert(rows, { onConflict: 'code' })
    .select('id, code');

  if (error) return c.json({ error: error.message }, 500);
  return c.json({
    success: true,
    imported_count: data?.length ?? 0,
    expected_total: REFERENTIEL_INFO.expected_criteria_count,
  });
});

// ------------------------------------------------------------------
// GET /psdm/audit-export — JSON structuré complet, prêt pour la
// génération PDF du dossier d'audit Cofrac (pdf-generator.ts plus tard).
// ------------------------------------------------------------------

app.get('/psdm/audit-export', async (c) => {
  const tenantId = c.get('tenantId');
  try {
    const [{ chapters, criteria }, assessments, actions] = await Promise.all([
      loadReferentiel(),
      loadAssessments(tenantId),
      loadActions(tenantId),
    ]);

    const { data: documents, error: docsError } = await supabase
      .from('psdm_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (docsError) throw new Error(docsError.message);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, finess, siret')
      .eq('id', tenantId)
      .single();
    if (tenantError) throw new Error(tenantError.message);

    const openActions = actions.filter((a) => a.status !== 'done');
    const scores = computeScores(criteria, assessments, openActions);

    const assessmentByCriterion = new Map(assessments.map((a) => [a.criterion_id, a]));
    const actionsByCriterion = new Map<string, typeof actions>();
    for (const a of actions) {
      const list = actionsByCriterion.get(a.criterion_id) ?? [];
      list.push(a);
      actionsByCriterion.set(a.criterion_id, list);
    }
    const docsByCriterion = new Map<string, NonNullable<typeof documents>>();
    for (const d of documents ?? []) {
      if (!d.criterion_id) continue;
      const list = docsByCriterion.get(d.criterion_id) ?? [];
      list.push(d);
      docsByCriterion.set(d.criterion_id, list);
    }

    return c.json({
      export_type: 'psdm_audit_dossier',
      generated_at: new Date().toISOString(),
      tenant,
      referentiel: {
        ...REFERENTIEL_INFO,
        imported_criteria_count: criteria.length,
      },
      summary: {
        score_global_pct: scores.global.score_pct,
        counts: scores.global,
        by_chapter: scores.by_chapter,
        critical_non_conforme_count: scores.critical_non_conformes.length,
      },
      chapters: chapters.map((ch) => ({
        ...ch,
        score: scores.by_chapter[ch.chapter_number] ?? null,
        criteria: criteria
          .filter((cr) => cr.chapter_number === ch.chapter_number)
          .map((cr) => ({
            ...cr,
            assessment: assessmentByCriterion.get(cr.id) ?? null,
            actions: actionsByCriterion.get(cr.id) ?? [],
            documents: docsByCriterion.get(cr.id) ?? [],
          })),
      })),
      unlinked_documents: (documents ?? []).filter((d) => !d.criterion_id),
    });
  } catch (e) {
    console.error('[PSDM] audit-export failed:', e);
    return c.json({ error: e instanceof Error ? e.message : 'audit-export failed' }, 500);
  }
});

export default app;
