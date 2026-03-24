/**
 * Vérifie la conformité de tous les patients
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Types
interface CPAMCompliance {
  isCompliant: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentPeriod: {
    compliantDays: number;
    totalDays: number;
  };
  daysUntilRisk?: number;
}

/**
 * Calcule la conformité CPAM pour un patient
 */
export async function calculateCPAMCompliance(
  patientId: string,
  supabase?: any
): Promise<CPAMCompliance> {
  if (!supabase) {
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  // Récupérer les données de télémétrie des 30 derniers jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // CORRECTION: Utiliser 'observance_data' au lieu de 'sleep_data'
  // CORRECTION: Utiliser 'patient_id' au lieu de 'user_id'
  const { data: telemetryData, error } = await supabase
    .from('observance_data')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error || !telemetryData) {
    console.error('[calculateCPAMCompliance] Error:', error);
    return {
      isCompliant: false,
      riskLevel: 'medium',
      currentPeriod: { compliantDays: 0, totalDays: 30 },
      daysUntilRisk: 0,
    };
  }

  // Compter les jours conformes (>= 4h d'utilisation)
  // Note: sleep_data utilise 'usage_duration' (en heures)
  const compliantDays = telemetryData.filter(d => (d.usage_duration || 0) >= 4).length;
  const totalDays = telemetryData.length;

  // Calculer le pourcentage de conformité
  const complianceRate = totalDays > 0 ? (compliantDays / totalDays) * 100 : 0;

  // Déterminer le niveau de risque
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  let daysUntilRisk: number | undefined;

  if (complianceRate >= 70) {
    riskLevel = 'low';
  } else if (complianceRate >= 50) {
    riskLevel = 'medium';
    daysUntilRisk = Math.floor((70 - complianceRate) / 3); // Estimation
  } else if (complianceRate >= 30) {
    riskLevel = 'high';
    daysUntilRisk = Math.floor((70 - complianceRate) / 5);
  } else {
    riskLevel = 'critical';
    daysUntilRisk = 0;
  }

  return {
    isCompliant: complianceRate >= 70,
    riskLevel,
    currentPeriod: {
      compliantDays,
      totalDays: totalDays || 30,
    },
    daysUntilRisk,
  };
}

/**
 * Génère des alertes de compliance
 */
export async function generateComplianceAlerts(supabase?: any): Promise<any[]> {
  // Placeholder - retourne un tableau vide pour éviter les erreurs
  return [];
}

/**
 * Sauvegarde l'historique de compliance
 */
export async function saveComplianceHistory(patientId: string, compliance: any, supabase?: any): Promise<void> {
  // Placeholder
}

/**
 * Crée une alerte de compliance dans la queue
 */
export async function createComplianceAlertInQueue(patientId: string, compliance: any, supabase?: any): Promise<void> {
  // Placeholder
}

/**
 * Exécute la vérification quotidienne de compliance
 */
export async function runDailyComplianceCheck(supabase?: any): Promise<void> {
  // Placeholder
}

/**
 * Vérifie la conformité de tous les patients
 */
export async function checkAllPatientsCompliance(supabase?: any): Promise<{
  total_patients: number;
  compliant_patients: number;
  revenue_at_risk: number;
  revenue_lost: number;
  total_monthly_revenue: number;
  risk_percentage: number;
  patients_needing_action: any[];
}> {
  if (!supabase) {
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  // Essayer avec 'profiles', sinon fallback sur 'users'
  let patients;
  let error;
  
  // Try profiles first (if migration has been run)
  const profilesResult = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'patient');
  
  if (profilesResult.error?.code === 'PGRST205') {
    // Table doesn't exist, try users instead
    console.log('[checkAllPatientsCompliance] profiles table not found, using users table');
    const usersResult = await supabase
      .from('users')
      .select('id')
      .eq('role', 'patient');
    
    patients = usersResult.data;
    error = usersResult.error;
  } else {
    patients = profilesResult.data;
    error = profilesResult.error;
  }

  if (error || !patients) {
    console.error('[checkAllPatientsCompliance] Error:', error);
    return {
      total_patients: 0,
      compliant_patients: 0,
      revenue_at_risk: 0,
      revenue_lost: 0,
      total_monthly_revenue: 0,
      risk_percentage: 0,
      patients_needing_action: [],
    };
  }

  const results: CPAMCompliance[] = [];
  let compliantCount = 0;
  let revenueAtRisk = 0;
  let revenueLost = 0;
  const patientsNeedingAction: any[] = [];
  const MONTHLY_RATE = 160; // Tarif forfait mensuel CPAM PPC

  for (const patient of patients) {
    try {
      const compliance = await calculateCPAMCompliance(patient.id, supabase);
      results.push(compliance);

      if (compliance.isCompliant) {
        compliantCount++;
      } else {
        // Patient non conforme
        if (compliance.riskLevel === 'critical' || compliance.riskLevel === 'high') {
          // CA à risque (patient proche de perdre son remboursement)
          revenueAtRisk += MONTHLY_RATE;
          
          patientsNeedingAction.push({
            patient_id: patient.id,
            patient_name: 'Patient ' + patient.id.substring(0, 8),
            average_usage: compliance.currentPeriod.compliantDays / 30 * 4, // Estimation heures/nuit
            days_until_deadline: compliance.daysUntilRisk || 0,
            status: compliance.riskLevel === 'critical' ? 'critical' : 'warning',
            revenue_at_risk: MONTHLY_RATE,
            action_priority: compliance.riskLevel === 'critical' ? 1 : 2,
          });
        } else {
          // CA perdu (patient déjà non éligible)
          revenueLost += MONTHLY_RATE;
        }
      }
    } catch (error) {
      console.error(`[checkAllPatientsCompliance] Error for patient ${patient.id}:`, error);
    }
  }

  const totalMonthlyRevenue = patients.length * MONTHLY_RATE;
  const riskPercentage = totalMonthlyRevenue > 0 
    ? ((revenueAtRisk + revenueLost) / totalMonthlyRevenue * 100) 
    : 0;

  // Trier patients par priorité
  patientsNeedingAction.sort((a, b) => a.action_priority - b.action_priority);

  return {
    total_patients: patients.length,
    compliant_patients: compliantCount,
    revenue_at_risk: revenueAtRisk,
    revenue_lost: revenueLost,
    total_monthly_revenue: totalMonthlyRevenue,
    risk_percentage: riskPercentage,
    patients_needing_action: patientsNeedingAction,
  };
}