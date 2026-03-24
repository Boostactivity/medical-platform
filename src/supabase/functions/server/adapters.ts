/**
 * ============================================
 * ADAPTATEURS UNIVERSELS MULTI-MARQUES
 * ============================================
 * 
 * Pattern Adapter pour normaliser les données de toutes les marques
 * d'appareils PPC (ResMed, Philips, Fisher & Paykel, Löwenstein, etc.)
 * 
 * OBJECTIF : Interopérabilité totale des données télémesure
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface StandardizedData {
  // Identifiants
  device_serial: string;
  device_brand: string;
  device_model: string;
  
  // Métriques principales (normalisées)
  ahi: number; // Index Apnée-Hypopnée (événements/heure)
  usage_hours: number; // Heures d'utilisation
  leak_rate: number; // Fuite moyenne (L/min)
  pressure_p95: number; // Pression 95e percentile (cmH2O)
  
  // Métriques complémentaires
  central_apneas?: number;
  obstructive_apneas?: number;
  hypopneas?: number;
  mask_on_time?: number;
  mask_off_events?: number;
  
  // Métadonnées
  recorded_at: string; // ISO 8601
  data_quality: 'excellent' | 'good' | 'fair' | 'poor';
  raw_data?: any; // Données brutes pour audit
}

export interface MachineAdapter {
  brand: string;
  parse(rawData: any): StandardizedData;
  validate(rawData: any): boolean;
}

// ============================================
// RESMED ADAPTER
// ============================================

export class ResmedAdapter implements MachineAdapter {
  brand = 'ResMed';

  validate(rawData: any): boolean {
    return !!(
      rawData &&
      typeof rawData === 'object' &&
      rawData.device_info?.manufacturer === 'ResMed'
    );
  }

  parse(rawData: any): StandardizedData {
    console.log('[RESMED ADAPTER] Parsing ResMed JSON data...');

    if (!this.validate(rawData)) {
      throw new Error('Invalid ResMed data format');
    }

    // ResMed utilise un format JSON structuré
    const metrics = rawData.therapy_metrics || {};
    const device = rawData.device_info || {};
    const session = rawData.session_data || {};

    return {
      // Identifiants
      device_serial: device.serial_number || 'UNKNOWN',
      device_brand: 'ResMed',
      device_model: device.model_name || 'AirSense',
      
      // Métriques principales
      ahi: metrics.ahi_index || 0,
      usage_hours: session.total_usage_hours || 0,
      leak_rate: metrics.leak_95th_percentile || 0,
      pressure_p95: metrics.pressure_95th || 10,
      
      // Métriques spécifiques ResMed
      central_apneas: metrics.central_apnea_count || 0,
      obstructive_apneas: metrics.obstructive_apnea_count || 0,
      hypopneas: metrics.hypopnea_count || 0,
      mask_on_time: session.mask_on_minutes || 0,
      mask_off_events: session.mask_off_count || 0,
      
      // Métadonnées
      recorded_at: session.date || new Date().toISOString(),
      data_quality: this.assessQuality(metrics),
      raw_data: rawData,
    };
  }

  private assessQuality(metrics: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const leak = metrics.leak_95th_percentile || 0;
    const usage = metrics.ahi_index || 0;

    if (leak < 24 && usage !== undefined) return 'excellent';
    if (leak < 40 && usage !== undefined) return 'good';
    if (leak < 60) return 'fair';
    return 'poor';
  }
}

// ============================================
// PHILIPS ADAPTER
// ============================================

export class PhilipsAdapter implements MachineAdapter {
  brand = 'Philips';

  validate(rawData: any): boolean {
    // Philips envoie souvent des CSV ou des chaînes formatées
    return typeof rawData === 'string' && rawData.includes('AHI');
  }

  parse(rawData: any): StandardizedData {
    console.log('[PHILIPS ADAPTER] Parsing Philips CSV data...');

    if (!this.validate(rawData)) {
      throw new Error('Invalid Philips data format');
    }

    // Parser le CSV Philips
    const lines = rawData.split('\n');
    const data: Record<string, string> = {};

    lines.forEach((line: string) => {
      const [key, value] = line.split(',');
      if (key && value) {
        data[key.trim()] = value.trim();
      }
    });

    return {
      // Identifiants
      device_serial: data['SerialNumber'] || 'UNKNOWN',
      device_brand: 'Philips',
      device_model: data['Model'] || 'DreamStation',
      
      // Métriques principales (mapping Philips)
      ahi: parseFloat(data['AHI']) || 0,
      usage_hours: parseFloat(data['UsageHours']) || 0,
      leak_rate: parseFloat(data['Leak95']) || 0,
      pressure_p95: parseFloat(data['Pressure95']) || 10,
      
      // Métriques spécifiques Philips
      central_apneas: parseFloat(data['CentralApneas']) || 0,
      obstructive_apneas: parseFloat(data['ObstructiveApneas']) || 0,
      hypopneas: parseFloat(data['Hypopneas']) || 0,
      
      // Métadonnées
      recorded_at: data['RecordDate'] || new Date().toISOString(),
      data_quality: this.assessQuality(data),
      raw_data: rawData,
    };
  }

  private assessQuality(data: Record<string, string>): 'excellent' | 'good' | 'fair' | 'poor' {
    const leak = parseFloat(data['Leak95']) || 0;
    const hasAHI = !!data['AHI'];

    if (leak < 24 && hasAHI) return 'excellent';
    if (leak < 40 && hasAHI) return 'good';
    if (leak < 60) return 'fair';
    return 'poor';
  }
}

// ============================================
// FISHER & PAYKEL ADAPTER (Bonus)
// ============================================

export class FisherPaykelAdapter implements MachineAdapter {
  brand = 'Fisher & Paykel';

  validate(rawData: any): boolean {
    return !!(
      rawData &&
      typeof rawData === 'object' &&
      rawData.manufacturer === 'F&P'
    );
  }

  parse(rawData: any): StandardizedData {
    console.log('[F&P ADAPTER] Parsing Fisher & Paykel data...');

    return {
      device_serial: rawData.device_id || 'UNKNOWN',
      device_brand: 'Fisher & Paykel',
      device_model: rawData.model || 'Icon',
      
      ahi: rawData.apnea_hypopnea_index || 0,
      usage_hours: rawData.usage_time_hours || 0,
      leak_rate: rawData.leak_median || 0,
      pressure_p95: rawData.pressure_median || 10,
      
      recorded_at: rawData.timestamp || new Date().toISOString(),
      data_quality: 'good',
      raw_data: rawData,
    };
  }
}

// ============================================
// FONCTION PRINCIPALE : NORMALISATION
// ============================================

export function normalizeData(input: any, brand: string): StandardizedData {
  console.log(`[NORMALIZE] Normalizing data for brand: ${brand}`);

  let adapter: MachineAdapter;

  // Sélection de l'adaptateur selon la marque
  switch (brand.toLowerCase()) {
    case 'resmed':
      adapter = new ResmedAdapter();
      break;
    case 'philips':
      adapter = new PhilipsAdapter();
      break;
    case 'fisher & paykel':
    case 'f&p':
      adapter = new FisherPaykelAdapter();
      break;
    default:
      throw new Error(`Unsupported brand: ${brand}`);
  }

  // Validation et parsing
  if (!adapter.validate(input)) {
    throw new Error(`Invalid data format for ${brand}`);
  }

  const normalized = adapter.parse(input);
  
  console.log('[NORMALIZE] ✅ Data normalized successfully');
  console.log(`[NORMALIZE] AHI: ${normalized.ahi}, Usage: ${normalized.usage_hours}h, Quality: ${normalized.data_quality}`);

  return normalized;
}

// ============================================
// HELPER : Détection automatique de la marque
// ============================================

export function detectBrand(rawData: any): string | null {
  if (typeof rawData === 'object' && rawData.device_info?.manufacturer === 'ResMed') {
    return 'resmed';
  }
  
  if (typeof rawData === 'string' && rawData.includes('AHI')) {
    return 'philips';
  }
  
  if (typeof rawData === 'object' && rawData.manufacturer === 'F&P') {
    return 'fisher & paykel';
  }
  
  return null;
}

// ============================================
// FONCTION TOUT-EN-UN : Auto-détection + Normalisation
// ============================================

export function smartNormalize(rawData: any): StandardizedData {
  const detectedBrand = detectBrand(rawData);
  
  if (!detectedBrand) {
    throw new Error('Cannot detect device brand from data');
  }
  
  console.log(`[SMART NORMALIZE] 🔍 Auto-detected brand: ${detectedBrand}`);
  return normalizeData(rawData, detectedBrand);
}
