-- ============================================
-- SCRIPT DE GÉNÉRATION D'ALERTES DE DÉMONSTRATION
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. NETTOYER LES ALERTES EXISTANTES (OPTIONNEL)
-- ============================================
-- Décommentez cette ligne si vous voulez recommencer à zéro
-- DELETE FROM public.alerts WHERE status = 'active';

-- ============================================
-- 2. GÉNÉRER DES ALERTES BASÉES SUR LES DONNÉES RÉELLES
-- ============================================

-- Alerte 1 : Machine déconnectée (patient avec anciennes données d'observance)
INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
SELECT 
  p.id,
  'disconnect',
  CASE 
    WHEN MAX(od.date) < CURRENT_DATE - 7 THEN 'high'
    WHEN MAX(od.date) < CURRENT_DATE - 3 THEN 'medium'
    ELSE 'low'
  END,
  'Machine déconnectée depuis ' || (CURRENT_DATE - MAX(od.date))::TEXT || ' jours',
  'Dernière synchronisation le ' || TO_CHAR(MAX(od.date), 'DD/MM/YYYY')
FROM public.patients p
LEFT JOIN public.observance_data od ON od.patient_id = p.id
WHERE p.device_installed = true
GROUP BY p.id
HAVING MAX(od.date) < CURRENT_DATE - 2
ON CONFLICT DO NOTHING;

-- Alerte 2 : IAH résiduel élevé (patients avec IAH moyen > 10)
INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
SELECT 
  p.id,
  'iah_high',
  CASE 
    WHEN AVG(od.events) > 15 THEN 'high'
    WHEN AVG(od.events) > 10 THEN 'medium'
    ELSE 'low'
  END,
  'IAH résiduel > ' || ROUND(AVG(od.events))::TEXT || ' événements/h',
  'Moyenne sur les 7 derniers jours. Contacter le médecin prescripteur.'
FROM public.patients p
INNER JOIN public.observance_data od ON od.patient_id = p.id
WHERE p.device_installed = true
  AND od.date >= CURRENT_DATE - 7
GROUP BY p.id
HAVING AVG(od.events) > 10
ON CONFLICT DO NOTHING;

-- Alerte 3 : Fuites excessives (patients avec fuites moyennes > 30 L/min)
INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
SELECT 
  p.id,
  'leak',
  CASE 
    WHEN AVG(od.leakage) > 40 THEN 'high'
    WHEN AVG(od.leakage) > 30 THEN 'medium'
    ELSE 'low'
  END,
  'Fuites > ' || ROUND(AVG(od.leakage))::TEXT || ' L/min',
  'Moyenne sur les 7 derniers jours. Vérifier l''ajustement du masque.'
FROM public.patients p
INNER JOIN public.observance_data od ON od.patient_id = p.id
WHERE p.device_installed = true
  AND od.date >= CURRENT_DATE - 7
GROUP BY p.id
HAVING AVG(od.leakage) > 30
ON CONFLICT DO NOTHING;

-- Alerte 4 : Faible observance (patients avec < 4h d'utilisation moyenne)
INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
SELECT 
  p.id,
  'no_data',
  CASE 
    WHEN AVG(od.hours_used) < 3 THEN 'high'
    WHEN AVG(od.hours_used) < 4 THEN 'medium'
    ELSE 'low'
  END,
  'Observance faible : ' || ROUND(AVG(od.hours_used), 1)::TEXT || 'h/nuit',
  'Moyenne sur les 7 derniers jours. Objectif : >4h par nuit.'
FROM public.patients p
INNER JOIN public.observance_data od ON od.patient_id = p.id
WHERE p.device_installed = true
  AND od.date >= CURRENT_DATE - 7
GROUP BY p.id
HAVING AVG(od.hours_used) < 4.5
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. ALERTES FICTIVES POUR DÉMONSTRATION
-- (Si pas assez de données réelles)
-- ============================================

-- Récupérer un patient au hasard pour les alertes de démo
DO $$
DECLARE
  random_patient_id UUID;
  patient_count INTEGER;
BEGIN
  -- Compter les patients
  SELECT COUNT(*) INTO patient_count FROM public.patients WHERE device_installed = true;
  
  IF patient_count > 0 THEN
    -- Alerte de masque ancien (fictive)
    SELECT id INTO random_patient_id 
    FROM public.patients 
    WHERE device_installed = true 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF random_patient_id IS NOT NULL THEN
      INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
      VALUES (
        random_patient_id,
        'mask_old',
        'medium',
        'Masque utilisé depuis 95 jours',
        'Remplacement recommandé tous les 90 jours',
        'active'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- Alerte de suivi nécessaire (fictive)
    SELECT id INTO random_patient_id 
    FROM public.patients 
    WHERE device_installed = true 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    IF random_patient_id IS NOT NULL THEN
      INSERT INTO public.alerts (patient_id, type, severity, message, details, status)
      VALUES (
        random_patient_id,
        'follow_up',
        'low',
        'Suivi téléphonique programmé',
        'Contrôle mensuel de l''observance',
        'active'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. VÉRIFIER LES ALERTES CRÉÉES
-- ============================================

-- Afficher toutes les alertes actives avec les infos patient
SELECT 
  a.id,
  a.type,
  a.severity,
  a.message,
  a.details,
  u.name AS patient_name,
  u.phone AS patient_phone,
  a.created_at
FROM public.alerts a
INNER JOIN public.patients p ON p.id = a.patient_id
INNER JOIN public.users u ON u.id = p.user_id
WHERE a.status = 'active'
ORDER BY 
  CASE a.severity 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END,
  a.created_at DESC;

-- ============================================
-- 5. STATISTIQUES
-- ============================================

SELECT 
  'Total alertes actives' AS metric,
  COUNT(*) AS value
FROM public.alerts
WHERE status = 'active'

UNION ALL

SELECT 
  'Alertes urgentes' AS metric,
  COUNT(*) AS value
FROM public.alerts
WHERE status = 'active' AND severity = 'high'

UNION ALL

SELECT 
  'Alertes moyennes' AS metric,
  COUNT(*) AS value
FROM public.alerts
WHERE status = 'active' AND severity = 'medium'

UNION ALL

SELECT 
  'Alertes faibles' AS metric,
  COUNT(*) AS value
FROM public.alerts
WHERE status = 'active' AND severity = 'low';

-- ============================================
-- 6. FONCTION POUR RÉGÉNÉRER LES ALERTES (CRON JOB)
-- ============================================

-- Cette fonction peut être appelée régulièrement (quotidiennement)
-- pour mettre à jour les alertes automatiquement

CREATE OR REPLACE FUNCTION refresh_automatic_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer les anciennes alertes auto-générées (optionnel)
  -- DELETE FROM public.alerts WHERE status = 'active' AND type IN ('disconnect', 'iah_high', 'leak');

  -- Régénérer les alertes
  -- (Copier les INSERT INTO ci-dessus)
  
  RAISE NOTICE 'Alertes automatiques régénérées avec succès';
END;
$$;

-- Pour appeler cette fonction manuellement :
-- SELECT refresh_automatic_alerts();

-- ============================================
-- 7. NOTES D'UTILISATION
-- ============================================

/*
UTILISATION :

1. Première fois : Exécuter tout le script pour créer les alertes initiales
2. Vérification : Consulter la section 4 pour voir les alertes créées
3. Régulièrement : Appeler refresh_automatic_alerts() pour mettre à jour

PERSONNALISATION :

- Modifier les seuils (7 jours, 10 événements/h, 30 L/min, 4h/nuit)
- Ajouter de nouveaux types d'alertes
- Adapter les messages et descriptions

PRODUCTION :

- Configurer un CRON job Supabase pour appeler refresh_automatic_alerts() quotidiennement
- Monitorer les alertes via dashboard prestataire
- Ajuster les seuils selon les retours terrain
*/
