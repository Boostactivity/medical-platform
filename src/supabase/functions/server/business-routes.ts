/**
 * ═══════════════════════════════════════════════════════════════════
 * ROUTES API BUSINESS MODEL - PHASE 3
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Routes pour gestion financière, compliance CPAM et stocks
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  calculateCPAMCompliance,
  checkAllPatientsCompliance,
  generateComplianceAlerts,
  saveComplianceHistory,
  createComplianceAlertInQueue,
  runDailyComplianceCheck,
} from './compliance-calculator.ts';
import {
  registerEquipment,
  renewEquipment,
  checkUpcomingRenewals,
  generateRenewalAlerts,
  createRenewalAlertInQueue,
  setupPatientEquipment,
  EQUIPMENT_CATALOG,
} from './stock-manager.ts';

const businessRoutes = new Hono();

// ═══════════════════════════════════════════════════════════════════
// ROUTES COMPLIANCE CPAM
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /business/compliance/:patientId
 * Vérifie la conformité CPAM pour un patient
 */
businessRoutes.get('/compliance/:patientId', async (c) => {
  const patientId = c.req.param('patientId');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const compliance = await calculateCPAMCompliance(patientId, supabase);

    // Sauvegarder historique
    await saveComplianceHistory(compliance, supabase);

    // Générer alerte si nécessaire
    if (compliance.status !== 'safe') {
      const alert = await generateComplianceAlerts(compliance);
      if (alert) {
        await createComplianceAlertInQueue(alert, supabase);
      }
    }

    return c.json({
      success: true,
      compliance,
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error checking compliance:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /business/compliance-report
 * Rapport global de conformité pour tous les patients
 */
businessRoutes.get('/compliance-report', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const report = await checkAllPatientsCompliance(supabase);

    return c.json({
      success: true,
      report,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error generating compliance report:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /business/revenue-at-risk
 * Calcule le CA à risque (patients non-conformes)
 */
businessRoutes.get('/revenue-at-risk', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const report = await checkAllPatientsCompliance(supabase);

    return c.json({
      success: true,
      summary: {
        total_monthly_revenue: report.total_monthly_revenue,
        revenue_at_risk: report.revenue_at_risk,
        revenue_lost: report.revenue_lost,
        risk_percentage: report.risk_percentage,
      },
      patients_at_risk: report.patients_needing_action,
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error calculating revenue at risk:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /business/run-compliance-check
 * Exécute manuellement le check de compliance (normalement CRON)
 */
businessRoutes.post('/run-compliance-check', async (c) => {
  try {
    await runDailyComplianceCheck();

    return c.json({
      success: true,
      message: 'Compliance check completed successfully',
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error running compliance check:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTES GESTION STOCKS / RENOUVELLEMENTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /business/equipment/register
 * Enregistre un nouvel équipement installé
 */
businessRoutes.post('/equipment/register', async (c) => {
  const body = await c.req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const equipment = await registerEquipment({
      patient_id: body.patient_id,
      equipment_type: body.equipment_type,
      installation_date: body.installation_date,
      actual_renewal_date: null,
      manufacturer: body.manufacturer || '',
      serial_number: body.serial_number || null,
      notes: body.notes || null,
    }, supabase);

    return c.json({
      success: true,
      equipment,
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error registering equipment:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /business/equipment/renew
 * Marque un équipement comme renouvelé
 */
businessRoutes.post('/equipment/renew', async (c) => {
  const body = await c.req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    await renewEquipment(
      body.equipment_id,
      body.renewal_date,
      supabase
    );

    return c.json({
      success: true,
      message: 'Equipment renewed successfully',
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error renewing equipment:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /business/renewals/upcoming
 * Liste les renouvellements à venir (30 et 60 jours)
 */
businessRoutes.get('/renewals/upcoming', async (c) => {
  const days = parseInt(c.req.query('days') || '60');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const stockSummary = await checkUpcomingRenewals(supabase, days);

    return c.json({
      success: true,
      summary: stockSummary,
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error fetching upcoming renewals:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /business/patient/setup-equipment
 * Installation initiale équipements pour nouveau patient
 */
businessRoutes.post('/patient/setup-equipment', async (c) => {
  const body = await c.req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    await setupPatientEquipment(
      body.patient_id,
      body.installation_date,
      {
        maskType: body.mask_type,
        manufacturer: body.manufacturer,
        hasHumidifier: body.has_humidifier,
        filterType: body.filter_type,
      },
      supabase
    );

    return c.json({
      success: true,
      message: 'Patient equipment setup completed',
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error setting up patient equipment:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /business/equipment/catalog
 * Retourne le catalogue des équipements avec durées de vie
 */
businessRoutes.get('/equipment/catalog', async (c) => {
  return c.json({
    success: true,
    catalog: Object.values(EQUIPMENT_CATALOG),
  });
});

/**
 * GET /business/patient/:patientId/equipment
 * Liste tous les équipements d'un patient
 */
businessRoutes.get('/patient/:patientId/equipment', async (c) => {
  const patientId = c.req.param('patientId');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const { data: equipment, error } = await supabase
      .from('equipment_tracking')
      .select('*')
      .eq('patient_id', patientId)
      .order('installation_date', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST205') {
        console.log('[BUSINESS] equipment_tracking table not found, returning empty equipment list');
        return c.json({
          success: true,
          equipment: [],
        });
      }
      throw error;
    }

    // Enrichir avec infos catalogue
    const enrichedEquipment = (equipment || []).map(item => ({
      ...item,
      config: EQUIPMENT_CATALOG[item.equipment_type as keyof typeof EQUIPMENT_CATALOG],
      days_until_renewal: Math.ceil(
        (new Date(item.expected_renewal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return c.json({
      success: true,
      equipment: enrichedEquipment,
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error fetching patient equipment:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// ROUTES ANALYTICS BUSINESS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /business/dashboard
 * Dashboard business complet (compliance + stocks)
 */
businessRoutes.get('/dashboard', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    // Compliance
    const complianceReport = await checkAllPatientsCompliance(supabase);

    // Stocks
    const stockSummary = await checkUpcomingRenewals(supabase, 60);

    // KPIs combinés
    const dashboard = {
      compliance: {
        total_patients: complianceReport.total_patients,
        compliant_patients: complianceReport.compliant_patients,
        compliance_rate: complianceReport.total_patients > 0
          ? (complianceReport.compliant_patients / complianceReport.total_patients) * 100
          : 0,
        revenue_at_risk: complianceReport.revenue_at_risk,
        revenue_lost: complianceReport.revenue_lost,
        patients_needing_action: complianceReport.patients_needing_action.slice(0, 10), // Top 10
      },
      stock: {
        renewals_30days: stockSummary.upcoming_renewals_30days.length,
        renewals_60days: stockSummary.upcoming_renewals_60days.length,
        overdue_renewals: stockSummary.overdue_renewals.length,
        revenue_30days: stockSummary.total_revenue_30days,
        revenue_60days: stockSummary.total_revenue_60days,
        revenue_lost_overdue: stockSummary.revenue_lost_overdue,
        urgent_items: [
          ...stockSummary.overdue_renewals,
          ...stockSummary.upcoming_renewals_30days.filter(r => r.status === 'urgent'),
        ].slice(0, 10), // Top 10
      },
      total_revenue: {
        monthly_recurring: complianceReport.total_monthly_revenue,
        renewals_30days: stockSummary.total_revenue_30days,
        total_projected: complianceReport.total_monthly_revenue + stockSummary.total_revenue_30days,
        at_risk: complianceReport.revenue_at_risk + stockSummary.revenue_lost_overdue,
      },
    };

    return c.json({
      success: true,
      dashboard,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BUSINESS] Error generating dashboard:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export default businessRoutes;