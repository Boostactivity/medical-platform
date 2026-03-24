-- ================================================================
-- SPRINT 0 - SÉCURITÉ & INFRASTRUCTURE
-- EXP'AIR MEDICAL - DISPOSITIF MÉDICAL SÉCURISÉ
-- ================================================================
-- Date : 4 décembre 2024
-- Objectif : RLS + Audit Logs + Traçabilité RGPD
-- ================================================================

-- ================================================================
-- PARTIE 1 : ROW LEVEL SECURITY (RLS)
-- Principe : "Refus par défaut" - Seules les permissions explicites
-- ================================================================

-- 1.1 ACTIVER RLS SUR TOUTES LES TABLES CRITIQUES
-- ================================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_data ENABLE ROW LEVEL SECURITY;

-- Note : Si une table n'existe pas encore, créer d'abord
-- CREATE TABLE IF NOT EXISTS ... puis ALTER TABLE ... ENABLE ROW LEVEL SECURITY

-- ================================================================
-- 1.2 POLICIES : PROFILS PATIENTS
-- ================================================================

-- Supprimer les anciennes policies (si existantes)
DROP POLICY IF EXISTS "Patient view own profile" ON profiles;
DROP POLICY IF EXISTS "Doctor view assigned patients" ON profiles;
DROP POLICY IF EXISTS "Admin view all profiles" ON profiles;
DROP POLICY IF EXISTS "Patient update own profile" ON profiles;

-- Policy 1 : Le patient ne voit QUE son propre profil
CREATE POLICY "Patient view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2 : Le médecin voit ses patients assignés
-- Suppose une colonne 'panel_code' dans profiles (médecin référent)
CREATE POLICY "Doctor view assigned patients"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles doctor_profile
    WHERE doctor_profile.id = auth.uid()
    AND doctor_profile.role = 'doctor'
    AND profiles.panel_code = doctor_profile.panel_code
  )
  OR
  auth.uid() = id -- Le médecin peut aussi voir son propre profil
);

-- Policy 3 : Les admins voient tout (Service Prestataire)
CREATE POLICY "Admin view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'prestataire')
  )
);

-- Policy 4 : Le patient peut modifier UNIQUEMENT ses infos non-médicales
CREATE POLICY "Patient update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  -- Interdire modification des champs critiques
  (OLD.role = NEW.role) AND
  (OLD.panel_code = NEW.panel_code) AND
  (OLD.created_at = NEW.created_at)
);

-- Policy 5 : INTERDICTION DE SUPPRESSION (Immutabilité)
-- Pas de policy DELETE créée = Suppression impossible par défaut ✅

-- ================================================================
-- 1.3 POLICIES : DONNÉES DE SOMMEIL (sleep_data)
-- ================================================================

DROP POLICY IF EXISTS "Patient view own sleep data" ON sleep_data;
DROP POLICY IF EXISTS "Doctor view patients sleep data" ON sleep_data;
DROP POLICY IF EXISTS "Admin view all sleep data" ON sleep_data;
DROP POLICY IF EXISTS "IoT insert sleep data" ON sleep_data;

-- Policy 1 : Le patient voit ses propres données
CREATE POLICY "Patient view own sleep data"
ON sleep_data FOR SELECT
USING (user_id = auth.uid());

-- Policy 2 : Le médecin voit les données de ses patients
CREATE POLICY "Doctor view patients sleep data"
ON sleep_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles patient_profile
    WHERE patient_profile.id = sleep_data.user_id
    AND EXISTS (
      SELECT 1 FROM profiles doctor_profile
      WHERE doctor_profile.id = auth.uid()
      AND doctor_profile.role = 'doctor'
      AND patient_profile.panel_code = doctor_profile.panel_code
    )
  )
);

-- Policy 3 : Les admins voient toutes les données
CREATE POLICY "Admin view all sleep data"
ON sleep_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'prestataire')
  )
);

-- Policy 4 : Insertion UNIQUEMENT via Service Role (Backend IoT)
-- Pas de policy INSERT pour les users = Interdiction par défaut ✅
-- Le backend utilisera la clé SERVICE_ROLE_KEY pour bypasser RLS

-- ================================================================
-- 1.4 POLICIES : ALERTES
-- ================================================================

DROP POLICY IF EXISTS "Patient view own alerts" ON alerts;
DROP POLICY IF EXISTS "Doctor view patients alerts" ON alerts;
DROP POLICY IF EXISTS "Admin view all alerts" ON alerts;

CREATE POLICY "Patient view own alerts"
ON alerts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Doctor view patients alerts"
ON alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles patient_profile
    WHERE patient_profile.id = alerts.user_id
    AND EXISTS (
      SELECT 1 FROM profiles doctor_profile
      WHERE doctor_profile.id = auth.uid()
      AND doctor_profile.role = 'doctor'
      AND patient_profile.panel_code = doctor_profile.panel_code
    )
  )
);

