/**
 * ═══════════════════════════════════════════════════════════════════
 * BILLING AUTOMATION ENGINE - Phase 3
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Gère l'automatisation de la facturation et de la logistique :
 * - Calcul automatique de la compliance (règle des 28 jours)
 * - Génération des batches de renouvellement de consommables
 * - Export CSV pour la logistique
 * - KPIs financiers en temps réel
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';

const app = new Hono();

// ───────────────────────────────────────────────────────────────────
// ROUTE 1 : CALCULER LA COMPLIANCE (Manuelle ou CRON)
// ───────────────────────────────────────────────────────────────────

app.post('/billing/calculate-compliance', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Billing] Starting compliance calculation...');

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('calculate_billing_compliance');

    if (error) {
      console.error('[Billing] Error calculating compliance:', error);
      return c.json({ 
        success: false, 
        error: error.message 
      }, 500);
    }

    console.log('[Billing] Compliance calculation completed:', data);

    return c.json({
      success: true,
      message: 'Compliance calculée avec succès',
      results: data?.[0] || {
        patients_processed: 0,
        eligible_patients: 0,
        at_risk_patients: 0,
        lost_patients: 0,
      },
    });
  } catch (error: any) {
    console.error('[Billing] Unexpected error:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 2 : RÉCUPÉRER LES KPIs FINANCIERS
// ───────────────────────────────────────────────────────────────────

app.get('/billing/kpis', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer la vue des KPIs
    const { data, error } = await supabase
      .from('vw_billing_kpis')
      .select('*')
      .single();

    if (error) {
      console.error('[Billing] Error fetching KPIs:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      kpis: data || {
        patients_eligible: 0,
        patients_at_risk: 0,
        patients_lost: 0,
        total_active_patients: 0,
        pct_ca_secured: 0,
        pct_ca_at_risk: 0,
        pct_ca_lost: 0,
      },
    });
  } catch (error: any) {
    console.error('[Billing] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 3 : LISTE DES PATIENTS À RISQUE FINANCIER
// ───────────────────────────────────────────────────────────────────

app.get('/billing/patients-at-risk', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('vw_patients_at_financial_risk')
      .select('*')
      .order('compliance_28d_average', { ascending: true });

    if (error) {
      console.error('[Billing] Error fetching at-risk patients:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      patients: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Billing] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 4 : GÉNÉRER UN BATCH DE RENOUVELLEMENT
// ───────────────────────────────────────────────────────────────────

app.post('/logistics/generate-renewal-batch', async (c) => {
  try {
    const body = await c.req.json();
    const daysAhead = body.days_ahead || 14; // Par défaut 14 jours

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[Logistics] Generating renewal batch for next ${daysAhead} days...`);

    // Appeler la fonction SQL
    const { data, error } = await supabase.rpc('generate_renewal_batch', {
      days_ahead: daysAhead,
    });

    if (error) {
      console.error('[Logistics] Error generating batch:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    const result = data?.[0] || {
      batch_id: 'BATCH-EMPTY',
      items_count: 0,
      items: [],
    };

    console.log(`[Logistics] Batch generated: ${result.batch_id} (${result.items_count} items)`);

    return c.json({
      success: true,
      batch: result,
    });
  } catch (error: any) {
    console.error('[Logistics] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 5 : EXPORT CSV POUR LA LOGISTIQUE
// ───────────────────────────────────────────────────────────────────

app.post('/logistics/export-csv', async (c) => {
  try {
    const body = await c.req.json();
    const daysAhead = body.days_ahead || 14;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les items à renouveler
    const { data: items, error } = await supabase
      .from('equipment_inventory')
      .select(`
        *,
        patient:patients!inner(
          user:users!inner(full_name, email, phone, address)
        )
      `)
      .eq('status', 'active')
      .gte('renewal_due_at', new Date().toISOString().split('T')[0])
      .lte('renewal_due_at', new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      console.error('[Logistics] Error fetching items:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!items || items.length === 0) {
      return c.json({
        success: true,
        message: 'Aucun renouvellement à expédier',
        csv: '',
      });
    }

    // Générer le CSV
    const csvHeader = 'Patient,Email,Téléphone,Adresse,Type,Modèle,Taille,Date Installation,Date Renouvellement\n';
    const csvRows = items.map((item: any) => {
      const user = item.patient?.user || {};
      return [
        user.full_name || 'N/A',
        user.email || 'N/A',
        user.phone || 'N/A',
        `"${user.address || 'N/A'}"`, // Guillemets pour adresses avec virgules
        item.item_type,
        item.model_ref,
        item.size || 'N/A',
        item.installed_at,
        item.renewal_due_at,
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    console.log(`[Logistics] CSV generated with ${items.length} items`);

    // Retourner le CSV
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="renouvellements_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('[Logistics] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 6 : MARQUER UN RENOUVELLEMENT COMME EXPÉDIÉ
// ───────────────────────────────────────────────────────────────────

app.post('/logistics/mark-shipped', async (c) => {
  try {
    const body = await c.req.json();
    const { equipment_ids } = body;

    if (!equipment_ids || !Array.isArray(equipment_ids)) {
      return c.json({ 
        success: false, 
        error: 'equipment_ids array required' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mettre à jour les équipements
    const { data, error } = await supabase
      .from('equipment_inventory')
      .update({
        status: 'shipped',
        renewal_shipped_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .in('id', equipment_ids)
      .select();

    if (error) {
      console.error('[Logistics] Error marking as shipped:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Logistics] Marked ${data?.length || 0} items as shipped`);

    return c.json({
      success: true,
      message: `${data?.length || 0} items marqués comme expédiés`,
      updated: data,
    });
  } catch (error: any) {
    console.error('[Logistics] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ───────────────────────────────────────────────────────────────────
// ROUTE 7 : HISTORIQUE DES FACTURATIONS
// ───────────────────────────────────────────────────────────────────

app.get('/billing/history/:patient_id', async (c) => {
  try {
    const patientId = c.req.param('patient_id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('billing_period_start', { ascending: false });

    if (error) {
      console.error('[Billing] Error fetching history:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      history: data || [],
    });
  } catch (error: any) {
    console.error('[Billing] Unexpected error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { app as billingAutomation };
