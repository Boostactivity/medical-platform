/**
 * ═══════════════════════════════════════════════════════════════════
 * GESTIONNAIRE DE STOCKS & CONSOMMABLES - PHASE 3 BUSINESS MODEL
 * ═══════════════════════════════════════════════════════════════════
 * 
 * OBJECTIF : Automatiser le suivi des renouvellements de consommables
 * pour sécuriser le CA et améliorer la compliance patient.
 * 
 * LOGIQUE MÉTIER :
 * - Chaque équipement a une durée de vie fixe (3-6 mois)
 * - Oubli renouvellement = Perte CA + Risque dégradation compliance
 * - Renouvellement anticipé = Meilleure observance + Fidélisation
 * 
 * ÉQUIPEMENTS SUIVIS :
 * - Masque nasal/facial : 6 mois
 * - Tubulure : 6 mois
 * - Filtre machine : 3 mois (lavable) / 1 mois (jetable)
 * - Humidificateur : 6 mois
 * - Harnais masque : 12 mois
 * 
 * WORKFLOW AUTOMATIQUE :
 * 1. J-30 : Alerte préparation commande
 * 2. J-15 : Alerte programmation visite/envoi
 * 3. J-7 : Alerte urgente si pas d'action
 * 4. J-0 : Alerte critique dépassement
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════

export type EquipmentType = 
  | 'mask_nasal'
  | 'mask_full_face'
  | 'tubing'
  | 'filter_disposable'
  | 'filter_washable'
  | 'humidifier'
  | 'headgear'
  | 'chinstrap';

export interface EquipmentLifespan {
  type: EquipmentType;
  name: string;
  lifespan_months: number;
  warning_days_before: number; // Alerte anticipée
  critical_days_before: number; // Alerte urgente
  price_euro: number; // Prix unitaire
  cpam_reimbursement: boolean;
}

export interface EquipmentTracking {
  id?: string;
  patient_id: string;
  equipment_type: EquipmentType;
  installation_date: string;
  expected_renewal_date: string;
  actual_renewal_date: string | null;
  status: 'active' | 'renewed' | 'overdue';
  manufacturer: string;
  serial_number: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RenewalAlert {
  type: 'RENEWAL_PREPARE' | 'RENEWAL_URGENT' | 'RENEWAL_OVERDUE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patient_id: string;
  equipment: EquipmentTracking;
  title: string;
  message: string;
  days_until_renewal: number;
  estimated_revenue: number;
  suggested_actions: string[];
}

export interface StockSummary {
  total_equipment_tracked: number;
  upcoming_renewals_30days: RenewalItem[];
  upcoming_renewals_60days: RenewalItem[];
  overdue_renewals: RenewalItem[];
  total_revenue_30days: number;
  total_revenue_60days: number;
  revenue_lost_overdue: number;
}

export interface RenewalItem {
  patient_id: string;
  patient_name: string;
  panel_code: string;
  equipment_type: EquipmentType;
  equipment_name: string;
  installation_date: string;
  renewal_date: string;
  days_until_renewal: number;
  status: 'upcoming' | 'urgent' | 'overdue';
  revenue: number;
  last_contact: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION ÉQUIPEMENTS
// ═══════════════════════════════════════════════════════════════════

export const EQUIPMENT_CATALOG: Record<EquipmentType, EquipmentLifespan> = {
  mask_nasal: {
    type: 'mask_nasal',
    name: 'Masque nasal',
    lifespan_months: 6,
    warning_days_before: 30,
    critical_days_before: 7,
    price_euro: 33.20,
    cpam_reimbursement: true,
  },
  mask_full_face: {
    type: 'mask_full_face',
    name: 'Masque facial complet',
    lifespan_months: 6,
    warning_days_before: 30,
    critical_days_before: 7,
    price_euro: 38.90,
    cpam_reimbursement: true,
  },
  tubing: {
    type: 'tubing',
    name: 'Tubulure',
    lifespan_months: 6,
    warning_days_before: 30,
    critical_days_before: 7,
    price_euro: 12.50,
    cpam_reimbursement: true,
  },
  filter_disposable: {
    type: 'filter_disposable',
    name: 'Filtre jetable',
    lifespan_months: 1,
    warning_days_before: 7,
    critical_days_before: 3,
    price_euro: 4.20,
    cpam_reimbursement: true,
  },
  filter_washable: {
    type: 'filter_washable',
    name: 'Filtre lavable',
    lifespan_months: 3,
    warning_days_before: 15,
    critical_days_before: 5,
    price_euro: 8.90,
    cpam_reimbursement: true,
  },
  humidifier: {
    type: 'humidifier',
    name: 'Humidificateur',
    lifespan_months: 6,
    warning_days_before: 30,
    critical_days_before: 7,
    price_euro: 15.00,
    cpam_reimbursement: true,
  },
  headgear: {
    type: 'headgear',
    name: 'Harnais masque',
    lifespan_months: 12,
    warning_days_before: 45,
    critical_days_before: 14,
    price_euro: 18.50,
    cpam_reimbursement: true,
  },
  chinstrap: {
    type: 'chinstrap',
    name: 'Mentonnière',
    lifespan_months: 12,
    warning_days_before: 45,
    critical_days_before: 14,
    price_euro: 9.80,
    cpam_reimbursement: false,
  },
};

// ═══════════════════════════════════════════════════════════════════
// FONCTIONS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════

/**
 * Enregistre un nouvel équipement installé
 */
