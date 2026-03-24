-- ============================================
-- MIGRATION 003 : SECURITY HARDENING
-- Blindage sécurité + MFA + Audit complet
-- ============================================

-- ============================================
-- PARTIE 1 : VÉRIFICATION ET COMPLÉTION RLS
-- ============================================

-- Activer RLS sur TOUTES les tables (si pas déjà fait)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE observance_data ENABLE ROW LEVEL SECURITY;

-- Nouvelles tables Phase 1A
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTIE 2 : POLICIES CRITIQUES MANQUANTES
-- ============================================

-- Policy pour observance_data (si manquante)
DROP POLICY IF EXISTS "Patients can view own observance data" ON observance_data;
CREATE POLICY "Patients can view own observance data" ON observance_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = observance_data.patient_id
      AND patients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Doctors can view their patients observance data" ON observance_data;
CREATE POLICY "Doctors can view their patients observance data" ON observance_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = observance_data.patient_id
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all observance data" ON observance_data;
CREATE POLICY "Admins can view all observance data" ON observance_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy pour sleep_data (renforcement)
DROP POLICY IF EXISTS "Users can only see their own sleep data" ON sleep_data;
CREATE POLICY "Users can only see their own sleep data" ON sleep_data
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can view their patients sleep data" ON sleep_data;
CREATE POLICY "Doctors can view their patients sleep data" ON sleep_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = sleep_data.user_id
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all sleep data" ON sleep_data;
CREATE POLICY "Admins can view all sleep data" ON sleep_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy pour interventions
DROP POLICY IF EXISTS "Patients can view their own interventions" ON interventions;
CREATE POLICY "Patients can view their own interventions" ON interventions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = interventions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Technicians can view interventions assigned to them" ON interventions;
CREATE POLICY "Technicians can view interventions assigned to them" ON interventions
  FOR SELECT
  USING (
    technician_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'prestataire')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all interventions" ON interventions;
CREATE POLICY "Admins can manage all interventions" ON interventions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'prestataire')
    )
  );

-- ============================================
-- PARTIE 3 : AUDIT LOGS (LECTURE SEULE)
-- ============================================

-- Audit logs sont APPEND ONLY (insertion seulement, pas de modification)
DROP POLICY IF EXISTS "Only system can insert audit logs" ON audit_logs;
CREATE POLICY "Only system can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Tout le monde peut insérer (via service role)

DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
CREATE POLICY "Admins can read all audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can read their own audit logs" ON audit_logs;
CREATE POLICY "Users can read their own audit logs" ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- IMPORTANT : Désactiver UPDATE et DELETE sur audit_logs
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Retirer toutes les policies UPDATE/DELETE si elles existent
DO $$
BEGIN
  -- Supprimer toute policy permettant UPDATE ou DELETE
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON audit_logs;', ' ')
    FROM pg_policies
    WHERE tablename = 'audit_logs'
    AND cmd IN ('UPDATE', 'DELETE')
  );
END $$;

-- ============================================
-- PARTIE 4 : FUNCTION DE VÉRIFICATION SÉCURITÉ
-- ============================================

-- Function pour vérifier qu'un utilisateur a le droit d'accéder à un patient
CREATE OR REPLACE FUNCTION check_patient_access(target_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  has_access BOOLEAN := false;
BEGIN
  -- Récupérer le rôle de l'utilisateur actuel
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();

  -- Admin = accès total
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Prestataire = accès total
  IF user_role = 'prestataire' THEN
    RETURN true;
  END IF;

  -- Patient = accès uniquement à ses propres données
  IF user_role = 'patient' THEN
    SELECT EXISTS (
      SELECT 1 FROM patients
      WHERE id = target_patient_id
      AND user_id = auth.uid()
    ) INTO has_access;
    RETURN has_access;
  END IF;

  -- Médecin = accès uniquement à ses patients assignés
  IF user_role = 'doctor' THEN
    SELECT EXISTS (
      SELECT 1 FROM patients
      WHERE id = target_patient_id
      AND assigned_doctor_id = auth.uid()
    ) INTO has_access;
    RETURN has_access;
  END IF;

  -- Par défaut : pas d'accès
  RETURN false;
END;
$$;

-- ============================================
-- PARTIE 5 : TABLE MFA (Multi-Factor Auth)
-- ============================================

CREATE TABLE IF NOT EXISTS user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT, -- Secret TOTP (chiffré côté app)
  backup_codes TEXT[], -- Codes de secours (hachés)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- RLS pour user_mfa
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own MFA" ON user_mfa;
CREATE POLICY "Users can manage their own MFA" ON user_mfa
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all MFA settings" ON user_mfa;
CREATE POLICY "Admins can view all MFA settings" ON user_mfa
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);

