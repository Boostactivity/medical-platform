/**
 * Prestataire operations routes (alertes & interventions).
 * Mounted at `${prefix}/prestataire` — public URLs unchanged.
 * All routes require an authenticated admin or prestataire
 * (same semantics as the old verifyPrestataire helper).
 */

import { Hono } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth.ts';
import { requireTenant, type TenantEnv } from '../middleware/tenant.ts';
import { autoSetupTables } from '../auto-setup.tsx';

const app = new Hono<TenantEnv>();

// Accès : admin, prestataire + technicien (app mobile terrain : lecture
// interventions, check-in/complétion). requireTenant expose c.get('tenantId').
app.use('*', requireAuth, requireRole('admin', 'prestataire', 'technicien'), requireTenant);

// Helper function to log actions
const logAction = async (userId: string, action: string, details: any = {}) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
      ip_address: 'unknown', // TODO: Get from request
      user_agent: 'unknown', // TODO: Get from request
    });
  } catch (error) {
    console.error('[AUDIT LOG] Error:', error);
  }
};

// GET /prestataire/alerts - Get all active alerts
app.get('/alerts', async (c) => {
  try {
    const user = c.get('user');

    // Auto-setup: Create tables if they don't exist
    const setupResult = await autoSetupTables();
    if (!setupResult.success && setupResult.error) {
      console.warn('[PRESTATAIRE ALERTS] Auto-setup warning:', setupResult.error);
    }

    // Get all active alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        *,
        patient:patients!alerts_patient_id_fkey(
          id,
          user:users!patients_user_id_fkey(name, phone, email)
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PRESTATAIRE ALERTS] Error fetching alerts:', error);
      return c.json({ error: 'Failed to fetch alerts', details: error.message }, 500);
    }

    // Log access
    await logAction(user.id, 'view_alerts', { count: alerts?.length || 0 });

    return c.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('[PRESTATAIRE ALERTS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /prestataire/alerts/:id/resolve - Resolve an alert
app.post('/alerts/:id/resolve', async (c) => {
  try {
    const user = c.get('user');
    const alertId = c.req.param('id');
    const body = await c.req.json();
    const { method, notes } = body;

    if (!method || !notes) {
      return c.json({ error: 'method and notes are required' }, 400);
    }

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
        resolved_by: user.id,
        resolution_method: method,
        resolution_notes: notes,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[RESOLVE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to resolve alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(user.id, 'resolve_alert', {
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

// POST /prestataire/alerts/:id/ignore - Ignore an alert
app.post('/alerts/:id/ignore', async (c) => {
  try {
    const user = c.get('user');
    const alertId = c.req.param('id');

    // Get alert details first
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Update alert status to ignored
    const { error: updateError } = await supabase
      .from('alerts')
      .update({
        status: 'ignored',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[IGNORE ALERT] Error:', updateError);
      return c.json({ error: 'Failed to ignore alert', details: updateError.message }, 500);
    }

    // Log action
    await logAction(user.id, 'ignore_alert', {
      alert_id: alertId,
      patient_id: alert.patient_id,
    });

    return c.json({ success: true, message: 'Alert ignored successfully' });
  } catch (error: any) {
    console.error('[IGNORE ALERT] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /prestataire/interventions - Get all interventions with optional filter
app.get('/interventions', async (c) => {
  try {
    const user = c.get('user');

    // Auto-setup: Create tables if they don't exist
    const setupResult = await autoSetupTables();
    if (!setupResult.success && setupResult.error) {
      console.warn('[PRESTATAIRE INTERVENTIONS] Auto-setup warning:', setupResult.error);
    }

    const statusFilter = c.req.query('status'); // all, scheduled, in_progress, completed

    let query = supabase
      .from('interventions')
      .select(`
        *,
        patient:patients!interventions_patient_id_fkey(
          id,
          user:users!patients_user_id_fkey(name, phone, email)
        )
      `)
      .order('date', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: interventions, error } = await query;

    if (error) {
      console.error('[PRESTATAIRE INTERVENTIONS] Error fetching interventions:', error);
      return c.json({ error: 'Failed to fetch interventions', details: error.message }, 500);
    }

    // Log access
    await logAction(user.id, 'view_interventions', {
      count: interventions?.length || 0,
      filter: statusFilter || 'all'
    });

    return c.json({ interventions: interventions || [] });
  } catch (error: any) {
    console.error('[PRESTATAIRE INTERVENTIONS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /prestataire/interventions - Create a new intervention
app.post('/interventions', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { patient_id, technician_id, type, date, notes, material, alert_id } = body;

    if (!patient_id || !type || !date) {
      return c.json({ error: 'patient_id, type, and date are required' }, 400);
    }

    // Create intervention
    const { data: intervention, error: createError } = await supabase
      .from('interventions')
      .insert({
        patient_id,
        technician_id: technician_id || user.id,
        type,
        date,
        notes,
        material,
        status: 'scheduled',
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[CREATE INTERVENTION] Error:', createError);
      return c.json({ error: 'Failed to create intervention', details: createError.message }, 500);
    }

    // If created from alert, resolve the alert automatically
    if (alert_id) {
      await supabase
        .from('alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_method: 'intervention_created',
          resolution_notes: `Intervention ${intervention.id} created`,
        })
        .eq('id', alert_id);
    }

    // Log action
    await logAction(user.id, 'create_intervention', {
      intervention_id: intervention.id,
      patient_id,
      type,
      from_alert: !!alert_id,
    });

    return c.json({ success: true, intervention });
  } catch (error: any) {
    console.error('[CREATE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PATCH /prestataire/interventions/:id/start - Start an intervention
app.patch('/interventions/:id/start', async (c) => {
  try {
    const user = c.get('user');
    const interventionId = c.req.param('id');

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
    await logAction(user.id, 'start_intervention', {
      intervention_id: interventionId,
    });

    return c.json({ success: true, message: 'Intervention started successfully' });
  } catch (error: any) {
    console.error('[START INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PATCH /prestataire/interventions/:id/complete - Complete an intervention
app.patch('/interventions/:id/complete', async (c) => {
  try {
    const user = c.get('user');
    const interventionId = c.req.param('id');
    const body = await c.req.json();
    const {
      duration, materialUsed, notes, patientSatisfaction, followUpNeeded, followUpNotes,
      // App mobile technicien : preuve d'intervention terrain
      signatureSvg, checkInAt, checkOutAt,
    } = body;

    // Get intervention details
    const { data: intervention } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single();

    if (!intervention) {
      return c.json({ error: 'Intervention not found' }, 404);
    }

    // Update intervention status
    const { error: updateError } = await supabase
      .from('interventions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        duration,
        material_used: materialUsed,
        patient_satisfaction: patientSatisfaction,
        // Preuve terrain (app technicien) — null si non transmis (colonnes migration 106)
        signature_svg: signatureSvg ?? null,
        check_in_at: checkInAt ?? null,
        check_out_at: checkOutAt ?? null,
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
        severity: 'low',
        message: 'Suivi nécessaire après intervention',
        details: followUpNotes || 'Intervention completed, follow-up required',
        status: 'active',
      });
    }

    // Log action
    await logAction(user.id, 'complete_intervention', {
      intervention_id: interventionId,
      patient_id: intervention.patient_id,
      follow_up_needed: followUpNeeded,
      satisfaction: patientSatisfaction,
    });

    return c.json({ success: true, message: 'Intervention completed successfully' });
  } catch (error: any) {
    console.error('[COMPLETE INTERVENTION] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /prestataire/dashboard/stats - Get dashboard statistics
app.get('/dashboard/stats', async (c) => {
  try {
    // Get alerts stats
    const { data: alerts } = await supabase
      .from('alerts')
      .select('severity')
      .eq('status', 'active');

    const alertsStats = {
      total: alerts?.length || 0,
      high: alerts?.filter(a => a.severity === 'high').length || 0,
      medium: alerts?.filter(a => a.severity === 'medium').length || 0,
      low: alerts?.filter(a => a.severity === 'low').length || 0,
    };

    // Get interventions stats
    const { data: interventions } = await supabase
      .from('interventions')
      .select('status');

    const interventionsStats = {
      total: interventions?.length || 0,
      scheduled: interventions?.filter(i => i.status === 'scheduled').length || 0,
      in_progress: interventions?.filter(i => i.status === 'in_progress').length || 0,
      completed: interventions?.filter(i => i.status === 'completed').length || 0,
    };

    // Get patients count
    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    return c.json({
      alerts: alertsStats,
      interventions: interventionsStats,
      patients: {
        total: patientsCount || 0,
      },
    });
  } catch (error: any) {
    console.error('[PRESTATAIRE STATS] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

export default app;
