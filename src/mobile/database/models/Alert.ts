import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

/**
 * Modèle Alert
 * 
 * Représente une alerte médicale dans la base locale.
 * Synchronisé avec la table 'alerts' de Supabase.
 */

export class Alert extends Model {
  static table = 'alerts';

  static associations: Associations = {
    patients: { type: 'belongs_to', key: 'patient_id' },
  };

  // ============================================
  // CHAMPS IDENTIFIANTS
  // ============================================

  @text('alert_id') alertId!: string;
  @text('patient_id') patientId!: string;

  // ============================================
  // CHAMPS DE CLASSIFICATION
  // ============================================

  @text('type') type!: string; // 'observance', 'technical', 'medical', 'maintenance'
  @text('severity') severity!: string; // 'low', 'medium', 'high', 'critical'
  @text('title') title!: string;
  @text('message') message!: string;

  // ============================================
  // CHAMPS D'ÉTAT
  // ============================================

  @field('is_read') isRead!: boolean;
  @field('is_resolved') isResolved!: boolean;
  @text('acknowledged_by') acknowledgedBy?: string;
  @date('acknowledged_at') acknowledgedAt?: Date;
  @text('resolved_by') resolvedBy?: string;
  @date('resolved_at') resolvedAt?: Date;

  // ============================================
  // DONNÉES SUPPLÉMENTAIRES
  // ============================================

  @text('metadata') metadata?: string; // JSON string

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
   * Parse les métadonnées JSON
   */
  get parsedMetadata(): any {
    if (!this.metadata) return null;
    try {
      return JSON.parse(this.metadata);
    } catch (e) {
      console.error('Error parsing alert metadata:', e);
      return null;
    }
  }

  /**
   * Vérifie si l'alerte est active (non résolue)
   */
  get isActive(): boolean {
    return !this.isResolved;
  }

  /**
   * Vérifie si l'alerte est non lue et non résolue
   */
  get needsAction(): boolean {
    return !this.isRead && !this.isResolved;
  }

  /**
   * Vérifie si l'alerte a été acquittée
   */
  get isAcknowledged(): boolean {
    return !!this.acknowledgedAt;
  }

  /**
   * Vérifie si les données sont synchronisées
   */
  get isSynced(): boolean {
    if (!this.syncedAt) return false;
    return this.syncedAt >= this.updatedAt;
  }

  /**
   * Retourne la couleur associée à la sévérité
   */
  get severityColor(): string {
    const colors: { [key: string]: string } = {
      low: '#3b82f6', // blue
      medium: '#fbbf24', // yellow
      high: '#f97316', // orange
      critical: '#ef4444', // red
    };
    return colors[this.severity] || colors.medium;
  }

  /**
   * Retourne l'icône associée au type
   */
  get typeIcon(): string {
    const icons: { [key: string]: string } = {
      observance: 'activity',
      technical: 'tool',
      medical: 'alert-circle',
      maintenance: 'settings',
    };
    return icons[this.type] || 'bell';
  }

