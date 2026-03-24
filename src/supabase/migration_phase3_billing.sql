-- ═══════════════════════════════════════════════════════════════════
-- PHASE 3 : AUTOMATISATION FACTURATION & STOCKS - Exp'Air Medical
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Ce fichier contient toutes les modifications de base de données
-- nécessaires pour la Phase 3 :
-- 1. Ajout des colonnes de compliance/facturation dans `patients`
-- 2. Création de la table `equipment_inventory` (stock consommables)
-- 3. Création de la fonction SQL de calcul de compliance
-- 4. Configuration du CRON job automatique
--
-- ⚠️ IMPORTANT : Exécuter ce fichier dans l'éditeur SQL Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. AJOUT DES COLONNES DE FACTURATION DANS `patients`
-- ───────────────────────────────────────────────────────────────────

-- Moyenne glissante sur 28 jours (heures/nuit)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS compliance_28d_average DECIMAL(4,2) DEFAULT 0.0;

-- Éligibilité au remboursement (TRUE si >= 3h/nuit)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT FALSE;

-- Date de la prochaine facturation
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Date de la dernière facturation réussie
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS last_billing_date DATE;

-- Statut du patient (active, suspended, archived)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Commentaires sur les colonnes
COMMENT ON COLUMN patients.compliance_28d_average IS 'Moyenne glissante sur 28 jours (heures/nuit) - Calculée automatiquement chaque nuit';
COMMENT ON COLUMN patients.is_reimbursable IS 'TRUE si patient éligible au remboursement CPAM (>= 3h/nuit sur 28j)';
COMMENT ON COLUMN patients.next_billing_date IS 'Date de la prochaine facturation au forfait';
COMMENT ON COLUMN patients.last_billing_date IS 'Date de la dernière facturation réussie';
COMMENT ON COLUMN patients.status IS 'Statut du patient : active, suspended, archived';

