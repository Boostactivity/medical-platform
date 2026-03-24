/**
 * UNIVERSAL ADAPTER - Parseur IoT Multi-Constructeurs
 * Transforme les données ResMed, Philips, Löwenstein en format standardisé
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Format standardisé la plateforme
 * Toutes les données constructeurs sont converties vers ce format
 */
export interface StandardizedSleepData {
  // Métadonnées
  patient_id: string;
  device_serial: string;
  manufacturer: 'resmed' | 'philips' | 'lowenstein' | 'other';
  device_model: string;
  session_date: string; // ISO 8601
  
  // Durées (en minutes)
  usage_hours: number;
  total_sleep_time: number; // Temps total au lit
  
  // Événements respiratoires (par heure)
  ahi: number; // Apnea-Hypopnea Index
  apneas_total: number;
  apneas_obstructive: number;
  apneas_central: number;
  hypopneas: number;
  
  // Pression (en cmH2O)
  pressure_95th: number; // Pression 95ème percentile
  pressure_median: number;
  pressure_mode: 'CPAP' | 'APAP' | 'BiPAP';
  pressure_min?: number; // Pour APAP
  pressure_max?: number;
  
  // Fuite (en L/min)
  leak_95th: number; // Fuite 95ème percentile
  leak_median: number;
  leak_max: number;
  
  // Masque
  mask_on_off_events: number; // Nombre de retraits masque
  mask_type?: string;
  
  // SpO2 (si disponible - Philips DreamStation 2)
  spo2_min?: number;
  spo2_avg?: number;
  desaturation_index?: number; // ODI (Oxygen Desaturation Index)
  
  // Confort
  humidifier_level?: number; // 0-5
  temperature?: number;
  
  // Compliance
  compliance_percent: number; // % nuits > 4h
  
  // Métadonnées brutes (pour debugging)
  raw_data?: Record<string, any>;
}

/**
 * PARSEUR RESMED
 * Format : JSON via MyAir API ou SD card export
 */
export function parseResMedData(rawData: any, patientId: string): StandardizedSleepData {
  // ResMed AirSense 10/11 structure
  const session = rawData;
  
  return {
    patient_id: patientId,
    device_serial: session.DeviceSerialNumber || 'UNKNOWN',
    manufacturer: 'resmed',
    device_model: session.DeviceType || 'AirSense 10',
    session_date: session.StartDate,
    
    // Durées
    usage_hours: parseFloat(session.TotalUsage) / 60, // Conversion minutes → heures
    total_sleep_time: parseFloat(session.TotalUsage) / 60,
    
    // Événements
    ahi: parseFloat(session.AHI) || 0,
    apneas_total: parseInt(session.TotalApneas) || 0,
    apneas_obstructive: parseInt(session.ObstructiveApneas) || 0,
    apneas_central: parseInt(session.CentralApneas) || 0,
    hypopneas: parseInt(session.Hypopneas) || 0,
    
    // Pression (ResMed utilise cmH2O)
    pressure_95th: parseFloat(session.Pressure95) || 0,
    pressure_median: parseFloat(session.PressureMedian) || 0,
    pressure_mode: detectPressureMode(session.DeviceMode),
    pressure_min: parseFloat(session.PressureMin),
    pressure_max: parseFloat(session.PressureMax),
    
    // Fuite
    leak_95th: parseFloat(session.Leak95) || 0,
    leak_median: parseFloat(session.LeakMedian) || 0,
    leak_max: parseFloat(session.LeakMax) || 0,
    
    // Masque
    mask_on_off_events: parseInt(session.MaskEvents) || 0,
    mask_type: session.MaskType,
    
    // Confort
    humidifier_level: parseInt(session.HumidifierSetting),
    
    // Compliance
    compliance_percent: calculateCompliance(session),
    
    raw_data: session,
  };
}

/**
 * PARSEUR PHILIPS
 * Format : CSV export DreamStation 1/2
 */
