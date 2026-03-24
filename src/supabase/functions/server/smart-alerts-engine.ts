/**
 * SMART ALERTS ENGINE - Système d'Alertes Intelligent
 * Détection automatique + Workflow + Priorisation + Assignment
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { StandardizedSleepData } from './universal-adapter.ts';
import type { ExpAirScore } from './scoring-engine.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * TYPES D'ALERTES
 */
export enum AlertType {
  // Alertes critiques (intervention immédiate)
  LEAK_CRITICAL = 'LEAK_CRITICAL',               // Fuite > 40 L/min
  AHI_SEVERE = 'AHI_SEVERE',                     // AHI > 30
  NO_USAGE = 'NO_USAGE',                         // Pas d'utilisation 3+ jours
  DEVICE_ERROR = 'DEVICE_ERROR',                 // Erreur machine
  
  // Alertes importantes (action rapide)
  LEAK_HIGH = 'LEAK_HIGH',                       // Fuite 24-40 L/min
  AHI_MODERATE = 'AHI_MODERATE',                 // AHI 15-30
  LOW_USAGE = 'LOW_USAGE',                       // Usage < 4h/nuit
  MASK_INSTABILITY = 'MASK_INSTABILITY',         // Retraits fréquents
  
  // Alertes modérées (suivi requis)
  SCORE_DECLINING = 'SCORE_DECLINING',           // Score baisse > 10 pts
  PRESSURE_ABNORMAL = 'PRESSURE_ABNORMAL',       // Pression hors plage
  CONSUMABLE_DUE = 'CONSUMABLE_DUE',             // Consommable à renouveler
  
  // Alertes informatives
  COMPLIANCE_GOOD = 'COMPLIANCE_GOOD',           // Félicitations usage
  SCORE_EXCELLENT = 'SCORE_EXCELLENT',           // Score > 90
  MILESTONE_REACHED = 'MILESTONE_REACHED',       // Palier atteint
}

export interface SmartAlert {
  id?: string;
  type: AlertType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  patient_id: string;
  title: string;
  message: string;
  recommendation: string;
  
