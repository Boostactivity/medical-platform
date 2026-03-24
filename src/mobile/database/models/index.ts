/**
 * Export centralisé de tous les modèles WatermelonDB
 * 
 * Utilisation :
 * ```ts
 * import { Patient, SleepData, Doctor, Alert, Device } from './database/models';
 * ```
 */

export { Patient } from './Patient';
export { SleepData } from './SleepData';
export { Doctor } from './Doctor';
export { Alert } from './Alert';
export { Device } from './Device';

/**
 * Liste des modèles pour l'initialisation de WatermelonDB
 */
export const allModels = [
  Patient,
  SleepData,
  Doctor,
  Alert,
  Device,
];

/**
 * Types des modèles pour TypeScript
 */
export type Models = {
  patients: Patient;
  sleep_data: SleepData;
  doctors: Doctor;
  alerts: Alert;
  devices: Device;
};
