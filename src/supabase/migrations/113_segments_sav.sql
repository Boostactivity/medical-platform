-- ============================================================
-- 113 — SEGMENTATION PATIENTS + GESTION SAV / SLA (back-office PSAD)
--
-- Deux briques back-office (côté pro uniquement) :
--
--   A. patient_segments — cohortes machine-lisibles. Les `rules`
--      (JSONB) décrivent des critères évalués DYNAMIQUEMENT côté
--      requête sur observance_periods (compliance_band) + patient_
--      therapy_status (phase, ancienneté thérapie). Aucun snapshot :
--      le compteur reflète l'état courant de la flotte.
--
--   B. GESTION SAV par-dessus les déclarations patient. La table
--      patient_tickets (migration 104) reste la DÉCLARATION simple
--      du patient (panne / masque / question). Ici on construit la
--      GESTION pro : sav_tickets ajoute priorité, SLA, assignation,
--      catégorie, résolution ; sav_ticket_events trace l'historique.
--      Un sav_ticket peut naître d'une déclaration patient
--      (patient_ticket_id renseigné) OU d'une création interne pro.
--
-- Suit le pattern multi-tenant des migrations 100/101/104
-- (tenant_id + RLS RESTRICTIVE sur current_tenant_id() + accès staff
-- admin/prestataire). prochaine migration libre après celle-ci : 114.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présent via 100/104 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. SEGMENTS PATIENTS (cohortes dynamiques)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Pastille couleur (hex) pour repérage visuel dans le back-office
  color TEXT NOT NULL DEFAULT '#007AFF',
  -- Critères machine-lisibles évalués côté requête. Clés supportées :
  --   compliance_band : string[]  (full|partial|low|none) — dernière fenêtre 28j
  --   phase           : string[]  (initial|maintenance|stopped)
  --   therapy_max_days: number    — thérapie démarrée il y a <= N jours
  --   therapy_min_days: number    — thérapie démarrée il y a >= N jours
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- is_dynamic : le segment se recalcule en continu (true). Réservé pour
  -- d'éventuels segments figés/manuels en V2 (false).
  is_dynamic BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_segments_tenant_idx
  ON public.patient_segments (tenant_id);

DROP TRIGGER IF EXISTS patient_segments_touch ON public.patient_segments;
CREATE TRIGGER patient_segments_touch
  BEFORE UPDATE ON public.patient_segments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. TICKETS SAV (gestion pro : priorité, SLA, assignation)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sav_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Origine patient : lien vers la déclaration patient_tickets (104).
  -- NULL = ticket créé en interne par le pro (appel, mail, terrain...).
  patient_ticket_id UUID REFERENCES public.patient_tickets(id) ON DELETE SET NULL,
  -- Patient concerné (FK logique vers patients.id). Renseigné quand connu,
  -- pour relier le ticket à la fiche patient et aux segments.
  patient_id UUID,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'autre' CHECK (category IN (
    'panne', 'masque', 'consommable', 'administratif', 'autre'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  -- Échéance SLA calculée à la création / au changement de priorité
  -- (urgent 4h, high 1j, medium 3j, low 7j). Dépassée => badge retard.
  sla_due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',          -- créé, non pris en charge
    'assigned',     -- affecté à un agent
    'in_progress',  -- en cours de traitement
    'waiting',      -- en attente (pièce, retour patient, fournisseur)
    'resolved',     -- résolu
    'closed'        -- clôturé
  )),
  assigned_to UUID,                         -- FK logique vers users.id (staff)
  resolution_note TEXT,
  created_by UUID,                          -- staff auteur de la création
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sav_tickets_tenant_idx
  ON public.sav_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS sav_tickets_status_idx
  ON public.sav_tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS sav_tickets_sla_idx
  ON public.sav_tickets (tenant_id, sla_due_at);
CREATE INDEX IF NOT EXISTS sav_tickets_assigned_idx
  ON public.sav_tickets (tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS sav_tickets_patient_ticket_idx
  ON public.sav_tickets (patient_ticket_id);

DROP TRIGGER IF EXISTS sav_tickets_touch ON public.sav_tickets;
CREATE TRIGGER sav_tickets_touch
  BEFORE UPDATE ON public.sav_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. HISTORIQUE SAV (timeline du ticket)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sav_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.sav_tickets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Type d'évènement : created | status_change | priority_change |
  -- assigned | note | resolved | reopened
  event_type TEXT NOT NULL DEFAULT 'note',
  detail TEXT,
  author TEXT,                              -- email/identifiant de l'agent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sav_ticket_events_ticket_idx
  ON public.sav_ticket_events (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS sav_ticket_events_tenant_idx
  ON public.sav_ticket_events (tenant_id);

-- ------------------------------------------------------------
-- 4. RLS — tenant RESTRICTIVE (pattern 101/104) + accès staff
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_segments', 'sav_tickets', 'sav_ticket_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
       AS RESTRICTIVE FOR ALL
       USING (tenant_id = public.current_tenant_id())
       WITH CHECK (tenant_id = public.current_tenant_id())', t
    );

    -- Staff (admin / prestataire) : gestion complète au sein du tenant.
    -- (segments & SAV n'ont PAS de versant patient — back-office pur.)
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

-- ------------------------------------------------------------
-- 5. SEED — 3 segments plateforme par défaut (tenant 'medical')
--    Calcul dynamique côté requête (rules évaluées en live).
-- ------------------------------------------------------------

INSERT INTO public.patient_segments (tenant_id, name, description, color, rules, is_dynamic)
SELECT t.id, s.name, s.description, s.color, s.rules::jsonb, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('Observance fragile',
   'Patients dont la dernière fenêtre 28 jours est sous le seuil (faible ou aucun relevé). Cible prioritaire pour un accompagnement.',
   '#C45D40',
   '{"compliance_band": ["low", "none"]}'),
  ('Phase initiale',
   'Patients en phase initiale 9.INI (13 semaines, accord préalable). Suivi renforcé du démarrage de traitement.',
   '#007AFF',
   '{"phase": ["initial"]}'),
  ('Nouveaux patients',
   'Thérapie démarrée il y a moins de 30 jours. Premiers réglages, premier masque, premières habitudes.',
   '#34C759',
   '{"therapy_max_days": 30}')
) AS s(name, description, color, rules)
WHERE t.slug = 'medical'
  AND NOT EXISTS (
    SELECT 1 FROM public.patient_segments ps
    WHERE ps.tenant_id = t.id AND ps.name = s.name
  );

-- ============================================================
-- FIN MIGRATION 113
-- ============================================================
