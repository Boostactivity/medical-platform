-- ============================================================
-- 104 — PORTAIL PATIENT (préférences, tickets, forgiveness)
--
-- Règles produit (research/15 §VIII + research/12) :
--   - Streaks OPT-IN : streaks_enabled DEFAULT false. Le patient
--     choisit d'afficher sa série, jamais imposée.
--   - FORGIVENESS : la progression cumulée (cumulative_nights)
--     n'est JAMAIS remise à zéro. Pattern Apple Activity Rings.
--   - Tickets panne : déclaration simple côté patient
--     (panne / masque / question), traitée par le prestataire.
--
-- Défensive : IF NOT EXISTS partout, colonnes ajoutées via DO
-- blocks (patient_stats a deux schémas historiques possibles).
-- Multi-tenant : pattern migrations 100/101 (tenant_id + RLS
-- RESTRICTIVE sur current_tenant_id()) + accès patient à SES
-- propres lignes via patients.user_id = auth.uid().
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présents normalement via 100/101 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. PRÉFÉRENCES PATIENT
--    patient_id = patients.id (FK logique, comme observance_periods)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID UNIQUE NOT NULL,        -- FK logique vers patients(id)
  -- Gamification OPT-IN : false par défaut, le patient active s'il veut
  streaks_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Anti-harcèlement : max 1 notification/jour par défaut
  notifications_daily_max INT NOT NULL DEFAULT 1
    CHECK (notifications_daily_max BETWEEN 0 AND 3),
  notification_channel TEXT NOT NULL DEFAULT 'app'
    CHECK (notification_channel IN ('app', 'email', 'sms', 'none')),
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_preferences_tenant_idx
  ON public.patient_preferences (tenant_id);

DROP TRIGGER IF EXISTS patient_preferences_touch ON public.patient_preferences;
CREATE TRIGGER patient_preferences_touch
  BEFORE UPDATE ON public.patient_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. TICKETS PATIENT (déclaration panne / masque / question)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  type TEXT NOT NULL CHECK (type IN ('panne', 'masque', 'question')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_tickets_tenant_idx
  ON public.patient_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS patient_tickets_patient_idx
  ON public.patient_tickets (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS patient_tickets_status_idx
  ON public.patient_tickets (tenant_id, status);

DROP TRIGGER IF EXISTS patient_tickets_touch ON public.patient_tickets;
CREATE TRIGGER patient_tickets_touch
  BEFORE UPDATE ON public.patient_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. FORGIVENESS sur patient_stats (si la table existe)
--    - cumulative_nights : progression cumulée, JAMAIS resetée
--    - streak_freezes_used_month : tolérance avant pause de série
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patient_stats'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patient_stats'
        AND column_name = 'cumulative_nights'
    ) THEN
      ALTER TABLE public.patient_stats ADD COLUMN cumulative_nights INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patient_stats'
        AND column_name = 'streak_freezes_used_month'
    ) THEN
      ALTER TABLE public.patient_stats ADD COLUMN streak_freezes_used_month INT NOT NULL DEFAULT 0;
    END IF;

    -- Backfill : la progression cumulée part du total déjà suivi
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patient_stats'
        AND column_name = 'total_nights_tracked'
    ) THEN
      UPDATE public.patient_stats
      SET cumulative_nights = GREATEST(cumulative_nights, COALESCE(total_nights_tracked, 0))
      WHERE COALESCE(total_nights_tracked, 0) > cumulative_nights;
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. RLS — tenant RESTRICTIVE (pattern 101) + accès patient
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_preferences', 'patient_tickets'] LOOP
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

-- Le patient lit/écrit uniquement SES lignes (via patients.user_id)
DROP POLICY IF EXISTS patient_own_preferences ON public.patient_preferences;
CREATE POLICY patient_own_preferences ON public.patient_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_preferences.patient_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_preferences.patient_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_own_tickets ON public.patient_tickets;
CREATE POLICY patient_own_tickets ON public.patient_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_tickets.patient_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_tickets.patient_id
        AND p.user_id = auth.uid()
    )
  );

-- Staff (admin / prestataire) : lecture + traitement des tickets du tenant
DROP POLICY IF EXISTS staff_manage_tickets ON public.patient_tickets;
CREATE POLICY staff_manage_tickets ON public.patient_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

DROP POLICY IF EXISTS staff_read_preferences ON public.patient_preferences;
CREATE POLICY staff_read_preferences ON public.patient_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

-- ============================================================
-- FIN MIGRATION 104
-- ============================================================