CREATE POLICY "Admin view all alerts"
ON alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'prestataire')
  )
);

-- ================================================================
-- 1.5 POLICIES : INTERVENTIONS
-- ================================================================

DROP POLICY IF EXISTS "Patient view own interventions" ON interventions;
DROP POLICY IF EXISTS "Doctor view patients interventions" ON interventions;
DROP POLICY IF EXISTS "Doctor create interventions" ON interventions;
DROP POLICY IF EXISTS "Admin view all interventions" ON interventions;

CREATE POLICY "Patient view own interventions"
ON interventions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Doctor view patients interventions"
ON interventions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles patient_profile
    WHERE patient_profile.id = interventions.user_id
    AND EXISTS (
      SELECT 1 FROM profiles doctor_profile
      WHERE doctor_profile.id = auth.uid()
      AND doctor_profile.role = 'doctor'
      AND patient_profile.panel_code = doctor_profile.panel_code
    )
  )
);

CREATE POLICY "Doctor create interventions"
ON interventions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles doctor_profile
    WHERE doctor_profile.id = auth.uid()
    AND doctor_profile.role = 'doctor'
  )
);

CREATE POLICY "Admin view all interventions"
ON interventions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'prestataire')
  )
);

-- ================================================================
-- PARTIE 2 : AUDIT LOGS (TRAÇABILITÉ RGPD)
-- ================================================================

-- 2.1 CRÉATION TABLE AUDIT_LOGS (Boîte Noire Immuable)
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_role text,
  changed_by_email text,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now() NOT NULL,
  
  -- Index pour performance
  INDEX idx_audit_table_name ON audit_logs(table_name),
  INDEX idx_audit_record_id ON audit_logs(record_id),
  INDEX idx_audit_changed_by ON audit_logs(changed_by),
  INDEX idx_audit_timestamp ON audit_logs(timestamp DESC)
);

-- RLS sur audit_logs : Seuls les admins peuvent lire
CREATE POLICY "Admin view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'prestataire')
  )
);

-- INTERDICTION TOTALE de modifier ou supprimer des audit logs
-- Pas de policy UPDATE/DELETE = Immutabilité ✅

COMMENT ON TABLE audit_logs IS 'Table d''audit immuable - Traçabilité RGPD - Aucune modification/suppression autorisée';

-- ================================================================
-- 2.2 FONCTION TRIGGER AUDIT (Le Moteur)
-- ================================================================

