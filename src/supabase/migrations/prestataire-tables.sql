-- ============================================
-- TABLES POUR SYSTÈME PRESTATAIRE
-- Avec Row Level Security (RLS) et chiffrement
-- ============================================

-- ============================================
-- TABLE: alerts
-- Alertes automatiques générées par le système
-- ============================================

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  
  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT CHECK (resolution_method IN ('phone', 'false_positive', 'other', 'intervention_created')),
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON public.alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin/Prestataire can see all alerts
CREATE POLICY "Prestataire can view all alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'prestataire')
    )
  );

-- Doctors can see alerts for their patients
CREATE POLICY "Doctors can view alerts for their patients"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = alerts.patient_id
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

-- Patients can see their own alerts
CREATE POLICY "Patients can view their own alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = alerts.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Only admin/prestataire can modify alerts
CREATE POLICY "Prestataire can modify alerts"
  ON public.alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'prestataire')
    )
  );

-- ============================================
-- TABLE: interventions
-- Interventions techniques planifiées/effectuées
-- ============================================

CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('installation', 'maintenance', 'repair', 'mask_delivery', 'phone_support')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Scheduling
  date TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Details
  notes TEXT,
  material TEXT,
  
  -- Completion details
  duration TEXT,
  material_used TEXT,
  completion_notes TEXT,
  patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON public.interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON public.interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON public.interventions(date);

-- Enable RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin/Prestataire can see all interventions
CREATE POLICY "Prestataire can view all interventions"
  ON public.interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'prestataire')
    )
  );

-- Technicians can see their own interventions
CREATE POLICY "Technicians can view their interventions"
  ON public.interventions FOR SELECT
  TO authenticated
  USING (interventions.technician_id = auth.uid());

-- Doctors can see interventions for their patients
CREATE POLICY "Doctors can view interventions for their patients"
  ON public.interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = interventions.patient_id
      AND patients.assigned_doctor_id = auth.uid()
    )
  );

-- Patients can see their own interventions
CREATE POLICY "Patients can view their own interventions"
  ON public.interventions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = interventions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Only admin/prestataire can modify interventions
CREATE POLICY "Prestataire can modify interventions"
  ON public.interventions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'prestataire')
    )
  );

-- ============================================
-- TABLE: audit_logs
-- Logs d'audit pour traçabilité RGPD
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admin can view audit logs
CREATE POLICY "Admin can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (audit_logs.user_id = auth.uid());

-- Only system can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS: Auto-generate alerts
-- ============================================

-- Function to generate alerts for disconnected machines
CREATE OR REPLACE FUNCTION generate_disconnect_alerts()
RETURNS void AS $$
BEGIN
  INSERT INTO public.alerts (patient_id, type, severity, message, details)
  SELECT 
    p.id,
    'disconnect',
    CASE 
      WHEN MAX(od.date) < NOW() - INTERVAL '7 days' THEN 'high'
      WHEN MAX(od.date) < NOW() - INTERVAL '3 days' THEN 'medium'
      ELSE 'low'
    END,
    'Machine déconnectée depuis ' || EXTRACT(DAY FROM NOW() - MAX(od.date))::TEXT || ' jours',
    'Dernière synchronisation le ' || TO_CHAR(MAX(od.date), 'DD/MM/YYYY')
  FROM public.patients p
  LEFT JOIN public.observance_data od ON od.patient_id = p.id
  WHERE p.device_installed = true
  GROUP BY p.id
  HAVING MAX(od.date) < NOW() - INTERVAL '3 days'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate alerts for old masks
CREATE OR REPLACE FUNCTION generate_mask_alerts()
RETURNS void AS $$
BEGIN
  INSERT INTO public.alerts (patient_id, type, severity, message, details)
  SELECT 
    p.id,
    'mask_old',
    'medium',
    'Masque utilisé depuis ' || EXTRACT(DAY FROM NOW() - p.last_mask_change)::TEXT || ' jours',
    'Remplacement recommandé tous les 90 jours'
  FROM public.patients p
  WHERE p.device_installed = true
  AND p.last_mask_change < NOW() - INTERVAL '90 days'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users (RLS will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interventions TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
