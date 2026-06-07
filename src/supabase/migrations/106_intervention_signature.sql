-- ============================================================
-- 106 — SIGNATURE PATIENT + CHECK-IN TERRAIN sur interventions
-- L'app mobile technicien capture la signature du patient (SVG)
-- et l'horodatage exact du check-in terrain. Le serveur les
-- centralise comme preuve d'intervention (bon de passage).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'interventions') THEN
    ALTER TABLE public.interventions
      ADD COLUMN IF NOT EXISTS signature_svg TEXT;
    ALTER TABLE public.interventions
      ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ;     -- heure terrain exacte (≠ started_at = heure de sync)
    ALTER TABLE public.interventions
      ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ;
  END IF;
END $$;