  // Données contextuelles
  context: {
    value: number;
    threshold: number;
    unit: string;
    trend?: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Workflow
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  assigned_to?: string; // UUID technicien/médecin
  auto_assigned: boolean;
  
  // Actions suggérées
  suggested_actions: string[];
  estimated_time?: number; // Minutes
  
  // Métadonnées
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  
  // Lien intervention (si créée)
  intervention_id?: string;
}

/**
 * ANALYSE AUTOMATIQUE - Point d'entrée principal
 */
export async function analyzeAndCreateAlerts(
  sleepData: StandardizedSleepData,
  score: ExpAirScore
): Promise<SmartAlert[]> {
  const alerts: SmartAlert[] = [];
  
  // 1. Vérifier fuites
  alerts.push(...checkLeakAlerts(sleepData));
  
  // 2. Vérifier AHI
  alerts.push(...checkAhiAlerts(sleepData));
  
  // 3. Vérifier usage
  alerts.push(...checkUsageAlerts(sleepData));
  
  // 4. Vérifier masque
  alerts.push(...checkMaskAlerts(sleepData));
  
  // 5. Vérifier pression
  alerts.push(...checkPressureAlerts(sleepData));
  
  // 6. Vérifier score
  alerts.push(...checkScoreAlerts(score));
  
  // 7. Vérifier consommables
  alerts.push(...await checkConsumableAlerts(sleepData.patient_id));
  
  // 8. Auto-assignment selon règles métier
  for (const alert of alerts) {
    await autoAssignAlert(alert);
  }
  
  // 9. Sauvegarder dans la base
  await saveAlerts(alerts);
  
  return alerts;
}

/**
 * RÈGLE 1 : ALERTES FUITES
 */
function checkLeakAlerts(data: StandardizedSleepData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  if (data.leak_95th > 40) {
    // Critique: > 40 L/min
    alerts.push({
      type: AlertType.LEAK_CRITICAL,
      severity: 'critical',
      patient_id: data.patient_id,
      title: '🚨 Fuites critiques détectées',
      message: `Fuites excessives: ${data.leak_95th.toFixed(1)} L/min (seuil: 40 L/min)`,
      recommendation: 'Intervention immédiate requise. Vérifier ajustement masque ou changement nécessaire.',
      context: {
        value: data.leak_95th,
        threshold: 40,
        unit: 'L/min',
        trend: 'increasing',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Appeler patient pour vérifier port masque',
        'Planifier visite technicien pour réajustement',
        'Proposer essai autre modèle masque',
        'Vérifier taille masque actuelle',
      ],
      estimated_time: 30,
      created_at: new Date().toISOString(),
    });
  } else if (data.leak_95th > 24) {
    // Important: 24-40 L/min
    alerts.push({
      type: AlertType.LEAK_HIGH,
      severity: 'high',
      patient_id: data.patient_id,
      title: '⚠️ Fuites importantes',
      message: `Fuites élevées: ${data.leak_95th.toFixed(1)} L/min (seuil: 24 L/min)`,
      recommendation: 'Réajustement masque recommandé dans les 48h.',
      context: {
        value: data.leak_95th,
        threshold: 24,
        unit: 'L/min',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Envoyer tutoriel vidéo ajustement masque',
        'Planifier appel de suivi',
        'Vérifier historique fuites (tendance)',
      ],
      estimated_time: 15,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 2 : ALERTES AHI
 */
function checkAhiAlerts(data: StandardizedSleepData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  if (data.ahi > 30) {
    // Critique: AHI > 30 (apnée sévère)
    alerts.push({
      type: AlertType.AHI_SEVERE,
      severity: 'critical',
      patient_id: data.patient_id,
      title: '🚨 Apnées non contrôlées',
      message: `AHI très élevé: ${data.ahi.toFixed(1)}/h (seuil: 30/h)`,
      recommendation: 'Consulter médecin prescripteur urgence. Traitement inefficace.',
      context: {
        value: data.ahi,
        threshold: 30,
        unit: 'événements/h',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Alerter médecin prescripteur',
        'Vérifier paramètres machine',
        'Vérifier compliance patient',
        'Proposer téléconsultation urgente',
      ],
      estimated_time: 45,
      created_at: new Date().toISOString(),
    });
  } else if (data.ahi > 15) {
    // Important: AHI 15-30 (apnée modérée)
    alerts.push({
      type: AlertType.AHI_MODERATE,
      severity: 'high',
      patient_id: data.patient_id,
      title: '⚠️ Apnées partiellement contrôlées',
      message: `AHI élevé: ${data.ahi.toFixed(1)}/h (cible: < 5/h)`,
      recommendation: 'Ajustement traitement recommandé.',
      context: {
        value: data.ahi,
        threshold: 15,
        unit: 'événements/h',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Informer médecin pour ajustement pression',
        'Vérifier type apnées (centrales vs obstructives)',
        'Planifier titration pression',
      ],
      estimated_time: 30,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 3 : ALERTES USAGE
 */
function checkUsageAlerts(data: StandardizedSleepData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  if (data.usage_hours === 0) {
    // Critique: Pas d'utilisation
    alerts.push({
      type: AlertType.NO_USAGE,
      severity: 'critical',
      patient_id: data.patient_id,
      title: '🚨 Aucune utilisation détectée',
      message: 'Patient n\'a pas utilisé son appareil',
      recommendation: 'Contacter patient immédiatement pour comprendre raison.',
      context: {
        value: 0,
        threshold: 1,
        unit: 'heures',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Appeler patient (raison: effets secondaires, oubli, problème technique)',
        'Vérifier historique compliance',
        'Proposer accompagnement personnalisé',
      ],
      estimated_time: 20,
      created_at: new Date().toISOString(),
    });
  } else if (data.usage_hours < 4) {
    // Important: Usage < 4h (non-compliance)
    alerts.push({
      type: AlertType.LOW_USAGE,
      severity: 'high',
      patient_id: data.patient_id,
      title: '⚠️ Utilisation insuffisante',
      message: `Usage: ${data.usage_hours.toFixed(1)}h (cible: 4h minimum)`,
      recommendation: 'Accompagnement patient pour améliorer compliance.',
      context: {
        value: data.usage_hours,
        threshold: 4,
        unit: 'heures',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Envoyer message encouragement',
        'Identifier barrières compliance',
        'Proposer coaching personnalisé',
        'Vérifier confort traitement',
      ],
      estimated_time: 15,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 4 : ALERTES MASQUE
 */
function checkMaskAlerts(data: StandardizedSleepData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const eventsPerHour = data.usage_hours > 0 ? data.mask_on_off_events / data.usage_hours : 0;
  
  if (eventsPerHour > 2) {
    alerts.push({
      type: AlertType.MASK_INSTABILITY,
      severity: 'high',
      patient_id: data.patient_id,
      title: '⚠️ Masque instable',
      message: `${data.mask_on_off_events} retraits détectés (${eventsPerHour.toFixed(1)}/h)`,
      recommendation: 'Vérifier confort et ajustement masque.',
      context: {
        value: data.mask_on_off_events,
        threshold: 2,
        unit: 'retraits/h',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Proposer essai autre modèle masque',
        'Vérifier taille masque',
        'Envoyer guide ajustement',
        'Planifier visite ajustement',
      ],
      estimated_time: 30,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 5 : ALERTES PRESSION
 */
function checkPressureAlerts(data: StandardizedSleepData): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  if (data.pressure_95th < 4 || data.pressure_95th > 20) {
    alerts.push({
      type: AlertType.PRESSURE_ABNORMAL,
      severity: 'medium',
      patient_id: data.patient_id,
      title: '⚠️ Pression anormale',
      message: `Pression ${data.pressure_95th.toFixed(1)} cmH2O (plage normale: 4-20)`,
      recommendation: 'Vérifier paramètres machine et consulter médecin.',
      context: {
        value: data.pressure_95th,
        threshold: data.pressure_95th < 4 ? 4 : 20,
        unit: 'cmH2O',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Vérifier réglages machine',
        'Informer médecin',
        'Vérifier absence dysfonctionnement',
      ],
      estimated_time: 20,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 6 : ALERTES SCORE
 */
function checkScoreAlerts(score: ExpAirScore): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  
  // Alerte si score en baisse significative
  if (score.trend === 'declining' && score.previous_score && score.previous_score - score.total_score > 10) {
    alerts.push({
      type: AlertType.SCORE_DECLINING,
      severity: 'medium',
      patient_id: score.patient_id,
      title: '📉 Score en baisse',
      message: `Score: ${score.total_score}/100 (baisse de ${(score.previous_score - score.total_score).toFixed(0)} points)`,
      recommendation: 'Analyser causes baisse et accompagner patient.',
      context: {
        value: score.total_score,
        threshold: score.previous_score,
        unit: 'points',
        trend: 'decreasing',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Analyser critères en baisse',
        'Contacter patient pour identifier problèmes',
        'Proposer ajustements ciblés',
      ],
      estimated_time: 15,
      created_at: new Date().toISOString(),
    });
  }
  
  // Alerte positive si excellent score
  if (score.total_score >= 90) {
    alerts.push({
      type: AlertType.SCORE_EXCELLENT,
      severity: 'low',
      patient_id: score.patient_id,
      title: '🎉 Excellent score !',
      message: `Score exceptionnel: ${score.total_score}/100 (${score.grade})`,
      recommendation: 'Féliciter patient et encourager à maintenir.',
      context: {
        value: score.total_score,
        threshold: 90,
        unit: 'points',
      },
      status: 'new',
      auto_assigned: false,
      suggested_actions: [
        'Envoyer message félicitations',
        'Partager success story (avec accord)',
        'Proposer témoignage',
      ],
      estimated_time: 5,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * RÈGLE 7 : ALERTES CONSOMMABLES
 */
async function checkConsumableAlerts(patientId: string): Promise<SmartAlert[]> {
  const alerts: SmartAlert[] = [];
  
  // Récupérer consommables du patient
  const { data: consumables } = await supabase
    .from('consumables')
    .select('*')
    .eq('patient_id', patientId)
    .lt('next_replacement_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  
  if (consumables && consumables.length > 0) {
    alerts.push({
      type: AlertType.CONSUMABLE_DUE,
      severity: 'medium',
      patient_id: patientId,
      title: '🔄 Consommable à renouveler',
      message: `${consumables.length} consommable(s) à renouveler prochainement`,
      recommendation: 'Planifier livraison consommables.',
      context: {
        value: consumables.length,
        threshold: 1,
        unit: 'consommables',
      },
      status: 'new',
      auto_assigned: true,
      suggested_actions: [
        'Préparer commande consommables',
        'Contacter patient pour confirmer adresse',
        'Planifier livraison',
      ],
      estimated_time: 10,
      created_at: new Date().toISOString(),
    });
  }
  
  return alerts;
}

/**
 * AUTO-ASSIGNMENT INTELLIGENT
 */
async function autoAssignAlert(alert: SmartAlert): Promise<void> {
  if (!alert.auto_assigned) return;
  
  // Règles d'assignation
  let assignTo: string | undefined;
  
  switch (alert.severity) {
    case 'critical':
      // Alertes critiques → Responsable technique senior
      assignTo = await findAvailableTechnician('senior');
      break;
      
    case 'high':
      // Alertes importantes → Technicien disponible
      assignTo = await findAvailableTechnician('any');
      break;
      
    case 'medium':
      // Alertes modérées → Pool techniciens
      assignTo = await findAvailableTechnician('any');
      break;
      
    case 'low':
      // Alertes informatives → Pas d'assignation auto
      break;
  }
  
  alert.assigned_to = assignTo;
}

/**
 * TROUVER TECHNICIEN DISPONIBLE
 */
async function findAvailableTechnician(level: 'senior' | 'any'): Promise<string | undefined> {
  const { data: technicians } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'prestataire')
    .eq('is_active', true)
    .limit(1);
  
  return technicians?.[0]?.id;
}

/**
 * SAUVEGARDE ALERTES
 */
async function saveAlerts(alerts: SmartAlert[]): Promise<void> {
  if (alerts.length === 0) return;
  
  const { error } = await supabase
    .from('alerts')
    .insert(alerts.map(a => ({
      type: a.type,
      severity: a.severity,
      patient_id: a.patient_id,
      title: a.title,
      message: a.message,
      recommendation: a.recommendation,
      context: a.context,
      status: a.status,
      assigned_to: a.assigned_to,
      auto_assigned: a.auto_assigned,
      suggested_actions: a.suggested_actions,
      estimated_time: a.estimated_time,
      created_at: a.created_at,
    })));
  
  if (error) {
    console.error('Erreur sauvegarde alertes:', error);
  }
}

/**
 * WORKFLOW : ACKNOWLEDGE ALERT
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  await supabase
    .from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      assigned_to: userId,
    })
    .eq('id', alertId);
}

/**
 * WORKFLOW : RESOLVE ALERT
 */
export async function resolveAlert(
  alertId: string,
  userId: string,
  resolutionNote: string,
  interventionId?: string
): Promise<void> {
  await supabase
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_note: resolutionNote,
      intervention_id: interventionId,
    })
    .eq('id', alertId);
}