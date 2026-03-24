/**
 * Routes d'Automatisation
 * 
 * Endpoints pour les calculs automatiques et notifications
 */

import { Hono } from 'npm:hono';
import { SleepScoreCalculator, CPAMBillingChecker, NotificationService } from './automation-services.ts';

const automation = new Hono();

// ============================================
// SLEEP SCORE CALCULATOR
// ============================================

/**
 * POST /automation/calculate-scores
 * Calcule les scores pour toutes les nuits non scorées (batch)
 */
automation.post('/calculate-scores', async (c) => {
  try {
    const calculator = new SleepScoreCalculator();
    const result = await calculator.processUnscored();
    
    return c.json({
      success: true,
      message: `Processed ${result.processed} nights: ${result.success} success, ${result.errors} errors`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in batch score calculation:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /automation/calculate-score/:id
 * Recalcule le score pour une nuit spécifique
 */
automation.post('/calculate-score/:id', async (c) => {
  try {
    const sleepDataId = c.req.param('id');
    const calculator = new SleepScoreCalculator();
    const result = await calculator.recalculateNight(sleepDataId);
    
    return c.json({
      success: true,
      message: `Score calculated: ${result.score}/100`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error recalculating score:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /automation/quality-report/:patientId
 * Génère un rapport de qualité pour un patient
 */
automation.get('/quality-report/:patientId', async (c) => {
  try {
    const patientId = c.req.param('patientId');
    const days = parseInt(c.req.query('days') || '30');
    
    const calculator = new SleepScoreCalculator();
    const report = await calculator.generateQualityReport(patientId, days);
    
    return c.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating quality report:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ============================================
// CPAM BILLING CHECKER
// ============================================

/**
 * POST /automation/cpam-check
 * Vérifie l'éligibilité CPAM pour tous les patients (batch)
 */
automation.post('/cpam-check', async (c) => {
  try {
    const checker = new CPAMBillingChecker();
    const result = await checker.processAllPatients();
    
    return c.json({
      success: true,
      message: `Checked ${result.total} patients: ${result.eligible} eligible, ${result.at_risk} at risk`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in CPAM batch check:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /automation/cpam-status/:patientId
 * Vérifie l'éligibilité CPAM pour un patient spécifique
 */
automation.get('/cpam-status/:patientId', async (c) => {
  try {
    const patientId = c.req.param('patientId');
    const checker = new CPAMBillingChecker();
    const result = await checker.checkEligibility(patientId);
    
    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error checking CPAM status:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /automation/billing-report/:month/:year
 * Génère un rapport de facturation mensuel
 */
automation.get('/billing-report/:month/:year', async (c) => {
  try {
    const month = parseInt(c.req.param('month'));
    const year = parseInt(c.req.param('year'));
    
    const checker = new CPAMBillingChecker();
    const report = await checker.generateMonthlyBillingReport(month, year);
    
    return c.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating billing report:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

// ============================================
// NOTIFICATION SERVICE
// ============================================

/**
 * POST /automation/send-sms
 * Envoie un SMS via Twilio
 */
automation.post('/send-sms', async (c) => {
  try {
    const body = await c.req.json();
    const { to, message, patient_id, alert_type } = body;
    
    if (!to || !message) {
      return c.json({
        success: false,
        error: 'Missing required fields: to, message',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendSMS({
      to,
      message,
      patient_id,
      alert_type,
    });
    
    return c.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /automation/send-email
 * Envoie un email via SendGrid
 */
automation.post('/send-email', async (c) => {
  try {
    const body = await c.req.json();
    const { to, subject, html, text, patient_id, alert_type } = body;
    
    if (!to || !subject || !html) {
      return c.json({
        success: false,
        error: 'Missing required fields: to, subject, html',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendEmail({
      to,
      subject,
      html,
      text,
      patient_id,
      alert_type,
    });
    
    return c.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /automation/send-critical-alert
 * Envoie une alerte critique (SMS + Email)
 */
automation.post('/send-critical-alert', async (c) => {
  try {
    const body = await c.req.json();
    const { phone, email, patient_name, alert_message, patient_id } = body;
    
    if (!phone || !email || !patient_name || !alert_message) {
      return c.json({
        success: false,
        error: 'Missing required fields: phone, email, patient_name, alert_message',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendCriticalAlert(
      phone,
      email,
      patient_name,
      alert_message,
      patient_id
    );
    
    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending critical alert:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /automation/send-usage-reminder
 * Envoie un rappel d'utilisation
 */
automation.post('/send-usage-reminder', async (c) => {
  try {
    const body = await c.req.json();
    const { phone, patient_name, avg_hours, patient_id } = body;
    
    if (!phone || !patient_name || avg_hours === undefined) {
      return c.json({
        success: false,
        error: 'Missing required fields: phone, patient_name, avg_hours',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendUsageReminder(
      phone,
      patient_name,
      avg_hours,
      patient_id
    );
    
    return c.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending usage reminder:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /automation/send-delivery-notification
 * Envoie une notification de livraison
 */
automation.post('/send-delivery-notification', async (c) => {
  try {
    const body = await c.req.json();
    const { phone, email, patient_name, item_name, delivery_date, patient_id } = body;
    
    if (!phone || !email || !patient_name || !item_name || !delivery_date) {
      return c.json({
        success: false,
        error: 'Missing required fields: phone, email, patient_name, item_name, delivery_date',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendDeliveryNotification(
      phone,
      email,
      patient_name,
      item_name,
      delivery_date,
      patient_id
    );
    
    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending delivery notification:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
    }
});

/**
 * POST /automation/send-monthly-report
 * Envoie un rapport mensuel
 */
automation.post('/send-monthly-report', async (c) => {
  try {
    const body = await c.req.json();
    const { email, patient_name, report_data, patient_id } = body;
    
    if (!email || !patient_name || !report_data) {
      return c.json({
        success: false,
        error: 'Missing required fields: email, patient_name, report_data',
      }, 400);
    }
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendMonthlyReport(
      email,
      patient_name,
      report_data,
      patient_id
    );
    
    return c.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending monthly report:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

export default automation;

/**
 * RÉSUMÉ DES ROUTES :
 * 
 * SLEEP SCORE CALCULATOR :
 * - POST /automation/calculate-scores (batch)
 * - POST /automation/calculate-score/:id (single)
 * - GET  /automation/quality-report/:patientId
 * 
 * CPAM BILLING CHECKER :
 * - POST /automation/cpam-check (batch)
 * - GET  /automation/cpam-status/:patientId
 * - GET  /automation/billing-report/:month/:year
 * 
 * NOTIFICATION SERVICE :
 * - POST /automation/send-sms
 * - POST /automation/send-email
 * - POST /automation/send-critical-alert
 * - POST /automation/send-usage-reminder
 * - POST /automation/send-delivery-notification
 * - POST /automation/send-monthly-report
 */