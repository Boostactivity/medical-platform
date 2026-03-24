-- =============================================
-- PHASE 2 IOT: Tables supplémentaires
-- =============================================

-- Table patient_stats (pour stocker scores Exp'Air)
CREATE TABLE IF NOT EXISTS patient_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exp_air_score INTEGER NOT NULL CHECK (exp_air_score >= 0 AND exp_air_score <= 100),
  grade VARCHAR(3) NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  score_details JSONB NOT NULL, -- Détail des 6 critères
  trend VARCHAR(20) NOT NULL CHECK (trend IN ('improving', 'stable', 'declining')),
  previous_score INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_patient_stats_patient_date ON patient_stats(patient_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_stats_score ON patient_stats(exp_air_score);
CREATE INDEX IF NOT EXISTS idx_patient_stats_trend ON patient_stats(trend);

-- Table alerts_queue (alertes intelligentes)
CREATE TABLE IF NOT EXISTS alerts_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  context JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  auto_assigned BOOLEAN DEFAULT false,
  suggested_actions JSONB NOT NULL,
  estimated_time INTEGER, -- Minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_alerts_queue_patient ON alerts_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_status ON alerts_queue(status);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_severity ON alerts_queue(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_assigned ON alerts_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_queue_created ON alerts_queue(created_at DESC);

-- Table consumables (consommables patients)
CREATE TABLE IF NOT EXISTS consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('mask', 'filter', 'tube', 'humidifier', 'other')),
  name VARCHAR(100) NOT NULL,
  installation_date DATE NOT NULL,
  replacement_frequency_days INTEGER NOT NULL, -- Ex: 90 jours pour masque
  next_replacement_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'replaced', 'ordered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_consumables_patient ON consumables(patient_id);
CREATE INDEX IF NOT EXISTS idx_consumables_next_replacement ON consumables(next_replacement_date);
CREATE INDEX IF NOT EXISTS idx_consumables_status ON consumables(status);

-- Amélioration sleep_data pour IoT
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS device_serial VARCHAR(50);
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(50);
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS apneas_total INTEGER DEFAULT 0;
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS hypopneas INTEGER DEFAULT 0;
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS leak_median DECIMAL(5,2);
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS pressure_median DECIMAL(5,2);
ALTER TABLE sleep_data ADD COLUMN IF NOT EXISTS total_sleep_time DECIMAL(5,2); -- En heures

-- RLS Policies pour patient_stats
ALTER TABLE patient_stats ENABLE ROW LEVEL SECURITY;

-- Patients peuvent voir leurs propres stats
CREATE POLICY "Patients can view own stats" ON patient_stats
  FOR SELECT USING (
    patient_id = auth.uid()
  );

-- Médecins peuvent voir stats de leurs patients
CREATE POLICY "Doctors can view their patients stats" ON patient_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.user_id = patient_stats.patient_id
      AND p.assigned_doctor_id = auth.uid()
    )
  );

-- Admins/Prestataires voient tout
CREATE POLICY "Admins can view all stats" ON patient_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire')
    )
  );

-- RLS Policies pour alerts_queue
ALTER TABLE alerts_queue ENABLE ROW LEVEL SECURITY;

-- Patients peuvent voir leurs propres alertes
CREATE POLICY "Patients can view own alerts" ON alerts_queue
  FOR SELECT USING (
    patient_id = auth.uid()
  );

-- Prestataires/Admins voient toutes les alertes
CREATE POLICY "Staff can view all alerts" ON alerts_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire')
    )
  );

-- Prestataires/Admins peuvent modifier alertes
CREATE POLICY "Staff can update alerts" ON alerts_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire')
    )
  );

-- Prestataires/Admins peuvent créer alertes
CREATE POLICY "Staff can insert alerts" ON alerts_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire')
    )
  );

-- RLS Policies pour consumables
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;

-- Patients voient leurs consommables
CREATE POLICY "Patients can view own consumables" ON consumables
  FOR SELECT USING (
    patient_id = auth.uid()
  );

-- Staff voit tout
CREATE POLICY "Staff can view all consumables" ON consumables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire', 'doctor')
    )
  );

-- Staff peut créer/modifier consommables
CREATE POLICY "Staff can manage consumables" ON consumables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'prestataire')
    )
  );

-- Fonction trigger pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_patient_stats_updated_at BEFORE UPDATE ON patient_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON consumables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE patient_stats IS 'Scores Exp''Air quotidiens calculés automatiquement';
COMMENT ON TABLE alerts_queue IS 'File d''alertes intelligentes avec workflow prestataire';
COMMENT ON TABLE consumables IS 'Gestion consommables patients (masques, filtres, etc.)';
