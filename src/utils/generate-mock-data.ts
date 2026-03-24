/**
 * GÉNÉRATEUR DE DONNÉES DE TEST
 * Simule des données d'appareil PPC pour développement/démo
 */

import { createClient } from './supabase/client';

export interface MockDataOptions {
  patientId: string;
  daysOfHistory: number;
  manufacturer?: 'resmed' | 'philips' | 'lowenstein';
  scenario?: 'excellent' | 'good' | 'declining' | 'problematic' | 'mixed';
}

/**
 * GÉNÉRATEUR PRINCIPAL
 * Crée un historique de données PPC simulées
 */
export async function generateMockSleepData(options: MockDataOptions) {
  const {
    patientId,
    daysOfHistory = 30,
    manufacturer = 'resmed',
    scenario = 'mixed',
  } = options;

  const supabase = createClient();
  const mockData = [];

  console.log(`[MOCK DATA] Génération de ${daysOfHistory} jours pour patient ${patientId}`);
  console.log(`[MOCK DATA] Scénario: ${scenario}, Fabricant: ${manufacturer}`);

  for (let i = daysOfHistory - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Générer données selon le scénario
    const dayData = generateDayData(i, daysOfHistory, scenario);

    mockData.push({
      user_id: patientId,
      date: dateStr,
      usage_hours: dayData.usage_hours,
      ahi: dayData.ahi,
      leak_95: dayData.leak_95,
      leak_median: dayData.leak_median,
      pressure_95: dayData.pressure_95,
      pressure_median: dayData.pressure_median,
      mask_events: dayData.mask_events,
      compliance_score: dayData.compliance_score,
      total_sleep_time: dayData.total_sleep_time,
      device_serial: `${manufacturer.toUpperCase()}-${Math.random().toString(36).substring(7)}`,
      manufacturer: manufacturer,
      apneas_total: Math.floor(dayData.ahi * dayData.usage_hours * 0.6),
      hypopneas: Math.floor(dayData.ahi * dayData.usage_hours * 0.4),
    });
  }

  // Insertion dans la base (le trigger calculera automatiquement les scores)
  const { data, error } = await supabase
    .from('sleep_data')
    .upsert(mockData, { onConflict: 'user_id,date' })
    .select();

  if (error) {
    console.error('[MOCK DATA] Erreur insertion:', error);
    throw error;
  }

  console.log(`[MOCK DATA] ✅ ${mockData.length} jours de données créés avec succès`);
  
  return {
    success: true,
    daysGenerated: mockData.length,
    dateRange: {
      from: mockData[mockData.length - 1].date,
      to: mockData[0].date,
    },
    manufacturer,
    scenario,
  };
}

/**
 * GÉNÉRATEUR DE DONNÉES POUR 1 JOUR
 * Selon le scénario choisi
 */
function generateDayData(
  dayIndex: number,
  totalDays: number,
  scenario: string
): {
  usage_hours: number;
  ahi: number;
  leak_95: number;
  leak_median: number;
  pressure_95: number;
  pressure_median: number;
  mask_events: number;
  compliance_score: number;
  total_sleep_time: number;
} {
  const progress = dayIndex / totalDays; // 0 = ancien, 1 = récent
  let baseData: any;

  switch (scenario) {
    case 'excellent':
      // Patient modèle: utilisation excellente et IAH contrôlé
      baseData = {
        usage_hours: randomInRange(7, 8.5),
        ahi: randomInRange(1.5, 4),
        leak_95: randomInRange(5, 15),
        pressure_95: randomInRange(10, 13),
        mask_events: randomInt(0, 2),
      };
      break;

    case 'good':
      // Patient correct: observance bonne, IAH acceptable
      baseData = {
        usage_hours: randomInRange(5, 7),
        ahi: randomInRange(4, 8),
        leak_95: randomInRange(12, 22),
        pressure_95: randomInRange(9, 14),
        mask_events: randomInt(1, 4),
      };
      break;

    case 'declining':
      // Détérioration progressive au fil du temps
      baseData = {
        usage_hours: randomInRange(7 - progress * 3, 8 - progress * 3), // 7-8h → 4-5h
        ahi: randomInRange(3 + progress * 7, 5 + progress * 10), // 3-5 → 10-15
        leak_95: randomInRange(8 + progress * 20, 12 + progress * 25), // 8-12 → 28-37
        pressure_95: randomInRange(10, 13),
        mask_events: randomInt(progress * 5, progress * 10 + 2), // 0-2 → 5-12
      };
      break;

    case 'problematic':
      // Patient en difficulté: mauvaise observance, IAH non contrôlé
      baseData = {
        usage_hours: randomInRange(2, 4.5),
        ahi: randomInRange(12, 25),
        leak_95: randomInRange(28, 45),
        pressure_95: randomInRange(8, 16),
        mask_events: randomInt(5, 15),
      };
      break;

    case 'mixed':
    default:
      // Profil réaliste: alternance bons/mauvais jours
      const isGoodDay = Math.random() > 0.3; // 70% de bons jours
      const isBadNight = Math.random() > 0.85; // 15% de très mauvaises nuits

      if (isBadNight) {
        baseData = {
          usage_hours: randomInRange(1, 3),
          ahi: randomInRange(15, 30),
          leak_95: randomInRange(30, 50),
          pressure_95: randomInRange(8, 15),
          mask_events: randomInt(8, 20),
        };
      } else if (isGoodDay) {
        baseData = {
          usage_hours: randomInRange(6, 8),
          ahi: randomInRange(2, 6),
          leak_95: randomInRange(8, 20),
          pressure_95: randomInRange(10, 13),
          mask_events: randomInt(0, 3),
        };
      } else {
        baseData = {
          usage_hours: randomInRange(4, 6),
          ahi: randomInRange(6, 12),
          leak_95: randomInRange(18, 30),
          pressure_95: randomInRange(9, 14),
          mask_events: randomInt(3, 7),
        };
      }
      break;
  }

  // Calculs dérivés
  baseData.leak_median = baseData.leak_95 * 0.6; // Médiane ≈ 60% du 95ème percentile
  baseData.pressure_median = baseData.pressure_95 * 0.85;
  baseData.total_sleep_time = baseData.usage_hours + randomInRange(0.2, 0.8); // Temps au lit > temps masque
  baseData.compliance_score = baseData.usage_hours >= 4 ? 100 : (baseData.usage_hours / 4) * 100;

  // Arrondir valeurs
  return {
    usage_hours: roundTo(baseData.usage_hours, 1),
    ahi: roundTo(baseData.ahi, 1),
    leak_95: roundTo(baseData.leak_95, 1),
    leak_median: roundTo(baseData.leak_median, 1),
    pressure_95: roundTo(baseData.pressure_95, 1),
    pressure_median: roundTo(baseData.pressure_median, 1),
    mask_events: baseData.mask_events,
    compliance_score: Math.round(baseData.compliance_score),
    total_sleep_time: roundTo(baseData.total_sleep_time, 1),
  };
}