  /**
   * Retourne le label de sévérité en français
   */
  get severityLabel(): string {
    const labels: { [key: string]: string } = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée',
      critical: 'Critique',
    };
    return labels[this.severity] || 'Moyenne';
  }

  /**
   * Retourne le label de type en français
   */
  get typeLabel(): string {
    const labels: { [key: string]: string } = {
      observance: 'Observance',
      technical: 'Technique',
      medical: 'Médical',
      maintenance: 'Maintenance',
    };
    return labels[this.type] || 'Autre';
  }

  /**
   * Vérifie si l'alerte est récente (< 24h)
   */
  get isRecent(): boolean {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return this.createdAt >= oneDayAgo;
  }

  /**
   * Vérifie si l'alerte est urgente (critique et non résolue)
   */
  get isUrgent(): boolean {
    return this.severity === 'critical' && !this.isResolved;
  }

  /**
   * Calcule l'âge de l'alerte en heures
   */
  get ageInHours(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Calcule l'âge de l'alerte en format lisible
   */
  get ageFormatted(): string {
    const hours = this.ageInHours;
    
    if (hours < 1) {
      return 'Il y a moins d\'1h';
    } else if (hours < 24) {
      return `Il y a ${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      return `Il y a ${days}j`;
    }
  }

  /**
   * Formatte la date de création
   */
  get formattedDate(): string {
    return this.createdAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Retourne la priorité d'affichage (0 = plus prioritaire)
   */
  get displayPriority(): number {
    // Critique non résolue = priorité max
    if (this.severity === 'critical' && !this.isResolved) return 0;
    
    // Haute non résolue
    if (this.severity === 'high' && !this.isResolved) return 1;
    
    // Moyenne non résolue
    if (this.severity === 'medium' && !this.isResolved) return 2;
    
    // Faible non résolue
    if (this.severity === 'low' && !this.isResolved) return 3;
    
    // Résolues
    return 10;
  }

  // ============================================
  // MÉTHODES ASYNCHRONES
  // ============================================

  /**
   * Marque l'alerte comme lue
   */
  async markAsRead(userId?: string) {
    await this.update((alert: any) => {
      alert.isRead = true;
      if (userId) {
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
      }
    });
  }

  /**
   * Marque l'alerte comme non lue
   */
  async markAsUnread() {
    await this.update((alert: any) => {
      alert.isRead = false;
    });
  }

  /**
   * Résout l'alerte
   */
  async resolve(userId: string, note?: string) {
    await this.update((alert: any) => {
      alert.isResolved = true;
      alert.resolvedBy = userId;
      alert.resolvedAt = new Date();
      
      // Ajouter la note aux métadonnées
      if (note) {
        const meta = alert.parsedMetadata || {};
        meta.resolutionNote = note;
        alert.metadata = JSON.stringify(meta);
      }
    });
  }

  /**
   * Rouvre l'alerte (annule la résolution)
   */
  async reopen() {
    await this.update((alert: any) => {
      alert.isResolved = false;
      alert.resolvedBy = null;
      alert.resolvedAt = null;
    });
  }

  /**
   * Acquitte l'alerte (marque comme prise en compte)
   */
  async acknowledge(userId: string) {
    await this.update((alert: any) => {
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
    });
  }

  /**
   * Met à jour les métadonnées
   */
  async updateMetadata(newMetadata: any) {
    await this.update((alert: any) => {
      const existing = alert.parsedMetadata || {};
      alert.metadata = JSON.stringify({ ...existing, ...newMetadata });
    });
  }

  /**
   * Marque l'alerte comme synchronisée
   */
  async markAsSynced() {
    await this.update((alert: any) => {
      alert.syncedAt = new Date();
    });
  }

  /**
   * Récupère le patient associé
   */
  async getPatient() {
    return await this.patient.fetch();
  }

  /**
   * Génère un résumé court de l'alerte
   */
  generateShortSummary(): string {
    return `${this.typeLabel} - ${this.severityLabel} - ${this.title}`;
  }

  /**
   * Génère un résumé détaillé de l'alerte
   */
  async generateDetailedSummary(): Promise<string> {
    const patient = await this.getPatient();
    const patientName = patient?.user?.name || 'Patient inconnu';
    
    const parts = [
      `Patient : ${patientName}`,
      `Type : ${this.typeLabel}`,
      `Sévérité : ${this.severityLabel}`,
      `Créée : ${this.formattedDate}`,
    ];
    
    if (this.isAcknowledged) {
      parts.push(`Acquittée : ${this.acknowledgedAt?.toLocaleDateString('fr-FR')}`);
    }
    
    if (this.isResolved) {
      parts.push(`Résolue : ${this.resolvedAt?.toLocaleDateString('fr-FR')}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Détermine l'action recommandée
   */
  getRecommendedAction(): string {
    const meta = this.parsedMetadata;
    
    switch (this.type) {
      case 'observance':
        if (this.severity === 'critical') {
          return 'Contacter le patient immédiatement pour comprendre les difficultés';
        }
        return 'Appeler le patient pour un suivi';
      
      case 'technical':
        if (meta?.issue === 'high_leakage') {
          return 'Vérifier l\'ajustement du masque, prévoir intervention si nécessaire';
        }
        return 'Planifier une intervention technique';
      
      case 'medical':
        if (this.severity === 'critical') {
          return 'Consulter le médecin traitant rapidement';
        }
        return 'Suivi médical recommandé';
      
      case 'maintenance':
        return 'Planifier la maintenance préventive';
      
      default:
        return 'Évaluer la situation et prendre action appropriée';
    }
  }

  /**
   * Vérifie si l'alerte nécessite une escalade
   */
  needsEscalation(): boolean {
    // Critique non résolue depuis plus de 24h
    if (this.severity === 'critical' && !this.isResolved && this.ageInHours > 24) {
      return true;
    }
    
    // Haute non résolue depuis plus de 48h
    if (this.severity === 'high' && !this.isResolved && this.ageInHours > 48) {
      return true;
    }
    
    return false;
  }

  /**
   * Calcule le temps restant avant escalade (en heures)
   */
  hoursUntilEscalation(): number | null {
    if (this.isResolved) return null;
    
    if (this.severity === 'critical') {
      return Math.max(0, 24 - this.ageInHours);
    }
    
    if (this.severity === 'high') {
      return Math.max(0, 48 - this.ageInHours);
    }
    
    return null;
  }
}

/**
 * NOTES SUR LE MODÈLE :
 * 
 * 1. Types d'alertes :
 *    - observance : Problèmes d'utilisation (<4h, abandon)
 *    - technical : Problèmes techniques (fuites, pression)
 *    - medical : Problèmes médicaux (IAH élevé, événements)
 *    - maintenance : Maintenance préventive
 * 
 * 2. Sévérités :
 *    - low : Information, pas d'action immédiate requise
 *    - medium : Suivi recommandé dans les 7 jours
 *    - high : Action requise dans les 48h
 *    - critical : Action immédiate requise (<24h)
 * 
 * 3. Workflow :
 *    - Création : isRead=false, isResolved=false
 *    - Lecture : markAsRead() → isRead=true
 *    - Acquittement : acknowledge() → acknowledgedBy, acknowledgedAt
 *    - Résolution : resolve() → isResolved=true, resolvedBy, resolvedAt
 * 
 * 4. Escalade :
 *    - Critique : 24h sans résolution
 *    - Haute : 48h sans résolution
 *    - Notifie automatiquement le niveau supérieur
 * 
 * 5. Métadonnées :
 *    - Stockées en JSON
 *    - Peuvent contenir : issue, value, threshold, context
 *    - Extensibles selon le type d'alerte
 */