CREATE OR REPLACE FUNCTION log_changes() 
RETURNS TRIGGER 
SECURITY DEFINER -- Exécuté avec les privilèges du créateur (bypass RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role text;
  current_user_email text;
BEGIN
  -- Récupérer les infos du user
  SELECT role, email INTO current_user_role, current_user_email
  FROM profiles
  WHERE id = auth.uid();

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (
      table_name, 
      record_id, 
      operation, 
      old_data, 
      changed_by,
      changed_by_role,
      changed_by_email
    )
    VALUES (
      TG_TABLE_NAME, 
      OLD.id, 
      'DELETE', 
      row_to_json(OLD)::jsonb, 
      auth.uid(),
      current_user_role,
      current_user_email
    );
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (
      table_name, 
      record_id, 
      operation, 
      old_data, 
      new_data, 
      changed_by,
      changed_by_role,
      changed_by_email
    )
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      'UPDATE', 
      row_to_json(OLD)::jsonb, 
      row_to_json(NEW)::jsonb, 
      auth.uid(),
      current_user_role,
      current_user_email
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (
      table_name, 
      record_id, 
      operation, 
      new_data, 
      changed_by,
      changed_by_role,
      changed_by_email
    )
    VALUES (
      TG_TABLE_NAME, 
      NEW.id, 
      'INSERT', 
      row_to_json(NEW)::jsonb, 
      auth.uid(),
      current_user_role,
      current_user_email
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION log_changes() IS 'Fonction trigger pour audit automatique - Enregistre tous les changements dans audit_logs';

-- ================================================================
-- 2.3 APPLICATION DES TRIGGERS SUR TABLES CRITIQUES
-- ================================================================

-- Trigger sur profiles
DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Trigger sur sleep_data
DROP TRIGGER IF EXISTS audit_sleep_data_changes ON sleep_data;
CREATE TRIGGER audit_sleep_data_changes
AFTER INSERT OR UPDATE OR DELETE ON sleep_data
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Trigger sur alerts
DROP TRIGGER IF EXISTS audit_alerts_changes ON alerts;
CREATE TRIGGER audit_alerts_changes
AFTER INSERT OR UPDATE OR DELETE ON alerts
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Trigger sur interventions
DROP TRIGGER IF EXISTS audit_interventions_changes ON interventions;
CREATE TRIGGER audit_interventions_changes
AFTER INSERT OR UPDATE OR DELETE ON interventions
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- ================================================================
-- PARTIE 3 : FONCTIONS DE SÉCURITÉ UTILITAIRES
-- ================================================================

-- 3.1 Fonction : Vérifier si un user est médecin
CREATE OR REPLACE FUNCTION is_doctor(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'doctor'
  );
$$;

-- 3.2 Fonction : Vérifier si un user est admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('admin', 'prestataire')
  );
$$;

-- 3.3 Fonction : Vérifier si un médecin a accès à un patient
CREATE OR REPLACE FUNCTION doctor_has_access_to_patient(doctor_id uuid, patient_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles doctor_profile
    JOIN profiles patient_profile ON patient_profile.panel_code = doctor_profile.panel_code
    WHERE doctor_profile.id = doctor_id
    AND doctor_profile.role = 'doctor'
    AND patient_profile.id = patient_id
    AND patient_profile.role = 'patient'
  );
$$;

-- ================================================================
-- PARTIE 4 : INDEXES POUR PERFORMANCE
-- ================================================================

-- Index sur profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_panel_code ON profiles(panel_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index sur sleep_data
CREATE INDEX IF NOT EXISTS idx_sleep_data_user_id ON sleep_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_data_date ON sleep_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_data_user_date ON sleep_data(user_id, date DESC);

-- Index sur alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Index sur interventions
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at DESC);

-- ================================================================
-- PARTIE 5 : VUES DE SÉCURITÉ (Pour audits)
-- ================================================================

-- Vue : Résumé des audits par utilisateur
CREATE OR REPLACE VIEW audit_summary_by_user AS
SELECT 
  changed_by,
  changed_by_email,
  changed_by_role,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE operation = 'INSERT') as inserts,
  COUNT(*) FILTER (WHERE operation = 'UPDATE') as updates,
  COUNT(*) FILTER (WHERE operation = 'DELETE') as deletes,
  MIN(timestamp) as first_action,
  MAX(timestamp) as last_action
FROM audit_logs
GROUP BY changed_by, changed_by_email, changed_by_role;

-- Vue : Audits récents (dernières 24h)
CREATE OR REPLACE VIEW audit_recent AS
SELECT 
  id,
  table_name,
  operation,
  changed_by_email,
  changed_by_role,
  timestamp
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- ================================================================
-- PARTIE 6 : COMMENTAIRES DE DOCUMENTATION
-- ================================================================

COMMENT ON POLICY "Patient view own profile" ON profiles IS 'Un patient ne peut voir que son propre profil';
COMMENT ON POLICY "Doctor view assigned patients" ON profiles IS 'Un médecin voit uniquement ses patients assignés via panel_code';
COMMENT ON POLICY "Admin view all profiles" ON profiles IS 'Les admins/prestataires voient tous les profils';

COMMENT ON TABLE sleep_data IS 'Données télémétrie machines PPC - Insertion uniquement via backend IoT (Service Role)';
COMMENT ON TABLE alerts IS 'Alertes médicales - Lecture selon rôle, création automatique par système';
COMMENT ON TABLE interventions IS 'Interventions médicales - Création par médecins uniquement, lecture selon rôle';

-- ================================================================
-- VALIDATION FINALE
-- ================================================================

-- Test : Vérifier que RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'sleep_data', 'alerts', 'interventions', 'audit_logs');

-- Résultat attendu : rowsecurity = true pour toutes les tables

-- Test : Compter les policies
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ================================================================
-- INSTRUCTIONS D'EXÉCUTION
-- ================================================================

/*
COMMENT EXÉCUTER CE SCRIPT :

1. Aller sur Supabase Dashboard → SQL Editor
2. Créer une nouvelle query
3. Copier-coller CE FICHIER COMPLET
4. Cliquer "Run" (Exécuter)
5. Vérifier les résultats (aucune erreur)

IMPORTANT :
- Exécuter sur un environnement de TEST d'abord
- Faire un backup de la base avant (Dashboard → Database → Backups)
- Tester avec différents rôles (patient, doctor, admin)

TESTS À FAIRE APRÈS :
1. Se connecter en tant que patient → Vérifier qu'il ne voit que ses données
2. Se connecter en tant que médecin → Vérifier qu'il voit ses patients uniquement
3. Modifier un profil patient → Vérifier que l'audit_logs est créé
4. Essayer de supprimer une donnée → Vérifier que c'est bloqué

DATE : 4 décembre 2024
VERSION : 1.0.0
AUTEUR : Sprint 0 - Sécurité & Infrastructure
*/
