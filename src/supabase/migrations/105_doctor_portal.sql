-- ============================================================
-- 105 — PORTAIL MÉDECIN (chantier portail prescripteur)
-- Bloc-notes privé du médecin par patient.
--
-- Périmètre volontairement minimal : les tables observance_periods,
-- patient_therapy_status, billing_lines (101), alerts (prestataire-tables)
-- et observance_data existent déjà. Seule doctor_notes manque dans les
-- migrations du repo (référencée par la liste canonique de la 100 mais
-- jamais créée).
--
-- Sémantique doctor_id : auth.users.id du médecin — même convention que
-- patients.assigned_doctor_id (cf. 003_security_hardening.sql,
-- prestataire-tables.sql : assigned_doctor_id = auth.uid()).
--
-- RLS double couche :
--   1. tenant_isolation RESTRICTIVE (pattern migrations 100/101)
--   2. owner : le médecin ne lit/écrit QUE ses propres notes
--      (doctor_id = auth.uid())
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table (défensive — ne casse pas un schéma pré-existant)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.doctor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  doctor_id UUID NOT NULL,                -- auth.users.id du médecin
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si la table existait déjà (schéma canonique partiel), compléter les
-- colonnes manquantes sans toucher aux existantes.
DO $$
DECLARE
  default_tenant UUID;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants WHERE slug = 'medical';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctor_notes' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.doctor_notes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.doctor_notes SET tenant_id = default_tenant WHERE tenant_id IS NULL;
    ALTER TABLE public.doctor_notes ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.doctor_notes ALTER COLUMN tenant_id SET DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctor_notes' AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE public.doctor_notes ADD COLUMN doctor_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctor_notes' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE public.doctor_notes ADD COLUMN patient_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctor_notes' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.doctor_notes ADD COLUMN content TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctor_notes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.doctor_notes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS doctor_notes_tenant_idx ON public.doctor_notes (tenant_id);
CREATE INDEX IF NOT EXISTS doctor_notes_doctor_patient_idx ON public.doctor_notes (doctor_id, patient_id);

-- Un seul bloc-notes par couple (médecin, patient) — autosave côté front.
-- Défensif : si des doublons pré-existent, on n'échoue pas la migration
-- (l'API gère alors le cas multi-notes en prenant la plus récente).
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS doctor_notes_doctor_patient_uniq
    ON public.doctor_notes (doctor_id, patient_id);
EXCEPTION WHEN unique_violation OR others THEN
  RAISE NOTICE 'doctor_notes_doctor_patient_uniq non créé (doublons existants ?) : %', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- 2. RLS — tenant (RESTRICTIVE) + propriétaire (le médecin seul)
-- ------------------------------------------------------------

ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.doctor_notes;
CREATE POLICY tenant_isolation ON public.doctor_notes
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Le médecin ne voit et ne modifie QUE ses propres notes.
-- Aucune autre policy permissive : ni patient, ni autre médecin,
-- ni prestataire n'y accèdent via le client (le service role bypasse,
-- scopé par middleware côté Edge Functions).
DROP POLICY IF EXISTS doctor_notes_owner ON public.doctor_notes;
CREATE POLICY doctor_notes_owner ON public.doctor_notes
  FOR ALL
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- ------------------------------------------------------------
-- 3. updated_at automatique (touch_updated_at vient de la 100 ;
--    re-déclaré ici par sécurité, CREATE OR REPLACE idempotent)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS doctor_notes_touch ON public.doctor_notes;
CREATE TRIGGER doctor_notes_touch BEFORE UPDATE ON public.doctor_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
