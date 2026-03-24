import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { allModels } from './models';

/**
 * Configuration et initialisation de WatermelonDB
 * 
 * Architecture :
 * - SQLite local pour stockage persistant
 * - Schéma avec 8 tables
 * - Modèles avec relations automatiques
 * - Synchronisation bidirectionnelle avec Supabase
 */

// ============================================
// CONFIGURATION DE L'ADAPTATEUR SQLite
// ============================================

const adapter = new SQLiteAdapter({
  schema,
  // Nom de la base de données SQLite
  dbName: 'expair_medical',
  
  // Options de performance
  jsi: true, // Active JSI (JavaScript Interface) pour de meilleures performances
  
  // Mode de journalisation (utile pour debug)
  // onSetUpError: (error) => {
  //   console.error('Database setup error:', error);
  // },
});

// ============================================
// CRÉATION DE L'INSTANCE DATABASE
// ============================================

export const database = new Database({
  adapter,
  modelClasses: allModels,
});

// ============================================
// HELPERS POUR ACCÈS RAPIDE
// ============================================

/**
 * Récupère la collection Patients
 */
export function getPatientsCollection() {
  return database.get('patients');
}

/**
 * Récupère la collection SleepData
 */
export function getSleepDataCollection() {
  return database.get('sleep_data');
}

/**
 * Récupère la collection Doctors
 */
export function getDoctorsCollection() {
  return database.get('doctors');
}

/**
 * Récupère la collection Alerts
 */
export function getAlertsCollection() {
  return database.get('alerts');
}

/**
 * Récupère la collection Devices
 */
export function getDevicesCollection() {
  return database.get('devices');
}

// ============================================
// HELPERS POUR REQUÊTES COURANTES
// ============================================

/**
 * Récupère un patient par son ID
 */
export async function getPatientById(patientId: string) {
  const collection = getPatientsCollection();
  try {
    return await collection.find(patientId);
  } catch (error) {
    console.error('Patient not found:', patientId);
    return null;
  }
}

/**
 * Récupère toutes les alertes actives
 */
export async function getActiveAlerts() {
  const collection = getAlertsCollection();
  return await collection
    .query(
      // @ts-ignore - WatermelonDB types
      Q.where('is_resolved', false)
    )
    .fetch();
}

/**
 * Récupère les données de sommeil d'un patient pour une période
 */
export async function getPatientSleepData(patientId: string, days: number = 30) {
  const collection = getSleepDataCollection();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffString = cutoffDate.toISOString().split('T')[0];
  
  return await collection
    .query(
      // @ts-ignore
      Q.where('patient_id', patientId),
      // @ts-ignore
      Q.where('date', Q.gte(cutoffString)),
      // @ts-ignore
      Q.sortBy('date', 'desc')
    )
    .fetch();
}

/**
 * Récupère l'appareil actif d'un patient
 */
export async function getPatientActiveDevice(patientId: string) {
  const collection = getDevicesCollection();
  const devices = await collection
    .query(
      // @ts-ignore
      Q.where('patient_id', patientId),
      // @ts-ignore
      Q.where('status', 'active')
    )
    .fetch();
  
  return devices[0] || null;
}

/**
 * Récupère tous les patients d'un médecin
 */
export async function getDoctorPatients(doctorId: string) {
  const collection = getPatientsCollection();
  return await collection
    .query(
      // @ts-ignore
      Q.where('assigned_doctor_id', doctorId)
    )
    .fetch();
}

// ============================================
// HELPERS POUR STATISTIQUES
// ============================================

/**
 * Compte le nombre total de patients
 */
export async function countPatients(): Promise<number> {
  const collection = getPatientsCollection();
  return await collection.query().fetchCount();
}

/**
 * Compte le nombre d'alertes actives
 */
export async function countActiveAlerts(): Promise<number> {
  const collection = getAlertsCollection();
  return await collection
    .query(
      // @ts-ignore
      Q.where('is_resolved', false)
    )
    .fetchCount();
}

/**
 * Compte le nombre d'appareils actifs
 */
export async function countActiveDevices(): Promise<number> {
  const collection = getDevicesCollection();
  return await collection
    .query(
      // @ts-ignore
      Q.where('status', 'active')
    )
    .fetchCount();
}

// ============================================
// HELPERS POUR NETTOYAGE/DEBUG
// ============================================

/**
 * Vide complètement la base de données
 * ⚠️ ATTENTION : Efface toutes les données locales !
 */
export async function clearDatabase() {
  if (__DEV__) {
    console.warn('⚠️ Clearing entire database!');
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('✅ Database cleared');
  } else {
    throw new Error('clearDatabase() is only available in development mode');
  }
}

/**
 * Affiche des statistiques de debug sur la base
 */
export async function logDatabaseStats() {
  if (__DEV__) {
    const stats = {
      patients: await countPatients(),
      alerts: await countActiveAlerts(),
      devices: await countActiveDevices(),
      sleepData: await getSleepDataCollection().query().fetchCount(),
      doctors: await getDoctorsCollection().query().fetchCount(),
    };
    
    console.log('📊 Database Statistics:', stats);
    return stats;
  }
}

// ============================================
// EXPORT PAR DÉFAUT
// ============================================

export default database;

/**
 * NOTES D'UTILISATION :
 * 
 * 1. Initialisation :
 *    ```ts
 *    import database from './database';
 *    ```
 * 
 * 2. Accès aux collections :
 *    ```ts
 *    import { getPatientsCollection } from './database';
 *    const patients = getPatientsCollection();
 *    ```
 * 
 * 3. Requêtes :
 *    ```ts
 *    import { getPatientById, getActiveAlerts } from './database';
 *    const patient = await getPatientById('uuid');
 *    const alerts = await getActiveAlerts();
 *    ```
 * 
 * 4. Écriture (toujours dans database.write) :
 *    ```ts
 *    await database.write(async () => {
 *      const patient = await patients.create(patient => {
 *        patient.name = 'John Doe';
 *        patient.email = 'john@example.com';
 *      });
 *    });
 *    ```
 * 
 * 5. Performance :
 *    - JSI activé pour vitesse native
 *    - Lazy loading des relations
 *    - Index sur colonnes fréquentes
 *    - Requêtes optimisées au niveau SQLite
 * 
 * 6. Debug :
 *    - logDatabaseStats() : Affiche les stats
 *    - clearDatabase() : Reset complet (dev only)
 */
