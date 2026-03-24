-- =====================================================
-- MIGRATION 002: Device Management & Gamification
-- Description: Gestion matériel, consommables, badges
-- Date: 2025-12-03
-- =====================================================

-- ============================================================
-- 1. TABLE DEVICES (Catalogue matériel PPC)
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer TEXT NOT NULL CHECK (manufacturer IN ('ResMed', 'Philips', 'Löwenstein', 'Fisher & Paykel', 'BMC Medical', 'DeVilbiss', 'Apex Medical')),
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  connectivity_type TEXT CHECK (connectivity_type IN ('wifi', 'bluetooth', 'sd_card', '4g', 'none')),
  firmware_version TEXT,
  purchase_date DATE,
  status TEXT DEFAULT 'stock' CHECK (status IN ('stock', 'active', 'maintenance', 'retired', 'defective')),
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_devices_serial ON devices(serial_number);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_manufacturer ON devices(manufacturer);

-- ============================================================
-- 2. TABLE DEVICE_ASSIGNMENTS (Attribution patient ↔ appareil)
-- ============================================================
CREATE TABLE IF NOT EXISTS device_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  installation_notes TEXT,
  technician_id UUID REFERENCES users(id),
  installation_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  pressure_settings JSONB, -- Ex: {"min": 4, "max": 20, "mode": "auto"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_device_assignments_patient ON device_assignments(patient_id) WHERE is_active = true;
CREATE INDEX idx_device_assignments_device ON device_assignments(device_id);

-- ============================================================
-- 3. TABLE CONSUMABLES (Stock masques, filtres, tubulures)
-- ============================================================
CREATE TABLE IF NOT EXISTS consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('mask_nasal', 'mask_facial', 'mask_narinaire', 'filter', 'tube', 'humidifier', 'headgear')),
  name TEXT NOT NULL,
  size TEXT, -- 'S', 'M', 'L' pour masques
  manufacturer TEXT,
  reference TEXT, -- Référence fabricant
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_threshold INTEGER DEFAULT 10,
  unit_price_ht DECIMAL(10,2),
  replacement_frequency_days INTEGER, -- Ex: 90 pour un masque
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour gestion stock
CREATE INDEX idx_consumables_type ON consumables(type);
CREATE INDEX idx_consumables_low_stock ON consumables(stock_quantity) WHERE stock_quantity <= reorder_threshold;

-- ============================================================
-- 4. TABLE CONSUMABLE_ORDERS (Commandes automatiques)
-- ============================================================
CREATE TABLE IF NOT EXISTS consumable_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consumable_id UUID NOT NULL REFERENCES consumables(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  order_date TIMESTAMPTZ DEFAULT NOW(),
  scheduled_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  shipping_address TEXT,
  notes TEXT,
  auto_ordered BOOLEAN DEFAULT false, -- Commande automatique ou manuelle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour suivi
CREATE INDEX idx_consumable_orders_patient ON consumable_orders(patient_id);
CREATE INDEX idx_consumable_orders_status ON consumable_orders(status);

-- ============================================================
-- 5. TABLE MAINTENANCE_LOGS (Historique SAV et entretien)
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('preventive', 'corrective', 'cleaning', 'calibration', 'inspection')),
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  issue_description TEXT,
  actions_taken TEXT,
  parts_replaced JSONB, -- Ex: [{"part": "filter", "ref": "ABC123"}]
  next_maintenance_due DATE,
  cost DECIMAL(10,2),
  duration_minutes INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour historique
CREATE INDEX idx_maintenance_logs_device ON maintenance_logs(device_id);
CREATE INDEX idx_maintenance_logs_date ON maintenance_logs(performed_at);

-- ============================================================
-- 6. TABLE ALERTS_QUEUE (Système d'alertes temps réel)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'LOW_COMPLIANCE', 'HIGH_LEAK', 'HIGH_AHI', 'DEVICE_ERROR', 
    'MAINTENANCE_DUE', 'CONSUMABLE_REPLACEMENT', 'NO_SYNC', 
    'BATTERY_LOW', 'PRESSURE_ABNORMAL', 'MASK_FIT_ISSUE'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  trigger_data JSONB, -- Données contextuelles ayant déclenché l'alerte
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'auto_resolved', 'dismissed')),
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);

-- Index pour performance dashboard
CREATE INDEX idx_alerts_patient ON alerts_queue(patient_id) WHERE status IN ('open', 'acknowledged');
CREATE INDEX idx_alerts_severity ON alerts_queue(severity) WHERE status = 'open';
CREATE INDEX idx_alerts_created ON alerts_queue(created_at DESC);

