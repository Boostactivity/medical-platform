/**
 * ALERT ENGINE - Système de détection automatique des problèmes
 * Analyse les données de sommeil et crée des alertes contextuelles
 * Appelé automatiquement après chaque import de données machine
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Types d'alertes disponibles
 */
export enum AlertType {
  LOW_COMPLIANCE = 'LOW_COMPLIANCE',
  HIGH_LEAK = 'HIGH_LEAK',
  HIGH_AHI = 'HIGH_AHI',
  DEVICE_ERROR = 'DEVICE_ERROR',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  CONSUMABLE_REPLACEMENT = 'CONSUMABLE_REPLACEMENT',
  NO_SYNC = 'NO_SYNC',
  BATTERY_LOW = 'BATTERY_LOW',
  PRESSURE_ABNORMAL = 'PRESSURE_ABNORMAL',
  MASK_FIT_ISSUE = 'MASK_FIT_ISSUE'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

interface AlertData {
  patient_id: string;
  device_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  trigger_data?: Record<string, any>;
  action_required?: boolean;
  action_url?: string;
}

/**
 * Crée une alerte dans la queue si elle n'existe pas déjà
 */
async function createAlert(alertData: AlertData): Promise<boolean> {
  try {
    // Vérifier si une alerte similaire existe déjà (open ou acknowledged)
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('patient_id', alertData.patient_id)
      .eq('alert_type', alertData.alert_type)
      .in('status', ['open', 'acknowledged'])
      .maybeSingle();

    if (existingAlert) {
      console.log(`[ALERT ENGINE] Alert ${alertData.alert_type} already exists for patient ${alertData.patient_id}`);
      return false;
    }

    // Créer la nouvelle alerte
    const { error } = await supabase
      .from('alerts')
      .insert({
        ...alertData,
        status: 'open',
        notification_sent: false,
      });

    if (error) {
      console.error('[ALERT ENGINE] Error creating alert:', error);
      return false;
    }

    console.log(`[ALERT ENGINE] ✅ Created alert ${alertData.alert_type} for patient ${alertData.patient_id}`);
    return true;
  } catch (err) {
    console.error('[ALERT ENGINE] Exception creating alert:', err);
    return false;
  }
}

/**
 * RÈGLE 1 : Observance faible (< 4h/nuit sur 3 nuits)
 */
export async function checkLowCompliance(patientId: string): Promise<void> {
  try {
    // Récupère les 3 dernières nuits
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recentNights, error } = await supabase
      .from('observance_data')
      .select('usage_hours, date')
      .eq('patient_id', patientId)
      .gte('date', threeDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error || !recentNights || recentNights.length < 3) {
      return;
    }

    const avgUsage = recentNights.reduce((sum, n) => sum + (n.usage_hours || 0), 0) / recentNights.length;

    // Seuil critique : < 3h
    if (avgUsage < 3) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.LOW_COMPLIANCE,
        severity: AlertSeverity.CRITICAL,
        title: '⚠️ Observance critique',
        message: `Votre utilisation moyenne est de ${avgUsage.toFixed(1)}h/nuit sur les 3 derniers jours. L'objectif est de 4h minimum pour maintenir le remboursement.`,
        trigger_data: { avg_usage: avgUsage, threshold: 3, nights_analyzed: 3 },
        action_required: true,
        action_url: '/contact-support',
      });
    }
    // Seuil warning : 3-4h
    else if (avgUsage < 4) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.LOW_COMPLIANCE,
        severity: AlertSeverity.WARNING,
        title: '📊 Observance à améliorer',
        message: `Votre utilisation moyenne est de ${avgUsage.toFixed(1)}h/nuit. Essayez d'atteindre 4h pour une efficacité optimale.`,
        trigger_data: { avg_usage: avgUsage, threshold: 4, nights_analyzed: 3 },
        action_required: false,
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkLowCompliance:', err);
  }
}

/**
 * RÈGLE 2 : Fuites élevées (> 24L/min en moyenne sur 3 nuits)
 */
