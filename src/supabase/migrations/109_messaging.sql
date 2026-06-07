-- ============================================================
-- 109 — MESSAGERIE SÉCURISÉE (patient ↔ équipe prestataire ↔ médecin)
--
-- Deux tables :
--   - conversations          : fil par patient (kind patient_support|medical)
--   - conversation_messages  : messages d'un fil, read_by JSONB (user ids)
--
-- NOTE table legacy `public.messages` (migration.sql racine) :
--   schéma sender_id/receiver_id 1-à-1, SANS conversation_id ni tenant_id
--   → inutilisable pour des fils multi-tenant. On ne la touche pas et on
--   crée `conversation_messages` (nom distinct, zéro collision).
--
-- Multi-tenant : pattern migrations 100/101/104
--   - tenant_id + RLS RESTRICTIVE sur current_tenant_id()
--   - les Edge Functions (SERVICE_ROLE) scopent tenant explicitement,
--     la RLS protège les accès supabase-js directs côté navigateur.
--
-- Accès (RLS additive par audience) :
--   - patient : SEULEMENT ses conversations (patients.user_id = auth.uid())
--   - staff (admin/prestataire) : tout le tenant
--   - médecin : SEULEMENT kind='medical' de SES patients assignés
--     (patients.assigned_doctor_id = auth.uid(), convention 003/105)
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
-- 1. CONVERSATIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  kind TEXT NOT NULL DEFAULT 'patient_support'
    CHECK (kind IN ('patient_support', 'medical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  created_by UUID NOT NULL,               -- auth.users.id du créateur
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_tenant_last_message_idx
  ON public.conversations (tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_patient_idx
  ON public.conversations (patient_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_tenant_kind_status_idx
  ON public.conversations (tenant_id, kind, status);

DROP TRIGGER IF EXISTS conversations_touch ON public.conversations;
CREATE TRIGGER conversations_touch
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. MESSAGES D'UN FIL
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL
    REFERENCES public.conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sender_id UUID NOT NULL,                -- auth.users.id de l'expéditeur
  sender_role TEXT NOT NULL
    CHECK (sender_role IN ('patient', 'prestataire', 'admin', 'doctor')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  -- Liste des auth.users.id ayant lu ce message (l'expéditeur est implicite)
  read_by JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_idx
  ON public.conversation_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversation_messages_tenant_idx
  ON public.conversation_messages (tenant_id);

-- ------------------------------------------------------------
-- 3. RLS — tenant RESTRICTIVE (pattern 101/104) + 3 audiences
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['conversations', 'conversation_messages'] LOOP
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

-- 3a. Patient : SEULEMENT ses conversations (via patients.user_id)
DROP POLICY IF EXISTS patient_own_conversations ON public.conversations;
CREATE POLICY patient_own_conversations ON public.conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = conversations.patient_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = conversations.patient_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_own_messages ON public.conversation_messages;
CREATE POLICY patient_own_messages ON public.conversation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE c.id = conversation_messages.conversation_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE c.id = conversation_messages.conversation_id
        AND p.user_id = auth.uid()
    )
  );

-- 3b. Staff (admin / prestataire) : tout le tenant
--     (le périmètre tenant est déjà imposé par tenant_isolation RESTRICTIVE)
DROP POLICY IF EXISTS staff_tenant_conversations ON public.conversations;
CREATE POLICY staff_tenant_conversations ON public.conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

DROP POLICY IF EXISTS staff_tenant_messages ON public.conversation_messages;
CREATE POLICY staff_tenant_messages ON public.conversation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

-- 3c. Médecin : SEULEMENT kind='medical' de SES patients assignés.
--     Lecture des fils ; sur les messages, ALL (répondre + marquer lu).
--     Pas de création/clôture de conversation côté médecin.
DROP POLICY IF EXISTS doctor_medical_conversations ON public.conversations;
CREATE POLICY doctor_medical_conversations ON public.conversations
  FOR SELECT USING (
    kind = 'medical'
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = conversations.patient_id
        AND p.assigned_doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS doctor_medical_messages ON public.conversation_messages;
CREATE POLICY doctor_medical_messages ON public.conversation_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE c.id = conversation_messages.conversation_id
        AND c.kind = 'medical'
        AND p.assigned_doctor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.patients p ON p.id = c.patient_id
      WHERE c.id = conversation_messages.conversation_id
        AND c.kind = 'medical'
        AND p.assigned_doctor_id = auth.uid()
    )
  );

-- ============================================================
-- FIN MIGRATION 109
-- ============================================================