export function parsePhilipsData(csvData: string, patientId: string): StandardizedSleepData[] {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const results: StandardizedSleepData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    
    // Philips DreamStation CSV structure
    results.push({
      patient_id: patientId,
      device_serial: row['Device Serial Number'] || 'UNKNOWN',
      manufacturer: 'philips',
      device_model: row['Device Model'] || 'DreamStation',
      session_date: convertPhilipsDate(row['Date']),
      
      // Durées (Philips donne en heures:minutes)
      usage_hours: parsePhilipsTime(row['Usage Time']),
      total_sleep_time: parsePhilipsTime(row['Total Time in Bed']),
      
      // Événements
      ahi: parseFloat(row['AHI']) || 0,
      apneas_total: parseInt(row['Total Apneas']) || 0,
      apneas_obstructive: parseInt(row['Obstructive Apneas']) || 0,
      apneas_central: parseInt(row['Central Apneas']) || 0,
      hypopneas: parseInt(row['Hypopneas']) || 0,
      
      // Pression
      pressure_95th: parseFloat(row['Pressure 95%']) || 0,
      pressure_median: parseFloat(row['Pressure Median']) || 0,
      pressure_mode: row['Mode'] === 'Auto' ? 'APAP' : 'CPAP',
      pressure_min: parseFloat(row['Pressure Min']),
      pressure_max: parseFloat(row['Pressure Max']),
      
      // Fuite
      leak_95th: parseFloat(row['Leak 95%']) || 0,
      leak_median: parseFloat(row['Leak Median']) || 0,
      leak_max: parseFloat(row['Leak Max']) || 0,
      
      // Masque
      mask_on_off_events: parseInt(row['Mask Events']) || 0,
      
      // SpO2 (DreamStation 2 uniquement)
      spo2_min: parseFloat(row['SpO2 Min']),
      spo2_avg: parseFloat(row['SpO2 Average']),
      desaturation_index: parseFloat(row['ODI']),
      
      // Compliance
      compliance_percent: parseFloat(row['Compliance %']) || 0,
      
      raw_data: row,
    });
  }
  
  return results;
}

/**
 * PARSEUR LÖWENSTEIN
 * Format : XML export PrismaLine/PrismaCloud
 */
export function parseLowensteinData(xmlData: string, patientId: string): StandardizedSleepData[] {
  // Parser XML simple (pour production, utiliser DOMParser ou xml2js)
  const results: StandardizedSleepData[] = [];
  
  // Regex pour extraire sessions (exemple simplifié)
  const sessionRegex = /<Session>(.*?)<\/Session>/gs;
  const sessions = xmlData.match(sessionRegex) || [];
  
  sessions.forEach(sessionXml => {
    const extractValue = (tag: string): string => {
      const match = sessionXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return match ? match[1] : '';
    };
    
    results.push({
      patient_id: patientId,
      device_serial: extractValue('SerialNumber') || 'UNKNOWN',
      manufacturer: 'lowenstein',
      device_model: extractValue('DeviceModel') || 'PrismaLine',
      session_date: convertLowensteinDate(extractValue('Date')),
      
      usage_hours: parseFloat(extractValue('UsageHours')) || 0,
      total_sleep_time: parseFloat(extractValue('TotalTime')) || 0,
      
      ahi: parseFloat(extractValue('AHI')) || 0,
      apneas_total: parseInt(extractValue('Apneas')) || 0,
      apneas_obstructive: parseInt(extractValue('OA')) || 0,
      apneas_central: parseInt(extractValue('CA')) || 0,
      hypopneas: parseInt(extractValue('Hypopneas')) || 0,
      
      pressure_95th: parseFloat(extractValue('Pressure95')) || 0,
      pressure_median: parseFloat(extractValue('PressureMedian')) || 0,
      pressure_mode: extractValue('Mode') === 'AUTO' ? 'APAP' : 'CPAP',
      
      leak_95th: parseFloat(extractValue('Leak95')) || 0,
      leak_median: parseFloat(extractValue('LeakMedian')) || 0,
      leak_max: parseFloat(extractValue('LeakMax')) || 0,
      
      mask_on_off_events: parseInt(extractValue('MaskEvents')) || 0,
      
      compliance_percent: parseFloat(extractValue('Compliance')) || 0,
      
      raw_data: { xml: sessionXml },
    });
  });
  
  return results;
}

/**
 * DÉTECTION AUTOMATIQUE DU FORMAT
 */
