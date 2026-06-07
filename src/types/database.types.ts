/**
 * TYPES TYPESCRIPT SUPABASE - BASE DE DONNÉES
 * 
 * Types générés pour correspondre exactement à la structure de la base de données Supabase
 * Architecture : 7 tables principales avec RLS et panel_code
 * 
 * ⚠️ IMPORTANT : Ces types doivent rester synchronisés avec le schéma SQL
 * Voir : /supabase/migration.sql pour la structure complète
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * ============================================================================
 * TABLE: users
 * Utilisateurs de la plateforme (patients, médecins, admins, prestataires)
 * ============================================================================
 */
export interface Users {
  id: string
  email: string
  password_hash?: string
  role: 'patient' | 'medecin' | 'admin' | 'prestataire'
  first_name: string
  last_name: string
  phone?: string
  created_at: string
  updated_at: string
}

/**
 * ============================================================================
 * TABLE: patients
 * Informations patients avec segmentation par panel_code médecin
 * ============================================================================
 */
export interface Patients {
  id: string
  user_id: string
  medical_id?: string
  nir?: string // Numéro Sécurité Sociale
  birth_date?: string
  medecin_id?: string
  panel_code?: string // Segmentation par médecin
  device_serial?: string
  consent_data_sharing: boolean
  consent_telemedicine: boolean
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
}

/**
 * ============================================================================
 * TABLE: medecins
 * Médecins prescripteurs avec identifiant RPPS
 * ============================================================================
 */
export interface Medecins {
  id: string
  user_id: string
  rpps?: string // Répertoire Partagé des Professionnels de Santé
  specialty?: string
  panel_code?: string // Code unique pour segmenter leurs patients
  practice_address?: string
  psc_connected: boolean // Pro Santé Connect
  psc_user_id?: string
  created_at: string
  updated_at: string
}

/**
 * ============================================================================
 * TABLE: telemetry
 * Données télémétriques des appareils PPC (Pression Positive Continue)
 * ============================================================================
 */
export interface Telemetry {
  id: string
  patient_id: string
  device_serial: string
  recorded_at: string
  
  // Métriques principales d'observance
  usage_hours: number
  iah: number // Indice Apnée-Hypopnée
  observance: number // Pourcentage d'observance
  leak_rate: number // Fuite masque (L/min)
  
  // Pressions
  pressure_min: number
  pressure_max: number
  pressure_avg: number
  
  // Données brutes JSON (pour analyses avancées)
  raw_data?: Json
  
  created_at: string
}

/**
 * ============================================================================
 * TABLE: exp_air_scores
 * Système de gamification pour motivation patient
 * ============================================================================
 */
export interface MedicalScores {
  id: string
  patient_id: string
  date: string
  
  // Score global (0-100)
  total_score: number
  
  // Sous-scores détaillés
  observance_score: number // Régularité utilisation
  quality_score: number // Qualité du sommeil (IAH bas)
  consistency_score: number // Constance dans le temps
  
  // Badges débloqués (JSON array)
  badges_unlocked: string[]
  
  created_at: string
}

/**
 * ============================================================================
 * TABLE: alerts
 * Alertes automatiques pour suivi prestataire/médecin
 * ============================================================================
 */
export interface Alerts {
  id: string
  patient_id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  resolved_by?: string // user_id du résolveur
  resolution_note?: string
}

export type AlertType =
  | 'low_observance' // Observance < 4h/nuit
  | 'high_iah' // IAH élevé malgré traitement
  | 'device_malfunction' // Panne appareil
  | 'high_leak' // Fuite importante
  | 'no_data' // Absence données > 3 jours
  | 'maintenance_due' // Maintenance préventive
  | 'consumable_replacement' // Remplacement masque/filtre

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * ============================================================================
 * TABLE: interventions
 * Interventions techniques du prestataire (installation, maintenance, SAV)
 * ============================================================================
 */
export interface Interventions {
  id: string
  patient_id: string
  alert_id?: string // Lié à une alerte si intervention corrective
  type: InterventionType
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_at: string
  completed_at?: string
  technician_id?: string // user_id du technicien
  notes?: string
  parts_replaced?: string[] // JSON array des pièces changées
  created_at: string
  updated_at: string
}

export type InterventionType =
  | 'installation' // Installation initiale
  | 'maintenance' // Maintenance préventive
  | 'repair' // Réparation
  | 'mask_replacement' // Changement masque
  | 'filter_replacement' // Changement filtre
  | 'tubing_replacement' // Changement tuyau
  | 'training' // Formation patient
  | 'troubleshooting' // Dépannage

/**
 * ============================================================================
 * TABLE: devices
 * Appareils PPC avec configuration et statut
 * ============================================================================
 */
export interface Devices {
  id: string
  serial: string
  model: string
  manufacturer: string
  firmware_version?: string
  
  // Paramètres médicaux
  pressure_min: number
  pressure_max: number
  ramp_time?: number
  
