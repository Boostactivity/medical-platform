/**
 * Configuration des Tâches Planifiées (Cron Jobs)
 * 
 * Les Edge Functions Supabase supportent les cron jobs via pg_cron.
 * Ce fichier documente la configuration de toutes les tâches automatiques.
 * 
 * Installation :
 * 1. Activer pg_cron dans Supabase Dashboard → Database → Extensions
 * 2. Créer les cron jobs via SQL (voir ci-dessous)
 * 3. Les jobs s'exécutent automatiquement selon le planning
 */

/**
 * SQL POUR CRÉER LES CRON JOBS
 * 
 * Copier-coller dans l'éditeur SQL de Supabase Dashboard
 */

export const CRON_JOBS_SQL = `
-- ============================================
-- CRON JOB 1 : CALCUL DES SCORES DE SOMMEIL
-- ============================================
-- Exécution : Chaque matin à 6h
-- Objectif : Calculer le score la plateforme pour toutes les nuits

SELECT cron.schedule(
  'calculate-sleep-scores',           -- Job name
  '0 6 * * *',                        -- Cron expression (6h tous les jours)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-50732e52/automation/calculate-scores',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- CRON JOB 2 : VÉRIFICATION ÉLIGIBILITÉ CPAM
-- ============================================
-- Exécution : Chaque nuit à 1h
-- Objectif : Vérifier l'éligibilité de tous les patients et créer des alertes

SELECT cron.schedule(
  'check-cpam-eligibility',          -- Job name
  '0 1 * * *',                       -- Cron expression (1h tous les jours)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-50732e52/automation/cpam-check',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- CRON JOB 3 : ENVOI RAPPORTS MENSUELS
-- ============================================
-- Exécution : Le 1er de chaque mois à 9h
-- Objectif : Envoyer le rapport mensuel à tous les patients

SELECT cron.schedule(
  'send-monthly-reports',            -- Job name
  '0 9 1 * *',                       -- Cron expression (9h le 1er du mois)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-50732e52/automation/send-monthly-reports-batch',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- CRON JOB 4 : RAPPELS D'UTILISATION
-- ============================================
-- Exécution : Tous les lundis à 10h
-- Objectif : Envoyer un rappel aux patients avec faible observance

SELECT cron.schedule(
  'send-usage-reminders',            -- Job name
  '0 10 * * 1',                      -- Cron expression (10h tous les lundis)
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-50732e52/automation/send-usage-reminders-batch',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- CRON JOB 5 : NETTOYAGE DES ANCIENNES DONNÉES
-- ============================================
-- Exécution : Le 1er de chaque mois à 3h
-- Objectif : Archiver et nettoyer les données de plus de 2 ans

SELECT cron.schedule(
  'cleanup-old-data',                -- Job name
  '0 3 1 * *',                       -- Cron expression (3h le 1er du mois)
  $$
  -- Archiver les sleep_data de plus de 2 ans
  INSERT INTO sleep_data_archive
  SELECT * FROM sleep_data
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Supprimer après archivage
  DELETE FROM sleep_data
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Nettoyer les alertes résolues de plus de 6 mois
  DELETE FROM alerts
  WHERE is_resolved = true
  AND resolved_at < NOW() - INTERVAL '6 months';
  $$
);

-- ============================================
-- COMMANDES UTILES POUR GÉRER LES CRON JOBS
-- ============================================

-- Lister tous les cron jobs actifs
SELECT * FROM cron.job;

-- Désactiver un cron job
SELECT cron.unschedule('job-name');

-- Supprimer un cron job
SELECT cron.unschedule('job-name');

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;

-- Voir les erreurs
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
`;

