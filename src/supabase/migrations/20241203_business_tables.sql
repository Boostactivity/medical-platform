-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION PHASE 3 : BUSINESS MODEL - Tables financières
-- ═══════════════════════════════════════════════════════════════════
-- Date: 2024-12-03
-- Description: Tables pour tracking compliance CPAM et gestion stocks/consommables
-- ═══════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 1 : HISTORIQUE COMPLIANCE CPAM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS cpam_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  average_usage_hours DECIMAL(4,2) NOT NULL,
  is_compliant BOOLEAN NOT NULL,
  compliance_percentage DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('safe', 'warning', 'critical', 'failed')),
  revenue_at_risk DECIMAL(8,2) DEFAULT 0,
  days_until_deadline INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index pour performance
  UNIQUE(patient_id, check_date)
);

CREATE INDEX idx_cpam_compliance_patient ON cpam_compliance(patient_id);
CREATE INDEX idx_cpam_compliance_date ON cpam_compliance(check_date DESC);
CREATE INDEX idx_cpam_compliance_status ON cpam_compliance(status) WHERE status != 'safe';

COMMENT ON TABLE cpam_compliance IS 'Historique quotidien de conformité CPAM (3h x 28 jours) pour sécuriser le CA';
COMMENT ON COLUMN cpam_compliance.average_usage_hours IS 'Moyenne glissante 28 jours (seuil: 3h)';
COMMENT ON COLUMN cpam_compliance.is_compliant IS 'TRUE si ≥ 3h/nuit en moyenne';
COMMENT ON COLUMN cpam_compliance.revenue_at_risk IS 'Montant en € à risque si non-conforme';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 2 : TRACKING ÉQUIPEMENTS / CONSOMMABLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS equipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN (
    'mask_nasal',
    'mask_full_face',
    'tubing',
    'filter_disposable',
    'filter_washable',
    'humidifier',
    'headgear',
    'chinstrap'
  )),
  installation_date DATE NOT NULL,
  expected_renewal_date DATE NOT NULL,
  actual_renewal_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'renewed', 'overdue')) DEFAULT 'active',
  manufacturer TEXT,
  serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_patient ON equipment_tracking(patient_id);
CREATE INDEX idx_equipment_renewal ON equipment_tracking(expected_renewal_date) WHERE status = 'active';
CREATE INDEX idx_equipment_status ON equipment_tracking(status);

COMMENT ON TABLE equipment_tracking IS 'Suivi des équipements installés et dates de renouvellement';
COMMENT ON COLUMN equipment_tracking.equipment_type IS 'Type équipement (masque, tubulure, filtre, etc.)';
COMMENT ON COLUMN equipment_tracking.expected_renewal_date IS 'Date théorique renouvellement (installation + durée vie)';
COMMENT ON COLUMN equipment_tracking.actual_renewal_date IS 'Date réelle renouvellement (NULL si pas encore fait)';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE 3 : TRACKING REVENU (Optionnel - Analytics)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- Premier jour du mois
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('cpam_monthly', 'equipment_renewal', 'other')),
  amount_euro DECIMAL(8,2) NOT NULL,
  is_confirmed BOOLEAN DEFAULT FALSE,
  cpam_compliant BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, month, revenue_type)
);

CREATE INDEX idx_revenue_month ON revenue_tracking(month DESC);
CREATE INDEX idx_revenue_patient ON revenue_tracking(patient_id);

COMMENT ON TABLE revenue_tracking IS 'Tracking mensuel du CA par patient (réel vs prévu)';
COMMENT ON COLUMN revenue_tracking.cpam_compliant IS 'Si revenue_type=cpam_monthly, indique si patient était conforme';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FONCTIONS UTILITAIRES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_equipment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_updated
  BEFORE UPDATE ON equipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_timestamp();

-- Fonction: Calculer statut équipement (active/overdue)
CREATE OR REPLACE FUNCTION check_equipment_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.expected_renewal_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_equipment_overdue
  BEFORE INSERT OR UPDATE ON equipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION check_equipment_overdue();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VUES UTILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Vue: Dernière compliance par patient
CREATE OR REPLACE VIEW latest_cpam_compliance AS
SELECT DISTINCT ON (patient_id)
  c.*,
  u.full_name,
  u.panel_code
FROM cpam_compliance c
JOIN users u ON c.patient_id = u.id
ORDER BY patient_id, check_date DESC;

-- Vue: Équipements actifs avec statut renouvellement
CREATE OR REPLACE VIEW active_equipment_status AS
SELECT 
  e.*,
  u.full_name,
  u.panel_code,
  (e.expected_renewal_date - CURRENT_DATE) AS days_until_renewal,
  CASE 
    WHEN e.expected_renewal_date < CURRENT_DATE THEN 'overdue'
    WHEN e.expected_renewal_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
    WHEN e.expected_renewal_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
    ELSE 'ok'
  END AS renewal_status
FROM equipment_tracking e
JOIN users u ON e.patient_id = u.id
WHERE e.status = 'active'
ORDER BY e.expected_renewal_date ASC;

