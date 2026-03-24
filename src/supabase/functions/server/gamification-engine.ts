/**
 * GAMIFICATION ENGINE - Système de calcul XP et achievements
 * Met à jour les stats du patient et débloque les badges automatiquement
 * Appelé après chaque import de données ou action utilisateur
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Types d'achievements
 */
export enum AchievementType {
  // Streaks
  STREAK_7 = 'STREAK_7',
  STREAK_30 = 'STREAK_30',
  STREAK_90 = 'STREAK_90',
  STREAK_365 = 'STREAK_365',
  
  // Qualité
  PERFECT_NIGHT = 'PERFECT_NIGHT',
  PERFECT_WEEK = 'PERFECT_WEEK',
  PERFECT_MONTH = 'PERFECT_MONTH',
  ZERO_LEAK_NIGHT = 'ZERO_LEAK_NIGHT',
  ZERO_LEAK_WEEK = 'ZERO_LEAK_WEEK',
  
  // Onboarding
  FIRST_NIGHT = 'FIRST_NIGHT',
  ONBOARDING_COMPLETE = 'ONBOARDING_COMPLETE',
  
  // Niveaux
  LEVEL_5 = 'LEVEL_5',
  LEVEL_10 = 'LEVEL_10',
  LEVEL_25 = 'LEVEL_25',
  LEVEL_50 = 'LEVEL_50',
  
  // Spéciaux
  EARLY_ADOPTER = 'EARLY_ADOPTER',
  HEALTH_CHAMPION = 'HEALTH_CHAMPION',
  SLEEP_MASTER = 'SLEEP_MASTER'
}

interface AchievementDefinition {
  type: AchievementType;
  name: string;
  description: string;
  xp_reward: number;
  condition: (stats: any, history: any[]) => boolean;
}

/**
 * Définitions de tous les achievements
 */
const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    type: AchievementType.FIRST_NIGHT,
    name: 'Première nuit',
    description: 'Complétez votre première nuit de traitement',
    xp_reward: 50,
    condition: (stats) => stats.total_nights_tracked >= 1,
  },
  {
    type: AchievementType.STREAK_7,
    name: 'Champion 7 jours',
    description: '7 nuits consécutives avec > 4h d\'utilisation',
    xp_reward: 100,
    condition: (stats) => stats.current_streak_days >= 7,
  },
  {
    type: AchievementType.STREAK_30,
    name: 'Champion 30 jours',
    description: '30 nuits consécutives avec > 4h d\'utilisation',
    xp_reward: 300,
    condition: (stats) => stats.current_streak_days >= 30,
  },
  {
    type: AchievementType.STREAK_90,
    name: 'Champion 90 jours',
    description: '90 nuits consécutives avec > 4h d\'utilisation',
    xp_reward: 800,
    condition: (stats) => stats.current_streak_days >= 90,
  },
  {
    type: AchievementType.STREAK_365,
    name: 'Maître du sommeil',
    description: '365 nuits consécutives avec > 4h d\'utilisation',
    xp_reward: 2000,
    condition: (stats) => stats.current_streak_days >= 365,
  },
  {
    type: AchievementType.PERFECT_NIGHT,
    name: 'Nuit parfaite',
    description: 'IAH < 5, Fuites < 10L/min, Usage > 6h',
    xp_reward: 75,
    condition: (stats) => stats.perfect_nights_count >= 1,
  },
  {
    type: AchievementType.PERFECT_WEEK,
    name: 'Semaine parfaite',
    description: '7 nuits parfaites consécutives',
    xp_reward: 400,
    condition: (stats, history) => {
      const last7 = history.slice(-7);
      return last7.length === 7 && last7.every(isPerfectNight);
    },
  },
  {
    type: AchievementType.PERFECT_MONTH,
    name: 'Mois parfait',
    description: '30 nuits parfaites consécutives',
    xp_reward: 1500,
    condition: (stats, history) => {
      const last30 = history.slice(-30);
      return last30.length === 30 && last30.every(isPerfectNight);
    },
  },
  {
    type: AchievementType.ZERO_LEAK_NIGHT,
    name: 'Étanchéité parfaite',
    description: 'Une nuit avec fuites < 5L/min',
    xp_reward: 60,
    condition: (stats, history) => history.some((n: any) => n.leak_rate < 5),
  },
  {
    type: AchievementType.ZERO_LEAK_WEEK,
    name: 'Semaine zéro fuite',
    description: '7 nuits consécutives avec fuites < 5L/min',
    xp_reward: 350,
    condition: (stats, history) => {
      const last7 = history.slice(-7);
      return last7.length === 7 && last7.every((n: any) => n.leak_rate < 5);
    },
  },
  {
    type: AchievementType.ONBOARDING_COMPLETE,
    name: 'Installation terminée',
    description: 'Profil complété et première semaine validée',
    xp_reward: 150,
    condition: (stats) => stats.total_nights_tracked >= 7,
  },
  {
    type: AchievementType.LEVEL_5,
    name: 'Niveau 5',
    description: 'Atteignez le niveau 5',
    xp_reward: 0,
    condition: (stats) => stats.level >= 5,
  },
  {
    type: AchievementType.LEVEL_10,
    name: 'Niveau 10',
    description: 'Atteignez le niveau 10',
    xp_reward: 0,
    condition: (stats) => stats.level >= 10,
  },
  {
    type: AchievementType.LEVEL_25,
    name: 'Niveau 25',
    description: 'Atteignez le niveau 25',
    xp_reward: 0,
    condition: (stats) => stats.level >= 25,
  },
  {
    type: AchievementType.LEVEL_50,
    name: 'Niveau 50 - Expert',
    description: 'Atteignez le niveau maximum',
    xp_reward: 0,
    condition: (stats) => stats.level >= 50,
  },
  {
    type: AchievementType.HEALTH_CHAMPION,
    name: 'Champion de la santé',
    description: 'Taux de réussite > 90% sur 60 jours',
    xp_reward: 1000,
    condition: (stats) => {
      return stats.total_nights_tracked >= 60 && 
             (stats.perfect_nights_count / stats.total_nights_tracked) > 0.9;
    },
  },
  {
    type: AchievementType.SLEEP_MASTER,
    name: 'Maître du sommeil',
    description: 'IAH moyen < 3 sur 90 jours',
    xp_reward: 1500,
    condition: (stats) => stats.avg_ahi < 3 && stats.total_nights_tracked >= 90,
  },
];

