-- ============================================================
-- 108 — SERVICES PATIENT (marketplace consommables, RDV, documents)
--
-- Trois briques côté patient, traitées côté prestataire :
--   1. patient_orders / patient_order_items : commandes de
--      consommables (masques, filtres, tubulures). Les consommables
--      PPC relèvent du forfait LPP : prix INDICATIFS uniquement,
--      covered_by_insurance = pris en charge Sécurité sociale.
--   2. appointment_requests : demandes de rendez-vous patient
--      (installation, contrôle, dépannage, renouvellement) avec
--      disponibilités proposées, créneau proposé par le prestataire,
--      et lien vers l'intervention créée à la planification.
--   3. patient_documents : documents du patient (ordonnances,
--      attestations de voyage générées, rapports, justificatifs).
--      Les documents auto-générés portent generated = true et leur
--      contenu structuré dans payload (PDF via pdf-generator plus tard).
--
-- Défensive : IF NOT EXISTS partout, colonnes via ADD COLUMN IF NOT
-- EXISTS, FK "logiques" (UUID sans contrainte) vers patients /
-- consumables / interventions comme dans la migration 104 — rejouable,
-- n'échoue pas si une table amont est absente.
-- Multi-tenant : pattern migrations 100/101/104 (tenant_id + RLS
-- RESTRICTIVE sur current_tenant_id()) + accès patient à SES propres
-- lignes via patients.user_id = auth.uid().
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présents via 100/104 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. COMMANDES PATIENT — patient_orders + patient_order_items
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('draft', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_orders_tenant_status_idx
  ON public.patient_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS patient_orders_patient_idx
  ON public.patient_orders (patient_id, created_at DESC);

DROP TRIGGER IF EXISTS patient_orders_touch ON public.patient_orders;
CREATE TRIGGER patient_orders_touch
  BEFORE UPDATE ON public.patient_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.patient_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_id UUID NOT NULL REFERENCES public.patient_orders(id) ON DELETE CASCADE,
  consumable_id UUID,                     -- FK logique vers consumables(id), NULL si article libre
  -- Photo du libellé au moment de la commande (le catalogue peut bouger)
  item_label TEXT NOT NULL CHECK (char_length(item_label) BETWEEN 1 AND 200),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  -- Prix INDICATIF uniquement (consommables LPP remboursés) — jamais facturé ici
  unit_price_indicatif NUMERIC(10,2),
  covered_by_insurance BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_order_items_order_idx
  ON public.patient_order_items (order_id);
CREATE INDEX IF NOT EXISTS patient_order_items_tenant_idx
  ON public.patient_order_items (tenant_id);

-- ------------------------------------------------------------
-- 2. DEMANDES DE RENDEZ-VOUS — appointment_requests
--    preferred_dates : JSONB, tableau de disponibilités patient
--      [{ "date": "YYYY-MM-DD", "time_slot": "matin"|"apres_midi"|"indifferent" }]
--    proposed_slot : JSONB, créneau proposé/retenu par le prestataire
--      { "date": "YYYY-MM-DD", "time_slot": "morning"|"afternoon" }
--    intervention_id : posé quand le prestataire convertit la demande
--      en intervention planifiée (FK logique vers interventions(id))
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  type TEXT NOT NULL
    CHECK (type IN ('install', 'controle', 'depannage', 'renouvellement', 'autre')),
  preferred_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'proposed', 'confirmed', 'declined', 'cancelled')),
  proposed_slot JSONB,
  intervention_id UUID,                   -- FK logique vers interventions(id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_requests_tenant_status_idx
  ON public.appointment_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS appointment_requests_patient_idx
  ON public.appointment_requests (patient_id, created_at DESC);

DROP TRIGGER IF EXISTS appointment_requests_touch ON public.appointment_requests;
CREATE TRIGGER appointment_requests_touch
  BEFORE UPDATE ON public.appointment_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. DOCUMENTS PATIENT — patient_documents
--    storage_path : fichier dans Supabase Storage (uploads / PDF)
--    generated + payload : documents auto-générés (attestation voyage)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('ordonnance', 'attestation_voyage', 'rapport', 'justificatif', 'autre')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  storage_path TEXT,
  generated BOOLEAN NOT NULL DEFAULT false,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Défensif : si une table patient_documents pré-existait avec un schéma
-- partiel, on aligne les colonnes nécessaires sans rien casser.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patient_documents'
  ) THEN
    ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS generated BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS payload JSONB;
    ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS patient_documents_patient_idx
  ON public.patient_documents (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS patient_documents_tenant_idx
  ON public.patient_documents (tenant_id);

-- ------------------------------------------------------------
-- 4. RLS — tenant RESTRICTIVE (pattern 101/104) + accès patient
--    Rappel : les Edge Functions écrivent en service_role (bypass RLS)
--    et scopent tenant explicitement — ces policies protègent l'accès
--    direct PostgREST côté client.
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patient_orders', 'patient_order_items', 'appointment_requests', 'patient_documents'
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

-- Le patient lit/écrit uniquement SES lignes (via patients.user_id)
DROP POLICY IF EXISTS patient_own_orders ON public.patient_orders;
CREATE POLICY patient_own_orders ON public.patient_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_orders.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_orders.patient_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_own_order_items ON public.patient_order_items;
CREATE POLICY patient_own_order_items ON public.patient_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patient_orders o
      JOIN public.patients p ON p.id = o.patient_id
      WHERE o.id = patient_order_items.order_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_orders o
      JOIN public.patients p ON p.id = o.patient_id
      WHERE o.id = patient_order_items.order_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_own_appointments ON public.appointment_requests;
CREATE POLICY patient_own_appointments ON public.appointment_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = appointment_requests.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = appointment_requests.patient_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_own_documents ON public.patient_documents;
CREATE POLICY patient_own_documents ON public.patient_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_documents.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_documents.patient_id AND p.user_id = auth.uid()
    )
  );

-- Staff (admin / prestataire) : gestion des lignes du tenant
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patient_orders', 'patient_order_items', 'appointment_requests', 'patient_documents'
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
-- FIN MIGRATION 108
-- ============================================================
