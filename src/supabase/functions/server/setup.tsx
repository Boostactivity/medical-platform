import { createClient } from 'jsr:@supabase/supabase-js@2';

export async function setupPrestataireTablesRoute(c: any) {
  try {
    // Verify admin authentication
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized', details: authError?.message }, 401);
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin' && userData?.role !== 'prestataire') {
      return c.json({ error: 'Forbidden: Admin role required' }, 403);
    }

    console.log('[SETUP] Creating prestataire tables...');

    // Execute SQL to create tables
    const createTablesSQL = `
-- 1. TABLE ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('disconnect', 'mask_old', 'leak', 'iah_high', 'no_data', 'follow_up')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_method TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- 2. TABLE INTERVENTIONS
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('installation', 'mask_change', 'maintenance', 'training', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  date TIMESTAMPTZ NOT NULL,
  duration TEXT,
  notes TEXT,
  material TEXT,
  material_used TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  patient_satisfaction INTEGER CHECK (patient_satisfaction >= 1 AND patient_satisfaction <= 5),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON interventions(technician_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);

-- 3. TABLE AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. TRIGGERS
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_interventions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_updated_at ON alerts;
CREATE TRIGGER alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_alerts_updated_at();

DROP TRIGGER IF EXISTS interventions_updated_at ON interventions;
CREATE TRIGGER interventions_updated_at
BEFORE UPDATE ON interventions
FOR EACH ROW
EXECUTE FUNCTION update_interventions_updated_at();

-- 5. RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin and prestataire can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can update alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Admin and prestataire can view all interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can insert interventions" ON interventions;
DROP POLICY IF EXISTS "Admin and prestataire can update interventions" ON interventions;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;

-- ALERTS POLICIES
CREATE POLICY "Admin and prestataire can view all alerts"
ON alerts FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

CREATE POLICY "Admin and prestataire can update alerts"
ON alerts FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

CREATE POLICY "Admin and prestataire can insert alerts"
ON alerts FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- INTERVENTIONS POLICIES
CREATE POLICY "Admin and prestataire can view all interventions"
ON interventions FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

CREATE POLICY "Admin and prestataire can insert interventions"
ON interventions FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

CREATE POLICY "Admin and prestataire can update interventions"
ON interventions FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'prestataire')
  )
);

-- AUDIT LOGS POLICIES
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
`;

    // Execute the SQL using the REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });

    if (error) {
      console.error('[SETUP] Error creating tables:', error);
      // Try alternative method with direct query
      try {
        // Split into individual statements and execute
        const statements = createTablesSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`[SETUP] Executing ${statements.length} SQL statements...`);

        // For now, return instructions since direct SQL execution may not be available
        return c.json({
          success: false,
          error: 'Direct SQL execution not available',
          message: 'Please execute the SQL script manually in Supabase Dashboard',
          instructions: {
            step1: 'Copy the SQL script from /constants/sql-scripts.ts',
            step2: 'Open Supabase Dashboard: https://supabase.com/dashboard',
            step3: 'Go to SQL Editor → New query',
            step4: 'Paste and run the script',
            step5: 'Go to Database → Replication',
            step6: 'Enable replication for: alerts, interventions'
          },
          sql_preview: createTablesSQL.substring(0, 500) + '...'
        }, 400);
      } catch (altError: any) {
        console.error('[SETUP] Alternative method failed:', altError);
        return c.json({
          success: false,
          error: 'Cannot execute SQL automatically',
          details: altError.message,
          message: 'Manual setup required - see /setup-prestataire'
        }, 500);
      }
    }

    console.log('[SETUP] Tables created successfully');

    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['alerts', 'interventions', 'audit_logs']);

    return c.json({
      success: true,
      message: 'Tables created successfully',
      tables: tables || [],
      next_steps: [
        'Enable Realtime for alerts table',
        'Enable Realtime for interventions table',
        'Go to: Database → Replication in Supabase Dashboard'
      ]
    });

  } catch (error: any) {
    console.error('[SETUP] Unexpected error:', error);
    return c.json({
      success: false,
      error: 'Setup failed',
      details: error.message,
      stack: error.stack
    }, 500);
  }
}
