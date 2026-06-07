-- ============================================================
-- 101 — OBSERVANCE / LPPR / FACTURATION (chantier 2.1)
-- Cœur revenue du back-office PSAD :
--   referentiel codes LPP PPC → fenêtres d'observance 28j glissantes
--   → statut thérapie patient (phase 9.INI 13 sem, switch auto)
--   → lignes à facturer (forfaits HEBDOMADAIRES)
--
-- Sources réglementaires (research/05_REGLEMENTAIRE_FRANCE.md) :
--   - Forfaits HEBDO. Seuils par fenêtre 28 jours :
--       ≥ 112 h → 9.TL1 (télésuivi) / 9.NT1 (non télésuivi)
--       56-112 h → 9.TL2 / 9.NT2
--       < 56 h  → 9.TL3 / 9.NT3
--   - Phase initiale 9.INI limitée à 13 semaines (accord préalable),
--     puis passage automatique aux codes TL/NT selon télésuivi+observance.
--   - Patient peut refuser le télésuivi → codes NT (ou 9.SRO sans relevé).
--
-- Tous les tarifs non sourcés dans la recherche sont NULL (jamais
-- inventés) — à compléter depuis la LPP officielle (ameli).
-- Suit le pattern multi-tenant de la migration 100 (tenant_id + RLS).
-- ============================================================

-- ------------------------------------------------------------
-- 1. RÉFÉRENTIEL CODES LPP (national — PAS de tenant_id)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lppr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_lpp TEXT UNIQUE NOT NULL,          -- code LPP officiel (ex. 1132608)
  short_code TEXT UNIQUE NOT NULL,        -- alias usuel (ex. 9.INI)
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'initial', 'telesuivi', 'non_telesuivi', 'sans_releve', 'pediatrique'
  )),
  billing_period TEXT NOT NULL DEFAULT 'weekly' CHECK (billing_period IN ('weekly')),
  -- Conditions d'éligibilité machine-lisibles (moteur observance)
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tarifs versionnés (la LPP baisse par paliers : -5% 2025, -4% 2026)
CREATE TABLE IF NOT EXISTS public.lppr_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lppr_code_id UUID NOT NULL REFERENCES public.lppr_codes(id) ON DELETE CASCADE,
  amount_ht NUMERIC(8,2),                 -- NULL = non sourcé, à compléter LPP officielle
  amount_ttc NUMERIC(8,2),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT,                            -- d'où vient le chiffre (traçabilité anti-hallu)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lppr_code_id, effective_from)
);

-- Seed référentiel — codes LPP officiels (research/05, tableau LPP PPC)
INSERT INTO public.lppr_codes (code_lpp, short_code, label, category, conditions) VALUES
  ('1132608', '9.INI', 'PPC apnée du sommeil — phase initiale (13 semaines max, accord préalable)', 'initial',
   '{"max_weeks": 13, "requires_prior_agreement": true}'),
  ('1187880', '9.TL1', 'PPC — patient télésuivi, observance ≥ 112 h / 28 j', 'telesuivi',
   '{"telesuivi": true, "min_hours_28d": 112}'),
  ('1115455', '9.TL2', 'PPC — patient télésuivi, observance 56 h à 112 h / 28 j', 'telesuivi',
   '{"telesuivi": true, "min_hours_28d": 56, "max_hours_28d": 112}'),
  ('1192987', '9.TL3', 'PPC — patient télésuivi, observance < 56 h / 28 j', 'telesuivi',
   '{"telesuivi": true, "max_hours_28d": 56}'),
  ('1103446', '9.NT1', 'PPC — patient non télésuivi, bonne observance (≥ 112 h / 28 j)', 'non_telesuivi',
   '{"telesuivi": false, "min_hours_28d": 112}'),
  ('1162006', '9.NT2', 'PPC — patient non télésuivi, observance insuffisante (56-112 h / 28 j)', 'non_telesuivi',
   '{"telesuivi": false, "min_hours_28d": 56, "max_hours_28d": 112}'),
  ('1124112', '9.NT3', 'PPC — patient non télésuivi, non observant (< 56 h / 28 j)', 'non_telesuivi',
   '{"telesuivi": false, "max_hours_28d": 56}'),
  ('1106663', '9.SRO', 'PPC — patient sans relevé d''observance', 'sans_releve', '{}'),
  ('1119045', '9.PE1', 'PPC pédiatrique — patient de moins de 6 ans', 'pediatrique',
   '{"max_age": 6}'),
  ('1108739', '9.PE2', 'PPC pédiatrique — patient de 6 à 16 ans', 'pediatrique',
   '{"min_age": 6, "max_age": 16}')
ON CONFLICT (code_lpp) DO NOTHING;

