-- =============================================
-- DEMO ALERTS FOR TESTING
-- Insert sample IoT alerts in alerts_queue table
-- =============================================

-- Note: Replace 'PATIENT_UUID_HERE' with actual patient UUID from your users table
-- This script creates demo alerts to test the SmartAlertsQueue component

-- CRITICAL ALERT: High leak rate
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'LEAK_CRITICAL',
  'critical',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'Fuite masque critique détectée',
  'Fuite moyenne de 48.5 L/min détectée pendant 3 nuits consécutives',
  'Vérifier l''étanchéité du masque immédiatement. Une fuite > 40 L/min compromet l''efficacité du traitement.',
  '{"value": 48.5, "threshold": 40, "unit": "L/min", "trend": "increasing"}'::jsonb,
  'new',
  true,
  '["Contacter le patient dans les 24h", "Planifier RDV ajustement masque", "Vérifier usure du joint", "Proposer essai nouveau modèle si nécessaire", "Envoyer guide repositionnement"]'::jsonb,
  30
);

-- HIGH ALERT: Low usage
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'LOW_USAGE',
  'high',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'Utilisation insuffisante',
  'Utilisation moyenne de 2.8h/nuit sur les 7 derniers jours (objectif: 4h minimum)',
  'Identifier les obstacles à l''utilisation. Une utilisation < 4h/nuit réduit significativement l''efficacité thérapeutique.',
  '{"value": 2.8, "threshold": 4, "unit": "h", "trend": "stable"}'::jsonb,
  'new',
  true,
  '["Appel téléphonique patient", "Identifier causes: confort, claustrophobie, bruit", "Proposer masque plus confortable", "Envoyer guide motivation", "Suivi hebdomadaire"]'::jsonb,
  20
);

-- MEDIUM ALERT: Moderate AHI
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'AHI_MODERATE',
  'medium',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'IAH modéré persistant',
  'IAH résiduel de 8.2 événements/h malgré traitement (objectif: <5)',
  'Évaluer l''efficacité du traitement actuel. Un IAH résiduel > 5 peut indiquer un besoin d''ajustement.',
  '{"value": 8.2, "threshold": 5, "unit": "évts/h", "trend": "stable"}'::jsonb,
  'new',
  true,
  '["Vérifier réglages pression", "Consulter médecin prescripteur", "Analyser courbes de pression", "Vérifier position de sommeil", "Évaluer changement mode PPC"]'::jsonb,
  45
);

-- LOW ALERT: Good score celebration
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'SCORE_EXCELLENT',
  'low',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  '🎉 Score excellent maintenu!',
  'Score Exp''Air de 95/100 pendant 7 jours consécutifs',
  'Félicitations! Continuer sur cette excellente dynamique.',
  '{"value": 95, "threshold": 90, "unit": "pts", "trend": "stable"}'::jsonb,
  'new',
  false,
  '["Envoyer message de félicitations", "Badge ''Champion 7 jours'' débloqué", "Proposer témoignage pour encourager autres patients"]'::jsonb,
  5
);

-- MEDIUM ALERT: Mask instability
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'MASK_INSTABILITY',
  'medium',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'Retraits masque fréquents',
  '5 retraits de masque détectés la nuit dernière',
  'Les retraits fréquents peuvent indiquer un inconfort. Vérifier l''ajustement du masque.',
  '{"value": 5, "threshold": 2, "unit": "retraits", "trend": "increasing"}'::jsonb,
  'new',
  true,
  '["Appeler patient pour feedback", "Vérifier taille du masque", "Proposer coussin plus souple", "Vérifier réglages harnais", "Envoyer guide ajustement"]'::jsonb,
  25
);

-- HIGH ALERT: Consumable replacement needed
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'CONSUMABLE_OVERDUE',
  'high',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'Remplacement masque en retard',
  'Masque installé il y a 105 jours (recommandation: 90 jours)',
  'Un masque usé peut causer des fuites et réduire l''efficacité du traitement.',
  '{"value": 105, "threshold": 90, "unit": "jours", "trend": "increasing"}'::jsonb,
  'new',
  true,
  '["Contacter patient pour livraison", "Vérifier stock consommables", "Préparer colis remplacement", "Planifier livraison sous 48h", "Rappel entretien matériel"]'::jsonb,
  15
);

-- CRITICAL ALERT: Device connectivity issue
INSERT INTO alerts_queue (
  type,
  severity,
  patient_id,
  title,
  message,
  recommendation,
  context,
  status,
  auto_assigned,
  suggested_actions,
  estimated_time
) VALUES (
  'DEVICE_OFFLINE',
  'critical',
  (SELECT id FROM users WHERE email LIKE '%patient%' OR role = 'patient' LIMIT 1),
  'Appareil non connecté',
  'Aucune donnée reçue depuis 5 jours',
  'Vérifier connexion appareil et batterie. Absence de données empêche le suivi thérapeutique.',
  '{"value": 5, "threshold": 3, "unit": "jours", "trend": "increasing"}'::jsonb,
  'new',
  true,
  '["Appeler patient URGENT", "Vérifier connexion WiFi/SD", "Diagnostiquer panne éventuelle", "Prévoir intervention technique si nécessaire", "Activer appareil de secours si disponible"]'::jsonb,
  60
);

-- Note: After running this script, you should have 7 demo alerts in the alerts_queue table
-- To verify: SELECT * FROM alerts_queue ORDER BY created_at DESC;
