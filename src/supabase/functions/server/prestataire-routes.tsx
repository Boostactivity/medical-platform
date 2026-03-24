import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const getSupabase = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ============================================
// AUTHENTICATION HELPER
// ============================================

const verifyPrestataire = async (accessToken: string) => {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return { error: 'Invalid authentication', status: 401 };
  }

  const userRole = user.user_metadata?.role;
  if (userRole !== 'admin' && userRole !== 'prestataire') {
    return { error: 'Forbidden - Prestataire access required', status: 403 };
  }

  return { user, role: userRole };
};

// ============================================
// AUDIT LOG HELPER (RGPD Compliance)
// ============================================

const logAction = async (userId: string, action: string, details: any) => {
  const supabase = getSupabase();
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    ip_address: null, // Could be extracted from request headers
  });
};

// ============================================
// ALERTS ROUTES
// ============================================

// IoT Smart Alerts (from alerts table)
app.get('/alerts/iot', async (c) => {
  try {
    const supabase = getSupabase();
    
    // Get all IoT smart alerts - NO JOIN to avoid RLS issues
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[IOT ALERTS] Error fetching alerts:', error);
      // Return empty array instead of 500 error if RLS issue
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.warn('[IOT ALERTS] RLS permission issue - returning empty array');
        return c.json({ alerts: [] });
      }
      return c.json({ error: 'Failed to fetch IoT alerts', details: error }, 500);
    }

    return c.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('[IOT ALERTS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.get('/alerts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const supabase = getSupabase();
    
    // Get all active alerts - NO JOIN to avoid RLS issues
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ALERTS] Error fetching alerts:', error);
      // Return empty array if RLS issue
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.warn('[ALERTS] RLS permission issue - returning empty array');
        return c.json({ alerts: [] });
      }
      return c.json({ error: 'Failed to fetch alerts', details: error.message }, 500);
    }

    // Log access (protect against audit_logs RLS errors too)
    try {
      await logAction(authResult.user!.id, 'view_alerts', { count: alerts?.length || 0 });
    } catch (logError) {
      console.warn('[ALERTS] Could not log action:', logError);
      // Continue anyway - logging should not break the main flow
    }

    return c.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('[ALERTS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.post('/alerts/:id/resolve', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const alertId = c.req.param('id');
    const body = await c.req.json();
    const { method, notes } = body;

    if (!method || !notes) {
      return c.json({ error: 'method and notes are required' }, 400);
    }

    const supabase = getSupabase();

    // Get alert details first
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Update alert status
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: authResult.user!.id,
        resolution_method: method,
        resolution_notes: notes,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[RESOLVE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to resolve alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'resolve_alert', {
      alert_id: alertId,
      patient_id: alert.patient_id,
      method,
    });

    return c.json({ success: true, message: 'Alert resolved successfully' });
  } catch (error: any) {
    console.error('[RESOLVE ALERT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.post('/alerts/:id/ignore', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const alertId = c.req.param('id');
    const supabase = getSupabase();

    // Get alert details first
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Update alert status
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: authResult.user!.id,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[IGNORE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to ignore alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'ignore_alert', {
      alert_id: alertId,
      patient_id: alert.patient_id,
    });

    return c.json({ success: true, message: 'Alert ignored successfully' });
  } catch (error: any) {
    console.error('[IGNORE ALERT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// INTERVENTIONS ROUTES
// ============================================

app.get('/interventions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const supabase = getSupabase();
    
    // Get filter from query params
    const status = c.req.query('status'); // 'all', 'scheduled', 'in_progress', 'completed'
    
    let query = supabase
      .from('interventions')
      .select(`
        *,
        patient:patients!interventions_patient_id_fkey(
          id,
          user:users!patients_user_id_fkey(name, phone, email)
        ),
        technician:users!interventions_technician_id_fkey(name, email)
      `)
      .order('date', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: interventions, error } = await query;

    if (error) {
      console.error('[INTERVENTIONS] Error fetching interventions:', error);
      return c.json({ error: 'Failed to fetch interventions', details: error.message }, 500);
    }

    // Log access
    await logAction(authResult.user!.id, 'view_interventions', { count: interventions?.length || 0, filter: status });

    return c.json({ interventions: interventions || [] });
  } catch (error: any) {
    console.error('[INTERVENTIONS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.post('/interventions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const body = await c.req.json();
    const { patient_id, technician_id, type, date, notes, material, alert_id } = body;

    if (!patient_id || !technician_id || !type || !date) {
      return c.json({ error: 'patient_id, technician_id, type, and date are required' }, 400);
    }

    const supabase = getSupabase();

    // Create intervention
    const { data: intervention, error: insertError } = await supabase
      .from('interventions')
      .insert({
        patient_id,
        technician_id,
        type,
        date,
        notes,
        material,
        status: 'scheduled',
        created_by: authResult.user!.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CREATE INTERVENTION] Error:', insertError);
      return c.json({ error: 'Failed to create intervention', details: insertError.message }, 500);
    }

    // If created from alert, resolve the alert
    if (alert_id) {
      await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: authResult.user!.id,
          resolution_method: 'intervention_created',
          resolution_notes: `Intervention créée: ${intervention.id}`,
        })
        .eq('id', alert_id);
    }

    // Log action
    await logAction(authResult.user!.id, 'create_intervention', {
      intervention_id: intervention.id,
      patient_id,
      technician_id,
      type,
    });

    return c.json({ success: true, intervention });
  } catch (error: any) {
    console.error('[CREATE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.patch('/interventions/:id/start', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const interventionId = c.req.param('id');
    const supabase = getSupabase();

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', interventionId);

    if (updateError) {
      console.error('[START INTERVENTION] Error:', updateError);
      return c.json({ error: 'Failed to start intervention', details: updateError.message }, 500);
    }

    // Log action
    await logAction(authResult.user!.id, 'start_intervention', { intervention_id: interventionId });

    return c.json({ success: true, message: 'Intervention started successfully' });
  } catch (error: any) {
    console.error('[START INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

app.patch('/interventions/:id/complete', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const interventionId = c.req.param('id');
    const body = await c.req.json();
    const { duration, materialUsed, notes, patientSatisfaction, followUpNeeded, followUpNotes } = body;

    if (!notes) {
      return c.json({ error: 'Completion notes are required' }, 400);
    }

    const supabase = getSupabase();

    // Get intervention details
    const { data: intervention } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single();

    if (!intervention) {
      return c.json({ error: 'Intervention not found' }, 404);
    }

    // Update intervention
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        duration,
        material_used: materialUsed,
        patient_satisfaction: patientSatisfaction,
      })
      .eq('id', interventionId);

    if (updateError) {
      console.error('[COMPLETE INTERVENTION] Error:', updateError);
      return c.json({ error: 'Failed to complete intervention', details: updateError.message }, 500);
    }

    // If follow-up needed, create a new alert
    if (followUpNeeded) {
      await supabase.from('alerts').insert({
        patient_id: intervention.patient_id,
        type: 'follow_up',
        severity: 'medium',
        message: 'Suivi nécessaire suite à intervention',
        details: followUpNotes,
        status: 'active',
      });
    }

    // Log action
    await logAction(authResult.user!.id, 'complete_intervention', {
      intervention_id: interventionId,
      patient_id: intervention.patient_id,
      satisfaction: patientSatisfaction,
      follow_up_needed: followUpNeeded,
    });

    return c.json({ success: true, message: 'Intervention completed successfully' });
  } catch (error: any) {
    console.error('[COMPLETE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ============================================
// STATISTICS & DASHBOARD
// ============================================

app.get('/dashboard/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const authResult = await verifyPrestataire(accessToken);
    if ('error' in authResult) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const supabase = getSupabase();

    // Get counts
    const [alertsResult, interventionsResult, patientsResult] = await Promise.all([
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('interventions').select('*', { count: 'exact', head: true }),
      supabase.from('patients').select('*', { count: 'exact', head: true }).eq('device_installed', true),
    ]);

    // Get alerts by severity
    const { data: highAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('severity', 'high');

    const { data: mediumAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('severity', 'medium');

    // Get interventions by status
    const { data: scheduledInt } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    const { data: inProgressInt } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    return c.json({
      alerts: {
        total: alertsResult.count || 0,
        high: highAlerts || 0,
        medium: mediumAlerts || 0,
      },
      interventions: {
        total: interventionsResult.count || 0,
        scheduled: scheduledInt || 0,
        in_progress: inProgressInt || 0,
      },
      patients: {
        total: patientsResult.count || 0,
      },
    });
  } catch (error: any) {
    console.error('[DASHBOARD STATS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

export default app;