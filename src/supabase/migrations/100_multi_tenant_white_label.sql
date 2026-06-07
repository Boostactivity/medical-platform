-- ============================================================
-- 100 — MULTI-TENANT WHITE-LABEL (chantier 0.3)
-- Hiérarchie : tenant (PSAD) → brand (sous-marque) → agency → team
-- - tenant_id sur TOUTES les tables métier existantes (défensif :
--   n'altère que les tables présentes dans le schéma)
-- - RLS étanche par tenant via current_tenant_id() (claim JWT)
-- - Branding configurable par brand (logo, couleurs, mentions)
-- - Renommage exp_air_scores → medical_scores (suite rebrand)
--
-- NOTE service_role : les Edge Functions utilisent SERVICE_ROLE_KEY
-- qui bypasse la RLS. La RLS protège les accès clients directs
-- (supabase-js côté navigateur). Côté Edge Functions, le scoping
-- tenant est appliqué par middleware/tenant.ts — les deux couches
-- sont nécessaires.
-- ============================================================

-- ------------------------------------------------------------
-- 1. HIÉRARCHIE TENANT
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  -- Identifiants réglementaires du PSAD
  finess TEXT,
  siret TEXT,
  -- Modules activables (toggles white-label)
  modules JSONB NOT NULL DEFAULT '{
    "observance": true,
    "facturation": false,
    "latm": false,
    "psdm_has": true,
    "marketplace": false,
    "teleconsultation": false,
    "communaute": false
  }'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Branding white-label (le front consomme ce JSON tel quel)
  branding JSONB NOT NULL DEFAULT '{
    "logo_url": null,
    "colors": { "primary": "#007AFF", "accent": "#C45D40" },
    "font_display": "Source Serif 4",
    "font_body": "Inter"
  }'::jsonb,
  -- Mentions légales / RGPD custom par marque
  legal JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Domaine custom (V2) : monpsad.fr
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- Une seule marque par défaut par tenant
CREATE UNIQUE INDEX IF NOT EXISTS brands_one_default_per_tenant
  ON public.brands (tenant_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  -- Géoloc pour la carte interactive vitrine + planning tournées
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  finess TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agencies_tenant_idx ON public.agencies (tenant_id);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teams_tenant_idx ON public.teams (tenant_id);

-- ------------------------------------------------------------
-- 2. TENANT PAR DÉFAUT (backfill des données existantes)
-- ------------------------------------------------------------

INSERT INTO public.tenants (slug, name)
VALUES ('medical', 'Medical')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.brands (tenant_id, slug, name, is_default)
SELECT t.id, 'medical', 'Medical', true
FROM public.tenants t
WHERE t.slug = 'medical'
  AND NOT EXISTS (SELECT 1 FROM public.brands b WHERE b.tenant_id = t.id AND b.is_default);

-- ------------------------------------------------------------
-- 3. HELPER : tenant courant depuis le JWT
--    (app_metadata.tenant_id, posé à l'invitation de l'utilisateur)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'tenant_id',
      ''
    ),
    ''
  )::uuid
$$;

-- ------------------------------------------------------------
-- 4. tenant_id + RLS sur toutes les tables métier EXISTANTES
-- ------------------------------------------------------------

DO $$
DECLARE
  default_tenant UUID;
  t TEXT;
  business_tables TEXT[] := ARRAY[
    -- schéma canonique
    'profiles', 'patients', 'devices', 'masks', 'therapy_data', 'scores',
    'alerts', 'interventions', 'messages', 'notifications', 'orders',
    'billing', 'prescriptions', 'doctor_notes', 'consents', 'tickets',
    'satisfaction_surveys', 'forum_posts', 'forum_replies', 'badges',
    'badge_attributions', 'milestones', 'loyalty_transactions',
    'wearable_configs', 'connector_configs', 'sites',
    -- tables ajoutées par les migrations du clone
    'users', 'doctors', 'sleep_data', 'observance_data', 'device_metrics',
    'alerts_queue', 'device_assignments', 'equipment_inventory',
    'equipment_tracking', 'maintenance_logs', 'consumables',
    'consumable_orders', 'patient_documents', 'patient_stats',
    'patient_achievements', 'billing_history', 'revenue_tracking',
    'cpam_compliance', 'audit_logs', 'exp_air_scores', 'medical_scores',
    'customers', 'subscriptions', 'invoices', 'payments',
    'compliance_records', 'fhir_exports'
  ];
BEGIN
  SELECT id INTO default_tenant FROM public.tenants WHERE slug = 'medical';

  FOREACH t IN ARRAY business_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- a. Colonne tenant_id (backfill sur le tenant par défaut)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', t
        );
        EXECUTE format(
          'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, default_tenant
        );
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t
        );
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L', t, default_tenant
        );
      END IF;

      -- b. Index
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', t || '_tenant_idx', t
      );

      -- c. RLS étanche : on ne voit QUE son tenant
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I
         AS RESTRICTIVE
         FOR ALL
         USING (tenant_id = public.current_tenant_id())
         WITH CHECK (tenant_id = public.current_tenant_id())', t
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 5. RLS sur la hiérarchie elle-même
--    (lecture de SON tenant ; écriture réservée au service role)
-- ------------------------------------------------------------

ALTER TABLE public.tenants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_self_read ON public.tenants;
CREATE POLICY tenant_self_read ON public.tenants
  FOR SELECT USING (id = public.current_tenant_id());

DROP POLICY IF EXISTS brands_tenant_read ON public.brands;
CREATE POLICY brands_tenant_read ON public.brands
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS agencies_tenant_read ON public.agencies;
CREATE POLICY agencies_tenant_read ON public.agencies
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS teams_tenant_read ON public.teams;
CREATE POLICY teams_tenant_read ON public.teams
  FOR SELECT USING (tenant_id = public.current_tenant_id());

-- ------------------------------------------------------------
-- 6. RENOMMAGE exp_air_scores → medical_scores (suite rebrand)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exp_air_scores'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medical_scores'
  ) THEN
    ALTER TABLE public.exp_air_scores RENAME TO medical_scores;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'medical_scores'
        AND column_name = 'exp_air_score'
    ) THEN
      ALTER TABLE public.medical_scores RENAME COLUMN exp_air_score TO medical_score;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. updated_at automatique sur la hiérarchie
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenants_touch ON public.tenants;
CREATE TRIGGER tenants_touch BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS brands_touch ON public.brands;
CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS agencies_touch ON public.agencies;
CREATE TRIGGER agencies_touch BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
