-- ============================================================
-- 114 — CRM PRESCRIPTEURS + TRACE DES EXPORTS CPAM (chantier back-office)
--
-- Trois tables tenantées, pattern strict des migrations 100/101 :
--   1. prescriber_contacts     : CRM léger des médecins apporteurs d'un PSAD
--   2. prescriber_interactions : timeline de contacts par prescripteur
--   3. cpam_export_runs        : trace des exports CPAM générés (régénérables)
--
-- Conventions reprises du repo :
--   - tenant_id NOT NULL + RLS RESTRICTIVE via public.current_tenant_id()
--     (cf. 100/101) ; le service role (Edge Functions) bypasse la RLS et
--     applique le scoping tenant par middleware/tenant.ts.
--   - prescriber_contacts.doctor_id = auth.users.id du médecin lié
--     (MÊME convention que doctor_notes.doctor_id et
--      patients.assigned_doctor_id — cf. 105_doctor_portal.sql). NULLABLE :
--     un prescripteur peut être un contact externe sans compte plateforme.
--     Pas de FK dure (doctors.user_id n'est pas une cible FK garantie ;
--     convention identique à doctor_notes qui ne pose pas de FK non plus).
--   - touch_updated_at() vient de la 100 (CREATE OR REPLACE idempotent ici).
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRM PRESCRIPTEURS — fiche médecin apporteur
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prescriber_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- auth.users.id du médecin si le prescripteur a un compte (= patients.assigned_doctor_id) ;
  -- NULL = contact externe sans compte plateforme
  doctor_id UUID,
  full_name TEXT NOT NULL,
  rpps TEXT,                                -- n° RPPS / ADELI
  specialty TEXT,
  establishment TEXT,                       -- cabinet / clinique / hôpital
  email TEXT,
  phone TEXT,
  notes TEXT,
  relationship_status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (relationship_status IN ('prospect', 'actif', 'inactif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescriber_contacts_tenant_idx
  ON public.prescriber_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS prescriber_contacts_doctor_idx
  ON public.prescriber_contacts (tenant_id, doctor_id);
-- Un même médecin lié n'apparaît qu'une fois par tenant (les contacts
-- externes sans compte, doctor_id NULL, ne sont pas contraints).
CREATE UNIQUE INDEX IF NOT EXISTS prescriber_contacts_doctor_uniq
  ON public.prescriber_contacts (tenant_id, doctor_id)
  WHERE doctor_id IS NOT NULL;

-- ------------------------------------------------------------
-- 2. INTERACTIONS — timeline de contacts par prescripteur
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prescriber_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  prescriber_contact_id UUID NOT NULL
    REFERENCES public.prescriber_contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'autre'
    CHECK (kind IN ('appel', 'visite', 'email', 'autre')),
  summary TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author UUID,                              -- auth.users.id de l'auteur (admin/prestataire)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescriber_interactions_tenant_idx
  ON public.prescriber_interactions (tenant_id);
CREATE INDEX IF NOT EXISTS prescriber_interactions_contact_idx
  ON public.prescriber_interactions (prescriber_contact_id, occurred_at DESC);

-- ------------------------------------------------------------
-- 3. TRACE DES EXPORTS CPAM (régénérables depuis payload_summary)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cpam_export_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('observance_112_28', 'facturation', 'activite')),
  status TEXT NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated')),
  rows_count INTEGER NOT NULL DEFAULT 0,
  generated_by UUID,                        -- auth.users.id du générateur
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Snapshot complet (colonnes + lignes + méta) pour régénérer le CSV
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS cpam_export_runs_tenant_idx
  ON public.cpam_export_runs (tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS cpam_export_runs_kind_idx
  ON public.cpam_export_runs (tenant_id, kind);

-- ------------------------------------------------------------
-- 4. RLS tenant RESTRICTIVE (pattern 100/101)
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prescriber_contacts', 'prescriber_interactions', 'cpam_export_runs'
  ] LOOP
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
-- 5. updated_at auto (touch_updated_at vient de la 100)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prescriber_contacts_touch ON public.prescriber_contacts;
CREATE TRIGGER prescriber_contacts_touch BEFORE UPDATE ON public.prescriber_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
