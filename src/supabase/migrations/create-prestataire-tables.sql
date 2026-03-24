-- ============================================
-- TABLES POUR SYSTÈME PRESTATAIRE
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- Script idempotent : peut être exécuté plusieurs fois sans erreur
-- ============================================

-- 1. TABLE ALERTS (Alertes patients)
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  
  -- Résolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_updated_at ON alerts;
CREATE TRIGGER alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_alerts_updated_at();

-- ============================================
-- 2. TABLE INTERVENTIONS (Interventions techniques)
-- ============================================

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  
  type TEXT NOT NULL CHECK (type IN ('installation', 'mask_change', 'maintenance', 'training', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Planification
  date TIMESTAMPTZ NOT NULL,
  duration TEXT,
  
  -- Détails
  notes TEXT,
  material TEXT,
  material_used TEXT,
  
  -- Complétion
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_interventions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interventions_updated_at ON interventions;
CREATE TRIGGER interventions_updated_at
BEFORE UPDATE ON interventions
FOR EACH ROW
EXECUTE FUNCTION update_interventions_updated_at();

-- ============================================
-- 3. TABLE AUDIT_LOGS (Logs d'audit RGPD)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admin and prestataire can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can update alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can view all interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can insert interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can update interventions" ON interventions;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;

-- ALERTS POLICIES
-- ----------------

-- Admin/Prestataire can view all alerts
CREATE POLICY "Admin and prestataire can view all alerts"
ON alerts FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- Admin/Prestataire can update alerts (resolve/ignore)
CREATE POLICY "Admin and prestataire can update alerts"
ON alerts FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- Admin/Prestataire can insert alerts
CREATE POLICY "Admin and prestataire can insert alerts"
ON alerts FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- INTERVENTIONS POLICIES
-- -----------------------

-- Admin/Prestataire can view all interventions
CREATE POLICY "Admin and prestataire can view all interventions"
ON interventions FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- Admin/Prestataire can create interventions
CREATE POLICY "Admin and prestataire can insert interventions"
ON interventions FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- Admin/Prestataire can update interventions
CREATE POLICY "Admin and prestataire can update interventions"
ON interventions FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- AUDIT LOGS POLICIES
-- --------------------

-- Admin can view all audit logs
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

-- Any authenticated user can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. REALTIME ACTIVATION
-- ============================================

-- Enable Realtime for alerts and interventions
-- (À activer manuellement dans Supabase Dashboard -> Database -> Replication)
-- ✅ alerts
-- ✅ interventions

-- ============================================
-- 6. DEMO DATA (Optionnel)
-- ============================================

-- Générer des alertes de test pour le développement
-- Décommenter si vous voulez des données de démo

/*
-- Récupérer un patient de test
DO $$
DECLARE
  test_patient_id UUID;
BEGIN
  SELECT id INTO test_patient_id FROM patients LIMIT 1;
  
  IF test_patient_id IS NOT NULL THEN
    -- Alerte déconnexion (haute priorité)
    INSERT INTO alerts (patient_id, type, severity, message, details, status)
    VALUES (
      test_patient_id,
      'disconnect',
      'high',
      'Machine déconnectée depuis 5 jours',
      'Dernière connexion le ' || (NOW() - INTERVAL '5 days')::DATE,
      'active'
    );
    
    -- Alerte fuite (moyenne priorité)
    INSERT INTO alerts (patient_id, type, severity, message, details, status)
    VALUES (
      test_patient_id,
      'leak',
      'medium',
      'Fuites importantes détectées',
      'Fuite moyenne: 28 L/min (> 24 L/min)',
      'active'
    );
    
    -- Alerte masque ancien (basse priorité)
    INSERT INTO alerts (patient_id, type, severity, message, details, status)
    VALUES (
      test_patient_id,
      'mask_old',
      'low',
      'Masque à renouveler',
      'Date de pose: ' || (NOW() - INTERVAL '7 months')::DATE,
      'active'
    );
  END IF;
END $$;
*/

-- ============================================
-- FIN DE SCRIPT
-- ============================================

-- Vérification des tables créées
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('alerts', 'interventions', 'audit_logs')
ORDER BY tablename;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Tables prestataire créées avec succès !';
  RAISE NOTICE '📊 Tables: alerts, interventions, audit_logs';
  RAISE NOTICE '🔒 RLS activé avec policies pour admin/prestataire';
  RAISE NOTICE '⚡ Prochaine étape: Activer Realtime dans Database -> Replication';
END $$;