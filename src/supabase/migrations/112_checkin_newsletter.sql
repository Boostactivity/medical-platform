-- ============================================================
-- 112 — CARE CHECK-IN + NEWSLETTER
--
-- Deux briques de lien patient :
--   1. care_checkins : check-in bienveillant J1-J28 (quotidien) puis
--      semestriel. 3 réponses 1-5 (mood, confort masque, ressenti
--      sommeil) + note libre optionnelle. ANTI-SHAME : aucune notion
--      de score côté patient — flagged sert UNIQUEMENT au staff pour
--      prioriser un rappel humain (mood <= 2 OU mask_comfort <= 2).
--      day_index = jour de thérapie au moment du check-in, calculé
--      depuis patient_therapy_status.therapy_start_date (migration 101) ;
--      0 si la date de début de thérapie est inconnue.
--   2. newsletter_subscriptions / newsletter_issues : inscriptions
--      (vitrine anonyme via service role, patient_id NULLABLE) +
--      numéros rédigés par le staff. L'envoi réel est une dépendance
--      externe (fournisseur email non configuré) : status 'sent_mock'
--      uniquement — jamais de faux "envoyé" (pattern fse-transmitter).
--
-- Défensive : IF NOT EXISTS partout, FK logiques (UUID sans contrainte)
-- vers patients / users comme dans les migrations 104/108 — rejouable.
-- Multi-tenant : pattern migrations 100/101/108 (tenant_id + RLS
-- RESTRICTIVE sur current_tenant_id()) + accès patient à SES lignes.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présents via 100/108 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. CARE CHECK-INS
--    UNIQUE (patient_id, checkin_date) : un seul check-in par jour
--    calendaire, quelle que soit la cadence (quotidienne ou semestrielle).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.care_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  -- Jour de thérapie au moment du check-in (J1 = therapy_start_date).
  -- 0 = date de début de thérapie inconnue au moment du check-in.
  day_index INT NOT NULL DEFAULT 0 CHECK (day_index >= 0),
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  mask_comfort SMALLINT NOT NULL CHECK (mask_comfort BETWEEN 1 AND 5),
  sleep_feeling SMALLINT NOT NULL CHECK (sleep_feeling BETWEEN 1 AND 5),
  free_note TEXT CHECK (free_note IS NULL OR char_length(free_note) <= 500),
  -- Signal STAFF uniquement (jamais montré au patient) : un rappel
  -- humain est souhaitable. Posé par le serveur à l'insertion.
  flagged BOOLEAN NOT NULL DEFAULT false,
  handled_by UUID,                        -- FK logique vers users(id)
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS care_checkins_tenant_flagged_idx
  ON public.care_checkins (tenant_id, flagged, created_at DESC);
CREATE INDEX IF NOT EXISTS care_checkins_patient_idx
  ON public.care_checkins (patient_id, checkin_date DESC);

-- ------------------------------------------------------------
-- 2. NEWSLETTER — inscriptions
--    patient_id NULLABLE : inscriptions vitrine anonymes possibles.
--    token_unsubscribe : lien de désinscription sans authentification.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  patient_id UUID,                        -- FK logique vers patients(id), NULL = visiteur vitrine
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed')),
  token_unsubscribe UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS newsletter_subscriptions_tenant_status_idx
  ON public.newsletter_subscriptions (tenant_id, status);

DROP TRIGGER IF EXISTS newsletter_subscriptions_touch ON public.newsletter_subscriptions;
CREATE TRIGGER newsletter_subscriptions_touch
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. NEWSLETTER — numéros
--    tenant_id NULLABLE : un numéro "plateforme" (multi-tenant) reste
--    possible plus tard ; les numéros rédigés depuis le back-office
--    pro portent toujours leur tenant_id.
--    status : draft → sent_mock. PAS de statut 'sent' tant que le
--    fournisseur email réel n'est pas branché (anti faux "envoyé").
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.newsletter_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body_md TEXT NOT NULL CHECK (char_length(body_md) <= 50000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_mock')),
  sent_at TIMESTAMPTZ,
  recipients_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_issues_tenant_idx
  ON public.newsletter_issues (tenant_id, created_at DESC);

DROP TRIGGER IF EXISTS newsletter_issues_touch ON public.newsletter_issues;
CREATE TRIGGER newsletter_issues_touch
  BEFORE UPDATE ON public.newsletter_issues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 4. RLS — tenant RESTRICTIVE (pattern 101/108) + accès patient.
--    Rappel : les Edge Functions écrivent en service_role (bypass RLS)
--    et scopent tenant explicitement — ces policies protègent l'accès
--    direct PostgREST côté client. Les inscriptions vitrine anonymes
--    passent UNIQUEMENT par le service role (aucune policy anon).
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['care_checkins', 'newsletter_subscriptions'] LOOP
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

-- newsletter_issues : tenant_id NULLABLE → la restrictive tolère NULL
ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.newsletter_issues;
CREATE POLICY tenant_isolation ON public.newsletter_issues
  AS RESTRICTIVE FOR ALL
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

-- Le patient lit/écrit uniquement SES check-ins (via patients.user_id)
DROP POLICY IF EXISTS patient_own_checkins ON public.care_checkins;
CREATE POLICY patient_own_checkins ON public.care_checkins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = care_checkins.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = care_checkins.patient_id AND p.user_id = auth.uid()
    )
  );

-- Staff (admin / prestataire) : gestion des lignes du tenant
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'care_checkins', 'newsletter_subscriptions', 'newsletter_issues'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_manage ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY staff_manage ON public.%I
       FOR ALL USING (
         EXISTS (
           SELECT 1 FROM public.users u
           WHERE u.id = auth.uid() AND u.role IN (''admin'', ''prestataire'')
         )
       )', t
    );
  END LOOP;
END $$;

-- ============================================================
-- FIN MIGRATION 112
-- ============================================================
