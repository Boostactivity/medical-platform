-- ============================================================
-- 116 — Rattrapage tenant_id sur les tables créées APRÈS la migration 100
-- La migration 100 (multi-tenant) ajoutait tenant_id à toutes les tables
-- métier existantes À CE MOMENT-LÀ. Mais consumables/devices/sleep_data...
-- ont été (re)créées ensuite par les migrations legacy + les fixes de
-- déploiement → elles n'ont jamais reçu tenant_id, alors que le code les
-- requête avec .eq('tenant_id', ...) (→ 500). On répare + RLS étanche.
-- ============================================================

DO $$
DECLARE
  default_tenant UUID;
  t TEXT;
  tables TEXT[] := ARRAY[
    'consumables', 'devices', 'device_assignments',
    'equipment_inventory', 'patient_stats', 'sleep_data'
  ];
BEGIN
  SELECT id INTO default_tenant FROM public.tenants WHERE slug = 'medical';
  IF default_tenant IS NULL THEN RAISE EXCEPTION 'Tenant medical introuvable'; END IF;

  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t)
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', t);
      EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, default_tenant);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L', t, default_tenant);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', t || '_tenant_idx', t);

      -- RLS étanche par tenant (pattern migration 100)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL
         USING (tenant_id = public.current_tenant_id())
         WITH CHECK (tenant_id = public.current_tenant_id())', t
      );
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_auth_read', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')',
        t || '_auth_read', t
      );
    END IF;
  END LOOP;
END $$;
