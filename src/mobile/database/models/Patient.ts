import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * Modèle Patient
 * 
 * Représente un patient dans la base locale.
 * Synchronisé avec la table 'patients' de Supabase.
 */

export class Patient extends Model {
  static table = 'patients';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    doctors: { type: 'belongs_to', key: 'assigned_doctor_id' },
    sleep_data: { type: 'has_many', foreignKey: 'patient_id' },
    alerts: { type: 'has_many', foreignKey: 'patient_id' },
    devices: { type: 'has_many', foreignKey: 'patient_id' },
    interventions: { type: 'has_many', foreignKey: 'patient_id' },
  };

  // ============================================
  // CHAMPS
  // ============================================

  @text('patient_id') patientId!: string;
  @text('user_id') userId!: string;
  @text('panel_code') panelCode?: string;
  @text('assigned_doctor_id') assignedDoctorId?: string;
  @text('diagnosis_date') diagnosisDate?: string;
  @text('birth_date') birthDate?: string;
  @field('device_installed') deviceInstalled!: boolean;
  @text('treatment_start_date') treatmentStartDate?: string;
  @text('notes') notes?: string;

  // ============================================
  // METADATA
  // ============================================

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  // ============================================
  // RELATIONS
  // ============================================

  @relation('users', 'user_id') user: any;
  @relation('doctors', 'assigned_doctor_id') doctor: any;
  @children('sleep_data') sleepData: any;
  @children('alerts') alerts: any;
  @children('devices') devices: any;
  @children('interventions') interventions: any;

  // ============================================
  // MÉTHODES CALCULÉES
  // ============================================

  /**
   * Calcule l'âge du patient
   */
  get age(): number | null {
    if (!this.birthDate) return null;
    const birth = new Date(this.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Durée de traitement en jours
   */
  get treatmentDurationDays(): number | null {
    if (!this.treatmentStartDate) return null;
    const start = new Date(this.treatmentStartDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Vérifie si les données sont synchronisées
   */
  get isSynced(): boolean {
    if (!this.syncedAt) return false;
    return this.syncedAt >= this.updatedAt;
  }

  /**
   * Vérifie si le patient a un médecin assigné
   */
  get hasAssignedDoctor(): boolean {
    return !!this.assignedDoctorId;
  }

  /**
   * Vérifie si le patient a un appareil installé
   */
  get hasDevice(): boolean {
    return this.deviceInstalled;
  }

  // ============================================
  // MÉTHODES ASYNCHRONES
  // ============================================

  /**
   * Récupère les données de sommeil des N derniers jours
   */
  async getRecentSleepData(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    return await this.sleepData
      .extend((query: any) => 
        query
          .where('date', query.gte(cutoffString))
          .sortBy('date', 'desc')
      )
      .fetch();
  }

  /**
   * Récupère les alertes actives (non résolues)
   */
  async getActiveAlerts() {
    return await this.alerts
      .extend((query: any) => 
        query
          .where('is_resolved', false)
          .sortBy('created_at', 'desc')
      )
      .fetch();
  }

  /**
   * Récupère le dernier appareil actif
   */
  async getCurrentDevice() {
    const devices = await this.devices
      .extend((query: any) => 
        query
          .where('status', 'active')
          .sortBy('created_at', 'desc')
      )
      .fetch();
    
    return devices[0] || null;
  }

  /**
   * Calcule l'observance moyenne sur une période
   */
  async calculateAverageObservance(days: number = 30): Promise<number> {
    const sleepData = await this.getRecentSleepData(days);
    
    if (sleepData.length === 0) return 0;
    
    const totalHours = sleepData.reduce(
      (sum: number, data: any) => sum + (data.hoursUsed || 0),
      0
    );
    
    return totalHours / sleepData.length;
  }

  /**
   * Compte les jours d'utilisation sur une période
   */
  async countUsageDays(days: number = 30): Promise<number> {
    const sleepData = await this.getRecentSleepData(days);
    return sleepData.filter((data: any) => data.hoursUsed >= 4).length;
  }

  /**
   * Vérifie l'éligibilité à la facturation CPAM (>= 112h sur 28 jours)
   */
  async checkCPAMEligibility(): Promise<{ eligible: boolean; hours: number; days: number }> {
    const sleepData = await this.getRecentSleepData(28);
    
    const totalHours = sleepData.reduce(
      (sum: number, data: any) => sum + (data.hoursUsed || 0),
      0
    );
    
    const usageDays = sleepData.filter((data: any) => data.hoursUsed >= 4).length;
    
    return {
      eligible: totalHours >= 112,
      hours: totalHours,
      days: usageDays,
    };
  }

  /**
   * Marque le patient comme synchronisé
   */
  async markAsSynced() {
    await this.update((patient: any) => {
      patient.syncedAt = new Date();
    });
  }

  /**
   * Met à jour les notes du patient
   */
  async updateNotes(newNotes: string) {
    await this.update((patient: any) => {
      patient.notes = newNotes;
    });
  }

  /**
   * Assigne un médecin au patient
   */
  async assignDoctor(doctorId: string) {
    await this.update((patient: any) => {
      patient.assignedDoctorId = doctorId;
    });
  }
}

/**
 * NOTES SUR LE MODÈLE :
 * 
 * 1. Decorators :
 *    - @field : Champs simples (boolean, number)
 *    - @text : Champs texte
 *    - @date : Dates (converties automatiquement)
 *    - @readonly : Champs non modifiables après création
 *    - @relation : Relations avec d'autres tables
 *    - @children : Relations inverses (has_many)
 * 
 * 2. Relations :
 *    - belongs_to : Patient → User, Patient → Doctor
 *    - has_many : Patient → SleepData, Alerts, Devices, Interventions
 * 
 * 3. Méthodes :
 *    - Getters : Calculs synchrones (age, isSynced)
 *    - Async : Requêtes base de données (getRecentSleepData)
 * 
 * 4. Performance :
 *    - Lazy loading : Les relations ne sont chargées que si demandées
 *    - Query extensions : Filtres et tri optimisés au niveau SQLite
 *    - Indexation : Les colonnes clés sont indexées (voir schema.ts)
 */
