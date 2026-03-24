import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

let setupCompleted = false;
let setupInProgress = false;

/**
 * Reset the setup state to force a fresh setup on next call
 */
export function resetSetupState() {
  setupCompleted = false;
  setupInProgress = false;
  console.log('[AUTO-SETUP] Setup state has been reset');
}

/**
 * Auto-setup middleware that creates tables if they don't exist
 * This runs automatically before any prestataire route
 */
export async function autoSetupTables() {
  // Skip if already completed
  if (setupCompleted) {
    return { success: true, message: 'Tables already exist' };
  }

  // Prevent concurrent setup attempts
  if (setupInProgress) {
    console.log('[AUTO-SETUP] Setup already in progress, waiting...');
    // Wait for the in-progress setup to complete
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (setupCompleted) {
        return { success: true, message: 'Tables created by concurrent request' };
      }
    }
    return { success: false, error: 'Setup timeout' };
  }

  setupInProgress = true;

  try {
    console.log('[AUTO-SETUP] 🚀 Starting automatic table creation...');

    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      throw new Error('SUPABASE_DB_URL not found in environment');
    }

    // Connect to PostgreSQL directly
    const client = new Client(dbUrl);
    await client.connect();

    console.log('[AUTO-SETUP] ✅ Connected to PostgreSQL');

    // Check if tables exist AND have correct foreign keys
    const checkResult = await client.queryObject<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts'
      ) as exists;
    `);

    const tablesExist = checkResult.rows[0]?.exists;

    if (tablesExist) {
      console.log('[AUTO-SETUP] 📋 Tables exist, checking foreign keys...');
      
      // Check if foreign keys point to the correct table (users vs auth.users)
      const fkCheck = await client.queryObject<{ table_name: string, column_name: string }>(`
        SELECT 
          tc.table_name, 
          kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name IN ('alerts', 'interventions')
          AND ccu.table_name = 'users'
          AND ccu.table_schema = 'auth';
      `);

      // If any foreign keys point to auth.users instead of public.users, recreate tables
      if (fkCheck.rows.length > 0) {
        console.log('[AUTO-SETUP] ⚠️  Found incorrect foreign keys pointing to auth.users');
        console.log('[AUTO-SETUP] 🔄 Will drop and recreate tables with correct schema');
        // Don't return early - continue to drop and recreate
      } else {
        console.log('[AUTO-SETUP] ✅ Tables have correct schema');
        setupCompleted = true;
        setupInProgress = false;
        await client.end();
        return { success: true, message: 'Tables already exist with correct schema' };
      }
    }

    console.log('[AUTO-SETUP] 📦 Creating tables...');

    // Drop tables if they exist with wrong foreign keys (from previous failed setup)
    console.log('[AUTO-SETUP] 🧹 Cleaning up any existing tables with incorrect schema...');
    try {
      await client.queryObject(`
        DROP TABLE IF EXISTS audit_logs CASCADE;
        DROP TABLE IF EXISTS interventions CASCADE;
        DROP TABLE IF EXISTS alerts CASCADE;
      `);
      console.log('[AUTO-SETUP] ✅ Cleanup complete');
    } catch (cleanupError) {
      console.warn('[AUTO-SETUP] Cleanup warning:', cleanupError);
    }

    // Create tables with proper SQL
    await client.queryObject(`
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
        resolved_by UUID REFERENCES users(id),
        resolution_method TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('[AUTO-SETUP] ✅ Created alerts table');

    await client.queryObject(`
      -- 2. TABLE INTERVENTIONS
      CREATE TABLE IF NOT EXISTS interventions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        technician_id UUID REFERENCES users(id),
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
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('[AUTO-SETUP] ✅ Created interventions table');

    await client.queryObject(`
      -- 3. TABLE AUDIT_LOGS
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('[AUTO-SETUP] ✅ Created audit_logs table');

    // Create indexes
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_interventions_patient_id ON interventions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_technician_id ON interventions(technician_id);
      CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
      CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);
      
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);

    console.log('[AUTO-SETUP] ✅ Created indexes');

    // Create triggers
    await client.queryObject(`
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
    `);

    console.log('[AUTO-SETUP] ✅ Created triggers');

    // Enable RLS
    await client.queryObject(`
      ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    `);

    console.log('[AUTO-SETUP] ✅ Enabled RLS');

    // Create RLS policies
    await client.queryObject(`
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
    `);

    console.log('[AUTO-SETUP] ✅ Created RLS policies');

    await client.end();

    setupCompleted = true;
    setupInProgress = false;

    console.log('[AUTO-SETUP] 🎉 All tables created successfully!');
    console.log('[AUTO-SETUP] ⚠️  IMPORTANT: Go to Supabase Dashboard → Database → Replication');
    console.log('[AUTO-SETUP] ⚠️  Enable realtime for: alerts, interventions');

    return {
      success: true,
      message: 'Tables created successfully',
      next_steps: [
        'Go to Supabase Dashboard',
        'Navigate to: Database → Replication',
        'Enable realtime for: alerts, interventions',
      ]
    };

  } catch (error: any) {
    setupInProgress = false;
    console.error('[AUTO-SETUP] ❌ Error:', error);
    
    // If error is "relation already exists", consider it a success
    if (error.message?.includes('already exists')) {
      setupCompleted = true;
      return { success: true, message: 'Tables already exist' };
    }
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}