export async function checkHighLeak(patientId: string): Promise<void> {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recentNights, error } = await supabase
      .from('observance_data')
      .select('leak_rate, date')
      .eq('patient_id', patientId)
      .gte('date', threeDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(3);

    if (error || !recentNights || recentNights.length < 3) {
      return;
    }

    const avgLeak = recentNights.reduce((sum, n) => sum + (n.leak_rate || 0), 0) / recentNights.length;

    // Seuil critique : > 30L/min
    if (avgLeak > 30) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.HIGH_LEAK,
        severity: AlertSeverity.CRITICAL,
        title: '💨 Fuites importantes détectées',
        message: `Fuites moyennes de ${avgLeak.toFixed(1)}L/min sur 3 nuits. Votre masque nécessite un ajustement urgent.`,
        trigger_data: { avg_leak: avgLeak, threshold: 30, nights_analyzed: 3 },
        action_required: true,
        action_url: '/tutorials/mask-fitting',
      });
    }
    // Seuil warning : 24-30L/min
    else if (avgLeak > 24) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.HIGH_LEAK,
        severity: AlertSeverity.WARNING,
        title: '💨 Fuites détectées',
        message: `Fuites moyennes de ${avgLeak.toFixed(1)}L/min. L'objectif est < 24L/min. Consultez nos tutoriels d'ajustement.`,
        trigger_data: { avg_leak: avgLeak, threshold: 24, nights_analyzed: 3 },
        action_required: false,
        action_url: '/tutorials/mask-fitting',
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkHighLeak:', err);
  }
}

/**
 * RÈGLE 3 : IAH élevé (> 10 événements/heure sur 3 nuits)
 */
export async function checkHighAHI(patientId: string): Promise<void> {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recentNights, error } = await supabase
      .from('observance_data')
      .select('ahi, date')
      .eq('patient_id', patientId)
      .gte('date', threeDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(3);

    if (error || !recentNights || recentNights.length < 3) {
      return;
    }

    const avgAHI = recentNights.reduce((sum, n) => sum + (n.ahi || 0), 0) / recentNights.length;

    // Seuil critique : > 15
    if (avgAHI > 15) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.HIGH_AHI,
        severity: AlertSeverity.CRITICAL,
        title: '🔴 IAH élevé - Action requise',
        message: `Votre IAH moyen est de ${avgAHI.toFixed(1)} événements/heure. Consultez votre médecin rapidement.`,
        trigger_data: { avg_ahi: avgAHI, threshold: 15, nights_analyzed: 3 },
        action_required: true,
        action_url: '/contact-doctor',
      });
    }
    // Seuil warning : 10-15
    else if (avgAHI > 10) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.HIGH_AHI,
        severity: AlertSeverity.WARNING,
        title: '🟡 IAH à surveiller',
        message: `Votre IAH moyen est de ${avgAHI.toFixed(1)} événements/heure. L'objectif est < 10. Vérifiez l'ajustement de votre masque.`,
        trigger_data: { avg_ahi: avgAHI, threshold: 10, nights_analyzed: 3 },
        action_required: false,
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkHighAHI:', err);
  }
}

/**
 * RÈGLE 4 : Absence de synchronisation (> 2 jours sans données)
 */
