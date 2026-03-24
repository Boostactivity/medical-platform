-- ============================================
-- EXP'AIR MEDICAL - MIGRATION BASE DE DONNÉES
-- ============================================
-- 
-- Ce fichier crée la structure complète de la base de données
-- pour l'application Exp'Air Medical avec :
-- - Tables pour patients, médecins, observance
-- - Row Level Security (RLS) pour sécurité
-- - Policies pour contrôle d'accès par rôle
-- 
-- IMPORTANT : À exécuter dans le SQL Editor de Supabase
-- ============================================

-- ============================================
-- SECTION 1 : SUPPRESSION DES TABLES EXISTANTES (SI MIGRATION)
-- ============================================

-- Désactiver temporairement les contraintes
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS observance_data CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;

-- ============================================
-- SECTION 2 : CRÉATION DES TABLES
-- ============================================

-- Table 1 : Profils utilisateurs (base commune)
CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users_profile IS 'Profil de base pour tous les utilisateurs du système';
COMMENT ON COLUMN users_profile.role IS 'Rôle de l''utilisateur : patient, doctor, ou admin';

-- Table 2 : Médecins
CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty VARCHAR(100),
  license_number VARCHAR(50) UNIQUE,
  bio TEXT,
  consultation_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doctors IS 'Informations spécifiques aux médecins';
COMMENT ON COLUMN doctors.specialty IS 'Spécialité médicale (ex: Pneumologie, ORL)';
COMMENT ON COLUMN doctors.license_number IS 'Numéro RPPS ou ADELI du médecin';

-- Table 3 : Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  diagnosis_date DATE,
  treatment_start_date DATE,
  device_installed BOOLEAN DEFAULT FALSE,
  device_model VARCHAR(100),
  device_serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'Informations médicales des patients';
COMMENT ON COLUMN patients.assigned_doctor_id IS 'Médecin référent - CLÉ pour que chaque médecin voie UNIQUEMENT ses patients';
COMMENT ON COLUMN patients.device_installed IS 'Indique si l''appareil PPC est installé';

-- Table 4 : Données d'observance
CREATE TABLE observance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  hours_used DECIMAL(4,2) CHECK (hours_used >= 0 AND hours_used <= 24),
  leakage_rate DECIMAL(5,2) CHECK (leakage_rate >= 0),
  apnea_events INTEGER CHECK (apnea_events >= 0),
  pressure_level DECIMAL(4,1) CHECK (pressure_level >= 0),
  mask_fit_score INTEGER CHECK (mask_fit_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(patient_id, measurement_date)
);

COMMENT ON TABLE observance_data IS 'Données d''observance journalières enregistrées par les appareils PPC';
COMMENT ON COLUMN observance_data.hours_used IS 'Nombre d''heures d''utilisation du PPC par nuit';
COMMENT ON COLUMN observance_data.leakage_rate IS 'Taux de fuites du masque (L/min)';
COMMENT ON COLUMN observance_data.apnea_events IS 'Nombre d''événements apnéiques détectés';

-- Table 5 : Rendez-vous (optionnel - pour future évolution)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE appointments IS 'Gestion des rendez-vous entre patients et médecins';
COMMENT ON COLUMN appointments.appointment_type IS 'Type : consultation, suivi, installation, etc.';

-- Table 6 : Messages (optionnel - pour future messagerie interne)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Système de messagerie interne entre patients et médecins';

-- ============================================
-- SECTION 3 : INDEX POUR PERFORMANCES
-- ============================================

-- Index sur les colonnes fréquemment recherchées
CREATE INDEX idx_patients_doctor ON patients(assigned_doctor_id) 
  WHERE assigned_doctor_id IS NOT NULL;

CREATE INDEX idx_patients_user ON patients(user_id);

CREATE INDEX idx_patients_device ON patients(device_installed) 
  WHERE device_installed = TRUE;

CREATE INDEX idx_observance_patient ON observance_data(patient_id);

CREATE INDEX idx_observance_date ON observance_data(measurement_date DESC);

CREATE INDEX idx_observance_patient_date ON observance_data(patient_id, measurement_date DESC);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);

CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);

CREATE INDEX idx_appointments_status ON appointments(status) 
  WHERE status = 'scheduled';

CREATE INDEX idx_messages_sender ON messages(sender_id);

CREATE INDEX idx_messages_receiver ON messages(receiver_id);

CREATE INDEX idx_messages_unread ON messages(receiver_id, read) 
  WHERE read = FALSE;

-- ============================================
-- SECTION 4 : ACTIVER ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE observance_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 5 : POLICIES RLS - USERS_PROFILE
-- ============================================