/**
 * GÉNÉRATEUR DE DONNÉES RESMED (JSON)
 * Pour tester le parseur universel
 */
export function generateResMedJSON(patientId: string, numSessions: number = 1): string {
  const sessions = [];

  for (let i = 0; i < numSessions; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayData = generateDayData(i, numSessions, 'mixed');

    sessions.push({
      DeviceSerialNumber: `RESMED${Math.random().toString(36).substring(7).toUpperCase()}`,
      DeviceType: 'AirSense 10 AutoSet',
      StartDate: date.toISOString().split('T')[0],
      TotalUsage: dayData.usage_hours * 60, // Secondes
      AHI: dayData.ahi,
      TotalApneas: Math.floor(dayData.ahi * dayData.usage_hours * 0.6),
      ObstructiveApneas: Math.floor(dayData.ahi * dayData.usage_hours * 0.4),
      CentralApneas: Math.floor(dayData.ahi * dayData.usage_hours * 0.2),
      Hypopneas: Math.floor(dayData.ahi * dayData.usage_hours * 0.4),
      Pressure95: dayData.pressure_95,
      PressureMedian: dayData.pressure_median,
      PressureMin: 4,
      PressureMax: 20,
      DeviceMode: 'AutoSet',
      Leak95: dayData.leak_95,
      LeakMedian: dayData.leak_median,
      LeakMax: dayData.leak_95 * 1.3,
      MaskEvents: dayData.mask_events,
      MaskType: 'ResMed AirFit F20',
      HumidifierSetting: 4,
    });
  }

  return JSON.stringify(numSessions === 1 ? sessions[0] : sessions, null, 2);
}

/**
 * GÉNÉRATEUR DE DONNÉES PHILIPS (CSV)
 * Pour tester le parseur universel
 */
export function generatePhilipsCSV(patientId: string, numSessions: number = 7): string {
  let csv = 'Date,Device Serial Number,Device Model,Usage Time,Total Time in Bed,AHI,Total Apneas,Obstructive Apneas,Central Apneas,Hypopneas,Pressure 95%,Pressure Median,Pressure Min,Pressure Max,Mode,Leak 95%,Leak Median,Leak Max,Mask Events,Compliance %\n';

  for (let i = 0; i < numSessions; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;

    const dayData = generateDayData(i, numSessions, 'mixed');
    const usageHours = Math.floor(dayData.usage_hours);
    const usageMinutes = Math.round((dayData.usage_hours - usageHours) * 60);

    csv += [
      dateStr,
      `PH${Math.random().toString(36).substring(7).toUpperCase()}`,
      'DreamStation 2',
      `${usageHours}:${usageMinutes.toString().padStart(2, '0')}`,
      `${Math.floor(dayData.total_sleep_time)}:${Math.round((dayData.total_sleep_time % 1) * 60).toString().padStart(2, '0')}`,
      dayData.ahi,
      Math.floor(dayData.ahi * dayData.usage_hours),
      Math.floor(dayData.ahi * dayData.usage_hours * 0.6),
      Math.floor(dayData.ahi * dayData.usage_hours * 0.1),
      Math.floor(dayData.ahi * dayData.usage_hours * 0.3),
      dayData.pressure_95,
      dayData.pressure_median,
      4,
      20,
      'Auto',
      dayData.leak_95,
      dayData.leak_median,
      dayData.leak_95 * 1.2,
      dayData.mask_events,
      dayData.compliance_score,
    ].join(',') + '\n';
  }

  return csv;
}

/**
 * FONCTION DE NETTOYAGE
 * Supprime toutes les données de test
 */
export async function clearMockData(patientId: string) {
  const supabase = createClient();

  // Supprimer sleep_data (cascade vers patient_stats et alerts_queue)
  const { error } = await supabase
    .from('sleep_data')
    .delete()
    .eq('user_id', patientId);

  if (error) {
    console.error('[MOCK DATA] Erreur nettoyage:', error);
    throw error;
  }

  console.log(`[MOCK DATA] ✅ Données de test supprimées pour patient ${patientId}`);
  return { success: true };
}

// ============================================
// HELPERS
// ============================================

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
