import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, json } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * Modèle SleepData
 * 
 * Représente une nuit de sommeil avec les données PPC.
 * Synchronisé avec la table 'sleep_data' de Supabase.
 */

export class SleepData extends Model {
  static table = 'sleep_data';

  static associations: Associations = {
    patients: { type: 'belongs_to', key: 'patient_id' },
  };

  // ============================================
  // CHAMPS IDENTIFIANTS
  // ============================================

  @text('sleep_data_id') sleepDataId!: string;
  @text('patient_id') patientId!: string;
  @text('date') date!: string; // Format: YYYY-MM-DD

  // ============================================
  // MÉTRIQUES PRINCIPALES
  // ============================================

  @field('hours_used') hoursUsed!: number;
  @field('ahi') ahi?: number;
  @field('leakage') leakage?: number;
  @field('events') events?: number;
  @field('pressure_p95') pressureP95?: number;
  @field('expair_score') expairScore?: number;

  // ============================================
  // DONNÉES BRUTES
  // ============================================

  @text('raw_data_json') rawDataJson?: string;

  // ============================================
  // METADATA
  // ============================================

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @relation('patients', 'patient_id') patient: any;

  // ============================================
  // MÉTHODES CALCULÉES
  // ============================================

  /**
   * Parse les données brutes JSON
   */
  get rawData(): any {
    if (!this.rawDataJson) return null;
    try {
      return JSON.parse(this.rawDataJson);
    } catch (e) {
      console.error('Error parsing raw data JSON:', e);
      return null;
    }
  }

  /**
   * Vérifie si la nuit est conforme (>= 4h)
   */
  get isCompliant(): boolean {
    return this.hoursUsed >= 4;
  }

  /**
   * Vérifie si l'IAH est dans la norme (<5)
   */
  get isAHINormal(): boolean {
    return this.ahi !== undefined && this.ahi < 5;
  }

  /**
   * Évalue le niveau d'IAH
   * - normal: <5
   * - mild: 5-15
   * - moderate: 15-30
   * - severe: >30
   */
  get ahiLevel(): 'normal' | 'mild' | 'moderate' | 'severe' | 'unknown' {
    if (this.ahi === undefined) return 'unknown';
    if (this.ahi < 5) return 'normal';
    if (this.ahi < 15) return 'mild';
    if (this.ahi < 30) return 'moderate';
    return 'severe';
  }

  /**
   * Vérifie si les fuites sont acceptables (<24 L/min)
   */
  get hasAcceptableLeakage(): boolean {
    return this.leakage !== undefined && this.leakage < 24;
  }

  /**
   * Évalue la qualité générale de la nuit
   * Score combiné basé sur : heures, IAH, fuites
   */
  get qualityScore(): number {
    let score = 0;
    
    // Heures d'utilisation (40% du score)
    if (this.hoursUsed >= 7) score += 40;
    else if (this.hoursUsed >= 6) score += 35;
    else if (this.hoursUsed >= 4) score += 25;
    else score += 10;
    
    // IAH (40% du score)
    if (this.ahi !== undefined) {
      if (this.ahi < 5) score += 40;
      else if (this.ahi < 15) score += 30;
      else if (this.ahi < 30) score += 15;
      else score += 5;
    }
    
    // Fuites (20% du score)
    if (this.leakage !== undefined) {
      if (this.leakage < 10) score += 20;
      else if (this.leakage < 24) score += 15;
      else score += 5;
    }
    
    return score;
  }

  /**
   * Retourne un label de qualité basé sur le score
   */
  get qualityLabel(): 'Excellente' | 'Bonne' | 'Moyenne' | 'Faible' {
    const score = this.qualityScore;
    if (score >= 85) return 'Excellente';
    if (score >= 70) return 'Bonne';
    if (score >= 50) return 'Moyenne';
    return 'Faible';
  }

