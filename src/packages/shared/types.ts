/**
 * TYPES TYPESCRIPT PARTAGÉS
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Types métiers centralisés pour cohérence cross-platform
 */

/**
 * Rôles utilisateurs
 */
export type UserRole = 'patient' | 'medecin' | 'admin' | 'prestataire';

/**
 * Statuts génériques
 */
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

/**
 * Profil utilisateur
 */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Patient
 */
export interface Patient extends UserProfile {
  role: 'patient';
  medical_id?: string;
  nir?: string; // Numéro Sécurité Sociale
  birth_date?: string;
  medecin_id?: string;
  panel_code?: string;
  device_serial?: string;
  consent_data_sharing: boolean;
  consent_telemedicine: boolean;
}

/**
 * Médecin
 */
export interface Medecin extends UserProfile {
  role: 'medecin';
  rpps?: string; // Répertoire Partagé des Professionnels de Santé
  specialty?: string;
  panel_code?: string;
  practice_address?: string;
  psc_connected?: boolean; // Pro Santé Connect
}

/**
 * Admin / Prestataire
 */
export interface Admin extends UserProfile {
  role: 'admin' | 'prestataire';
  permissions?: string[];
}

/**
 * Données télémétrie (appareil PPC)
 */
export interface TelemetryData {
  id: string;
  patient_id: string;
  device_serial: string;
  recorded_at: string;
  
  // Métriques principales
  usage_hours: number;
  iah: number; // Indice Apnée-Hypopnée
  observance: number; // Pourcentage
  leak_rate: number; // Fuite masque (L/min)
  pressure_min: number;
  pressure_max: number;
  pressure_avg: number;
  
  // Données brutes (BLOB)
  raw_data?: any;
  
  created_at: string;
}

/**
 * Score Medical (gamification)
 */
export interface MedicalScore {
  id: string;
  patient_id: string;
  date: string;
  
  // Score global (0-100)
  total_score: number;
  
  // Sous-scores
  observance_score: number;
  quality_score: number;
  consistency_score: number;
  
  // Badges débloqués
  badges_unlocked: string[];
  
  created_at: string;
}

/**
 * Alerte
 */
export interface Alert {
  id: string;
  patient_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
}

export type AlertType = 
  | 'low_observance'
  | 'high_iah'
  | 'device_malfunction'
  | 'high_leak'
  | 'no_data'
  | 'maintenance_due'
  | 'consumable_replacement';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Intervention technique
 */
export interface Intervention {
  id: string;
  patient_id: string;
  alert_id?: string;
  type: InterventionType;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  completed_at?: string;
  technician_id?: string;
  notes?: string;
  parts_replaced?: string[];
  created_at: string;
}

export type InterventionType =
  | 'installation'
  | 'maintenance'
  | 'repair'
  | 'mask_replacement'
  | 'filter_replacement'
  | 'tubing_replacement'
  | 'training'
  | 'troubleshooting';

/**
 * Stock consommables
 */
export interface Stock {
  id: string;
  item_type: ConsumableType;
  item_name: string;
  quantity: number;
  min_threshold: number;
  unit_price: number;
  supplier?: string;
  last_updated: string;
}

export type ConsumableType = 
  | 'mask'
  | 'filter'
  | 'tubing'
  | 'humidifier_chamber'
  | 'chinstrap'
  | 'headgear';

/**
 * Facturation CPAM
 */
export interface Billing {
  id: string;
  patient_id: string;
  period_start: string;
  period_end: string;
  
  // Montants
  base_rental: number; // Location PPC
  consumables: number; // Consommables
  services: number; // Services (télémédecine, etc.)
  total_amount: number;
  
  // Remboursement CPAM
  cpam_rate: number; // Taux (ex: 60%)
  cpam_amount: number;
  patient_amount: number; // Reste à charge
  
  // Statut
  status: 'draft' | 'sent' | 'paid' | 'rejected';
  sent_at?: string;
  paid_at?: string;
  
  created_at: string;
}

/**
 * Métriques business (Admin)
 */
export interface BusinessMetrics {
  // Patients
  total_patients: number;
  active_patients: number;
  new_patients_month: number;
  
  // Observance
  avg_observance: number;
  good_observance_rate: number; // % patients > 70%
  
  // Financier
  monthly_revenue: number;
  pending_invoices: number;
  payment_rate: number;
  
  // Alertes
  open_alerts: number;
  critical_alerts: number;
  avg_resolution_time: number; // heures
  
  // Stock
  low_stock_items: number;
  
  // Compliance HDS
  data_exports_month: number;
  consent_rate: number;
}

/**
 * Configuration appareil
 */
export interface DeviceConfig {
  serial: string;
  model: string;
  manufacturer: string;
  firmware_version?: string;
  
  // Paramètres médicaux
  pressure_min: number;
  pressure_max: number;
  ramp_time?: number;
  
  // Connectivité
  connection_type: 'wifi' | 'cellular' | 'bluetooth' | 'sd_card';
  last_sync?: string;
  
  // Statut
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
}

/**
 * Réponse API standardisée
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    request_id: string;
  };
}

/**
 * Pagination
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Filtres de recherche
 */
export interface SearchFilters {
  query?: string;
  role?: UserRole;
  status?: Status;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
