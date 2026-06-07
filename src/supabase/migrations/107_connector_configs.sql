-- ============================================================
-- 107 — CONNECTEUR D'EXTRACTION TÉLÉSUIVI (chantier connecteurs)
-- Idée produit : le PSAD possède DÉJÀ ses identifiants sur les
-- portails fabricants (ResMed AirView, Philips Care Orchestrator,
-- Löwenstein prisma CLOUD). Le worker (apps/connector-worker)
-- automatise l'extraction de SES données avec SES identifiants,
-- plusieurs fois par jour — aucun NDA fabricant nécessaire.
--
-- - connector_configs : 1 ligne = 1 connecteur configuré pour un
--   tenant (provider + credentials chiffrés + horaires).
--   credentials_encrypted : blob AES-256-GCM produit par le worker
--   (clé locale ENCRYPTION_KEY, JAMAIS stockée côté plateforme).
--   La plateforme ne peut PAS déchiffrer — elle ne fait que stocker.
-- - connector_runs : journal des exécutions (succès/partiel/échec,
--   nombre d'enregistrements ingérés).
--
-- Suit le pattern multi-tenant des migrations 100/101
-- (tenant_id + RLS RESTRICTIVE via current_tenant_id()).
-- NOTE : 'connector_configs' figure déjà dans la liste défensive de
-- la migration 100 — si la table n'existait pas alors, elle est
-- créée ici avec tenant_id directement.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONFIGURATIONS DE CONNECTEURS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.connector_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'airview',            -- ResMed AirView (Playwright, flow à calibrer au pilote)
    'care_orchestrator',  -- Philips Care Orchestrator (plugin à venir)
    'prisma_cloud',       -- Löwenstein prisma CLOUD (plugin à venir)
    'csv_watch'           -- Surveillance dossier local — fonctionne dès aujourd'hui
  )),
  label TEXT NOT NULL,
  -- Blob chiffré AES-256-GCM par le worker (iv.tag.ciphertext en base64).
  -- JAMAIS de credentials en clair ici. NULL pour csv_watch (pas de creds).
  credentials_encrypted TEXT,
  -- Horaires d'extraction visés (informatif + génération cron côté worker).
  schedule_times JSONB NOT NULL DEFAULT '["06:00","12:00","18:00"]'::jsonb,
  -- Options par provider, lues par le worker :
  --   csv_watch : { "watchDir": "C:\\exports\\airview" }
  --   airview   : { "selectorOverrides": { "loginUser": "#new-id" },
  --                 "patientMap": { "ref-portail": "uuid-patient" } }
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('running', 'success', 'partial', 'failed')),
  last_run_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS connector_configs_tenant_idx
  ON public.connector_configs (tenant_id);
CREATE INDEX IF NOT EXISTS connector_configs_enabled_idx
  ON public.connector_configs (tenant_id, enabled);

-- ------------------------------------------------------------
-- 2. JOURNAL DES EXÉCUTIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.connector_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.connector_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'success', 'partial', 'failed'
  )),
  records_ingested INT NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS connector_runs_tenant_idx
  ON public.connector_runs (tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS connector_runs_config_idx
  ON public.connector_runs (config_id, started_at DESC);

-- ------------------------------------------------------------
-- 3. RLS tenant (pattern migrations 100/101)
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['connector_configs', 'connector_runs'] LOOP
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
-- 4. updated_at automatique (réutilise touch_updated_at de la 100)
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS connector_configs_touch ON public.connector_configs;
CREATE TRIGGER connector_configs_touch BEFORE UPDATE ON public.connector_configs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