-- ───────────────────────────────────────────────────────────────────
-- 2. TABLE EQUIPMENT_INVENTORY (Gestion des stocks/consommables)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Type de consommable
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('mask', 'tubing', 'filter', 'humidifier')),
  
  -- Référence du modèle
  model_ref VARCHAR(100) NOT NULL,
  
  -- Taille (pour les masques : S, M, L)
  size VARCHAR(10),
  
  -- Date d'installation chez le patient
  installed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Date de renouvellement due (calculée automatiquement)
  renewal_due_at DATE NOT NULL,
  
  -- Durée de vie en jours (180 = 6 mois pour masques)
  lifespan_days INTEGER DEFAULT 180,
  
  -- Statut : active, shipped, replaced
  status VARCHAR(20) DEFAULT 'active',
  
  -- Date d'expédition du renouvellement
  renewal_shipped_at DATE,
  
  -- Coût unitaire (pour calcul rentabilité)
  unit_cost DECIMAL(10,2),
  
  -- Notes libres
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_equipment_patient ON equipment_inventory(patient_id);
CREATE INDEX IF NOT EXISTS idx_equipment_renewal ON equipment_inventory(renewal_due_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment_inventory(item_type);

COMMENT ON TABLE equipment_inventory IS 'Inventaire des consommables installés chez les patients (masques, tubulures, filtres)';
COMMENT ON COLUMN equipment_inventory.renewal_due_at IS 'Date de renouvellement automatique (installed_at + lifespan_days)';
COMMENT ON COLUMN equipment_inventory.status IS 'active = en cours, shipped = renouvellement expédié, replaced = remplacé';

-- Trigger pour calculer automatiquement renewal_due_at
CREATE OR REPLACE FUNCTION calculate_renewal_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.renewal_due_at = NEW.installed_at + (NEW.lifespan_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_renewal_date
BEFORE INSERT OR UPDATE OF installed_at, lifespan_days
ON equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION calculate_renewal_date();

-- ───────────────────────────────────────────────────────────────────
-- 3. TABLE BILLING_HISTORY (Historique des facturations)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Période de facturation
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Montant facturé (forfait CPAM)
  amount DECIMAL(10,2) NOT NULL,
  
  -- Compliance durant la période
  period_compliance_avg DECIMAL(4,2) NOT NULL,
  
  -- Statut : pending, paid, rejected
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Référence facture
  invoice_ref VARCHAR(50),
  
  -- Date de paiement
  paid_at DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_period ON billing_history(billing_period_start, billing_period_end);

COMMENT ON TABLE billing_history IS 'Historique des facturations forfait CPAM par patient';
COMMENT ON COLUMN billing_history.period_compliance_avg IS 'Moyenne de compliance durant la période facturée';

-- ───────────────────────────────────────────────────────────────────
-- 4. FONCTION SQL : CALCULATEUR DE COMPLIANCE (Règle des 28 jours)
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_billing_compliance()
RETURNS TABLE(
  patients_processed INTEGER,
  eligible_patients INTEGER,
  at_risk_patients INTEGER,
  lost_patients INTEGER
) AS $$
DECLARE
  patient_record RECORD;
  avg_usage DECIMAL(4,2);
  total_count INTEGER := 0;
  eligible_count INTEGER := 0;
  risk_count INTEGER := 0;
  lost_count INTEGER := 0;
  previous_eligible BOOLEAN;
BEGIN
  -- Pour chaque patient actif avec appareil installé
  FOR patient_record IN 
    SELECT 
      p.id, 
      p.user_id,
      p.is_reimbursable as previous_status
    FROM patients p
    WHERE p.status = 'active' 
    AND p.device_installed = TRUE
  LOOP
    
    total_count := total_count + 1;
    previous_eligible := patient_record.previous_status;
    
    -- Calcul moyenne sur les 28 derniers jours
    -- Utilisation de observance_data (hours_used)
    SELECT COALESCE(AVG(hours_used), 0)::DECIMAL(4,2)
    INTO avg_usage
    FROM observance_data
    WHERE patient_id = patient_record.id
    AND measurement_date >= (CURRENT_DATE - INTERVAL '28 days')
    AND measurement_date <= CURRENT_DATE;

    -- Mise à jour du statut financier du patient
    UPDATE patients 
    SET 
      compliance_28d_average = avg_usage,
      is_reimbursable = (avg_usage >= 3.0), -- Seuil critique CPAM : 3h/nuit
      updated_at = NOW()
    WHERE id = patient_record.id;

    -- Comptage par catégorie
    IF avg_usage >= 3.0 THEN
      eligible_count := eligible_count + 1;
    ELSIF avg_usage >= 2.0 AND avg_usage < 3.0 THEN
      risk_count := risk_count + 1;
    ELSE
      lost_count := lost_count + 1;
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- SYSTÈME D'ALERTES RENTABILITÉ (Le "Sauvetage de CA")
    -- ═══════════════════════════════════════════════════════════════
    
    -- ALERTE CRITIQUE : Patient passe SOUS le seuil (était éligible, ne l'est plus)
    IF previous_eligible = TRUE AND avg_usage < 3.0 THEN
      INSERT INTO alerts (patient_id, type, severity, message, created_at)
      VALUES (
        patient_record.id, 
        'BILLING_RISK_CRITICAL', 
        'critical',
        'URGENT - Patient vient de PERDRE son éligibilité CPAM ! Moyenne 28j : ' || ROUND(avg_usage, 2) || 'h/nuit. Action commerciale immédiate requise.',
        NOW()
      );
    
    -- ALERTE HAUTE : Risque financier (entre 2h et 3h)
    ELSIF avg_usage >= 2.0 AND avg_usage < 3.0 THEN
      INSERT INTO alerts (patient_id, type, severity, message, created_at)
      VALUES (
        patient_record.id, 
        'BILLING_RISK', 
        'high',
        'Attention - Risque de non-remboursement. Moyenne 28j : ' || ROUND(avg_usage, 2) || 'h/nuit. Contacter le patient pour améliorer l''observance.',
        NOW()
      )
      ON CONFLICT DO NOTHING; -- Éviter les doublons si déjà alerté
    
    -- ALERTE MOYENNE : Revenu perdu (< 2h)
    ELSIF avg_usage < 2.0 THEN
      INSERT INTO alerts (patient_id, type, severity, message, created_at)
      VALUES (
        patient_record.id, 
        'BILLING_LOST', 
        'medium',
        'Revenu PERDU - Patient non conforme (< 2h/nuit). Moyenne 28j : ' || ROUND(avg_usage, 2) || 'h/nuit. Envisager récupération matériel ou résiliation.',
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;

  -- Retourner les statistiques
  RETURN QUERY SELECT total_count, eligible_count, risk_count, lost_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_billing_compliance IS 'Calcule la compliance 28j pour tous les patients actifs et génère les alertes financières';

-- ───────────────────────────────────────────────────────────────────
-- 5. FONCTION : GÉNÉRATION DES RENOUVELLEMENTS (Logistique)
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_renewal_batch(
  days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE(
  batch_id VARCHAR,
  items_count INTEGER,
  items JSONB
) AS $$
DECLARE
  batch_ref VARCHAR;
  renewal_items JSONB;
  items_total INTEGER;
BEGIN
  -- Générer ID batch unique
  batch_ref := 'BATCH-' || TO_CHAR(NOW(), 'YYYY-WW');
  
  -- Sélectionner tous les équipements à renouveler dans les N prochains jours
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'patient_name', u.full_name,
        'patient_email', u.email,
        'address', u.address,
        'item_type', ei.item_type,
        'model_ref', ei.model_ref,
        'size', ei.size,
        'renewal_due_at', ei.renewal_due_at,
        'installed_at', ei.installed_at,
        'reason', 'Renouvellement automatique semestriel'
      )
    ),
    COUNT(*)
  INTO renewal_items, items_total
  FROM equipment_inventory ei
  JOIN patients p ON p.id = ei.patient_id
  JOIN users u ON u.id = p.user_id
  WHERE ei.status = 'active'
  AND ei.renewal_due_at BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  AND p.status = 'active';
  
  -- Si aucun item à renouveler
  IF items_total IS NULL THEN
    items_total := 0;
    renewal_items := '[]'::JSONB;
  END IF;
  
  RETURN QUERY SELECT batch_ref, items_total, renewal_items;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_renewal_batch IS 'Génère un batch de renouvellements de consommables pour les N prochains jours';

-- ───────────────────────────────────────────────────────────────────
-- 6. ACTIVATION DU CRON JOB (AUTOMATISATION)
-- ───────────────────────────────────────────────────────────────────

-- ⚠️ IMPORTANT : L'extension pg_cron doit être activée dans Supabase
-- Dashboard → Database → Extensions → Activer "pg_cron"

-- Création du job CRON pour calculer la compliance tous les jours à 04h00
-- SELECT cron.schedule(
--   'calc-billing-compliance-daily',  -- Nom du job
--   '0 4 * * *',                       -- Tous les jours à 4h00 du matin
--   $cron$
--     SELECT calculate_billing_compliance();
--   $cron$
-- );

-- Note : La ligne ci-dessus est commentée car pg_cron n'est pas disponible
-- dans tous les plans Supabase. Pour l'activer :
-- 1. Aller dans Dashboard Supabase → Database → Extensions
-- 2. Activer "pg_cron"
-- 3. Exécuter la commande SELECT cron.schedule() ci-dessus

-- ───────────────────────────────────────────────────────────────────
-- 7. VUES POUR LE DASHBOARD FINANCE
-- ───────────────────────────────────────────────────────────────────

-- Vue : Statistiques financières en temps réel
CREATE OR REPLACE VIEW vw_billing_kpis AS
SELECT 
  COUNT(*) FILTER (WHERE is_reimbursable = TRUE) as patients_eligible,
  COUNT(*) FILTER (WHERE compliance_28d_average >= 2.0 AND compliance_28d_average < 3.0) as patients_at_risk,
  COUNT(*) FILTER (WHERE compliance_28d_average < 2.0) as patients_lost,
  COUNT(*) as total_active_patients,
  
  ROUND(
    (COUNT(*) FILTER (WHERE is_reimbursable = TRUE)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 
    2
  ) as pct_ca_secured,
  
  ROUND(
    (COUNT(*) FILTER (WHERE compliance_28d_average >= 2.0 AND compliance_28d_average < 3.0)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 
    2
  ) as pct_ca_at_risk,
  
  ROUND(
    (COUNT(*) FILTER (WHERE compliance_28d_average < 2.0)::DECIMAL / NULLIF(COUNT(*), 0) * 100), 
    2
  ) as pct_ca_lost
  
FROM patients
WHERE status = 'active' AND device_installed = TRUE;

COMMENT ON VIEW vw_billing_kpis IS 'KPIs financiers en temps réel pour le dashboard admin';

-- Vue : Liste des patients à risque financier (pour appel prioritaire)
CREATE OR REPLACE VIEW vw_patients_at_financial_risk AS
SELECT 
  p.id,
  u.full_name,
  u.email,
  u.phone,
  p.compliance_28d_average,
  p.is_reimbursable,
  d.full_name as doctor_name,
  CASE 
    WHEN p.compliance_28d_average < 2.0 THEN 'lost'
    WHEN p.compliance_28d_average >= 2.0 AND p.compliance_28d_average < 3.0 THEN 'at_risk'
    ELSE 'ok'
  END as risk_level
FROM patients p
JOIN users u ON u.id = p.user_id
LEFT JOIN users d ON d.id = p.assigned_doctor_id
WHERE p.status = 'active' 
AND p.device_installed = TRUE
AND p.compliance_28d_average < 3.0
ORDER BY p.compliance_28d_average ASC;

COMMENT ON VIEW vw_patients_at_financial_risk IS 'Liste prioritaire des patients à risque financier (< 3h/nuit)';

-- ═══════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION PHASE 3
-- ═══════════════════════════════════════════════════════════════════

-- Pour tester manuellement :
-- 1. Calculer la compliance : SELECT * FROM calculate_billing_compliance();
-- 2. Voir les KPIs : SELECT * FROM vw_billing_kpis;
-- 3. Voir les patients à risque : SELECT * FROM vw_patients_at_financial_risk;
-- 4. Générer batch renouvellement : SELECT * FROM generate_renewal_batch(14);