-- Tarifs SOURCÉS uniquement (research/00 §LPP : 9.INI 17,50 → 16,63 (avr 2025)
-- → 15,93 (avr 2026) ; 9.TL1 ~11,69 → 10,66 (avr 2026) ; 9.NT1 ~7,79 → 7,10 (avr 2026)).
-- Les autres codes : tarif "dégressif" non chiffré dans la recherche → pas de ligne.
INSERT INTO public.lppr_tariffs (lppr_code_id, amount_ttc, effective_from, effective_to, source)
SELECT c.id, t.amount, t.eff_from::date, t.eff_to::date, t.src
FROM (VALUES
  ('9.INI', 17.50, '2024-01-01', '2025-03-31', 'research/00_MASTER §LPP — tarif pré-avril 2025'),
  ('9.INI', 16.63, '2025-04-01', '2026-03-31', 'research/00_MASTER §LPP — palier avril 2025'),
  ('9.INI', 15.93, '2026-04-01', NULL,         'research/00_MASTER §LPP — palier avril 2026'),
  ('9.TL1', 11.69, '2025-04-01', '2026-03-31', 'research/00_MASTER §LPP — ~11,69 (approx. source)'),
  ('9.TL1', 10.66, '2026-04-01', NULL,         'research/00_MASTER §LPP — palier avril 2026'),
  ('9.NT1',  7.79, '2025-04-01', '2026-03-31', 'research/00_MASTER §LPP — ~7,79 (approx. source)'),
  ('9.NT1',  7.10, '2026-04-01', NULL,         'research/00_MASTER §LPP — palier avril 2026')
) AS t(short_code, amount, eff_from, eff_to, src)
JOIN public.lppr_codes c ON c.short_code = t.short_code
ON CONFLICT (lppr_code_id, effective_from) DO NOTHING;

-- Référentiel national : lecture pour tous les rôles authentifiés
ALTER TABLE public.lppr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lppr_tariffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lppr_codes_read ON public.lppr_codes;
CREATE POLICY lppr_codes_read ON public.lppr_codes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS lppr_tariffs_read ON public.lppr_tariffs;
CREATE POLICY lppr_tariffs_read ON public.lppr_tariffs FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2. STATUT THÉRAPIE PATIENT (phase, télésuivi, code courant)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_therapy_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID UNIQUE NOT NULL,        -- FK logique vers patients(id)
  therapy_start_date DATE NOT NULL,
  -- Fin de phase initiale = start + 13 semaines = 91 jours (9.INI max)
  initial_phase_end_date DATE GENERATED ALWAYS AS (therapy_start_date + 91) STORED,
  phase TEXT NOT NULL DEFAULT 'initial' CHECK (phase IN ('initial', 'maintenance', 'stopped')),
  telesuivi_consent BOOLEAN NOT NULL DEFAULT true,   -- le patient peut refuser → codes NT
  has_observance_data BOOLEAN NOT NULL DEFAULT true, -- false → 9.SRO
  current_lppr_code_id UUID REFERENCES public.lppr_codes(id),
  prior_agreement_ref TEXT,               -- réf accord préalable service médical (9.INI)
  last_engine_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pts_tenant_idx ON public.patient_therapy_status (tenant_id);
CREATE INDEX IF NOT EXISTS pts_phase_idx ON public.patient_therapy_status (phase);

-- ------------------------------------------------------------
-- 3. FENÊTRES D'OBSERVANCE 28 J GLISSANTES (calculées par le moteur)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.observance_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,               -- window_start + 27 jours
  total_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  nights_with_data INT NOT NULL DEFAULT 0,
  nights_over_4h INT NOT NULL DEFAULT 0,
  avg_hours_per_night NUMERIC(5,2),
  -- Bande réglementaire : full ≥112h | partial 56-112h | low <56h | none = aucun relevé
  compliance_band TEXT NOT NULL CHECK (compliance_band IN ('full', 'partial', 'low', 'none')),
  telesuivi BOOLEAN NOT NULL DEFAULT true,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, window_end)
);

CREATE INDEX IF NOT EXISTS op_tenant_idx ON public.observance_periods (tenant_id);
CREATE INDEX IF NOT EXISTS op_patient_window_idx ON public.observance_periods (patient_id, window_end DESC);
CREATE INDEX IF NOT EXISTS op_band_idx ON public.observance_periods (compliance_band);

-- ------------------------------------------------------------
-- 4. LIGNES À FACTURER (forfaits hebdo générés par le moteur)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,
  lppr_code_id UUID NOT NULL REFERENCES public.lppr_codes(id),
  period_start DATE NOT NULL,             -- début de semaine facturée (lundi)
  period_end DATE NOT NULL,
  amount_ttc NUMERIC(8,2),                -- tarif applicable à period_start (NULL si non sourcé)
  tariff_id UUID REFERENCES public.lppr_tariffs(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- générée par le moteur, à vérifier
    'ready',        -- validée, prête à transmettre
    'transmitted',  -- FSE transmise (SESAM-Vitale)
    'paid',         -- remboursée (retour NOEMIE)
    'rejected',     -- rejet CPAM
    'cancelled'
  )),
  fse_reference TEXT,
  rejection_reason TEXT,
  observance_period_id UUID REFERENCES public.observance_periods(id),
  created_by TEXT NOT NULL DEFAULT 'engine' CHECK (created_by IN ('engine', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, period_start, lppr_code_id)
);

CREATE INDEX IF NOT EXISTS bl_tenant_idx ON public.billing_lines (tenant_id);
CREATE INDEX IF NOT EXISTS bl_status_idx ON public.billing_lines (tenant_id, status);
CREATE INDEX IF NOT EXISTS bl_patient_idx ON public.billing_lines (patient_id, period_start DESC);

-- ------------------------------------------------------------
-- 5. RLS tenant (pattern migration 100) sur les tables tenantées
-- ------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_therapy_status', 'observance_periods', 'billing_lines'] LOOP
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
-- 6. updated_at auto
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS pts_touch ON public.patient_therapy_status;
CREATE TRIGGER pts_touch BEFORE UPDATE ON public.patient_therapy_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS bl_touch ON public.billing_lines;
CREATE TRIGGER bl_touch BEFORE UPDATE ON public.billing_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
