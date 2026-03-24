-- ============================================
-- FIX URGENT : Permission denied for table users
-- ============================================
-- Ce script corrige l'erreur RLS qui empêche l'accès aux alertes
-- 
-- INSTRUCTIONS :
-- 1. Copier TOUT ce script
-- 2. Aller sur : https://supabase.com/dashboard/project/ilskgkcbqnyydetsiwvi/sql/new
-- 3. Coller le script
-- 4. Cliquer sur RUN ▶️
-- 5. Recharger l'application web
--
-- ============================================

-- ÉTAPE 1 : Désactiver RLS (solution temporaire)
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 2 : Supprimer toutes les policies défectueuses
DROP POLICY IF EXISTS "Admin and prestataire can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can update alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can delete alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can view all interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can insert interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can update interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can delete interventions" ON interventions;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;

-- ÉTAPE 3 : Vérifier que RLS est bien désactivé
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('alerts', 'interventions', 'audit_logs')
ORDER BY tablename;

-- ÉTAPE 4 : Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS DÉSACTIVÉ SUR LES 3 TABLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochaines étapes :';
  RAISE NOTICE '  1. Rechargez votre application web';
  RAISE NOTICE '  2. L''erreur devrait avoir disparu';
  RAISE NOTICE '  3. Si OK, on réactivera RLS avec les bonnes policies';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ATTENTION : RLS désactivé = moins sécurisé';
  RAISE NOTICE '    C''est temporaire pour identifier le problème';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ÉTAPE 5 : Lister les policies restantes (devrait être vide)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('alerts', 'interventions', 'audit_logs')
ORDER BY tablename, policyname;
