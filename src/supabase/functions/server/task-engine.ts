/**
 * ============================================
 * MOTEUR DE TÂCHES AUTOMATIQUES
 * ============================================
 * 
 * Génère automatiquement des tâches pour les techniciens et médecins
 * selon des triggers cliniques et opérationnels
 * 
 * TRIGGERS :
 * - AHI critique (>30)
 * - Observance faible (<4h pendant 3 jours consécutifs)
 * - Fuites excessives (>40 L/min)
 * - Appareil non utilisé depuis 7 jours
 */

import { StandardizedData } from './adapters.ts';

// ============================================
// TYPES
// ============================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'call_patient' | 'technical_intervention' | 'medical_consultation' | 'equipment_check' | 'follow_up';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id?: string;
  patient_id: string;
  patient_name?: string;
  assigned_to?: string; // user_id du technicien/médecin
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description: string;
  trigger_reason: string;
  metadata?: {
    ahi?: number;
    usage_hours?: number;
    leak_rate?: number;
    days_inactive?: number;
  };
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

export interface TriggerResult {
  triggered: boolean;
  task?: Task;
  reason?: string;
}

// ============================================
// CALCUL DU SCORE QUOTIDIEN
// ============================================

export type DailyScore = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export function calculateDailyScore(data: StandardizedData): {
  score: DailyScore;
  details: {
    ahi_score: number;
    usage_score: number;
    leak_score: number;
    overall_score: number;
  };
} {
  // Score AHI (0-100)
  const ahi_score = data.ahi < 5 ? 100 : data.ahi < 15 ? 70 : data.ahi < 30 ? 40 : 0;
  
  // Score Usage (0-100)
  const usage_score = data.usage_hours >= 7 ? 100 : data.usage_hours >= 4 ? 70 : data.usage_hours >= 2 ? 40 : 0;
  
  // Score Fuites (0-100)
  const leak_score = data.leak_rate < 24 ? 100 : data.leak_rate < 40 ? 70 : data.leak_rate < 60 ? 40 : 0;
  
  // Score global (moyenne pondérée)
  const overall_score = (ahi_score * 0.5 + usage_score * 0.3 + leak_score * 0.2);
  
  // Déterminer le niveau
  let score: DailyScore;
  if (overall_score >= 85) score = 'excellent';
  else if (overall_score >= 60) score = 'good';
  else if (overall_score >= 40) score = 'fair';
  else if (overall_score >= 20) score = 'poor';
  else score = 'critical';

  return {
    score,
    details: {
      ahi_score,
      usage_score,
      leak_score,
      overall_score,
    },
  };
}

// ============================================
// TRIGGER 1 : AHI CRITIQUE
// ============================================

export function checkCriticalAHI(
  patientId: string,
  patientName: string,
  data: StandardizedData
): TriggerResult {
  if (data.ahi >= 30) {
    return {
      triggered: true,
      reason: `AHI critique détecté : ${data.ahi.toFixed(1)} événements/heure`,
      task: {
        patient_id: patientId,
        patient_name: patientName,
        type: 'call_patient',
        priority: 'critical',
        status: 'pending',
        title: `🚨 URGENCE - Appeler ${patientName} - AHI Critique`,
        description: `AHI anormalement élevé : ${data.ahi.toFixed(1)} événements/heure (seuil critique : ≥30).
        
**Actions recommandées :**
1. Contacter le patient dans les 24h
2. Vérifier l'étanchéité du masque
3. Contrôler les réglages de l'appareil
4. Envisager une consultation médicale urgente

**Contexte :**
- Usage : ${data.usage_hours.toFixed(1)}h
- Fuites : ${data.leak_rate.toFixed(1)} L/min
- Date : ${new Date(data.recorded_at).toLocaleDateString('fr-FR')}`,
        trigger_reason: 'critical_ahi',
        metadata: {
          ahi: data.ahi,
          usage_hours: data.usage_hours,
          leak_rate: data.leak_rate,
        },
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
        created_at: new Date().toISOString(),
      },
    };
  }

  return { triggered: false };
}

// ============================================
// TRIGGER 2 : OBSERVANCE FAIBLE
// ============================================

export function checkLowCompliance(
  patientId: string,
  patientName: string,
  recentData: StandardizedData[]
): TriggerResult {
  // Vérifier les 3 derniers jours
  const last3Days = recentData.slice(-3);
  
  if (last3Days.length < 3) {
    return { triggered: false };
  }

  const allBelowThreshold = last3Days.every(d => d.usage_hours < 4);

  if (allBelowThreshold) {
    const avgUsage = last3Days.reduce((sum, d) => sum + d.usage_hours, 0) / 3;

    return {
      triggered: true,
      reason: `Observance insuffisante : ${avgUsage.toFixed(1)}h/nuit (3 jours consécutifs)`,
      task: {
        patient_id: patientId,
        patient_name: patientName,
        type: 'call_patient',
        priority: 'high',
        status: 'pending',
        title: `⚠️ Appeler ${patientName} - Observance Faible`,
        description: `Observance insuffisante détectée sur 3 jours consécutifs.

**Statistiques :**
- Moyenne d'usage : ${avgUsage.toFixed(1)}h/nuit (objectif : ≥4h)
- Jours concernés : ${last3Days.map(d => new Date(d.recorded_at).toLocaleDateString('fr-FR')).join(', ')}

**Actions recommandées :**
1. Contacter le patient pour identifier les obstacles
2. Vérifier le confort du masque
3. Proposer un accompagnement personnalisé
4. Évaluer les effets secondaires éventuels`,
        trigger_reason: 'low_compliance',
        metadata: {
          usage_hours: avgUsage,
        },
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // +48h
        created_at: new Date().toISOString(),
      },
    };
  }

  return { triggered: false };
}

