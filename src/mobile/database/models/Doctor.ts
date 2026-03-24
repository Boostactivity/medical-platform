import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * Modèle Doctor
 * 
 * Représente un médecin dans la base locale.
 * Synchronisé avec la table 'doctors' de Supabase.
 */

export class Doctor extends Model {
  static table = 'doctors';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    patients: { type: 'has_many', foreignKey: 'assigned_doctor_id' },
  };

  // ============================================
  // CHAMPS
  // ============================================

  @text('doctor_id') doctorId!: string;
  @text('user_id') userId!: string;
  @text('specialty') specialty!: string;
  @text('license_number') licenseNumber!: string;
  @text('panel_code') panelCode?: string;

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
  @children('patients') patients: any;

  // ============================================
  // MÉTHODES CALCULÉES
  // ============================================

  /**
   * Vérifie si les données sont synchronisées
   */
  get isSynced(): boolean {
    if (!this.syncedAt) return false;
    return this.syncedAt >= this.updatedAt;
  }

  /**
   * Retourne le nom complet du médecin
   */
  async getFullName(): Promise<string> {
    const userData = await this.user.fetch();
    return userData?.name || 'Médecin';
  }

  /**
   * Vérifie si le médecin a un panel_code assigné
   */
  get hasPanelCode(): boolean {
    return !!this.panelCode;
  }

  /**
   * Formatte la spécialité pour l'affichage
   */
  get formattedSpecialty(): string {
    const specialties: { [key: string]: string } = {
      'pneumologie': 'Pneumologue',
      'orl': 'ORL',
      'cardiology': 'Cardiologue',
      'sleep_medicine': 'Médecin du sommeil',
      'general': 'Médecin généraliste',
    };
    return specialties[this.specialty.toLowerCase()] || this.specialty;
  }

  /**
   * Formatte le numéro de licence (RPPS)
   */
  get formattedLicenseNumber(): string {
    // Format RPPS : XX XXX XXX XXX (11 chiffres)
    if (this.licenseNumber.length === 11) {
      return `${this.licenseNumber.slice(0, 2)} ${this.licenseNumber.slice(2, 5)} ${this.licenseNumber.slice(5, 8)} ${this.licenseNumber.slice(8)}`;
    }
    return this.licenseNumber;
  }

  // ============================================
  // MÉTHODES ASYNCHRONES
  // ============================================

  /**
   * Récupère tous les patients assignés à ce médecin
   */
  async getAssignedPatients() {
    return await this.patients
      .extend((query: any) => 
        query.where('assigned_doctor_id', this.userId)
      )
      .fetch();
  }

  /**
   * Compte le nombre de patients
   */
  async countPatients(): Promise<number> {
    const patients = await this.getAssignedPatients();
    return patients.length;
  }

  /**
   * Récupère les patients avec un tri spécifique
   */
  async getPatientsSortedBy(sortBy: 'name' | 'last_active' | 'compliance'): Promise<any[]> {
    const patients = await this.getAssignedPatients();
    
    // Pour 'name' et 'last_active', on peut trier directement
    // Pour 'compliance', on devra calculer l'observance de chaque patient
    
    switch (sortBy) {
      case 'name':
        return patients.sort((a: any, b: any) => {
          // Tri par nom (nécessite de fetch le user associé)
          return 0; // TODO: Implémenter le tri par nom
        });
      case 'last_active':
        return patients.sort((a: any, b: any) => 
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      case 'compliance':
        // Tri par observance (nécessite calcul async)
        const patientsWithCompliance = await Promise.all(
          patients.map(async (patient: any) => ({
            patient,
            compliance: await patient.calculateAverageObservance(30),
          }))
        );
        return patientsWithCompliance
          .sort((a, b) => b.compliance - a.compliance)
          .map(item => item.patient);
      default:
        return patients;
    }
  }

  /**
   * Récupère les alertes actives de tous les patients
   */
  async getAllPatientsActiveAlerts() {
    const patients = await this.getAssignedPatients();
    const allAlerts = [];
    
    for (const patient of patients) {
      const alerts = await patient.getActiveAlerts();
      allAlerts.push(...alerts);
    }
    
    // Trier par date (plus récent en premier)
    return allAlerts.sort((a: any, b: any) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Calcule les statistiques du panel
   */
  async getPanelStatistics(): Promise<{
    totalPatients: number;
    averageCompliance: number;
    activeAlerts: number;
    patientsAtRisk: number;
  }> {
    const patients = await this.getAssignedPatients();
    
    if (patients.length === 0) {
      return {
        totalPatients: 0,
        averageCompliance: 0,
        activeAlerts: 0,
        patientsAtRisk: 0,
      };
    }

    // Calculer l'observance moyenne
    const complianceValues = await Promise.all(
      patients.map((p: any) => p.calculateAverageObservance(30))
    );
    const averageCompliance = complianceValues.reduce((sum, val) => sum + val, 0) / complianceValues.length;

    // Compter les alertes actives
    const allAlerts = await this.getAllPatientsActiveAlerts();
    const activeAlerts = allAlerts.length;

    // Patients à risque : observance < 4h/nuit en moyenne sur 30 jours
    const patientsAtRisk = complianceValues.filter(c => c < 4).length;

    return {
      totalPatients: patients.length,
      averageCompliance,
      activeAlerts,
      patientsAtRisk,
    };
  }

  /**
   * Récupère les patients nécessitant une attention (faible observance)
   */
  async getPatientsNeedingAttention(): Promise<any[]> {
    const patients = await this.getAssignedPatients();
    const patientsWithCompliance = await Promise.all(
      patients.map(async (patient: any) => ({
        patient,
        compliance: await patient.calculateAverageObservance(30),
      }))
    );
    
    // Retourner les patients avec observance < 4h/nuit
    return patientsWithCompliance
      .filter(item => item.compliance < 4)
      .sort((a, b) => a.compliance - b.compliance)
      .map(item => item.patient);
  }

  /**
   * Vérifie l'éligibilité CPAM pour tous les patients
   */
  async checkAllPatientsCPAMEligibility(): Promise<Array<{
    patient: any;
    eligible: boolean;
    hours: number;
    daysRemaining?: number;
  }>> {
    const patients = await this.getAssignedPatients();
    
    return await Promise.all(
      patients.map(async (patient: any) => {
        const eligibility = await patient.checkCPAMEligibility();
        return {
          patient,
          ...eligibility,
        };
      })
    );
  }

  /**
   * Marque le médecin comme synchronisé
   */
  async markAsSynced() {
    await this.update((doctor: any) => {
      doctor.syncedAt = new Date();
    });
  }

  /**
   * Met à jour le panel_code
   */
  async updatePanelCode(newPanelCode: string) {
    await this.update((doctor: any) => {
      doctor.panelCode = newPanelCode;
    });
  }

  /**
   * Met à jour la spécialité
   */
  async updateSpecialty(newSpecialty: string) {
    await this.update((doctor: any) => {
      doctor.specialty = newSpecialty;
    });
  }

  /**
   * Génère un résumé textuel du panel
   */
  async generatePanelSummary(): Promise<string> {
    const stats = await this.getPanelStatistics();
    
    const parts = [
      `${stats.totalPatients} patient${stats.totalPatients > 1 ? 's' : ''}`,
      `observance moyenne ${stats.averageCompliance.toFixed(1)}h/nuit`,
    ];
    
    if (stats.activeAlerts > 0) {
      parts.push(`${stats.activeAlerts} alerte${stats.activeAlerts > 1 ? 's' : ''} active${stats.activeAlerts > 1 ? 's' : ''}`);
    }
    
    if (stats.patientsAtRisk > 0) {
      parts.push(`${stats.patientsAtRisk} patient${stats.patientsAtRisk > 1 ? 's' : ''} à risque`);
    }
    
    return parts.join(' • ');
  }
}

/**
 * NOTES SUR LE MODÈLE :
 * 
 * 1. Identification :
 *    - RPPS (Répertoire Partagé des Professionnels de Santé)
 *    - 11 chiffres uniques par médecin en France
 *    - Utilisé pour Pro Santé Connect
 * 
 * 2. Panel Code :
 *    - Code unique du panel de patients
 *    - Copié automatiquement vers les patients assignés
 *    - Facilite la segmentation et la facturation
 * 
 * 3. Statistiques :
 *    - Calculs agrégés sur tous les patients du panel
 *    - Détection patients à risque (observance < 4h)
 *    - Alertes actives du panel
 * 
 * 4. Relations :
 *    - belongs_to : Doctor → User
 *    - has_many : Doctor → Patients
 * 
 * 5. Performance :
 *    - Méthodes async pour calculs lourds
 *    - Sorting optimisé au niveau SQLite quand possible
 *    - Cache des résultats recommandé pour statistiques
 */
