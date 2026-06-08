-- ============================================================
-- 115 — Colonnes de gestion de stock manquantes sur consumables
-- Le repo avait DEUX définitions concurrentes de `consumables` :
--   - 002_device_management.sql (stock : stock_quantity, size, unit_price_ht...)
--   - 20241203_iot_tables.sql   (consommables installés patient)
-- Le CREATE TABLE IF NOT EXISTS a fait gagner la 2e en prod → les colonnes
-- de stock attendues par routes/stock-parc.ts et le marketplace manquent.
-- On les rétablit défensivement (la gestion de stock a besoin de la quantité).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'consumables') THEN
    ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS unit_price_ht NUMERIC(8,2);
    ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS size TEXT;
    ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS manufacturer TEXT;
    ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS reference TEXT;
  END IF;
END $$;
