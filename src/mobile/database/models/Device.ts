import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * Modèle Device
 * 
 * Représente un appareil PPC dans la base locale.
 * Synchronisé avec la table 'devices' de Supabase.
 */

export class Device extends Model {
  static table = 'devices';

  static associations: Associations = {
    patients: { type: 'belongs_to', key: 'patient_id' },
  };

  // ============================================
  // CHAMPS IDENTIFIANTS
  // ============================================

  @text('device_id') deviceId!: string;
  @text('patient_id') patientId!: string;
  @text('serial_number') serialNumber!: string;

  // ============================================
  // INFORMATIONS APPAREIL
  // ============================================

  @text('model') model!: string;
  @text('manufacturer') manufacturer!: string; // 'ResMed', 'Philips', 'Löwenstein', etc.
  @text('installation_date') installationDate?: string;
  @text('last_maintenance_date') lastMaintenanceDate?: string;
  @text('next_maintenance_date') nextMaintenanceDate?: string;

  // ============================================
  // ÉTAT ET CONFIGURATION
  // ============================================

  @text('status') status!: string; // 'active', 'inactive', 'maintenance', 'replaced'
  @text('settings') settings?: string; // JSON string des paramètres

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
   * Parse les paramètres JSON
   */
  get parsedSettings(): any {
    if (!this.settings) return null;
    try {
      return JSON.parse(this.settings);
    } catch (e) {
      console.error('Error parsing device settings:', e);
      return null;
    }
  }

  /**
   * Vérifie si les données sont synchronisées
   */
  get isSynced(): boolean {
    if (!this.syncedAt) return false;
    return this.syncedAt >= this.updatedAt;
  }

  /**
   * Vérifie si l'appareil est actif
   */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Vérifie si l'appareil est en maintenance
   */
  get isInMaintenance(): boolean {
    return this.status === 'maintenance';
  }

  /**
   * Vérifie si l'appareil a été remplacé
   */
  get isReplaced(): boolean {
    return this.status === 'replaced';
  }

  /**
   * Retourne le nom complet de l'appareil
   */
  get fullName(): string {
    return `${this.manufacturer} ${this.model}`;
  }

  /**
   * Retourne le logo du fabricant
   */
  get manufacturerLogo(): string {
    const logos: { [key: string]: string } = {
      'ResMed': '🔵', // Placeholder - remplacer par vraie image
      'Philips': '⚪️',
      'Löwenstein': '🟢',
      'Fisher & Paykel': '🔷',
      'BMC': '🟠',
    };
    return logos[this.manufacturer] || '⚙️';
  }

  /**
   * Calcule l'âge de l'appareil en mois
   */
  get ageInMonths(): number | null {
    if (!this.installationDate) return null;
    
    const installation = new Date(this.installationDate);
    const now = new Date();
    const diffMs = now.getTime() - installation.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
    
    return Math.floor(diffMonths);
  }

  /**
   * Formatte l'âge de l'appareil
   */
  get ageFormatted(): string | null {
    const months = this.ageInMonths;
    if (months === null) return null;
    
    if (months < 1) return 'Moins d\'1 mois';
    if (months < 12) return `${months} mois`;
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    }
    