export async function registerEquipment(
  equipment: Omit<EquipmentTracking, 'id' | 'expected_renewal_date' | 'status' | 'created_at' | 'updated_at'>,
  supabase: any
): Promise<EquipmentTracking> {
  const config = EQUIPMENT_CATALOG[equipment.equipment_type];
  if (!config) {
    throw new Error(`Unknown equipment type: ${equipment.equipment_type}`);
  }

  // Calculer date de renouvellement attendue
  const installDate = new Date(equipment.installation_date);
  const renewalDate = new Date(installDate);
  renewalDate.setMonth(renewalDate.getMonth() + config.lifespan_months);

  const newEquipment: Partial<EquipmentTracking> = {
    ...equipment,
    expected_renewal_date: renewalDate.toISOString().split('T')[0],
    status: 'active',
  };

  const { data, error } = await supabase
    .from('equipment_tracking')
    .insert(newEquipment)
    .select()
    .single();

  if (error) {
    console.error('[STOCK] Error registering equipment:', error);
    throw error;
  }

  console.log(`[STOCK] ✅ Equipment registered: ${config.name} for patient ${equipment.patient_id}`);
  return data;
}

/**
 * Enregistre le renouvellement d'un équipement
 */
export async function renewEquipment(
  equipmentId: string,
  renewalDate: string,
  supabase: any
): Promise<void> {
  // Marquer ancien équipement comme renouvelé
  const { error: updateError } = await supabase
    .from('equipment_tracking')
    .update({
      actual_renewal_date: renewalDate,
      status: 'renewed',
    })
    .eq('id', equipmentId);

  if (updateError) {
    console.error('[STOCK] Error updating equipment:', updateError);
    throw updateError;
  }

  // Récupérer infos équipement pour créer nouveau
  const { data: oldEquipment, error: fetchError } = await supabase
    .from('equipment_tracking')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (fetchError) {
    console.error('[STOCK] Error fetching equipment:', fetchError);
    throw fetchError;
  }

  // Créer nouveau tracking pour le nouvel équipement
  await registerEquipment({
    patient_id: oldEquipment.patient_id,
    equipment_type: oldEquipment.equipment_type,
    installation_date: renewalDate,
    actual_renewal_date: null,
    manufacturer: oldEquipment.manufacturer,
    serial_number: null,
    notes: `Renouvellement de ${equipmentId}`,
  }, supabase);

  console.log(`[STOCK] ✅ Equipment renewed: ${equipmentId}`);
}

/**
 * Vérifie tous les équipements et génère alertes renouvellement
 */
