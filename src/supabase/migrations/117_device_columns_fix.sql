-- ============================================================
-- 117 — Colonnes attendues par le code, manquantes sur les tables
-- créées au déploiement (000c_runtime_tables avait des noms approximés).
-- stock-parc.ts lit devices.next_maintenance_due + connectivity_type ;
-- patient-services.ts lit equipment_inventory.size.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='devices') THEN
    ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS next_maintenance_due DATE;
    ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS connectivity_type TEXT;
    -- Aligne l'éventuelle valeur déjà saisie dans next_maintenance_date
    UPDATE public.devices SET next_maintenance_due = next_maintenance_date
    WHERE next_maintenance_due IS NULL AND next_maintenance_date IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='equipment_inventory') THEN
    ALTER TABLE public.equipment_inventory ADD COLUMN IF NOT EXISTS size TEXT;
  END IF;
END $$;
