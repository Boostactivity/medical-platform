-- ============================================
-- FIX: RLS Policies pour la table users
-- ============================================
-- Problème : Les policies des autres tables font des SELECT sur users
-- pour vérifier les rôles, mais users a RLS activé sans policies appropriées.
-- Solution : Ajouter des policies permettant de lire les infos de base
-- nécessaires pour les vérifications RLS (role, panel_code).

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "System can manage users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read basic info for RLS checks" ON users;

-- Policy 1: Les utilisateurs authentifiés peuvent lire les profils
-- (nécessaire pour les subqueries RLS des autres tables)
CREATE POLICY "Authenticated users can read user profiles" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Les utilisateurs peuvent mettre à jour leur propre profil uniquement
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Seuls les admins peuvent insérer de nouveaux utilisateurs
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 4: Seuls les admins peuvent supprimer des utilisateurs
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- FIX: RLS Policies pour la table alerts
-- ============================================
-- Ajout d'une policy pour que les patients puissent voir leurs propres alertes

-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Patients can view own alerts" ON alerts;

-- Policy pour les patients: voir leurs propres alertes
CREATE POLICY "Patients can view own alerts" ON alerts
  FOR SELECT
  USING (patient_id = auth.uid());

-- Policy pour les patients: mettre à jour leurs propres alertes (acknowledge)
DROP POLICY IF EXISTS "Patients can acknowledge own alerts" ON alerts;

CREATE POLICY "Patients can acknowledge own alerts" ON alerts
  FOR UPDATE
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());