export async function checkUpcomingRenewals(
  supabase: any,
  daysAhead: number = 60
): Promise<StockSummary> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Récupérer tous les équipements actifs
  const { data: equipment, error } = await supabase
    .from('equipment_tracking')
    .select('*, profiles!inner(full_name, panel_code)')
    .eq('status', 'active')
    .lte('expected_renewal_date', futureDate.toISOString().split('T')[0])
    .order('expected_renewal_date', { ascending: true });

  if (error) {
    // If table doesn't exist, return empty data instead of crashing
    if (error.code === 'PGRST205') {
      console.log('[STOCK] equipment_tracking table not found, returning empty data');
      return {
        total_equipment_tracked: 0,
        upcoming_renewals_30days: [],
        upcoming_renewals_60days: [],
        overdue_renewals: [],
        total_revenue_30days: 0,
        total_revenue_60days: 0,
        revenue_lost_overdue: 0,
      };
    }
    console.error('[STOCK] Error fetching equipment:', error);
    throw error;
  }

  const renewals: RenewalItem[] = [];
  let revenue30days = 0;
  let revenue60days = 0;
  let revenueLostOverdue = 0;

  for (const item of equipment || []) {
    const config = EQUIPMENT_CATALOG[item.equipment_type as EquipmentType];
    const renewalDate = new Date(item.expected_renewal_date);
    const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'upcoming' | 'urgent' | 'overdue';
    if (daysUntil < 0) {
      status = 'overdue';
      revenueLostOverdue += config.price_euro;
    } else if (daysUntil <= config.critical_days_before) {
      status = 'urgent';
    } else {
      status = 'upcoming';
    }

    if (daysUntil <= 30) revenue30days += config.price_euro;
    if (daysUntil <= 60) revenue60days += config.price_euro;

    renewals.push({
      patient_id: item.patient_id,
      patient_name: item.profiles?.full_name || 'Inconnu',
      panel_code: item.profiles?.panel_code || 'N/A',
      equipment_type: item.equipment_type,
      equipment_name: config.name,
      installation_date: item.installation_date,
      renewal_date: item.expected_renewal_date,
      days_until_renewal: daysUntil,
      status,
      revenue: config.price_euro,
      last_contact: null, // À implémenter
    });
  }

  return {
    total_equipment_tracked: equipment?.length || 0,
    upcoming_renewals_30days: renewals.filter(r => r.days_until_renewal >= 0 && r.days_until_renewal <= 30),
    upcoming_renewals_60days: renewals.filter(r => r.days_until_renewal > 30 && r.days_until_renewal <= 60),
    overdue_renewals: renewals.filter(r => r.days_until_renewal < 0),
    total_revenue_30days: revenue30days,
    total_revenue_60days: revenue60days,
    revenue_lost_overdue: revenueLostOverdue,
  };
}

/**
 * Génère alertes pour renouvellements à venir
 */
export async function generateRenewalAlerts(
  renewal: RenewalItem
): Promise<RenewalAlert | null> {
  const config = EQUIPMENT_CATALOG[renewal.equipment_type];
  let type: 'RENEWAL_PREPARE' | 'RENEWAL_URGENT' | 'RENEWAL_OVERDUE';
  let severity: 'low' | 'medium' | 'high' | 'critical';
  let title: string;
  let message: string;
  let suggestedActions: string[];

  if (renewal.status === 'overdue') {
    type = 'RENEWAL_OVERDUE';
    severity = 'critical';
    title = `🚨 Renouvellement dépassé - ${config.name}`;
    message = `${config.name} devait être renouvelé il y a ${Math.abs(renewal.days_until_renewal)} jours. Risque de dégradation compliance + perte CA.`;
    suggestedActions = [
      'Contacter patient IMMÉDIATEMENT',
      'Programmer visite technicien urgence',
      'Vérifier stock disponible',
      'Commander si rupture',
      'Proposer livraison express',
      'Documenter retard pour analyse',
    ];
  } else if (renewal.status === 'urgent') {
    type = 'RENEWAL_URGENT';
    severity = 'high';
    title = `⚠️ Renouvellement urgent - ${config.name}`;
    message = `${config.name} à renouveler dans ${renewal.days_until_renewal} jours. Programmer intervention maintenant.`;
    suggestedActions = [
      'Appeler patient pour planifier',
      'Vérifier stock et commander si besoin',
      'Bloquer créneau technicien',
      'Préparer matériel',
      'Confirmer RDV par SMS/email',
    ];
  } else {
    type = 'RENEWAL_PREPARE';
    severity = 'medium';
    title = `📅 Renouvellement à préparer - ${config.name}`;
    message = `${config.name} à renouveler dans ${renewal.days_until_renewal} jours. Anticiper la commande.`;
    suggestedActions = [
      'Vérifier stock',
      'Commander si nécessaire',
      'Contacter patient (pré-planification)',
      'Vérifier historique observance',
      'Préparer fiche intervention',
    ];
  }

  return {
    type,
    severity,
    patient_id: renewal.patient_id,
    equipment: {
      patient_id: renewal.patient_id,
      equipment_type: renewal.equipment_type,
      installation_date: renewal.installation_date,
      expected_renewal_date: renewal.renewal_date,
      actual_renewal_date: null,
      status: 'active',
      manufacturer: '',
      serial_number: null,
      notes: null,
    },
    title,
    message,
    days_until_renewal: renewal.days_until_renewal,
    estimated_revenue: renewal.revenue,
    suggested_actions: suggestedActions,
  };
}

/**
 * Crée alerte dans alerts pour renouvellement
 */
