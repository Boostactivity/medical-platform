/**
 * DONNÉES MOCKÉES - Dashboard Médecin
 * 
 * Données simulées pour le dashboard médecin incluant :
 * - KPIs globaux
 * - Historique IAH (Index Apnée-Hypopnée)
 * - Liste des patients avec alertes
 * - Statistiques d'observance
 */

export interface PatientAlert {
  id: string;
  patientName: string;
  patientId: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  score?: number;
}

export interface IAHData {
  date: string;
  iah_moyen: number;
  patients_total: number;
}

export interface DashboardKPIs {
  patientsActifs: number;
  alertesCritiques: number;
  observanceMoyenne: number;
  appareilsConnectes: number;
  scoreGlobal: number;
}

// KPIs Dashboard
export const mockKPIs: DashboardKPIs = {
  patientsActifs: 142,
  alertesCritiques: 3,
  observanceMoyenne: 78,
  appareilsConnectes: 98,
  scoreGlobal: 82,
};

// Historique IAH sur 7 jours
export const mockIAHHistory: IAHData[] = [
  { date: '2024-12-04', iah_moyen: 8.2, patients_total: 142 },
  { date: '2024-12-03', iah_moyen: 7.8, patients_total: 141 },
  { date: '2024-12-02', iah_moyen: 8.5, patients_total: 140 },
  { date: '2024-12-01', iah_moyen: 9.1, patients_total: 139 },
  { date: '2024-11-30', iah_moyen: 8.7, patients_total: 138 },
  { date: '2024-11-29', iah_moyen: 8.3, patients_total: 138 },
  { date: '2024-11-28', iah_moyen: 9.0, patients_total: 137 },
];

// Dernières alertes
export const mockAlerts: PatientAlert[] = [
  {
    id: 'alert-001',
    patientName: 'Sophie Bernard',
    patientId: 'patient-123',
    severity: 'critical',
    message: 'Observance critique (42%) - IAH en hausse (18.5)',
    timestamp: '2024-12-04T08:30:00Z',
    score: 42,
  },
  {
    id: 'alert-002',
    patientName: 'Jean Martin',
    patientId: 'patient-456',
    severity: 'warning',
    message: 'IAH en augmentation (+3.2 points)',
    timestamp: '2024-12-04T07:15:00Z',
    score: 65,
  },
  {
    id: 'alert-003',
    patientName: 'Marie Dubois',
    patientId: 'patient-789',
    severity: 'critical',
    message: 'Fuites importantes détectées (>40 L/min)',
    timestamp: '2024-12-03T22:45:00Z',
    score: 51,
  },
  {
    id: 'alert-004',
    patientName: 'Pierre Leroy',
    patientId: 'patient-321',
    severity: 'warning',
    message: 'Observance en baisse (68%, -12% vs mois dernier)',
    timestamp: '2024-12-03T18:30:00Z',
    score: 68,
  },
  {
    id: 'alert-005',
    patientName: 'Claire Moreau',
    patientId: 'patient-654',
    severity: 'info',
    message: 'Demande de renouvellement de consommables',
    timestamp: '2024-12-03T14:20:00Z',
    score: 87,
  },
];

// Données historiques d'observance (pour graphiques détaillés)
export const mockObservanceHistory = [
  { date: '2024-11-28', hours_used: 7.2, leakage: 12, events: 5 },
  { date: '2024-11-29', hours_used: 6.8, leakage: 8, events: 3 },
  { date: '2024-11-30', hours_used: 7.5, leakage: 10, events: 4 },
  { date: '2024-12-01', hours_used: 6.5, leakage: 15, events: 7 },
  { date: '2024-12-02', hours_used: 7.0, leakage: 9, events: 2 },
  { date: '2024-12-03', hours_used: 7.3, leakage: 11, events: 4 },
  { date: '2024-12-04', hours_used: 6.9, leakage: 13, events: 6 },
];

// Liste complète des patients (pour la vue liste)
export interface Patient {
  id: string;
  name: string;
  age: number;
  score: number;
  observance: number;
  iah: number;
  lastSync: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export const mockPatients: Patient[] = [
  {
    id: 'patient-001',
    name: 'Antoine Rousseau',
    age: 58,
    score: 92,
    observance: 94,
    iah: 4.2,
    lastSync: '2024-12-04T08:00:00Z',
    status: 'excellent',
  },
  {
    id: 'patient-002',
    name: 'Isabelle Fournier',
    age: 62,
    score: 88,
    observance: 89,
    iah: 5.8,
    lastSync: '2024-12-04T07:30:00Z',
    status: 'excellent',
  },
  {
    id: 'patient-003',
    name: 'François Girard',
    age: 55,
    score: 75,
    observance: 78,
    iah: 8.5,
    lastSync: '2024-12-04T06:45:00Z',
    status: 'good',
  },
  {
    id: 'patient-123',
    name: 'Sophie Bernard',
    age: 48,
    score: 42,
    observance: 42,
    iah: 18.5,
    lastSync: '2024-12-04T08:30:00Z',
    status: 'critical',
  },
  {
    id: 'patient-456',
    name: 'Jean Martin',
    age: 67,
    score: 65,
    observance: 68,
    iah: 12.3,
    lastSync: '2024-12-04T07:15:00Z',
    status: 'warning',
  },
];