    return `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`;
  }

  /**
   * Vérifie si l'appareil nécessite une maintenance
   */
  get needsMaintenance(): boolean {
    if (!this.nextMaintenanceDate) return false;
    
    const nextMaintenance = new Date(this.nextMaintenanceDate);
    const now = new Date();
    
    // Maintenance nécessaire si date dépassée ou dans les 7 prochains jours
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    return nextMaintenance <= sevenDaysFromNow;
  }

  /**
   * Calcule les jours avant la prochaine maintenance
   */
  get daysUntilMaintenance(): number | null {
    if (!this.nextMaintenanceDate) return null;
    
    const nextMaintenance = new Date(this.nextMaintenanceDate);
    const now = new Date();
    const diffMs = nextMaintenance.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Retourne le statut de maintenance formaté
   */
  get maintenanceStatus(): string {
    const days = this.daysUntilMaintenance;
    
    if (days === null) return 'Non planifiée';
    if (days < 0) return `En retard de ${Math.abs(days)} jours`;
    if (days === 0) return 'Aujourd\'hui';
    if (days <= 7) return `Dans ${days} jours`;
    
    return `Planifiée le ${new Date(this.nextMaintenanceDate!).toLocaleDateString('fr-FR')}`;
  }

  /**
   * Vérifie si l'appareil approche de la fin de vie (>5 ans)
   */
  get isApproachingEndOfLife(): boolean {
    const months = this.ageInMonths;
    return months !== null && months >= 60; // 5 ans
  }

  /**
   * Retourne la couleur du statut
   */
  get statusColor(): string {
    const colors: { [key: string]: string } = {
      active: '#4ade80', // green
      inactive: '#94a3b8', // gray
      maintenance: '#fbbf24', // yellow
      replaced: '#64748b', // dark gray
    };
    return colors[this.status] || colors.inactive;
  }

  /**
   * Retourne le label du statut en français
   */
  get statusLabel(): string {
    const labels: { [key: string]: string } = {
      active: 'Actif',
      inactive: 'Inactif',
      maintenance: 'En maintenance',
      replaced: 'Remplacé',
    };
    return labels[this.status] || 'Inconnu';
  }

  /**
   * Formatte le numéro de série pour l'affichage
   */
  get formattedSerialNumber(): string {
    // Formater selon le fabricant
    // ResMed : XXXX-XXXX-XXXX
    // Philips : XXXXXXXX
    // Par défaut, grouper par 4
    if (this.serialNumber.length > 8) {
      return this.serialNumber.match(/.{1,4}/g)?.join('-') || this.serialNumber;
    }
    return this.serialNumber;
  }

  // ============================================
  // MÉTHODES ASYNCHRONES
  // ============================================

  /**
   * Met à jour le statut de l'appareil
   */
  async updateStatus(newStatus: 'active' | 'inactive' | 'maintenance' | 'replaced') {
    await this.update((device: any) => {
      device.status = newStatus;
    });
  }

  /**
   * Enregistre une maintenance
   */
  async recordMaintenance(nextMaintenanceDate?: string) {
    await this.update((device: any) => {
      device.lastMaintenanceDate = new Date().toISOString().split('T')[0];
      
      if (nextMaintenanceDate) {
        device.nextMaintenanceDate = nextMaintenanceDate;
      } else {
        // Par défaut, maintenance tous les 6 mois
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        device.nextMaintenanceDate = sixMonthsLater.toISOString().split('T')[0];
      }
      
      // Si l'appareil était en maintenance, le remettre actif
      if (device.status === 'maintenance') {
        device.status = 'active';
      }
    });
  }

  /**
   * Planifie la prochaine maintenance
   */
  async scheduleNextMaintenance(date: string) {
    await this.update((device: any) => {
      device.nextMaintenanceDate = date;
    });
  }

  /**
   * Met à jour les paramètres de l'appareil
   */
  async updateSettings(newSettings: any) {
    await this.update((device: any) => {
      const existing = device.parsedSettings || {};
      device.settings = JSON.stringify({ ...existing, ...newSettings });
    });
  }

  /**
   * Marque l'appareil comme synchronisé
   */
  async markAsSynced() {
    await this.update((device: any) => {
      device.syncedAt = new Date();
    });
  }

  /**
   * Récupère le patient associé
   */
  async getPatient() {
    return await this.patient.fetch();
  }

  /**
   * Génère un résumé de l'appareil
   */
  generateSummary(): string {
    const parts = [
      this.fullName,
      `S/N: ${this.formattedSerialNumber}`,
      `Statut: ${this.statusLabel}`,
    ];
    
    if (this.ageFormatted) {
      parts.push(`Âge: ${this.ageFormatted}`);
    }
    
    if (this.needsMaintenance) {
      parts.push(`⚠️ Maintenance: ${this.maintenanceStatus}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Génère un rapport d'état détaillé
   */
  async generateStatusReport(): Promise<{
    device: any;
    patient: any;
    age: number | null;
    maintenanceStatus: string;
    needsMaintenance: boolean;
    isApproachingEndOfLife: boolean;
    recommendations: string[];
  }> {
    const patient = await this.getPatient();
    const recommendations: string[] = [];
    
    // Recommandations basées sur l'état
    if (this.needsMaintenance) {
      recommendations.push('Planifier une maintenance préventive');
    }
    
    if (this.isApproachingEndOfLife) {
      recommendations.push('Évaluer le remplacement de l\'appareil (>5 ans)');
    }
    
    if (!this.isActive) {
      recommendations.push('Vérifier pourquoi l\'appareil n\'est pas actif');
    }
    
    const settings = this.parsedSettings;
    if (settings) {
      // Vérifier les paramètres
      if (settings.pressure_min < 4 || settings.pressure_max > 20) {
        recommendations.push('Vérifier les paramètres de pression');
      }
    }
    
    return {
      device: this,
      patient,
      age: this.ageInMonths,
      maintenanceStatus: this.maintenanceStatus,
      needsMaintenance: this.needsMaintenance,
      isApproachingEndOfLife: this.isApproachingEndOfLife,
      recommendations,
    };
  }

  /**
   * Vérifie la compatibilité avec un type de masque
   */
  checkMaskCompatibility(maskType: string): boolean {
    const settings = this.parsedSettings;
    if (!settings?.compatible_masks) return true; // Si pas de restriction, compatible
    
    return settings.compatible_masks.includes(maskType);
  }

  /**
   * Récupère l'historique des maintenances (depuis métadonnées)
   */
  getMaintenanceHistory(): Array<{ date: string; type: string; note?: string }> {
    const settings = this.parsedSettings;
    return settings?.maintenance_history || [];
  }

  /**
   * Ajoute une entrée à l'historique de maintenance
   */
  async addMaintenanceHistoryEntry(type: string, note?: string) {
    const settings = this.parsedSettings || {};
    const history = settings.maintenance_history || [];
    
    history.push({
      date: new Date().toISOString().split('T')[0],
      type,
      note,
    });
    
    await this.updateSettings({ maintenance_history: history });
  }
}

/**
 * NOTES SUR LE MODÈLE :
 * 
 * 1. Fabricants supportés :
 *    - ResMed (leader mondial, format .edf)
 *    - Philips (format .001 propriétaire)
 *    - Löwenstein (format .xml)
 *    - Fisher & Paykel (format CSV)
 *    - BMC (format JSON)
 * 
 * 2. Statuts :
 *    - active : Appareil en utilisation normale
 *    - inactive : Appareil non utilisé (patient arrêté, en pause)
 *    - maintenance : Appareil en réparation/entretien
 *    - replaced : Appareil remplacé (historique)
 * 
 * 3. Maintenance :
 *    - Préventive : Tous les 6 mois
 *    - Curative : Sur alerte technique
 *    - Historique stocké en JSON
 * 
 * 4. Paramètres (settings JSON) :
 *    - pressure_min/max : Pression thérapeutique
 *    - mode : CPAP, APAP, BiPAP
 *    - humidity : Niveau d'humidification
 *    - ramp_time : Temps de montée en pression
 *    - compatible_masks : Types de masques compatibles
 * 
 * 5. Fin de vie :
 *    - Durée de vie typique : 5-7 ans
 *    - Alerte à partir de 5 ans (60 mois)
 *    - Remplacement recommandé au-delà de 7 ans
 */
