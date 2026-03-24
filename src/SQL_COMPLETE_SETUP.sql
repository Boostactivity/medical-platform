-- ============================================
-- EXP'AIR MEDICAL - SETUP COMPLET SUPABASE
-- ============================================
-- Date: 3 décembre 2024
-- Version: FINALE
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- ============================================
-- ÉTAPE 1: CRÉATION DES TABLES
-- ============================================

-- Table users (centrale)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Table doctors
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  specialty TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_license ON doctors(license_number);

-- Table patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  assigned_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  diagnosis_date DATE,
  device_installed BOOLEAN DEFAULT FALSE,
  treatment_start_date DATE,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_assigned_doctor ON patients(assigned_doctor_id);

-- Table observance_data
CREATE TABLE observance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_used DECIMAL(4,2),
  leakage INTEGER,
  events INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, date)
);

CREATE INDEX idx_observance_patient_id ON observance_data(patient_id);
CREATE INDEX idx_observance_date ON observance_data(date);
CREATE INDEX idx_observance_patient_date ON observance_data(patient_id, date DESC);

-- ============================================
-- ÉTAPE 2: ACTIVATION RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE observance_data ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3: POLICIES - USERS
-- ============================================

-- SELECT policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Doctors can read their patients" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.user_id = users.id
        AND p.assigned_doctor_id = auth.uid()
    )
    OR users.id = auth.uid()
  );

-- INSERT policy
CREATE POLICY "Admins can insert all users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete all users" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ÉTAPE 4: POLICIES - PATIENTS
-- ============================================

-- SELECT policies
CREATE POLICY "Patients can read own data" ON patients
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Doctors can read their patients data" ON patients
  FOR SELECT
  USING (assigned_doctor_id = auth.uid());

CREATE POLICY "Admins can read all patients" ON patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT policy
CREATE POLICY "Admins can insert all patients" ON patients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update all patients" ON patients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete all patients" ON patients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ÉTAPE 5: POLICIES - OBSERVANCE_DATA
-- ============================================

-- SELECT policies
CREATE POLICY "Patients can read own observance" ON observance_data
  FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can read their patients observance" ON observance_data
  FOR SELECT
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      WHERE p.assigned_doctor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all observance" ON observance_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT policy
CREATE POLICY "Admins can insert all observance" ON observance_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update all observance" ON observance_data
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete all observance" ON observance_data
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ÉTAPE 6: POLICIES - DOCTORS
-- ============================================

-- SELECT policies
CREATE POLICY "Doctors can read own profile" ON doctors
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Patients can read assigned doctor" ON doctors
  FOR SELECT
  USING (
    user_id IN (
      SELECT assigned_doctor_id FROM patients
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all doctors" ON doctors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT policy
CREATE POLICY "Admins can insert all doctors" ON doctors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update all doctors" ON doctors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete all doctors" ON doctors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ✅ SETUP TERMINÉ
-- ============================================
-- 
-- Prochaines étapes:
-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Vérifier que toutes les tables sont créées
-- 3. Vérifier que RLS est activé sur les 4 tables
-- 4. Tester avec les comptes démo
--
-- ============================================