export function detectFileFormat(content: string): 'resmed' | 'philips' | 'lowenstein' | 'unknown' {
  // ResMed = JSON avec clés spécifiques
  if (content.trim().startsWith('{') && content.includes('DeviceSerialNumber')) {
    return 'resmed';
  }
  
  // Philips = CSV avec headers spécifiques
  if (content.includes('Device Serial Number') && content.includes('Usage Time')) {
    return 'philips';
  }
  
  // Löwenstein = XML
  if (content.trim().startsWith('<?xml') || content.includes('<Session>')) {
    return 'lowenstein';
  }
  
  return 'unknown';
}

/**
 * PARSEUR UNIVERSEL - Point d'entrée principal
 */
export async function parseUniversalData(
  fileContent: string,
  patientId: string,
  format?: 'resmed' | 'philips' | 'lowenstein'
): Promise<StandardizedSleepData[]> {
  // Détection automatique si format non spécifié
  const detectedFormat = format || detectFileFormat(fileContent);
  
  let parsedData: StandardizedSleepData[] = [];
  
  switch (detectedFormat) {
    case 'resmed':
      const resMedJson = JSON.parse(fileContent);
      // ResMed peut retourner 1 session ou array
      const sessions = Array.isArray(resMedJson) ? resMedJson : [resMedJson];
      parsedData = sessions.map(s => parseResMedData(s, patientId));
      break;
      
    case 'philips':
      parsedData = parsePhilipsData(fileContent, patientId);
      break;
      
    case 'lowenstein':
      parsedData = parseLowensteinData(fileContent, patientId);
      break;
      
    default:
      throw new Error(`Format de fichier non reconnu. Formats supportés: ResMed (JSON), Philips (CSV), Löwenstein (XML)`);
  }
  
  // Valider et nettoyer
  parsedData = parsedData.map(validateAndClean);
  
  return parsedData;
}

/**
 * VALIDATION ET NETTOYAGE
 */
function validateAndClean(data: StandardizedSleepData): StandardizedSleepData {
  // Clamp values dans les plages acceptables
  return {
    ...data,
    usage_hours: Math.max(0, Math.min(24, data.usage_hours)),
    ahi: Math.max(0, data.ahi),
    leak_95th: Math.max(0, data.leak_95th),
    pressure_95th: Math.max(4, Math.min(25, data.pressure_95th)), // Plage CPAP standard
    compliance_percent: Math.max(0, Math.min(100, data.compliance_percent)),
  };
}

/**
 * SAUVEGARDE DANS LA BASE
 */
export async function saveSleepData(data: StandardizedSleepData[]): Promise<void> {
  const sleepDataRows = data.map(d => ({
    patient_id: d.patient_id,
    date: d.session_date,
    usage_hours: d.usage_hours,
    ahi: d.ahi,
    leak_95: d.leak_95th,
    pressure_95: d.pressure_95th,
    mask_events: d.mask_on_off_events,
    compliance_score: d.compliance_percent,
    total_sleep_time: d.total_sleep_time,
    
    // Détails supplémentaires
    device_serial: d.device_serial,
    manufacturer: d.manufacturer,
    apneas_total: d.apneas_total,
    hypopneas: d.hypopneas,
    leak_median: d.leak_median,
    pressure_median: d.pressure_median,
  }));
  
  const { error } = await supabase
    .from('observance_data')
    .upsert(sleepDataRows, { onConflict: 'patient_id,date' });
  
  if (error) {
    throw new Error(`Erreur sauvegarde données: ${error.message}`);
  }
}

// ============================================
// HELPERS
// ============================================

function detectPressureMode(mode: string): 'CPAP' | 'APAP' | 'BiPAP' {
  if (mode?.includes('Auto') || mode?.includes('APAP')) return 'APAP';
  if (mode?.includes('BiLevel') || mode?.includes('BiPAP')) return 'BiPAP';
  return 'CPAP';
}

function calculateCompliance(session: any): number {
  // Compliance = % nuits > 4h sur les 30 derniers jours
  const usageHours = parseFloat(session.TotalUsage) / 60;
  return usageHours >= 4 ? 100 : (usageHours / 4) * 100;
}

function parsePhilipsTime(timeStr: string): number {
  // Format "HH:MM" → heures décimales
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

function convertPhilipsDate(dateStr: string): string {
  // Format "MM/DD/YYYY" → "YYYY-MM-DD"
  const [month, day, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function convertLowensteinDate(dateStr: string): string {
  // Format "DD.MM.YYYY" → "YYYY-MM-DD"
  const [day, month, year] = dateStr.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}