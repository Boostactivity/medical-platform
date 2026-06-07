/**
 * Alerts routes (engine analysis + management, bypasses RLS).
 * Mounted at `${prefix}/alerts` — public URLs unchanged.
 * All routes require an authenticated user (no role restriction:
 * the original handlers had no role check — semantics preserved,
 * baseline auth added).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, type AuthEnv } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';
import { analyzePatient, analyzeBatch } from '../alert-engine.ts';

const app = new Hono<TenantEnv>();

// requireTenant expose c.get('tenantId') — à consommer lors du
// rebranchement données réelles des handlers (chantiers 2-3).
app.use('*', requireAuth, requireTenant);

// ============================================
// ALERT ENGINE ROUTES
// ============================================

app.post('/analyze/:patientId', async (c) => {
  try {
    const patientId = c.req.param('patientId');

    if (!patientId) {
      return c.json({ error: 'Patient ID required' }, 400);
    }

    console.log(`[ALERT ENGINE API] Analyzing patient ${patientId}`);
    const result = await analyzePatient(patientId);

    return c.json({
      success: result.success,
      patientId,
      alertsCreated: result.alertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ALERT ENGINE API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/analyze-batch', async (c) => {
  try {
    console.log('[ALERT ENGINE API] Starting batch analysis');
    const result = await analyzeBatch();

    return c.json({
      success: result.success,
      patientsAnalyzed: result.patientsAnalyzed,
      totalAlerts: result.totalAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ALERT ENGINE API] Batch error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// ALERTS MANAGEMENT ROUTES (bypasses RLS)
// ============================================

// Get alerts for a patient
app.get('/patient/:patientId', async (c) => {
  try {
    const patientId = c.req.param('patientId');

    if (!patientId) {
      return c.json({ error: 'Patient ID required' }, 400);
    }

    console.log(`[ALERTS API] Fetching alerts for patient ${patientId}`);

    // Use service role to bypass RLS
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[ALERTS API] Error fetching alerts:', error);

      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        return c.json({ alerts: [], unreadCount: 0 });
      }

      return c.json({ error: error.message }, 500);
    }

    return c.json({
      alerts: alerts || [],
      unreadCount: alerts?.length || 0
    });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Acknowledge an alert (mark as ignored in our schema)
app.patch('/:alertId/acknowledge', async (c) => {
  try {
    const alertId = c.req.param('alertId');
    const body = await c.req.json();
    const { userId } = body;

    if (!alertId) {
      return c.json({ error: 'Alert ID required' }, 400);
    }

    console.log(`[ALERTS API] Acknowledging alert ${alertId}`);

    // In our schema, "acknowledge" means mark as ignored
    // Use service role to bypass RLS
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: userId || null,
      })
      .eq('id', alertId);

    if (error) {
      console.error('[ALERTS API] Error acknowledging alert:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Resolve an alert
app.patch('/:alertId/resolve', async (c) => {
  try {
    const alertId = c.req.param('alertId');

    if (!alertId) {
      return c.json({ error: 'Alert ID required' }, 400);
    }

    console.log(`[ALERTS API] Resolving alert ${alertId}`);

    // Use service role to bypass RLS
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      console.error('[ALERTS API] Error resolving alert:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get all active alerts (for notifications bell - doctors/prestataires)
app.get('/active', async (c) => {
  try {
    console.log('[ALERTS API] Fetching all active alerts');

    // Use service role to bypass RLS
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        id,
        type,
        severity,
        message,
        details,
        created_at,
        status,
        patient_id
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[ALERTS API] Error fetching active alerts:', error);

      // If table doesn't exist or is empty, return empty array
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        console.log('[ALERTS API] Alerts table not found or empty, returning empty array');
        return c.json({
          alerts: [],
          unreadCount: 0
        });
      }

      return c.json({ error: error.message }, 500);
    }

    console.log(`[ALERTS API] Found ${alerts?.length || 0} active alerts`);

    return c.json({
      alerts: alerts || [],
      unreadCount: alerts?.length || 0
    });
  } catch (error: any) {
    console.error('[ALERTS API] Error:', error);

    // Return empty array on any error to avoid breaking the UI
    return c.json({
      alerts: [],
      unreadCount: 0
    });
  }
});

export default app;