-- ============================================
-- PARTIE 6 : TRIGGER AUDIT LOGS AUTOMATIQUE
-- ============================================

-- Function pour logger automatiquement les actions sensibles
CREATE OR REPLACE FUNCTION log_sensitive_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer dans audit_logs
  INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent)
  VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new_data', to_jsonb(NEW),
      'old_data', to_jsonb(OLD)
    ),
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur les tables sensibles
DROP TRIGGER IF EXISTS audit_sleep_data_changes ON sleep_data;
CREATE TRIGGER audit_sleep_data_changes
  AFTER INSERT OR UPDATE OR DELETE ON sleep_data
  FOR EACH ROW
  EXECUTE FUNCTION log_sensitive_action();

DROP TRIGGER IF EXISTS audit_patient_changes ON patients;
CREATE TRIGGER audit_patient_changes
  AFTER UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION log_sensitive_action();

DROP TRIGGER IF EXISTS audit_intervention_changes ON interventions;
CREATE TRIGGER audit_intervention_changes
  AFTER INSERT OR UPDATE ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION log_sensitive_action();

-- ============================================
-- PARTIE 7 : VÉRIFICATION FINALE
-- ============================================

-- View pour vérifier que toutes les tables ont RLS activé
CREATE OR REPLACE VIEW security_check AS
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) 
   FROM pg_policies 
   WHERE pg_policies.schemaname = pg_tables.schemaname 
   AND pg_policies.tablename = pg_tables.tablename) AS policies_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Function de test de sécurité
CREATE OR REPLACE FUNCTION test_security()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test 1 : Toutes les tables ont RLS
  RETURN QUERY
  SELECT 
    'All tables have RLS enabled'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations')
      AND NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = pg_tables.tablename
        AND relrowsecurity = true
      )
    ),
    COALESCE(
      (SELECT string_agg(tablename, ', ')
       FROM pg_tables
       WHERE schemaname = 'public'
       AND tablename NOT IN ('schema_migrations')
       AND NOT EXISTS (
         SELECT 1 FROM pg_class
         WHERE relname = pg_tables.tablename
         AND relrowsecurity = true
       )),
      'All tables have RLS'
    );

  -- Test 2 : Audit logs existe
  RETURN QUERY
  SELECT 
    'Audit logs table exists'::TEXT,
    EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs'),
    'audit_logs table is present'::TEXT;

  -- Test 3 : MFA table existe
  RETURN QUERY
  SELECT 
    'MFA table exists'::TEXT,
    EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_mfa'),
    'user_mfa table is present'::TEXT;
END;
$$;

-- ============================================
-- EXÉCUTION DU TEST
-- ============================================

-- Afficher les résultats du test de sécurité
SELECT * FROM test_security();

-- Afficher l'état de la sécurité de toutes les tables
SELECT * FROM security_check ORDER BY rls_enabled DESC, policies_count DESC;

-- ============================================
-- COMMENTAIRES POUR L'ÉQUIPE
-- ============================================

COMMENT ON TABLE user_mfa IS 'Stockage des paramètres MFA (Multi-Factor Authentication) par utilisateur';
COMMENT ON FUNCTION check_patient_access IS 'Vérifie si l''utilisateur actuel a le droit d''accéder aux données d''un patient';
COMMENT ON FUNCTION test_security IS 'Tests automatisés de vérification de la sécurité';
COMMENT ON VIEW security_check IS 'Vue pour vérifier l''état RLS de toutes les tables';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
