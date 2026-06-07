-- ============================================================
-- 103 — STOCK / PARC MACHINES / PLANNING TECHNICIENS
-- Complète l'existant SANS casser :
--   - 002_device_management.sql : devices, device_assignments,
--     consumables (stock_quantity + reorder_threshold), maintenance_logs
--   - URGENT_FIX_TABLES.sql : equipment_inventory (consommables
--     installés chez le patient), equipment_tracking
--   - 100_multi_tenant_white_label.sql : tenants, agencies,
--     tenant_id + RLS RESTRICTIVE tenant_isolation sur les tables métier
--
-- Ajouts :
--   1. Stock par agence : agency_id sur consumables / equipment_inventory
--      (+ devices pour le parc par agence)
--   2. Traçabilité lot / n° série + dates entrée/sortie de stock
--   3. Mapping machine ↔ patient ↔ masque : colonnes masque +
--      consommables (filtre/tubulure) sur device_assignments (suivi 90 j)
--   4. stock_movements : journal entrées/sorties/ajustements
--   5. technician_schedules : planning interventions par technicien
--
-- Tous les ALTER sont défensifs (IF NOT EXISTS / DO-block) :
-- rejouable, n'échoue pas si une table est absente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. STOCK PAR AGENCE + TRAÇABILITÉ — consumables
--    (consumables = lignes de stock : stock_quantity, reorder_threshold)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'consumables')
     AND EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'agencies') THEN
    ALTER TABLE public.consumables
      ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
    ALTER TABLE public.consumables
      ADD COLUMN IF NOT EXISTS lot_number TEXT;
    -- reorder_threshold existe déjà dans 002 — défensif si schéma plus ancien
    ALTER TABLE public.consumables
      ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER DEFAULT 10;
    CREATE INDEX IF NOT EXISTS idx_consumables_agency ON public.consumables(agency_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. STOCK PAR AGENCE + TRAÇABILITÉ — equipment_inventory
--    (consommables installés chez le patient : installed_at,
--     renewal_due_at, lifespan_days déjà présents)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'equipment_inventory') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'agencies') THEN
      ALTER TABLE public.equipment_inventory
        ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_equipment_inv_agency ON public.equipment_inventory(agency_id);
    END IF;
    ALTER TABLE public.equipment_inventory
      ADD COLUMN IF NOT EXISTS serial_number TEXT;
    ALTER TABLE public.equipment_inventory
      ADD COLUMN IF NOT EXISTS lot_number TEXT;
    -- Dates entrée/sortie de stock (installed_at = pose patient, distinct)
    ALTER TABLE public.equipment_inventory
      ADD COLUMN IF NOT EXISTS entered_stock_at DATE;
    ALTER TABLE public.equipment_inventory
      ADD COLUMN IF NOT EXISTS exited_stock_at DATE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. PARC — devices : rattachement agence + lot
--    (serial_number UNIQUE existe déjà dans 002)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'devices') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'agencies') THEN
      ALTER TABLE public.devices
        ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_devices_agency ON public.devices(agency_id);
    END IF;
    ALTER TABLE public.devices
      ADD COLUMN IF NOT EXISTS lot_number TEXT;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. MAPPING machine ↔ patient ↔ masque — device_assignments
--    002 a déjà : device_id, patient_id, assigned_at, returned_at,
--    technician_id, is_active, pressure_settings.
--    Manque : suivi du masque (modèle/taille/date pose → règle 90 j)
--    et dates de changement filtre / tubulure.
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'device_assignments') THEN
    ALTER TABLE public.device_assignments
      ADD COLUMN IF NOT EXISTS mask_model TEXT;
    ALTER TABLE public.device_assignments
      ADD COLUMN IF NOT EXISTS mask_size TEXT;
    ALTER TABLE public.device_assignments
      ADD COLUMN IF NOT EXISTS mask_assigned_at DATE;
    ALTER TABLE public.device_assignments
      ADD COLUMN IF NOT EXISTS filter_changed_at DATE;
    ALTER TABLE public.device_assignments
      ADD COLUMN IF NOT EXISTS tubing_changed_at DATE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. JOURNAL DE STOCK — stock_movements
--    Traçabilité de chaque entrée / sortie / ajustement sur une
--    ligne consumables (lot, n° série, motif, opérateur).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  consumable_id UUID NOT NULL REFERENCES public.consumables(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'adjust')),
  -- 'in'/'out' : quantité déplacée (>0). 'adjust' : nouvelle quantité absolue.
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  -- Quantité résultante après mouvement (photo du stock)
  resulting_quantity INTEGER,
  lot_number TEXT,
  serial_number TEXT,
  reason TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_consumable
  ON public.stock_movements(consumable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant
  ON public.stock_movements(tenant_id);

-- ------------------------------------------------------------
-- 6. PLANNING TECHNICIENS — technician_schedules
--    Aucune table équivalente dans le schéma (interventions porte
--    une date mais pas de créneau ni d'affectation planifiable).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.technician_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  technician_id UUID NOT NULL,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  time_slot TEXT NOT NULL DEFAULT 'morning' CHECK (time_slot IN ('morning', 'afternoon')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'done', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une seule affectation vivante par intervention
CREATE UNIQUE INDEX IF NOT EXISTS technician_schedules_one_active_per_intervention
  ON public.technician_schedules (intervention_id)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_tech_schedules_tech_date
  ON public.technician_schedules (technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tech_schedules_tenant_date
  ON public.technician_schedules (tenant_id, scheduled_date);

-- updated_at automatique (réutilise touch_updated_at de la migration 100)
DROP TRIGGER IF EXISTS technician_schedules_touch ON public.technician_schedules;
CREATE TRIGGER technician_schedules_touch BEFORE UPDATE ON public.technician_schedules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 7. TENANT PAR DÉFAUT + RLS sur les nouvelles tables
--    (même pattern que la migration 100 : RESTRICTIVE tenant_isolation,
--     lecture permissive pour les utilisateurs authentifiés du tenant ;
--     écritures via Edge Functions service_role uniquement)
-- ------------------------------------------------------------

DO $$
DECLARE
  default_tenant UUID;
BEGIN
  SELECT id INTO default_tenant FROM public.tenants WHERE slug = 'medical';
  IF default_tenant IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.stock_movements ALTER COLUMN tenant_id SET DEFAULT %L', default_tenant);
    EXECUTE format('ALTER TABLE public.technician_schedules ALTER COLUMN tenant_id SET DEFAULT %L', default_tenant);
  END IF;
END $$;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.stock_movements;
CREATE POLICY tenant_isolation ON public.stock_movements
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS stock_movements_tenant_read ON public.stock_movements;
CREATE POLICY stock_movements_tenant_read ON public.stock_movements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS tenant_isolation ON public.technician_schedules;
CREATE POLICY tenant_isolation ON public.technician_schedules
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS technician_schedules_tenant_read ON public.technician_schedules;
CREATE POLICY technician_schedules_tenant_read ON public.technician_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- FIN MIGRATION 103
-- ============================================================