  /**
   * Retourne une couleur associée à la qualité
   */
  get qualityColor(): string {
    const score = this.qualityScore;
    if (score >= 85) return '#4ade80'; // green
    if (score >= 70) return '#5eb3d6'; // turquoise
    if (score >= 50) return '#fbbf24'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Vérifie si les données sont synchronisées
   */
  get isSynced(): boolean {
    if (!this.syncedAt) return false;
    return this.syncedAt >= this.updatedAt;
  }

  /**
   * Vérifie si c'est une nuit récente (< 7 jours)
   */
  get isRecent(): boolean {
    const nightDate = new Date(this.date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - nightDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  /**
   * Calcule le nombre de jours depuis cette nuit
   */
  get daysAgo(): number {
    const nightDate = new Date(this.date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - nightDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formatte la date en français
   */
  get formattedDate(): string {
    const date = new Date(this.date);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Formatte la date courte
   */
  get shortDate(): string {
    const date = new Date(this.date);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  // ============================================
  // MÉTHODES ASYNCHRONES
  // ============================================

  /**
   * Marque les données comme synchronisées
   */
  async markAsSynced() {
    await this.update((sleepData: any) => {
      sleepData.syncedAt = new Date();
    });
  }

  /**
   * Met à jour le score la plateforme
   */
  async updateExpAirScore(score: number) {
    await this.update((sleepData: any) => {
      sleepData.expairScore = score;
    });
  }

  /**
   * Met à jour les données brutes
   */
  async updateRawData(data: any) {
    await this.update((sleepData: any) => {
      sleepData.rawDataJson = JSON.stringify(data);
    });
  }

  /**
   * Génère un résumé textuel de la nuit
   */
  generateSummary(): string {
    const parts = [];
    
    parts.push(`${this.hoursUsed.toFixed(1)}h d'utilisation`);
    
    if (this.ahi !== undefined) {
      parts.push(`IAH: ${this.ahi.toFixed(1)}`);
    }
    
    if (this.leakage !== undefined) {
      parts.push(`Fuites: ${this.leakage.toFixed(1)} L/min`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Détecte les anomalies dans les données
   */
  detectAnomalies(): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const anomalies = [];
    
    // Faible utilisation
    if (this.hoursUsed < 4) {
      anomalies.push({
        type: 'low_usage',
        message: `Utilisation faible (${this.hoursUsed.toFixed(1)}h). Objectif: ≥ 4h/nuit`,
        severity: 'high' as const,
      });
    }
    
    // IAH élevé
    if (this.ahi !== undefined && this.ahi > 15) {
      anomalies.push({
        type: 'high_ahi',
        message: `IAH élevé (${this.ahi.toFixed(1)}). Peut nécessiter un ajustement du traitement`,
        severity: this.ahi > 30 ? 'high' as const : 'medium' as const,
      });
    }
    
    // Fuites excessives
    if (this.leakage !== undefined && this.leakage > 24) {
      anomalies.push({
        type: 'high_leakage',
        message: `Fuites importantes (${this.leakage.toFixed(1)} L/min). Vérifier le masque`,
        severity: 'medium' as const,
      });
    }
    
    // Pression inhabituelle
    if (this.pressureP95 !== undefined && (this.pressureP95 < 4 || this.pressureP95 > 20)) {
      anomalies.push({
        type: 'unusual_pressure',
        message: `Pression inhabituelle (${this.pressureP95.toFixed(1)} cmH2O)`,
        severity: 'low' as const,
      });
    }
    
    return anomalies;
  }

  /**
   * Compare avec une autre nuit
   */
  compareWith(other: SleepData): {
    hoursChange: number;
    ahiChange?: number;
    leakageChange?: number;
  } {
    return {
      hoursChange: this.hoursUsed - other.hoursUsed,
      ahiChange: this.ahi !== undefined && other.ahi !== undefined 
        ? this.ahi - other.ahi 
        : undefined,
      leakageChange: this.leakage !== undefined && other.leakage !== undefined 
        ? this.leakage - other.leakage 
        : undefined,
    };
  }
}

/**
 * NOTES SUR LE MODÈLE :
 * 
 * 1. Métriques :
 *    - hoursUsed : Heures d'utilisation de l'appareil
 *    - ahi : Indice d'Apnées-Hypopnées (événements/heure)
 *    - leakage : Fuites (L/min)
 *    - events : Nombre total d'événements
 *    - pressureP95 : Pression au 95e percentile
 *    - expairScore : Score propriétaire (0-100)
 * 
 * 2. Calculs de qualité :
 *    - qualityScore : Score global 0-100
 *    - Basé sur 3 critères : heures (40%), IAH (40%), fuites (20%)
 * 
 * 3. Détection d'anomalies :
 *    - Utilisation < 4h : Alerte haute
 *    - IAH > 15 : Alerte moyenne/haute
 *    - Fuites > 24 : Alerte moyenne
 * 
 * 4. Performance :
 *    - Getters calculés à la demande (pas stockés)
 *    - JSON parsé uniquement si nécessaire
 *    - Pas de requêtes supplémentaires pour les calculs
 */