/**
 * EXPRESSIONS CRON - GUIDE RAPIDE
 * 
 * Format : minute hour day month day_of_week
 * 
 * Exemples :
 * - '0 6 * * *'     → Tous les jours à 6h
 * - '0 1 * * *'     → Tous les jours à 1h
 * - '0 9 1 * *'     → Le 1er de chaque mois à 9h
 * - '0 10 * * 1'    → Tous les lundis à 10h
 * - '0 */2 * * *'   → Toutes les 2 heures
 * - '0 0 * * 0'     → Tous les dimanches à minuit
 * - '30 14 * * *'   → Tous les jours à 14h30
 * 
 * Outils utiles :
 * - https://crontab.guru → Tester vos expressions cron
 * - https://crontab.cronhub.io → Générateur d'expressions
 */

/**
 * MONITORING DES CRON JOBS
 */

export const MONITORING_QUERIES = {
  /**
   * Vérifier le statut des dernières exécutions
   */
  checkLastRuns: `
    SELECT 
      job_id,
      jobname,
      start_time,
      end_time,
      status,
      return_message
    FROM cron.job_run_details
    ORDER BY start_time DESC
    LIMIT 20;
  `,

  /**
   * Statistiques par job
   */
  jobStatistics: `
    SELECT 
      jobname,
      COUNT(*) as total_runs,
      COUNT(*) FILTER (WHERE status = 'succeeded') as successes,
      COUNT(*) FILTER (WHERE status = 'failed') as failures,
      AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds
    FROM cron.job_run_details
    WHERE start_time > NOW() - INTERVAL '7 days'
    GROUP BY jobname
    ORDER BY jobname;
  `,

  /**
   * Jobs en cours d'exécution
   */
  runningJobs: `
    SELECT 
      jobname,
      start_time,
      NOW() - start_time as running_for
    FROM cron.job_run_details
    WHERE status = 'running'
    ORDER BY start_time;
  `,
};

/**
 * CONFIGURATION DES NOTIFICATIONS D'ERREUR
 * 
 * Pour être notifié en cas d'échec d'un cron job :
 */

export const ERROR_NOTIFICATION_TRIGGER = `
-- Créer une fonction qui envoie une notification en cas d'erreur
CREATE OR REPLACE FUNCTION notify_cron_failure()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    -- Envoyer une alerte via le service de notifications
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-50732e52/automation/send-critical-alert',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'phone', '+33612345678',
        'email', 'admin@plateforme.fr',
        'patient_name', 'Admin',
        'alert_message', 'Cron job failed: ' || NEW.jobname || ' - ' || NEW.return_message
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER cron_failure_notification
AFTER INSERT ON cron.job_run_details
FOR EACH ROW
EXECUTE FUNCTION notify_cron_failure();
`;

/**
 * BEST PRACTICES
 * 
 * 1. Idempotence :
 *    - Les jobs doivent pouvoir être réexécutés sans problème
 *    - Vérifier l'existence avant création
 *    - Utiliser des transactions
 * 
 * 2. Logging :
 *    - Logger toutes les exécutions
 *    - Sauvegarder les résumés dans KV store
 *    - Monitorer les erreurs
 * 
 * 3. Performance :
 *    - Traiter par batch (1000 items max)
 *    - Limiter la durée d'exécution (< 15 min)
 *    - Optimiser les requêtes SQL
 * 
 * 4. Sécurité :
 *    - Utiliser SERVICE_ROLE_KEY uniquement
 *    - Ne jamais exposer les credentials
 *    - Valider les inputs
 * 
 * 5. Alerting :
 *    - Notifier en cas d'échec
 *    - Monitorer la durée d'exécution
 *    - Alerter si trop de patients à risque
 */

/**
 * ALTERNATIVE : UTILISER SUPABASE DASHBOARD
 * 
 * Au lieu du SQL ci-dessus, vous pouvez configurer les cron jobs
 * directement dans le Dashboard Supabase :
 * 
 * 1. Aller dans Database → Cron Jobs
 * 2. Cliquer sur "New Cron Job"
 * 3. Entrer le nom et l'expression cron
 * 4. Entrer la commande SQL
 * 5. Sauvegarder
 * 
 * Interface plus conviviale que le SQL brut.
 */

export default {
  CRON_JOBS_SQL,
  MONITORING_QUERIES,
  ERROR_NOTIFICATION_TRIGGER,
};