export async function checkNoSync(patientId: string): Promise<void> {
  try {
    // Récupère la date de la dernière donnée
    const { data: lastNight } = await supabase
      .from('observance_data')
      .select('date')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastNight) {
      return;
    }

    const lastNightDate = new Date(lastNight.date);
    const daysSinceLastSync = Math.floor(
      (Date.now() - lastNightDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alerte si > 2 jours sans sync
    if (daysSinceLastSync > 2) {
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.NO_SYNC,
        severity: daysSinceLastSync > 5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: '📡 Appareil non synchronisé',
        message: `Aucune donnée reçue depuis ${daysSinceLastSync} jours. Vérifiez la connexion de votre machine.`,
        trigger_data: { days_since_last_sync: daysSinceLastSync, last_sync_date: lastNight.date },
        action_required: daysSinceLastSync > 5,
        action_url: '/device-troubleshooting',
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkNoSync:', err);
  }
}

/**
 * RÈGLE 5 : Maintenance préventive (6 mois depuis dernière maintenance)
 */
export async function checkMaintenanceDue(patientId: string): Promise<void> {
  try {
    // Récupère l'appareil actif du patient
    const { data: assignment } = await supabase
      .from('device_assignments')
      .select('device_id, devices(id, last_maintenance_date)')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignment || !assignment.devices) {
      return;
    }

    const device = assignment.devices as any;
    const lastMaintenanceDate = device.last_maintenance_date
      ? new Date(device.last_maintenance_date)
      : new Date(0); // Si jamais de maintenance, date très ancienne

    const monthsSinceLastMaintenance = Math.floor(
      (Date.now() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Alerte si > 6 mois
    if (monthsSinceLastMaintenance > 6) {
      await createAlert({
        patient_id: patientId,
        device_id: device.id,
        alert_type: AlertType.MAINTENANCE_DUE,
        severity: monthsSinceLastMaintenance > 9 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: '🔧 Maintenance préventive recommandée',
        message: `Votre appareil n'a pas été entretenu depuis ${monthsSinceLastMaintenance} mois. Planifiez une intervention.`,
        trigger_data: { months_since_maintenance: monthsSinceLastMaintenance },
        action_required: monthsSinceLastMaintenance > 9,
        action_url: '/schedule-maintenance',
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkMaintenanceDue:', err);
  }
}

/**
 * RÈGLE 6 : Remplacement consommable (90 jours depuis dernière commande)
 */
export async function checkConsumableReplacement(patientId: string): Promise<void> {
  try {
    // Récupère la dernière commande de masque
    const { data: lastOrder } = await supabase
      .from('consumable_orders')
      .select('order_date, consumables(name, replacement_frequency_days)')
      .eq('patient_id', patientId)
      .eq('status', 'delivered')
      .order('order_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastOrder || !lastOrder.consumables) {
      return;
    }

    const consumable = lastOrder.consumables as any;
    const orderDate = new Date(lastOrder.order_date);
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const replacementDue = consumable.replacement_frequency_days || 90;

    // Alerte si proche ou dépassé
    if (daysSinceOrder >= replacementDue - 7) {
      const isOverdue = daysSinceOrder >= replacementDue;
      
      await createAlert({
        patient_id: patientId,
        alert_type: AlertType.CONSUMABLE_REPLACEMENT,
        severity: isOverdue ? AlertSeverity.WARNING : AlertSeverity.INFO,
        title: isOverdue ? '🛒 Remplacement en retard' : '🛒 Remplacement à prévoir',
        message: isOverdue
          ? `Votre ${consumable.name} devrait être remplacé. Passez commande dès maintenant.`
          : `Votre ${consumable.name} arrivera bientôt à échéance (dans ${replacementDue - daysSinceOrder} jours).`,
        trigger_data: { 
          days_since_order: daysSinceOrder, 
          replacement_due: replacementDue,
          consumable_name: consumable.name 
        },
        action_required: isOverdue,
        action_url: '/order-consumables',
      });
    }
  } catch (err) {
    console.error('[ALERT ENGINE] Error in checkConsumableReplacement:', err);
  }
}

/**
 * FONCTION PRINCIPALE : Analyse complète d'un patient
 */
export async function analyzePatient(patientId: string): Promise<{
  success: boolean;
  alertsCreated: number;
}> {
  console.log(`[ALERT ENGINE] 🔍 Analyzing patient ${patientId}...`);

  const startTime = Date.now();
  let alertsCreated = 0;

  try {
    // Exécuter toutes les règles en parallèle
    await Promise.all([
      checkLowCompliance(patientId),
      checkHighLeak(patientId),
      checkHighAHI(patientId),
      checkNoSync(patientId),
      checkMaintenanceDue(patientId),
      checkConsumableReplacement(patientId),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[ALERT ENGINE] ✅ Analysis complete in ${duration}ms`);

    return { success: true, alertsCreated };
  } catch (err) {
    console.error('[ALERT ENGINE] ❌ Error analyzing patient:', err);
    return { success: false, alertsCreated: 0 };
  }
}

/**
 * FONCTION BATCH : Analyse tous les patients actifs
 */
export async function analyzeBatch(): Promise<{
  success: boolean;
  patientsAnalyzed: number;
  totalAlerts: number;
}> {
  console.log('[ALERT ENGINE] 🚀 Starting batch analysis...');

  try {
    // Récupère tous les patients avec un appareil actif
    const { data: patients, error } = await supabase
      .from('device_assignments')
      .select('patient_id')
      .eq('is_active', true);

    if (error || !patients) {
      console.error('[ALERT ENGINE] Error fetching patients:', error);
      return { success: false, patientsAnalyzed: 0, totalAlerts: 0 };
    }

    const uniquePatients = [...new Set(patients.map((p) => p.patient_id))];
    console.log(`[ALERT ENGINE] Found ${uniquePatients.length} active patients`);

    let totalAlerts = 0;

    // Analyser chaque patient (séquentiel pour éviter la surcharge)
    for (const patientId of uniquePatients) {
      const result = await analyzePatient(patientId);
      if (result.success) {
        totalAlerts += result.alertsCreated;
      }
      
      // Pause de 100ms entre chaque patient pour ne pas surcharger la DB
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[ALERT ENGINE] ✅ Batch complete. Analyzed ${uniquePatients.length} patients, created ${totalAlerts} alerts`);

    return {
      success: true,
      patientsAnalyzed: uniquePatients.length,
      totalAlerts,
    };
  } catch (err) {
    console.error('[ALERT ENGINE] ❌ Error in batch analysis:', err);
    return { success: false, patientsAnalyzed: 0, totalAlerts: 0 };
  }
}