export async function createRenewalAlertInQueue(
  alert: RenewalAlert
): Promise<void> {
  // Vérifier si alerte similaire existe déjà (< 7 jours)
  const { data: existingAlerts } = await supabase
    .from('alerts')
    .select('id')
    .eq('patient_id', alert.patient_id)
    .eq('type', alert.type)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .in('status', ['new', 'in_progress']);

  if (existingAlerts && existingAlerts.length > 0) {
    console.log(`[STOCK] Alert already exists for patient ${alert.patient_id}`);
    return; // Pas de doublon
  }

  // Assigner automatiquement au prestataire
  const prestatairesResult = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1);
  
  // Fallback to users table if profiles doesn't exist
  let prestataire;
  if (prestatairesResult.error?.code === 'PGRST205') {
    const usersResult = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    prestataire = usersResult.data?.[0];
  } else {
    prestataire = prestatairesResult.data?.[0];
  }

  const { error } = await supabase
    .from('alerts')
    .insert({
      patient_id: alert.patient_id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      status: 'new',
      assigned_to: prestataire?.id || null,
      context: {
        equipment_type: alert.equipment.equipment_type,
        installation_date: alert.equipment.installation_date,
        renewal_date: alert.equipment.expected_renewal_date,
        days_until_renewal: alert.days_until_renewal,
        estimated_revenue: alert.estimated_revenue,
      },
      suggested_actions: alert.suggested_actions,
      estimated_time_hours: alert.severity === 'critical' ? 2 : 1,
    });

  if (error) {
    console.error('[STOCK] Error creating alert:', error);
    throw error;
  }

  console.log(`[STOCK] ✅ Alert created: ${alert.type} for patient ${alert.patient_id}`);
}

/**
 * CRON JOB HEBDOMADAIRE - Vérification renouvellements
 */
export async function runWeeklyStockCheck(): Promise<void> {
  console.log('[STOCK CRON] ═══════════════════════════════════════════════════');
  console.log('[STOCK CRON] Starting weekly stock check...');
  console.log('[STOCK CRON] ═══════════════════════════════════════════════════');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  try {
    const stockSummary = await checkUpcomingRenewals(supabase, 60);

    console.log('[STOCK CRON] 📊 RAPPORT GLOBAL :');
    console.log(`  Total équipements suivis : ${stockSummary.total_equipment_tracked}`);
    console.log(`  📅 Renouvellements 30j : ${stockSummary.upcoming_renewals_30days.length}`);
    console.log(`  📅 Renouvellements 60j : ${stockSummary.upcoming_renewals_60days.length}`);
    console.log(`  🚨 En retard : ${stockSummary.overdue_renewals.length}`);
    console.log(`  💰 CA prévu 30j : ${stockSummary.total_revenue_30days.toFixed(2)}€`);
    console.log(`  💰 CA prévu 60j : ${stockSummary.total_revenue_60days.toFixed(2)}€`);
    console.log(`  ❌ CA perdu (retards) : ${stockSummary.revenue_lost_overdue.toFixed(2)}€`);

    // Créer alertes pour équipements à renouveler
    let alertsCreated = 0;
    const allRenewals = [
      ...stockSummary.overdue_renewals,
      ...stockSummary.upcoming_renewals_30days.filter(r => r.status === 'urgent'),
    ];

    for (const renewal of allRenewals) {
      const alert = await generateRenewalAlerts(renewal);
      if (alert) {
        await createRenewalAlertInQueue(alert);
        alertsCreated++;
      }
    }

    console.log(`[STOCK CRON] ✅ ${alertsCreated} alertes créées`);
    console.log('[STOCK CRON] ═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('[STOCK CRON] ❌ Error during stock check:', error);
  }
}

/**
 * Installation initiale équipements pour nouveau patient
 */
export async function setupPatientEquipment(
  patientId: string,
  installationDate: string,
  equipmentList: {
    maskType: 'nasal' | 'full_face';
    manufacturer: string;
    hasHumidifier: boolean;
    filterType: 'disposable' | 'washable';
  },
  supabase: any
): Promise<void> {
  const equipment: EquipmentType[] = [
    equipmentList.maskType === 'nasal' ? 'mask_nasal' : 'mask_full_face',
    'tubing',
    equipmentList.filterType === 'disposable' ? 'filter_disposable' : 'filter_washable',
    'headgear',
  ];

  if (equipmentList.hasHumidifier) {
    equipment.push('humidifier');
  }

  for (const type of equipment) {
    await registerEquipment({
      patient_id: patientId,
      equipment_type: type,
      installation_date: installationDate,
      actual_renewal_date: null,
      manufacturer: equipmentList.manufacturer,
      serial_number: null,
      notes: 'Installation initiale',
    }, supabase);
  }

  console.log(`[STOCK] ✅ Initial equipment setup for patient ${patientId}: ${equipment.join(', ')}`);
}