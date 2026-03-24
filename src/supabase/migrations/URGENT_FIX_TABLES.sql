-- ═══════════════════════════════════════════════════════════════════
-- 🔥 FIX URGENT : CRÉATION DES TABLES MANQUANTES
-- ═══════════════════════════════════════════════════════════════════
-- Ce fichier corrige les erreurs :
-- - "Could not find table equipment_tracking"
-- - "Could not find table profiles"
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. CRÉER LA TABLE profiles (alias de users pour compatibilité)
-- ───────────────────────────────────────────────────────────────────

-- Option A : Créer une vue "profiles" qui pointe vers "users"
-- C'est plus sûr car ça ne modifie pas la structure existante

DROP VIEW IF EXISTS profiles CASCADE;

CREATE VIEW profiles AS 
SELECT 
  id,
  email,
  full_name,
  first_name,
  last_name,
  phone,
  role,
  address,
  city,
  zip_code,
  rpps_number,
  panel_code,
  created_at,
  updated_at
FROM users;

COMMENT ON VIEW profiles IS 'Vue alias de la table users pour compatibilité backend';

-- ───────────────────────────────────────────────────────────────────
-- 2. TABLE equipment_tracking (Gestion des équipements patients)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type d'équipement
  equipment_type VARCHAR(50) NOT NULL CHECK (equipment_type IN ('ppc', 'mask', 'tubing', 'filter', 'humidifier')),
  
  -- Référence du modèle
  model_ref VARCHAR(100),
  
  -- Taille (pour masques)
  size VARCHAR(10),
  
  -- Dates
  installation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_renewal_date DATE NOT NULL,
  actual_renewal_date DATE,
  
  -- Statut
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'replaced', 'returned', 'maintenance')),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_equipment_patient ON equipment_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_equipment_renewal ON equipment_tracking(expected_renewal_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment_tracking(status);

COMMENT ON TABLE equipment_tracking IS 'Suivi des équipements installés chez les patients';

-- ───────────────────────────────────────────────────────────────────
-- 3. AJOUTER LES COLONNES DE COMPLIANCE DANS patients (si non présentes)
-- ───────────────────────────────────────────────────────────────────

-- Note : patients table existe déjà, on ajoute juste les colonnes manquantes

DO $$ 
BEGIN
  -- Compliance 28 jours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'compliance_28d_average'
  ) THEN
    ALTER TABLE patients ADD COLUMN compliance_28d_average DECIMAL(4,2) DEFAULT 0.0;
  END IF;

  -- Éligibilité remboursement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'is_reimbursable'
  ) THEN
    ALTER TABLE patients ADD COLUMN is_reimbursable BOOLEAN DEFAULT FALSE;
  END IF;

  -- Date prochaine facturation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'next_billing_date'
  ) THEN
    ALTER TABLE patients ADD COLUMN next_billing_date DATE;
  END IF;

  -- Date dernière facturation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'last_billing_date'
  ) THEN
    ALTER TABLE patients ADD COLUMN last_billing_date DATE;
  END IF;

  -- Statut patient
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'status'
  ) THEN
    ALTER TABLE patients ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 4. TABLE equipment_inventory (Phase 3 - Stocks de consommables)
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
CREATE INDEX IF NOT EXISTS idx_equipment_inv_patient ON equipment_inventory(patient_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inv_renewal ON equipment_inventory(renewal_due_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_equipment_inv_type ON equipment_inventory(item_type);

COMMENT ON TABLE equipment_inventory IS 'Inventaire des consommables installés chez les patients (masques, tubulures, filtres)';

-- Trigger pour calculer automatiquement renewal_due_at
CREATE OR REPLACE FUNCTION calculate_renewal_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.renewal_due_at = NEW.installed_at + (NEW.lifespan_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_renewal_date ON equipment_inventory;
CREATE TRIGGER trg_calculate_renewal_date
BEFORE INSERT OR UPDATE OF installed_at, lifespan_days
ON equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION calculate_renewal_date();

-- ───────────────────────────────────────────────────────────────────
-- 5. TABLE billing_history (Historique des facturations)
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

-- ───────────────────────────────────────────────────────────────────
-- 6. FONCTION : Calculateur de compliance CPAM (Règle des 28 jours)
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
BEGIN
  -- Pour chaque patient actif avec appareil installé
  FOR patient_record IN 
    SELECT 
      p.id,
      p.is_reimbursable as previous_status
    FROM patients p
    WHERE COALESCE(p.status, 'active') = 'active' 
    AND p.device_installed = TRUE
  LOOP
    
    total_count := total_count + 1;
    
    -- Calcul moyenne sur les 28 derniers jours
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
      is_reimbursable = (avg_usage >= 3.0),
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

  END LOOP;

  -- Retourner les statistiques
  RETURN QUERY SELECT total_count, eligible_count, risk_count, lost_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_billing_compliance IS 'Calcule la compliance 28j pour tous les patients actifs';

-- ───────────────────────────────────────────────────────────────────
-- 7. DONNÉES DE TEST (pour vérifier que tout fonctionne)
-- ───────────────────────────────────────────────────────────────────

-- Insérer un équipement de test si la table est vide
DO $$
DECLARE
  test_patient_id UUID;
BEGIN
  -- Trouver le premier patient
  SELECT id INTO test_patient_id FROM patients LIMIT 1;
  
  IF test_patient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipment_tracking LIMIT 1) THEN
    INSERT INTO equipment_tracking (
      patient_id,
      equipment_type,
      model_ref,
      installation_date,
      expected_renewal_date,
      status
    ) VALUES (
      test_patient_id,
      'ppc',
      'ResMed AirSense 10',
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE + INTERVAL '335 days',
      'active'
    );
    
    INSERT INTO equipment_tracking (
      patient_id,
      equipment_type,
      model_ref,
      size,
      installation_date,
      expected_renewal_date,
      status
    ) VALUES (
      test_patient_id,
      'mask',
      'ResMed AirFit N20',
      'M',
      CURRENT_DATE - INTERVAL '60 days',
      CURRENT_DATE + INTERVAL '120 days',
      'active'
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- FIN DU FIX
-- ═══════════════════════════════════════════════════════════════════

-- Pour tester :
-- SELECT * FROM profiles LIMIT 5;
-- SELECT * FROM equipment_tracking;
-- SELECT * FROM calculate_billing_compliance();
