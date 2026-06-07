-- ============================================================
-- 102 — CERTIFICATION PSDM HAS 2026 (Module L du catalogue)
-- Argument de vente n°1 : la certification PSDM (référentiel HAS,
-- audit Cofrac) devient obligatoire pour les PSAD — un PSDM non
-- certifié ne peut plus facturer l'Assurance Maladie.
--
-- Faits SOURCÉS (research/05_REGLEMENTAIRE_FRANCE.md §I.6) :
--   - Référentiel HAS publié le 18 juin 2024 (HAS p_3525164).
--   - 60 critères organisés en 4 chapitres :
--       1. Éthique, droits des usagers, satisfaction des usagers
--       2. Distribution de matériel et délivrance de prestations
--       3. Fonctions support (RH, locaux, SI)
--       4. Dispositions qualité et gestion des risques
--   - Certification valable 4 ans, audits intermédiaires.
--   - Organismes certificateurs accrédités par le Cofrac
--     (Qualianor, DEKRA, Bureau Veritas, TÜV Rheinland...).
--   - Décret n° 2026-178 du 11 mars 2026 : certification provisoire
--     1 an pour prestataires débutants ; délai de mise en conformité
--     18 mois après promulgation des décrets ; au-delà, les PSDM non
--     certifiés ne pourront plus facturer à l'Assurance Maladie.
--
-- ANTI-HALLUCINATION : la liste NOMINATIVE des 60 critères n'est PAS
-- dans la recherche. psdm_criteria est donc créée VIDE — seuls les
-- 4 chapitres sourcés sont seedés. Le référentiel officiel HAS se
-- charge via POST /psdm/import-referentiel (admin). Idem pour la
-- criticité par critère : non documentée dans la recherche, à poser
-- à l'import du référentiel officiel.
--
-- Pattern multi-tenant : migrations 100/101 (tenant_id + RLS
-- RESTRICTIVE tenant_isolation via current_tenant_id()). Le
-- référentiel (chapitres + critères) est NATIONAL : pas de
-- tenant_id, lecture authenticated.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RÉFÉRENTIEL — CHAPITRES (national, seed sourcé research/05 §I.6)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.psdm_chapters (
  chapter_number INT PRIMARY KEY CHECK (chapter_number BETWEEN 1 AND 4),
  label TEXT NOT NULL,
  source TEXT NOT NULL,                   -- traçabilité anti-hallu
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.psdm_chapters (chapter_number, label, source) VALUES
  (1, 'Éthique, droits des usagers, satisfaction des usagers',
     'research/05_REGLEMENTAIRE_FRANCE.md §I.6 — référentiel HAS PSDM 18/06/2024'),
  (2, 'Distribution de matériel et délivrance de prestations',
     'research/05_REGLEMENTAIRE_FRANCE.md §I.6 — référentiel HAS PSDM 18/06/2024'),
  (3, 'Fonctions support (RH, locaux, SI)',
     'research/05_REGLEMENTAIRE_FRANCE.md §I.6 — référentiel HAS PSDM 18/06/2024'),
  (4, 'Dispositions qualité et gestion des risques',
     'research/05_REGLEMENTAIRE_FRANCE.md §I.6 — référentiel HAS PSDM 18/06/2024')
ON CONFLICT (chapter_number) DO NOTHING;

-- ------------------------------------------------------------
-- 2. RÉFÉRENTIEL — CRITÈRES (national, VIDE par construction :
--    la liste nominative des 60 critères n'est pas sourcée.
--    Chargement via POST /psdm/import-referentiel, admin.)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.psdm_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- code officiel HAS du critère
  chapter_number INT NOT NULL REFERENCES public.psdm_chapters(chapter_number),
  domain TEXT,                            -- sous-domaine éventuel du référentiel officiel
  label TEXT NOT NULL,
  description TEXT,
  expected_evidence TEXT,                 -- type de preuve attendue à l'audit Cofrac
  -- Criticité : niveaux NON documentés dans la recherche → défaut
  -- 'standard', à poser à l'import du référentiel officiel HAS.
  criticality TEXT NOT NULL DEFAULT 'standard'
    CHECK (criticality IN ('standard', 'critique')),
  source TEXT NOT NULL,                   -- traçabilité : d'où vient ce critère
  display_order INT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psdm_criteria_chapter_idx
  ON public.psdm_criteria (chapter_number, display_order);

-- Référentiel national : lecture pour tous les rôles authentifiés.
-- Écriture uniquement via Edge Function service_role (import admin).
ALTER TABLE public.psdm_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psdm_criteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psdm_chapters_read ON public.psdm_chapters;
CREATE POLICY psdm_chapters_read ON public.psdm_chapters
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS psdm_criteria_read ON public.psdm_criteria;
CREATE POLICY psdm_criteria_read ON public.psdm_criteria
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 3. AUTO-ÉVALUATION PAR TENANT (un statut par critère et par PSAD)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.psdm_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  criterion_id UUID NOT NULL REFERENCES public.psdm_criteria(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'non_evalue' CHECK (status IN (
    'conforme', 'non_conforme', 'partiel', 'non_evalue'
  )),
  score INT CHECK (score BETWEEN 0 AND 100),  -- granularité optionnelle d'auto-scoring
  evidence_note TEXT,                          -- note de preuve (où est la preuve, contexte)
  assessed_by UUID,                            -- FK logique auth.users(id)
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS psdm_assessments_tenant_idx
  ON public.psdm_assessments (tenant_id);
CREATE INDEX IF NOT EXISTS psdm_assessments_status_idx
  ON public.psdm_assessments (tenant_id, status);

-- ------------------------------------------------------------
-- 4. COFFRE DOCUMENTAIRE CONFORMITÉ (métadonnées ; l'upload binaire
--    Storage viendra plus tard — on stocke storage_path)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.psdm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'autre' CHECK (doc_type IN (
    'procedure', 'fiche_technique', 'attestation_formation',
    'enregistrement_qualite', 'contrat', 'rapport_audit', 'autre'
  )),
  storage_path TEXT,                      -- chemin Supabase Storage (upload binaire ultérieur)
  criterion_id UUID REFERENCES public.psdm_criteria(id) ON DELETE SET NULL,
  uploaded_by UUID,                       -- FK logique auth.users(id)
  expires_at DATE,                        -- docs à renouveler (attestations, contrats...)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psdm_documents_tenant_idx
  ON public.psdm_documents (tenant_id);
CREATE INDEX IF NOT EXISTS psdm_documents_criterion_idx
  ON public.psdm_documents (criterion_id);
CREATE INDEX IF NOT EXISTS psdm_documents_expiry_idx
  ON public.psdm_documents (tenant_id, expires_at);

-- ------------------------------------------------------------
-- 5. PLAN DE REMÉDIATION (critère KO → action → preuve documentaire)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.psdm_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  criterion_id UUID NOT NULL REFERENCES public.psdm_criteria(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  owner TEXT,                             -- responsable de l'action (nom libre)
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN (
    'todo', 'in_progress', 'done'
  )),
  proof_document_id UUID REFERENCES public.psdm_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psdm_actions_tenant_idx
  ON public.psdm_actions (tenant_id);
CREATE INDEX IF NOT EXISTS psdm_actions_status_idx
  ON public.psdm_actions (tenant_id, status);
CREATE INDEX IF NOT EXISTS psdm_actions_criterion_idx
  ON public.psdm_actions (criterion_id);

-- ------------------------------------------------------------
-- 6. RLS tenant (pattern migrations 100/101) sur les tables tenantées
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['psdm_assessments', 'psdm_documents', 'psdm_actions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
       AS RESTRICTIVE FOR ALL
       USING (tenant_id = public.current_tenant_id())
       WITH CHECK (tenant_id = public.current_tenant_id())', t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 7. updated_at auto
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS psdm_criteria_touch ON public.psdm_criteria;
CREATE TRIGGER psdm_criteria_touch BEFORE UPDATE ON public.psdm_criteria
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS psdm_assessments_touch ON public.psdm_assessments;
CREATE TRIGGER psdm_assessments_touch BEFORE UPDATE ON public.psdm_assessments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS psdm_documents_touch ON public.psdm_documents;
CREATE TRIGGER psdm_documents_touch BEFORE UPDATE ON public.psdm_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS psdm_actions_touch ON public.psdm_actions;
CREATE TRIGGER psdm_actions_touch BEFORE UPDATE ON public.psdm_actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