/**
 * Vérifie si une nuit est "parfaite"
 */
function isPerfectNight(night: any): boolean {
  return (
    night.usage_hours >= 6 &&
    night.leak_rate < 10 &&
    night.ahi < 5
  );
}

/**
 * Calcule les XP gagnés pour une nuit
 */
function calculateNightXP(night: any): number {
  let xp = 0;

  // Base : 10 XP par nuit suivie
  xp += 10;

  // Bonus heures d'utilisation
  if (night.usage_hours >= 4) xp += 20;
  if (night.usage_hours >= 6) xp += 30;
  if (night.usage_hours >= 8) xp += 50;

  // Bonus IAH
  if (night.ahi < 5) xp += 30;
  if (night.ahi < 3) xp += 50;

  // Bonus fuites
  if (night.leak_rate < 10) xp += 20;
  if (night.leak_rate < 5) xp += 40;

  // Bonus nuit parfaite
  if (isPerfectNight(night)) xp += 100;

  return xp;
}

/**
 * Calcule le niveau en fonction des XP
 */
function calculateLevel(xp: number): number {
  // Formule : 1 niveau = 200 XP
  // Niveau 1 = 0-199 XP
  // Niveau 2 = 200-399 XP
  // etc.
  return Math.min(50, Math.floor(xp / 200) + 1);
}

/**
 * Calcule les statistiques globales d'un patient
 */
async function calculatePatientStats(patientId: string): Promise<any> {
  try {
    // Récupère toutes les nuits
    const { data: allNights, error } = await supabase
      .from('observance_data')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: true });

    if (error || !allNights || allNights.length === 0) {
      return null;
    }

    // Calcul du streak actuel (nuits consécutives avec >= 4h)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = allNights.length - 1; i >= 0; i--) {
      const night = allNights[i];
      const nightDate = new Date(night.date);
      nightDate.setHours(0, 0, 0, 0);

      if (night.usage_hours >= 4) {
        tempStreak++;
        
        // Si c'est hier ou aujourd'hui, compte dans le streak actuel
        const daysDiff = Math.floor((today.getTime() - nightDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1 && currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    // Compte les nuits parfaites
    const perfectNights = allNights.filter(isPerfectNight).length;

    // Calcule les moyennes
    const avgAHI = allNights.reduce((sum, n) => sum + (n.ahi || 0), 0) / allNights.length;
    const avgLeak = allNights.reduce((sum, n) => sum + (n.leak_rate || 0), 0) / allNights.length;
    const totalUsageHours = allNights.reduce((sum, n) => sum + (n.usage_hours || 0), 0);

    return {
      total_nights_tracked: allNights.length,
      current_streak_days: currentStreak,
      longest_streak_days: longestStreak,
      perfect_nights_count: perfectNights,
      avg_ahi: Math.round(avgAHI * 10) / 10,
      avg_leak: Math.round(avgLeak * 10) / 10,
      total_usage_hours: Math.round(totalUsageHours * 10) / 10,
      nights_data: allNights,
    };
  } catch (err) {
    console.error('[GAMIFICATION] Error calculating stats:', err);
    return null;
  }
}

/**
 * Débloque un achievement s'il n'est pas déjà débloqué
 */
async function unlockAchievement(
  patientId: string,
  achievementType: AchievementType,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    // Vérifie si déjà débloqué
    const { data: existing } = await supabase
      .from('patient_achievements')
      .select('id')
      .eq('patient_id', patientId)
      .eq('achievement_type', achievementType)
      .maybeSingle();

    if (existing) {
      return false; // Déjà débloqué
    }

    // Débloque l'achievement
    const { error } = await supabase
      .from('patient_achievements')
      .insert({
        patient_id: patientId,
        achievement_type: achievementType,
        metadata: metadata || {},
      });

    if (error) {
      console.error('[GAMIFICATION] Error unlocking achievement:', error);
      return false;
    }

    const achievement = ACHIEVEMENTS.find((a) => a.type === achievementType);
    console.log(`[GAMIFICATION] 🏆 Unlocked achievement ${achievementType} for patient ${patientId}`);
    
    // Ajouter les XP si applicable
    if (achievement && achievement.xp_reward > 0) {
      await addXP(patientId, achievement.xp_reward, `Achievement: ${achievement.name}`);
    }

    return true;
  } catch (err) {
    console.error('[GAMIFICATION] Exception unlocking achievement:', err);
    return false;
  }
}