-- Vue: Dashboard business KPIs
CREATE OR REPLACE VIEW business_kpis AS
SELECT 
  COUNT(DISTINCT u.id) AS total_patients,
  COUNT(DISTINCT CASE WHEN c.is_compliant THEN u.id END) AS compliant_patients,
  ROUND(
    CAST(COUNT(DISTINCT CASE WHEN c.is_compliant THEN u.id END) AS DECIMAL) / 
    NULLIF(COUNT(DISTINCT u.id), 0) * 100, 
    2
  ) AS compliance_rate_percent,
  SUM(CASE WHEN NOT c.is_compliant THEN c.revenue_at_risk ELSE 0 END) AS total_revenue_at_risk,
  COUNT(CASE WHEN e.expected_renewal_date < CURRENT_DATE THEN 1 END) AS overdue_renewals,
  COUNT(CASE WHEN e.expected_renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) AS upcoming_renewals_30days
FROM users u
LEFT JOIN latest_cpam_compliance c ON u.id = c.patient_id
LEFT JOIN equipment_tracking e ON u.id = e.patient_id AND e.status = 'active'
WHERE u.role = 'patient' AND u.is_active = TRUE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RLS (Row Level Security) - IMPORTANT SÉCURITÉ
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE cpam_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_tracking ENABLE ROW LEVEL SECURITY;

-- Policies CPAM Compliance
CREATE POLICY "Patients can view own compliance"
  ON cpam_compliance FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Admins/Medecins can view all compliance"
  ON cpam_compliance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'medecin')
    )
  );

CREATE POLICY "Service role can manage compliance"
  ON cpam_compliance FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policies Equipment Tracking
CREATE POLICY "Patients can view own equipment"
  ON equipment_tracking FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Admins can manage all equipment"
  ON equipment_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policies Revenue Tracking
CREATE POLICY "Only admins can view revenue"
  ON revenue_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage revenue"
  ON revenue_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DONNÉES DE TEST (Optionnel)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Exemple compliance pour patient de test
DO $$
DECLARE
  test_patient_id UUID;
BEGIN
  -- Récupérer un patient existant
  SELECT id INTO test_patient_id FROM users WHERE role = 'patient' LIMIT 1;
  
  IF test_patient_id IS NOT NULL THEN
    -- Insérer historique compliance (derniers 7 jours)
    INSERT INTO cpam_compliance (patient_id, check_date, period_start, period_end, average_usage_hours, is_compliant, compliance_percentage, status, revenue_at_risk, days_until_deadline)
    VALUES 
      (test_patient_id, CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE - INTERVAL '34 days', CURRENT_DATE - INTERVAL '6 days', 5.2, TRUE, 173.33, 'safe', 0, 10),
      (test_patient_id, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '33 days', CURRENT_DATE - INTERVAL '5 days', 5.1, TRUE, 170.00, 'safe', 0, 9),
      (test_patient_id, CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE - INTERVAL '32 days', CURRENT_DATE - INTERVAL '4 days', 4.8, TRUE, 160.00, 'safe', 0, 8),
      (test_patient_id, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE - INTERVAL '3 days', 4.5, TRUE, 150.00, 'safe', 0, 7),
      (test_patient_id, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '2 days', 3.8, TRUE, 126.67, 'safe', 0, 6),
      (test_patient_id, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', 3.2, TRUE, 106.67, 'safe', 0, 5),
      (test_patient_id, CURRENT_DATE, CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE, 2.8, FALSE, 93.33, 'warning', 160.00, 4)
    ON CONFLICT (patient_id, check_date) DO NOTHING;
    
    -- Insérer équipements pour le même patient
    INSERT INTO equipment_tracking (patient_id, equipment_type, installation_date, expected_renewal_date, status, manufacturer, notes)
    VALUES 
      (test_patient_id, 'mask_nasal', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE + INTERVAL '30 days', 'active', 'ResMed', 'AirFit N20'),
      (test_patient_id, 'tubing', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE + INTERVAL '30 days', 'active', 'ResMed', 'SlimLine'),
      (test_patient_id, 'filter_washable', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '30 days', 'active', 'ResMed', 'Filtre standard'),
      (test_patient_id, 'humidifier', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE + INTERVAL '30 days', 'active', 'ResMed', 'HumidAir'),
      (test_patient_id, 'headgear', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE + INTERVAL '210 days', 'active', 'ResMed', 'Harnais standard')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Test data inserted for patient %', test_patient_id;
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- GRANTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRANT SELECT ON cpam_compliance TO authenticated;
GRANT SELECT ON equipment_tracking TO authenticated;
GRANT SELECT ON revenue_tracking TO authenticated;

GRANT ALL ON cpam_compliance TO service_role;
GRANT ALL ON equipment_tracking TO service_role;
GRANT ALL ON revenue_tracking TO service_role;

-- Vues accessibles
GRANT SELECT ON latest_cpam_compliance TO authenticated;
GRANT SELECT ON active_equipment_status TO authenticated;
GRANT SELECT ON business_kpis TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIN MIGRATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Phase 3 Business Model terminée';
  RAISE NOTICE '   - cpam_compliance table created';
  RAISE NOTICE '   - equipment_tracking table created';
  RAISE NOTICE '   - revenue_tracking table created';
  RAISE NOTICE '   - 3 views created (latest_cpam_compliance, active_equipment_status, business_kpis)';
  RAISE NOTICE '   - RLS policies configured';
  RAISE NOTICE '   - Test data inserted';
END $$;
