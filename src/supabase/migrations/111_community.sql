-- ============================================================
-- 111 — COMMUNAUTÉ PATIENT MODÉRÉE (apnée du sommeil)
--
-- Espace d'échange entre patients d'un même prestataire, avec
-- trois règles dures (playbook santé) :
--   1. ANONYMAT : chaque patient participe sous un pseudonyme
--      (community_profiles). Le vrai nom n'apparaît JAMAIS côté
--      patients — seul le staff du tenant voit le lien
--      profil → patient pour la modération.
--   2. MODÉRATION A PRIORI : tout post / réponse naît en
--      'pending' et n'est visible des autres patients qu'après
--      approbation par le staff du tenant ('approved').
--      'rejected' (avec raison) et 'removed' (retrait après
--      publication, ex. suite signalement) complètent le cycle.
--   3. PAS DE PRESSION SOCIALE : aucun like, aucun score,
--      aucun classement. Signalement possible
--      (community_reports) traité par le staff.
--
-- community_partners : annuaire d'associations de patients
-- (FFAAIR, Alliance Apnées du Sommeil…). tenant_id NULL =
-- entrée commune à tous les tenants ; un tenant peut ajouter
-- les siennes. Descriptions factuelles, pas d'allégations.
--
-- Défensive : IF NOT EXISTS partout, FK "logiques" (UUID sans
-- contrainte) vers patients / users comme dans 104/108 —
-- rejouable, n'échoue pas si une table amont est absente.
-- Multi-tenant : pattern migrations 100/101/108 (tenant_id +
-- RLS RESTRICTIVE sur current_tenant_id()).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présents via 100/104/108 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. PROFILS COMMUNAUTAIRES — community_profiles
--    Un patient = un profil = un pseudonyme. Le pseudonyme est
--    unique PAR TENANT (insensible à la casse). S'il n'en
--    choisit pas, le serveur génère "Membre NNNN".
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL UNIQUE,        -- FK logique vers patients(id)
  pseudonym TEXT NOT NULL CHECK (char_length(pseudonym) BETWEEN 3 AND 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_profiles_tenant_pseudonym_idx
  ON public.community_profiles (tenant_id, lower(pseudonym));
CREATE INDEX IF NOT EXISTS community_profiles_tenant_idx
  ON public.community_profiles (tenant_id);

DROP TRIGGER IF EXISTS community_profiles_touch ON public.community_profiles;
CREATE TRIGGER community_profiles_touch
  BEFORE UPDATE ON public.community_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. DISCUSSIONS — community_posts
--    Cycle : pending → approved | rejected (raison) ;
--    approved → removed (retrait par le staff, ex. signalement).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  author_profile_id UUID NOT NULL REFERENCES public.community_profiles(id),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  moderated_by UUID,                      -- FK logique vers users(id)
  moderated_at TIMESTAMPTZ,
  reject_reason TEXT CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_tenant_status_idx
  ON public.community_posts (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON public.community_posts (author_profile_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. RÉPONSES — community_replies (même cycle de modération)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  author_profile_id UUID NOT NULL REFERENCES public.community_profiles(id),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  moderated_by UUID,                      -- FK logique vers users(id)
  moderated_at TIMESTAMPTZ,
  reject_reason TEXT CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_replies_post_status_idx
  ON public.community_replies (post_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS community_replies_tenant_status_idx
  ON public.community_replies (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_replies_author_idx
  ON public.community_replies (author_profile_id, created_at DESC);

-- ------------------------------------------------------------
-- 4. SIGNALEMENTS — community_reports
--    Un patient signale un post ou une réponse publiés ;
--    le staff traite (status handled), avec retrait optionnel
--    du contenu (status 'removed' côté post/réponse).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('post', 'reply')),
  target_id UUID NOT NULL,                -- FK logique vers community_posts / community_replies
  reporter_profile_id UUID NOT NULL REFERENCES public.community_profiles(id),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'handled')),
  handled_by UUID,                        -- FK logique vers users(id)
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_reports_tenant_status_idx
  ON public.community_reports (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reports_target_idx
  ON public.community_reports (target_kind, target_id);

-- ------------------------------------------------------------
-- 5. ASSOCIATIONS DE PATIENTS — community_partners
--    tenant_id NULL = visible par tous les tenants (socle commun).
--    Descriptions factuelles d'une phrase, pas d'allégations.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),   -- NULL = commun à tous
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  url TEXT NOT NULL CHECK (char_length(url) <= 500),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_partners_tenant_idx
  ON public.community_partners (tenant_id, display_order);

-- Seed socle commun (rejouable : insère seulement si absent)
INSERT INTO public.community_partners (tenant_id, name, url, description, display_order)
SELECT NULL,
       'FFAAIR',
       'https://www.ffaair.org',
       'Fédération Française des Associations et Amicales de malades Insuffisants ou handicapés Respiratoires, qui regroupe des associations de patients respiratoires en France.',
       1
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_partners
  WHERE tenant_id IS NULL AND url = 'https://www.ffaair.org'
);

INSERT INTO public.community_partners (tenant_id, name, url, description, display_order)
SELECT NULL,
       'Alliance Apnées du Sommeil',
       'https://allianceapnees.org',
       'Association de patients dédiée au syndrome d''apnées du sommeil, qui informe et accompagne les personnes concernées et leurs proches.',
       2
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_partners
  WHERE tenant_id IS NULL AND url = 'https://allianceapnees.org'
);