-- ============================================================
-- 7. TABLE PATIENT_ACHIEVEMENTS (Gamification - Badges)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'STREAK_7', 'STREAK_30', 'STREAK_90', 'STREAK_365',
    'PERFECT_NIGHT', 'PERFECT_WEEK', 'PERFECT_MONTH',
    'ZERO_LEAK_NIGHT', 'ZERO_LEAK_WEEK',
    'FIRST_NIGHT', 'ONBOARDING_COMPLETE',
    'LEVEL_5', 'LEVEL_10', 'LEVEL_25', 'LEVEL_50',
    'EARLY_ADOPTER', 'HEALTH_CHAMPION', 'SLEEP_MASTER'
  )),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Ex: {"streak_days": 30, "avg_hours": 7.2}
  UNIQUE(patient_id, achievement_type)
);

-- Index pour affichage rapide
CREATE INDEX idx_patient_achievements_patient ON patient_achievements(patient_id);

-- ============================================================
-- 8. TABLE PATIENT_STATS (Gamification - Statistiques globales)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_stats (
  patient_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0),
  total_nights_tracked INTEGER DEFAULT 0 CHECK (total_nights_tracked >= 0),
  perfect_nights_count INTEGER DEFAULT 0 CHECK (perfect_nights_count >= 0), -- IAH < 5, fuites < 10, usage > 6h
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 50),
  xp_points INTEGER DEFAULT 0 CHECK (xp_points >= 0),
  total_usage_hours DECIMAL(10,2) DEFAULT 0,
  avg_ahi DECIMAL(5,2),
  avg_leak DECIMAL(5,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Devices : Admins only pour modification, lecture selon assignation
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage devices" ON devices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Patients see assigned devices" ON devices
  FOR SELECT USING (
    id IN (SELECT device_id FROM device_assignments WHERE patient_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Doctors see panel devices" ON devices
  FOR SELECT USING (
    id IN (
      SELECT da.device_id FROM device_assignments da
      JOIN users u ON da.patient_id = u.id
      WHERE u.panel_code = (SELECT panel_code FROM users WHERE id = auth.uid())
      AND da.is_active = true
    )
  );

-- Device Assignments
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own assignments" ON device_assignments
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors see panel assignments" ON device_assignments
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM users WHERE panel_code = (
        SELECT panel_code FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins manage assignments" ON device_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Consumables : Admins manage, tous lisent
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads consumables" ON consumables
  FOR SELECT USING (true);

CREATE POLICY "Admins manage consumables" ON consumables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Consumable Orders
ALTER TABLE consumable_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own orders" ON consumable_orders
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients create orders" ON consumable_orders
  FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Admins manage orders" ON consumable_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Maintenance Logs : Admins + Doctors read
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage maintenance" ON maintenance_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Doctors read maintenance" ON maintenance_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'doctor')
  );

-- Alerts Queue
ALTER TABLE alerts_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own alerts" ON alerts_queue
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients acknowledge own alerts" ON alerts_queue
  FOR UPDATE USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors see panel alerts" ON alerts_queue
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM users WHERE panel_code = (
        SELECT panel_code FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Doctors manage panel alerts" ON alerts_queue
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM users WHERE panel_code = (
        SELECT panel_code FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins manage all alerts" ON alerts_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System creates alerts" ON alerts_queue
  FOR INSERT WITH CHECK (true);

-- Patient Achievements
ALTER TABLE patient_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own achievements" ON patient_achievements
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "System creates achievements" ON patient_achievements
  FOR INSERT WITH CHECK (true);

-- Patient Stats
ALTER TABLE patient_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own stats" ON patient_stats
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors see panel stats" ON patient_stats
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM users WHERE panel_code = (
        SELECT panel_code FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System updates stats" ON patient_stats
  FOR ALL WITH CHECK (true);

-- ============================================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================================

-- Trigger : Mise à jour automatique updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON consumables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger : Initialiser patient_stats à la création d'un user patient
CREATE OR REPLACE FUNCTION init_patient_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    INSERT INTO patient_stats (patient_id)
    VALUES (NEW.id)
    ON CONFLICT (patient_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_patient_stats
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_patient_stats();

-- Trigger : Décrémenter stock à la commande
CREATE OR REPLACE FUNCTION decrement_consumable_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    UPDATE consumables
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.consumable_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_stock
  AFTER UPDATE ON consumable_orders
  FOR EACH ROW
  WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
  EXECUTE FUNCTION decrement_consumable_stock();

-- ============================================================
-- 11. DONNÉES DE DÉMONSTRATION
-- ============================================================

-- Appareils de démonstration
INSERT INTO devices (manufacturer, model, serial_number, connectivity_type, firmware_version, status) VALUES
  ('ResMed', 'AirSense 11 AutoSet', 'RESMED-AS11-20240001', 'wifi', 'v5.2.3', 'stock'),
  ('ResMed', 'AirSense 11 AutoSet', 'RESMED-AS11-20240002', 'wifi', 'v5.2.3', 'active'),
  ('Philips', 'DreamStation 2 Auto', 'PHILIPS-DS2-20240001', 'bluetooth', 'v2.1.0', 'stock'),
  ('Löwenstein', 'Prisma SMART Max', 'LOWEN-PSM-20240001', 'wifi', 'v3.0.5', 'stock'),
  ('Fisher & Paykel', 'SleepStyle Auto', 'FP-SSA-20240001', 'sd_card', 'v1.8.2', 'maintenance')
ON CONFLICT (serial_number) DO NOTHING;

-- Consommables de démonstration
INSERT INTO consumables (type, name, size, manufacturer, reference, stock_quantity, reorder_threshold, unit_price_ht, replacement_frequency_days) VALUES
  ('mask_nasal', 'Masque Nasal AirFit N20', 'M', 'ResMed', 'AF-N20-M', 25, 10, 89.90, 180),
  ('mask_nasal', 'Masque Nasal AirFit N20', 'L', 'ResMed', 'AF-N20-L', 15, 10, 89.90, 180),
  ('mask_facial', 'Masque Facial AirFit F20', 'M', 'ResMed', 'AF-F20-M', 20, 8, 119.90, 180),
  ('mask_narinaire', 'Masque Narinaire AirFit P10', 'S', 'ResMed', 'AF-P10-S', 30, 12, 79.90, 180),
  ('filter', 'Filtre à air standard', NULL, 'ResMed', 'FILTER-STD', 150, 50, 3.50, 30),
  ('filter', 'Filtre à air HEPA', NULL, 'ResMed', 'FILTER-HEPA', 80, 30, 8.90, 90),
  ('tube', 'Tubulure standard 1.8m', NULL, 'ResMed', 'TUBE-STD-18', 60, 20, 24.90, 365),
  ('tube', 'Tubulure chauffante SlimLine', NULL, 'ResMed', 'TUBE-SLIM-HEAT', 40, 15, 49.90, 365),
  ('humidifier', 'Réservoir humidificateur', NULL, 'ResMed', 'HUM-TANK', 35, 15, 29.90, 180)
ON CONFLICT DO NOTHING;

-- Attribution appareil au patient de démo
DO $$
DECLARE
  demo_patient_id UUID;
  demo_device_id UUID;
BEGIN
  -- Récupère l'ID du patient démo
  SELECT id INTO demo_patient_id FROM users WHERE email = 'testpatient@demo.fr' LIMIT 1;
  
  -- Récupère un appareil actif
  SELECT id INTO demo_device_id FROM devices WHERE serial_number = 'RESMED-AS11-20240002' LIMIT 1;
  
  -- Crée l'attribution si les deux existent
  IF demo_patient_id IS NOT NULL AND demo_device_id IS NOT NULL THEN
    INSERT INTO device_assignments (device_id, patient_id, installation_notes, pressure_settings, is_active)
    VALUES (
      demo_device_id,
      demo_patient_id,
      'Installation initiale - Formation réalisée - Masque nasal AirFit N20 taille M',
      '{"min_pressure": 4, "max_pressure": 20, "mode": "auto", "ramp_time": 10}'::jsonb,
      true
    )
    ON CONFLICT DO NOTHING;
    
    -- Initialise les stats du patient
    INSERT INTO patient_stats (patient_id, total_nights_tracked, current_streak_days, longest_streak_days, perfect_nights_count, level, xp_points)
    VALUES (demo_patient_id, 45, 14, 21, 12, 8, 1240)
    ON CONFLICT (patient_id) DO UPDATE SET
      total_nights_tracked = 45,
      current_streak_days = 14,
      longest_streak_days = 21,
      perfect_nights_count = 12,
      level = 8,
      xp_points = 1240;
    
    -- Ajoute quelques achievements
    INSERT INTO patient_achievements (patient_id, achievement_type, metadata) VALUES
      (demo_patient_id, 'STREAK_7', '{"unlocked_date": "2025-11-15", "streak_days": 7}'::jsonb),
      (demo_patient_id, 'PERFECT_NIGHT', '{"first_perfect_date": "2025-11-01"}'::jsonb),
      (demo_patient_id, 'LEVEL_5', '{"reached_at": "2025-11-20"}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- FIN MIGRATION 002
-- ============================================================
