import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

/**
 * Force recreate all prestataire tables with correct schema
 * This bypasses the auto-setup cache and directly recreates tables
 */
export async function forceRecreateTables() {
  console.log('[FORCE RECREATE] ========================================');
  console.log('[FORCE RECREATE] 🔄 STARTING COMPLETE TABLE RECREATION...');
  console.log('[FORCE RECREATE] ========================================');

  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) {
    console.error('[FORCE RECREATE] ❌ SUPABASE_DB_URL not found');
    return {
      success: false,
      error: 'SUPABASE_DB_URL not configured'
    };
  }

  const client = new Client(dbUrl);

  try {
    await client.connect();
    console.log('[FORCE RECREATE] ✅ Connected to PostgreSQL');

    // STEP 1: Drop all existing tables
    console.log('[FORCE RECREATE] 🗑️  Dropping existing tables...');
    await client.queryObject(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS interventions CASCADE;
      DROP TABLE IF EXISTS alerts CASCADE;
    `);
    console.log('[FORCE RECREATE] ✅ Tables dropped');

    // STEP 2: Create alerts table with CORRECT foreign keys
    console.log('[FORCE RECREATE] 🔨 Creating alerts table...');
    await client.queryObject(`
      CREATE TABLE alerts (
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
    console.log('[FORCE RECREATE] ✅ alerts table created');

    // STEP 3: Create interventions table with CORRECT foreign keys
    console.log('[FORCE RECREATE] 🔨 Creating interventions table...');
    await client.queryObject(`
      CREATE TABLE interventions (
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
    console.log('[FORCE RECREATE] ✅ interventions table created');

    // STEP 4: Create audit_logs table with CORRECT foreign keys
    console.log('[FORCE RECREATE] 🔨 Creating audit_logs table...');
    await client.queryObject(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[FORCE RECREATE] ✅ audit_logs table created');

    // STEP 5: Create indexes
    console.log('[FORCE RECREATE] 📇 Creating indexes...');
    await client.queryObject(`
      CREATE INDEX idx_alerts_patient_id ON alerts(patient_id);
      CREATE INDEX idx_alerts_status ON alerts(status);
      CREATE INDEX idx_alerts_severity ON alerts(severity);
      CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
      
      CREATE INDEX idx_interventions_patient_id ON interventions(patient_id);
      CREATE INDEX idx_interventions_technician_id ON interventions(technician_id);
      CREATE INDEX idx_interventions_status ON interventions(status);
      CREATE INDEX idx_interventions_date ON interventions(date DESC);
      
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
    console.log('[FORCE RECREATE] ✅ Indexes created');

    // STEP 6: Create triggers
    console.log('[FORCE RECREATE] ⚡ Creating triggers...');
    await client.queryObject(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('[FORCE RECREATE] ✅ Triggers created');

    // STEP 7: Enable RLS
    console.log('[FORCE RECREATE] 🔒 Enabling RLS...');
    await client.queryObject(`
      ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    `);
    console.log('[FORCE RECREATE] ✅ RLS enabled');

    // STEP 8: Create RLS policies
    console.log('[FORCE RECREATE] 🔐 Creating RLS policies...');
    await client.queryObject(`
      -- Alerts policies
      CREATE POLICY "Admin and prestataire can view all alerts"
        ON alerts FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      CREATE POLICY "Admin and prestataire can insert alerts"
        ON alerts FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      CREATE POLICY "Admin and prestataire can update alerts"
        ON alerts FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      -- Interventions policies
      CREATE POLICY "Admin and prestataire can view all interventions"
        ON interventions FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      CREATE POLICY "Admin and prestataire can insert interventions"
        ON interventions FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      CREATE POLICY "Admin and prestataire can update interventions"
        ON interventions FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );

      -- Audit logs policies
      CREATE POLICY "Admin can view all audit logs"
        ON audit_logs FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
          )
        );

      CREATE POLICY "Admin and prestataire can insert audit logs"
        ON audit_logs FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'prestataire')
          )
        );
    `);
    console.log('[FORCE RECREATE] ✅ RLS policies created');

    await client.end();

    console.log('[FORCE RECREATE] ========================================');
    console.log('[FORCE RECREATE] ✅ ALL TABLES RECREATED SUCCESSFULLY!');
    console.log('[FORCE RECREATE] ========================================');

    return {
      success: true,
      message: 'Tables recreated with correct schema',
      details: {
        tables: ['alerts', 'interventions', 'audit_logs'],
        foreign_keys: 'All point to public.users ✅',
        indexes: 'Created ✅',
        triggers: 'Created ✅',
        rls: 'Enabled with policies ✅'
      }
    };
  } catch (error: any) {
    console.error('[FORCE RECREATE] ❌ Error:', error);
    await client.end();
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}
