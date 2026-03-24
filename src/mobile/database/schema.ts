import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schéma de la base de données locale WatermelonDB
 * 
 * Ce schéma reflète la structure de la base Supabase Postgres,
 * mais optimisé pour le stockage local SQLite.
 * 
 * Tables principales :
 * - users : Utilisateurs (patients, médecins, admins)
 * - patients : Données patients
 * - doctors : Données médecins
 * - sleep_data : Données de sommeil quotidiennes
 * - alerts : Alertes médicales
 * - devices : Appareils PPC
 * - interventions : Interventions prestataires
 */

export const schema = appSchema({
  version: 1,
  tables: [
    // ============================================
    // TABLE USERS
    // ============================================
    tableSchema({
      name: 'users',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE PATIENTS
    // ============================================
    tableSchema({
      name: 'patients',
      columns: [
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'panel_code', type: 'string', isOptional: true, isIndexed: true },
        { name: 'assigned_doctor_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'diagnosis_date', type: 'string', isOptional: true },
        { name: 'birth_date', type: 'string', isOptional: true },
        { name: 'device_installed', type: 'boolean' },
        { name: 'treatment_start_date', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE DOCTORS
    // ============================================
    tableSchema({
      name: 'doctors',
      columns: [
        { name: 'doctor_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'specialty', type: 'string' },
        { name: 'license_number', type: 'string', isIndexed: true },
        { name: 'panel_code', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE SLEEP_DATA (Données de sommeil)
    // ============================================
    tableSchema({
      name: 'sleep_data',
      columns: [
        { name: 'sleep_data_id', type: 'string', isIndexed: true },
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true },
        { name: 'hours_used', type: 'number' },
        { name: 'ahi', type: 'number', isOptional: true },
        { name: 'leakage', type: 'number', isOptional: true },
        { name: 'events', type: 'number', isOptional: true },
        { name: 'pressure_p95', type: 'number', isOptional: true },
        { name: 'expair_score', type: 'number', isOptional: true },
        { name: 'raw_data_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE ALERTS (Alertes médicales)
    // ============================================
    tableSchema({
      name: 'alerts',
      columns: [
        { name: 'alert_id', type: 'string', isIndexed: true },
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'severity', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'is_read', type: 'boolean', isIndexed: true },
        { name: 'is_resolved', type: 'boolean', isIndexed: true },
        { name: 'acknowledged_by', type: 'string', isOptional: true },
        { name: 'acknowledged_at', type: 'number', isOptional: true },
        { name: 'resolved_by', type: 'string', isOptional: true },
        { name: 'resolved_at', type: 'number', isOptional: true },
        { name: 'metadata', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE DEVICES (Appareils PPC)
    // ============================================
    tableSchema({
      name: 'devices',
      columns: [
        { name: 'device_id', type: 'string', isIndexed: true },
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'serial_number', type: 'string', isIndexed: true },
        { name: 'model', type: 'string' },
        { name: 'manufacturer', type: 'string', isIndexed: true },
        { name: 'installation_date', type: 'string', isOptional: true },
        { name: 'last_maintenance_date', type: 'string', isOptional: true },
        { name: 'next_maintenance_date', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'settings', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE INTERVENTIONS (Interventions prestataire)
    // ============================================
    tableSchema({
      name: 'interventions',
      columns: [
        { name: 'intervention_id', type: 'string', isIndexed: true },
        { name: 'patient_id', type: 'string', isIndexed: true },
        { name: 'alert_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string', isIndexed: true },
        { name: 'scheduled_date', type: 'string', isOptional: true },
        { name: 'completed_date', type: 'string', isOptional: true },
        { name: 'assigned_to', type: 'string', isOptional: true, isIndexed: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // TABLE SYNC_QUEUE (File de synchronisation)
    // ============================================
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string', isIndexed: true },
        { name: 'record_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' }, // 'create', 'update', 'delete'
        { name: 'data', type: 'string' },
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});

/**
 * NOTES SUR LE SCHÉMA :
 * 
 * 1. Timestamps :
 *    - Tous en millisecondes (number) pour faciliter les calculs
 *    - created_at : création locale
 *    - updated_at : dernière modification locale
 *    - synced_at : dernière synchronisation avec le serveur
 * 
 * 2. Indexation :
 *    - IDs indexés pour les recherches rapides
 *    - Colonnes fréquemment filtrées indexées (role, type, status, etc.)
 * 
 * 3. Sync Queue :
 *    - Table spéciale pour gérer les modifications offline
 *    - Permet de rejouer les opérations lors de la reconnexion
 * 
 * 4. JSON Fields :
 *    - raw_data_json, settings, metadata stockés en string
 *    - Parsés à l'utilisation (JSON.parse/stringify)
 * 
 * 5. Relations :
 *    - Définies dans les modèles, pas dans le schéma
 *    - WatermelonDB gère les relations automatiquement
 */