-- ------------------------------------------------------------
-- 6. RLS — tenant RESTRICTIVE (pattern 101/104/108)
--    Rappel : les Edge Functions écrivent en service_role
--    (bypass RLS) et scopent tenant explicitement — ces
--    policies protègent l'accès direct PostgREST côté client.
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_profiles', 'community_posts', 'community_replies', 'community_reports'
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

-- Partners : lecture du socle commun (tenant_id NULL) + entrées du tenant
ALTER TABLE public.community_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partners_read ON public.community_partners;
CREATE POLICY partners_read ON public.community_partners
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = public.current_tenant_id()
  );

-- Le patient gère SON profil (via patients.user_id = auth.uid())
DROP POLICY IF EXISTS patient_own_profile ON public.community_profiles;
CREATE POLICY patient_own_profile ON public.community_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = community_profiles.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = community_profiles.patient_id AND p.user_id = auth.uid()
    )
  );

-- Posts : le patient lit les 'approved' de son tenant (restrictive
-- tenant_isolation s'applique déjà) + SES propres posts quel que soit
-- le statut ; il n'écrit que via son propre profil, en 'pending'.
DROP POLICY IF EXISTS patient_read_posts ON public.community_posts;
CREATE POLICY patient_read_posts ON public.community_posts
  FOR SELECT USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_posts.author_profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_write_posts ON public.community_posts;
CREATE POLICY patient_write_posts ON public.community_posts
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_posts.author_profile_id AND p.user_id = auth.uid()
    )
  );

-- Réponses : même logique que les posts
DROP POLICY IF EXISTS patient_read_replies ON public.community_replies;
CREATE POLICY patient_read_replies ON public.community_replies
  FOR SELECT USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_replies.author_profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_write_replies ON public.community_replies;
CREATE POLICY patient_write_replies ON public.community_replies
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_replies.author_profile_id AND p.user_id = auth.uid()
    )
  );

-- Signalements : le patient crée et lit SES signalements
DROP POLICY IF EXISTS patient_own_reports ON public.community_reports;
CREATE POLICY patient_own_reports ON public.community_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_reports.reporter_profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_profiles pr
      JOIN public.patients p ON p.id = pr.patient_id
      WHERE pr.id = community_reports.reporter_profile_id AND p.user_id = auth.uid()
    )
  );

-- Staff (admin / prestataire) : tout voir / tout gérer dans son tenant
-- (la policy RESTRICTIVE tenant_isolation borne déjà au tenant)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'community_profiles', 'community_posts', 'community_replies', 'community_reports'
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

-- Partners : le staff ne gère que les entrées de SON tenant
-- (le socle commun tenant_id NULL n'est modifiable qu'en service_role)
DROP POLICY IF EXISTS staff_manage ON public.community_partners;
CREATE POLICY staff_manage ON public.community_partners
  FOR ALL USING (
    community_partners.tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  )
  WITH CHECK (
    community_partners.tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

-- ============================================================
-- FIN MIGRATION 111
-- ============================================================