/**
 * Ajoute des XP à un patient
 */
async function addXP(patientId: string, xp: number, reason: string): Promise<void> {
  try {
    // Récupère les stats actuelles
    const { data: currentStats } = await supabase
      .from('patient_stats')
      .select('xp_points, level')
      .eq('patient_id', patientId)
      .single();

    if (!currentStats) {
      console.error('[GAMIFICATION] Patient stats not found');
      return;
    }

    const newXP = currentStats.xp_points + xp;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > currentStats.level;

    // Met à jour
    await supabase
      .from('patient_stats')
      .update({
        xp_points: newXP,
        level: newLevel,
      })
      .eq('patient_id', patientId);

    console.log(`[GAMIFICATION] +${xp} XP for patient ${patientId} (${reason}). Total: ${newXP} XP, Level: ${newLevel}`);

    // Si level up, vérifier les achievements de niveau
    if (leveledUp) {
      if (newLevel >= 5) await unlockAchievement(patientId, AchievementType.LEVEL_5);
      if (newLevel >= 10) await unlockAchievement(patientId, AchievementType.LEVEL_10);
      if (newLevel >= 25) await unlockAchievement(patientId, AchievementType.LEVEL_25);
      if (newLevel >= 50) await unlockAchievement(patientId, AchievementType.LEVEL_50);
    }
  } catch (err) {
    console.error('[GAMIFICATION] Error adding XP:', err);
  }
}

/**
 * Met à jour toutes les stats et vérifie les achievements
 */
export async function updatePatientGamification(patientId: string): Promise<{
  success: boolean;
  stats?: any;
  achievementsUnlocked: number;
}> {
  console.log(`[GAMIFICATION] 🎮 Updating gamification for patient ${patientId}...`);

  try {
    // 1. Calculer les stats
    const stats = await calculatePatientStats(patientId);
    if (!stats) {
      return { success: false, achievementsUnlocked: 0 };
    }

    // 2. Mettre à jour patient_stats
    await supabase
      .from('patient_stats')
      .upsert({
        patient_id: patientId,
        total_nights_tracked: stats.total_nights_tracked,
        current_streak_days: stats.current_streak_days,
        longest_streak_days: stats.longest_streak_days,
        perfect_nights_count: stats.perfect_nights_count,
        avg_ahi: stats.avg_ahi,
        avg_leak: stats.avg_leak,
        total_usage_hours: stats.total_usage_hours,
        last_updated: new Date().toISOString(),
      });

    // 3. Vérifier tous les achievements
    let achievementsUnlocked = 0;

    for (const achievement of ACHIEVEMENTS) {
      const shouldUnlock = achievement.condition(stats, stats.nights_data);
      
      if (shouldUnlock) {
        const unlocked = await unlockAchievement(patientId, achievement.type, {
          unlocked_at: new Date().toISOString(),
        });
        
        if (unlocked) {
          achievementsUnlocked++;
        }
      }
    }

    console.log(`[GAMIFICATION] ✅ Updated gamification. ${achievementsUnlocked} new achievements`);

    return {
      success: true,
      stats,
      achievementsUnlocked,
    };
  } catch (err) {
    console.error('[GAMIFICATION] ❌ Error updating gamification:', err);
    return { success: false, achievementsUnlocked: 0 };
  }
}

/**
 * Ajoute des XP pour une nouvelle nuit de données
 */
export async function processNewNight(patientId: string, nightData: any): Promise<void> {
  try {
    // Calculer les XP gagnés
    const xp = calculateNightXP(nightData);
    
    // Ajouter les XP
    await addXP(patientId, xp, `Nuit du ${nightData.date}`);

    // Mettre à jour toute la gamification
    await updatePatientGamification(patientId);

    console.log(`[GAMIFICATION] Processed new night for patient ${patientId}, gained ${xp} XP`);
  } catch (err) {
    console.error('[GAMIFICATION] Error processing new night:', err);
  }
}