  // Connectivité
  connection_type: 'wifi' | 'cellular' | 'bluetooth' | 'sd_card'
  last_sync?: string
  
  // Statut
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  assigned_patient_id?: string
  
  created_at: string
  updated_at: string
}

/**
 * ============================================================================
 * TABLE: stock (Phase 3 - Facturation)
 * Gestion des stocks de consommables
 * ============================================================================
 */
export interface Stock {
  id: string
  item_type: ConsumableType
  item_name: string
  item_code?: string // Référence fournisseur
  quantity: number
  min_threshold: number
  unit_price: number
  supplier?: string
  last_restocked?: string
  created_at: string
  updated_at: string
}

export type ConsumableType =
  | 'mask' // Masque nasal/facial
  | 'filter' // Filtre à air
  | 'tubing' // Circuit respiratoire
  | 'humidifier_chamber' // Chambre humidificateur
  | 'chinstrap' // Mentonnière
  | 'headgear' // Harnais

/**
 * ============================================================================
 * TABLE: billing (Phase 3 - Facturation CPAM)
 * Facturation automatisée avec calcul remboursement CPAM
 * ============================================================================
 */
export interface Billing {
  id: string
  patient_id: string
  period_start: string
  period_end: string
  
  // Montants détaillés
  base_rental: number // Location mensuelle PPC
  consumables: number // Masque, filtres...
  services: number // Télémédecine, télésuivi...
  total_amount: number
  
  // Remboursement CPAM
  cpam_rate: number // Taux de remboursement (ex: 60%)
  cpam_amount: number // Montant remboursé CPAM
  patient_amount: number // Reste à charge patient
  
  // Observance pour remboursement
  observance_rate: number // % observance période
  observance_compliant: boolean // Si >= 70% (critère CPAM)
  
  // Statut
  status: 'draft' | 'sent' | 'paid' | 'rejected'
  sent_at?: string
  paid_at?: string
  rejection_reason?: string
  
  created_at: string
  updated_at: string
}

/**
 * ============================================================================
 * TABLE: audit_logs (Sécurité - Conformité HDS)
 * Logs d'audit pour traçabilité réglementaire
 * ============================================================================
 */
export interface AuditLogs {
  id: string
  user_id?: string
  action: string // Ex: "LOGIN", "PATIENT_VIEW", "DATA_EXPORT"
  resource_type?: string // Ex: "patient", "telemetry"
  resource_id?: string
  ip_address?: string
  user_agent?: string
  details?: Json
  timestamp: string
}

/**
 * ============================================================================
 * SCHÉMA COMPLET DE LA BASE DE DONNÉES
 * ============================================================================
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: Users
        Insert: Omit<Users, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Users, 'id' | 'created_at'>>
      }
      patients: {
        Row: Patients
        Insert: Omit<Patients, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Patients, 'id' | 'created_at'>>
      }
      medecins: {
        Row: Medecins
        Insert: Omit<Medecins, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Medecins, 'id' | 'created_at'>>
      }
      telemetry: {
        Row: Telemetry
        Insert: Omit<Telemetry, 'id' | 'created_at'>
        Update: Partial<Omit<Telemetry, 'id' | 'created_at'>>
      }
      exp_air_scores: {
        Row: MedicalScores
        Insert: Omit<MedicalScores, 'id' | 'created_at'>
        Update: Partial<Omit<MedicalScores, 'id' | 'created_at'>>
      }
      alerts: {
        Row: Alerts
        Insert: Omit<Alerts, 'id' | 'created_at'>
        Update: Partial<Omit<Alerts, 'id' | 'created_at'>>
      }
      interventions: {
        Row: Interventions
        Insert: Omit<Interventions, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Interventions, 'id' | 'created_at'>>
      }
      devices: {
        Row: Devices
        Insert: Omit<Devices, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Devices, 'id' | 'created_at'>>
      }
      stock: {
        Row: Stock
        Insert: Omit<Stock, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Stock, 'id' | 'created_at'>>
      }
      billing: {
        Row: Billing
        Insert: Omit<Billing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Billing, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLogs
        Insert: Omit<AuditLogs, 'id'>
        Update: Partial<Omit<AuditLogs, 'id'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

/**
 * ============================================================================
 * HELPERS TYPES POUR FACILITER L'UTILISATION
 * ============================================================================
 */

// Type pour une table complète
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

// Type pour insertion
export type InsertDTO<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

// Type pour update
export type UpdateDTO<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

/**
 * Exemples d'utilisation :
 * 
 * // Récupérer un patient
 * const patient: Tables<'patients'> = await supabase.from('patients').select('*').single()
 * 
 * // Insérer un nouveau patient
 * const newPatient: InsertDTO<'patients'> = {
 *   user_id: 'xxx',
 *   first_name: 'Jean',
 *   ...
 * }
 * 
 * // Mettre à jour un patient
 * const updates: UpdateDTO<'patients'> = {
 *   status: 'active'
 * }
 */