-- Utilisateurs peuvent voir leur propre profil
CREATE POLICY "users_select_own" ON users_profile
  FOR SELECT 
  USING (auth.uid() = id);

-- Utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "users_update_own" ON users_profile
  FOR UPDATE 
  USING (auth.uid() = id);

-- Admins peuvent tout voir
CREATE POLICY "users_select_admin" ON users_profile
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile up 
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Admins peuvent tout mettre à jour
CREATE POLICY "users_update_admin" ON users_profile
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Médecins peuvent voir leurs patients
CREATE POLICY "users_select_by_doctor" ON users_profile
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.user_id = users_profile.id 
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

-- ============================================
-- SECTION 6 : POLICIES RLS - DOCTORS
-- ============================================

-- Médecins peuvent voir leur propre profil
CREATE POLICY "doctors_select_own" ON doctors
  FOR SELECT 
  USING (auth.uid() = id);

-- Médecins peuvent mettre à jour leur propre profil
CREATE POLICY "doctors_update_own" ON doctors
  FOR UPDATE 
  USING (auth.uid() = id);

-- Admins peuvent voir tous les médecins
CREATE POLICY "doctors_select_admin" ON doctors
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Patients peuvent voir leur médecin assigné
CREATE POLICY "doctors_select_by_patient" ON doctors
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.assigned_doctor_id = doctors.id 
      AND patients.user_id = auth.uid()
    )
  );

-- ============================================
-- SECTION 7 : POLICIES RLS - PATIENTS
-- ============================================

-- Patients peuvent voir leurs propres données
CREATE POLICY "patients_select_own" ON patients
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Patients peuvent mettre à jour leurs propres données
CREATE POLICY "patients_update_own" ON patients
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Médecins peuvent voir leurs patients assignés (CLÉ PRINCIPALE)
CREATE POLICY "patients_select_by_doctor" ON patients
  FOR SELECT 
  USING (assigned_doctor_id = auth.uid());

-- Médecins peuvent mettre à jour leurs patients assignés
CREATE POLICY "patients_update_by_doctor" ON patients
  FOR UPDATE 
  USING (assigned_doctor_id = auth.uid());

-- Admins peuvent tout voir
CREATE POLICY "patients_select_admin" ON patients
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins peuvent tout gérer
CREATE POLICY "patients_all_admin" ON patients
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SECTION 8 : POLICIES RLS - OBSERVANCE_DATA
-- ============================================

-- Patients peuvent voir leur propre observance
CREATE POLICY "observance_select_own" ON observance_data
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = observance_data.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

-- Patients peuvent insérer leur propre observance
CREATE POLICY "observance_insert_own" ON observance_data
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = observance_data.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

-- Médecins peuvent voir l'observance de leurs patients
CREATE POLICY "observance_select_by_doctor" ON observance_data
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = observance_data.patient_id 
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

-- Médecins peuvent insérer des données pour leurs patients
CREATE POLICY "observance_insert_by_doctor" ON observance_data
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = observance_data.patient_id 
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

-- Admins peuvent tout voir
CREATE POLICY "observance_select_admin" ON observance_data
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins peuvent tout gérer
CREATE POLICY "observance_all_admin" ON observance_data
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SECTION 9 : POLICIES RLS - APPOINTMENTS
-- ============================================

-- Patients peuvent voir leurs rendez-vous
CREATE POLICY "appointments_select_patient" ON appointments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = appointments.patient_id 
      AND patients.user_id = auth.uid()
    )
  );

-- Médecins peuvent voir leurs rendez-vous
CREATE POLICY "appointments_select_doctor" ON appointments
  FOR SELECT 
  USING (doctor_id = auth.uid());

-- Médecins peuvent gérer leurs rendez-vous
CREATE POLICY "appointments_all_doctor" ON appointments
  FOR ALL 
  USING (doctor_id = auth.uid());

-- Admins peuvent tout gérer
CREATE POLICY "appointments_all_admin" ON appointments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SECTION 10 : POLICIES RLS - MESSAGES
-- ============================================

-- Utilisateurs peuvent voir leurs messages envoyés
CREATE POLICY "messages_select_sent" ON messages
  FOR SELECT 
  USING (sender_id = auth.uid());

-- Utilisateurs peuvent voir leurs messages reçus
CREATE POLICY "messages_select_received" ON messages
  FOR SELECT 
  USING (receiver_id = auth.uid());

-- Utilisateurs peuvent envoyer des messages
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT 
  WITH CHECK (sender_id = auth.uid());