// ============================================
// TRIGGER 3 : FUITES EXCESSIVES
// ============================================

export function checkExcessiveLeaks(
  patientId: string,
  patientName: string,
  data: StandardizedData
): TriggerResult {
  if (data.leak_rate >= 40) {
    return {
      triggered: true,
      reason: `Fuites excessives : ${data.leak_rate.toFixed(1)} L/min`,
      task: {
        patient_id: patientId,
        patient_name: patientName,
        type: 'technical_intervention',
        priority: 'medium',
        status: 'pending',
        title: `🔧 Intervention Technique - ${patientName} - Fuites`,
        description: `Fuites importantes détectées : ${data.leak_rate.toFixed(1)} L/min (seuil : <24 L/min).

**Diagnostic probable :**
- Mauvais ajustement du masque
- Usure du coussin nasal
- Fuite bouche ouverte

**Actions recommandées :**
1. Visite technique pour vérifier l'ajustement
2. Remplacer le coussin si nécessaire
3. Évaluer la nécessité d'un masque alternatif
4. Former le patient au bon positionnement`,
        trigger_reason: 'excessive_leaks',
        metadata: {
          leak_rate: data.leak_rate,
          ahi: data.ahi,
        },
        due_date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // +72h
        created_at: new Date().toISOString(),
      },
    };
  }

  return { triggered: false };
}

// ============================================
// TRIGGER 4 : APPAREIL INACTIF
// ============================================

export function checkInactiveDevice(
  patientId: string,
  patientName: string,
  lastDataDate: string
): TriggerResult {
  const daysSinceLastData = Math.floor(
    (Date.now() - new Date(lastDataDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastData >= 7) {
    return {
      triggered: true,
      reason: `Appareil inactif depuis ${daysSinceLastData} jours`,
      task: {
        patient_id: patientId,
        patient_name: patientName,
        type: 'call_patient',
        priority: 'high',
        status: 'pending',
        title: `📵 Appeler ${patientName} - Appareil Inactif`,
        description: `Aucune donnée reçue depuis ${daysSinceLastData} jours (dernière connexion : ${new Date(lastDataDate).toLocaleDateString('fr-FR')}).

**Causes possibles :**
- Patient n'utilise plus l'appareil
- Problème technique (panne, câble débranché)
- Problème de connectivité
- Abandon du traitement

**Actions recommandées :**
1. Contacter immédiatement le patient
2. Vérifier l'état de l'appareil
3. Identifier les raisons de l'arrêt
4. Proposer un accompagnement si nécessaire
5. Informer le médecin prescripteur si abandon`,
        trigger_reason: 'inactive_device',
        metadata: {
          days_inactive: daysSinceLastData,
        },
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24h
        created_at: new Date().toISOString(),
      },
    };
  }

  return { triggered: false };
}

// ============================================
// FONCTION PRINCIPALE : ANALYSER ET CRÉER TÂCHE
// ============================================

export function createAutomaticTask(
  patientId: string,
  patientName: string,
  currentData: StandardizedData,
  recentHistory: StandardizedData[] = []
): TriggerResult[] {
  console.log(`[TASK ENGINE] Analyzing patient ${patientName}...`);

  const results: TriggerResult[] = [];

  // Calcul du score quotidien
  const scoreResult = calculateDailyScore(currentData);
  console.log(`[TASK ENGINE] Daily score: ${scoreResult.score} (${scoreResult.details.overall_score.toFixed(0)}/100)`);

  // Check 1 : AHI Critique
  if (scoreResult.score === 'critical') {
    const criticalAHI = checkCriticalAHI(patientId, patientName, currentData);
    if (criticalAHI.triggered) {
      console.log(`[TASK ENGINE] ✅ TRIGGER: ${criticalAHI.reason}`);
      results.push(criticalAHI);
    }
  }

  // Check 2 : Observance faible (besoin de l'historique)
  if (recentHistory.length >= 3) {
    const lowCompliance = checkLowCompliance(patientId, patientName, recentHistory);
    if (lowCompliance.triggered) {
      console.log(`[TASK ENGINE] ✅ TRIGGER: ${lowCompliance.reason}`);
      results.push(lowCompliance);
    }
  }

  // Check 3 : Fuites excessives
  const excessiveLeaks = checkExcessiveLeaks(patientId, patientName, currentData);
  if (excessiveLeaks.triggered) {
    console.log(`[TASK ENGINE] ✅ TRIGGER: ${excessiveLeaks.reason}`);
    results.push(excessiveLeaks);
  }

  // Check 4 : Appareil inactif (si la dernière donnée est ancienne)
  const inactiveDevice = checkInactiveDevice(patientId, patientName, currentData.recorded_at);
  if (inactiveDevice.triggered) {
    console.log(`[TASK ENGINE] ✅ TRIGGER: ${inactiveDevice.reason}`);
    results.push(inactiveDevice);
  }

  if (results.length === 0) {
    console.log(`[TASK ENGINE] ✓ No triggers activated. Patient status: ${scoreResult.score}`);
  }

  return results;
}

// ============================================
// HELPER : Sauvegarder une tâche en DB
// ============================================

export async function saveTaskToDatabase(task: Task, supabase: any): Promise<void> {
  console.log(`[TASK ENGINE] Saving task to database: ${task.title}`);

  const { error } = await supabase
    .from('kv_store_50732e52')
    .insert({
      key: `task:${task.patient_id}:${Date.now()}`,
      value: JSON.stringify(task),
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[TASK ENGINE] ❌ Failed to save task:', error);
    throw error;
  }

  console.log('[TASK ENGINE] ✅ Task saved successfully');
}