-- Utilisateurs peuvent mettre à jour leurs messages reçus (marquer comme lu)
CREATE POLICY "messages_update_received" ON messages
  FOR UPDATE 
  USING (receiver_id = auth.uid());

-- Admins peuvent tout voir
CREATE POLICY "messages_select_admin" ON messages
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users_profile 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SECTION 11 : FUNCTIONS & TRIGGERS
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_users_profile_updated_at
  BEFORE UPDATE ON users_profile
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer automatiquement le profil utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_profile (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- Si c'est un médecin, créer l'entrée dans doctors
  IF (NEW.raw_user_meta_data->>'role' = 'doctor') THEN
    INSERT INTO doctors (id, specialty)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'specialty'
    );
  END IF;
  
  -- Si c'est un patient, créer l'entrée dans patients
  IF (NEW.raw_user_meta_data->>'role' = 'patient') THEN
    INSERT INTO patients (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Fonction pour mettre à jour read_at lors du marquage comme lu
CREATE OR REPLACE FUNCTION update_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_read_at
  BEFORE UPDATE ON messages
  FOR EACH ROW 
  EXECUTE FUNCTION update_message_read_at();

-- ============================================
-- SECTION 12 : VUES POUR STATISTIQUES
-- ============================================

-- Vue pour les statistiques admin
CREATE OR REPLACE VIEW admin_statistics AS
SELECT
  (SELECT COUNT(*) FROM users_profile WHERE role = 'patient') as total_patients,
  (SELECT COUNT(*) FROM users_profile WHERE role = 'doctor') as total_doctors,
  (SELECT COUNT(*) FROM users_profile WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM patients WHERE device_installed = true) as patients_with_device,
  (SELECT ROUND(AVG(hours_used)::numeric, 2) 
   FROM observance_data 
   WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days') as avg_hours_last_7_days,
  (SELECT COUNT(*) 
   FROM appointments 
   WHERE status = 'scheduled' 
   AND appointment_date >= NOW()) as upcoming_appointments,
  (SELECT COUNT(*) 
   FROM observance_data 
   WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days') as total_measurements_last_month;

-- Vue pour l'observance récente par patient
CREATE OR REPLACE VIEW patient_recent_observance AS
SELECT 
  p.id as patient_id,
  p.user_id,
  up.full_name as patient_name,
  p.assigned_doctor_id,
  ROUND(AVG(o.hours_used)::numeric, 2) as avg_hours_last_7_days,
  ROUND(AVG(o.leakage_rate)::numeric, 2) as avg_leakage_last_7_days,
  COUNT(*) as measurements_count,
  MAX(o.measurement_date) as last_measurement_date
FROM patients p
JOIN users_profile up ON p.user_id = up.id
LEFT JOIN observance_data o ON p.id = o.patient_id 
  AND o.measurement_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.id, p.user_id, up.full_name, p.assigned_doctor_id;

-- Vue pour les rendez-vous à venir
CREATE OR REPLACE VIEW upcoming_appointments_view AS
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_type,
  a.status,
  p.id as patient_id,
  up_patient.full_name as patient_name,
  up_patient.phone as patient_phone,
  d.id as doctor_id,
  up_doctor.full_name as doctor_name,
  d.specialty as doctor_specialty
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN users_profile up_patient ON p.user_id = up_patient.id
JOIN doctors d ON a.doctor_id = d.id
JOIN users_profile up_doctor ON d.id = up_doctor.id
WHERE a.status = 'scheduled'
  AND a.appointment_date >= NOW()
ORDER BY a.appointment_date;

-- ============================================
-- SECTION 13 : GRANT PERMISSIONS
-- ============================================

-- Donner les permissions sur les vues
GRANT SELECT ON admin_statistics TO authenticated;
GRANT SELECT ON patient_recent_observance TO authenticated;
GRANT SELECT ON upcoming_appointments_view TO authenticated;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Afficher un message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Exp''Air Medical terminée avec succès !';
  RAISE NOTICE '📊 Tables créées : users_profile, doctors, patients, observance_data, appointments, messages';
  RAISE NOTICE '🔒 Row Level Security activé sur toutes les tables';
  RAISE NOTICE '🎯 Policies RLS configurées pour patients, médecins et admin';
  RAISE NOTICE '📈 Vues de statistiques créées';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  PROCHAINES ÉTAPES :';
  RAISE NOTICE '1. Tester la migration avec un compte de chaque type';
  RAISE NOTICE '2. Exécuter /init-demo pour créer les comptes de test';
  RAISE NOTICE '3. Mettre à jour le code backend pour utiliser ces tables';
END $$;
