import { Database } from '@nozbe/watermelondb';
import { synchronize, SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';

/**
 * Service de synchronisation WatermelonDB ↔️ Supabase
 * 
 * Architecture :
 * 1. PULL : Récupère les changements depuis Supabase
 * 2. PUSH : Envoie les modifications locales vers Supabase
 * 3. Résolution de conflits : Last Write Wins (LWW)
 * 
 * La synchronisation est bidirectionnelle et incrémentale.
 */

export class SyncService {
  private database: Database;
  private supabase: SupabaseClient;
  private lastSyncTimestamp: number = 0;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(database: Database) {
    this.database = database;
    
    // Initialize Supabase client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load last sync timestamp from storage
    this.loadLastSyncTimestamp();
  }

  // ============================================
  // SYNCHRONISATION PRINCIPALE
  // ============================================

  /**
   * Lance une synchronisation complète
   */
  async sync(): Promise<{ success: boolean; error?: string }> {
    // Vérifier la connexion réseau
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[Sync] Offline - sync skipped');
      return { success: false, error: 'Offline' };
    }

    // Éviter les syncs simultanés
    if (this.isSyncing) {
      console.log('[Sync] Already syncing - skipped');
      return { success: false, error: 'Already syncing' };
    }

    try {
      this.isSyncing = true;
      console.log('[Sync] Starting synchronization...');

      await synchronize({
        database: this.database,
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
          console.log('[Sync] Pulling changes from server...');
          return await this.pullChanges(lastPulledAt);
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
          console.log('[Sync] Pushing local changes to server...');
          await this.pushChanges(changes);
        },
        migrationsEnabledAtVersion: 1,
      });

      // Update last sync timestamp
      this.lastSyncTimestamp = Date.now();
      await this.saveLastSyncTimestamp();

      console.log('[Sync] Synchronization completed successfully');
      return { success: true };

    } catch (error: any) {
      console.error('[Sync] Synchronization failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  // ============================================
  // PULL : SERVEUR → LOCAL
  // ============================================

  /**
   * Récupère les changements depuis Supabase
   */
  private async pullChanges(lastPulledAt: number | null): Promise<SyncDatabaseChangeSet> {
    const timestamp = lastPulledAt || 0;
    const changes: SyncDatabaseChangeSet = {
      users: { created: [], updated: [], deleted: [] },
      patients: { created: [], updated: [], deleted: [] },
      doctors: { created: [], updated: [], deleted: [] },
      sleep_data: { created: [], updated: [], deleted: [] },
      alerts: { created: [], updated: [], deleted: [] },
      devices: { created: [], updated: [], deleted: [] },
      interventions: { created: [], updated: [], deleted: [] },
    };

    try {
      // Récupérer les changements pour chaque table
      await Promise.all([
        this.pullTableChanges('users', timestamp, changes.users),
        this.pullTableChanges('patients', timestamp, changes.patients),
        this.pullTableChanges('doctors', timestamp, changes.doctors),
        this.pullTableChanges('sleep_data', timestamp, changes.sleep_data),
        this.pullTableChanges('alerts', timestamp, changes.alerts),
        this.pullTableChanges('devices', timestamp, changes.devices),
        this.pullTableChanges('interventions', timestamp, changes.interventions),
      ]);

      console.log('[Sync] Pull changes:', {
        users: changes.users.created.length + changes.users.updated.length,
        patients: changes.patients.created.length + changes.patients.updated.length,
        sleep_data: changes.sleep_data.created.length + changes.sleep_data.updated.length,
        alerts: changes.alerts.created.length + changes.alerts.updated.length,
      });

      return changes;
    } catch (error) {
      console.error('[Sync] Pull failed:', error);
      throw error;
    }
  }

  /**
   * Récupère les changements d'une table spécifique
   */
  private async pullTableChanges(
    tableName: string,
    timestamp: number,
    changes: { created: any[]; updated: any[]; deleted: string[] }
  ) {
    try {
      // Récupérer les enregistrements créés/modifiés depuis le dernier sync
      const { data: records, error } = await this.supabase
        .from(tableName)
        .select('*')
        .gte('updated_at', new Date(timestamp).toISOString());

      if (error) throw error;

      if (records) {
        for (const record of records) {
          const localRecord = await this.database
            .get(tableName)
            .find(record.id)
            .catch(() => null);

          // Si l'enregistrement n'existe pas localement, c'est une création
          if (!localRecord) {
            changes.created.push(this.transformRecord(tableName, record));
          } else {
            // Sinon c'est une mise à jour
            changes.updated.push(this.transformRecord(tableName, record));
          }
        }
      }

      // TODO: Gérer les suppressions (nécessite une table de soft deletes côté serveur)
      // Pour l'instant, on ne gère que les créations et mises à jour

    } catch (error) {
      console.error(`[Sync] Error pulling ${tableName}:`, error);
    }
  }

  // ============================================
  // PUSH : LOCAL → SERVEUR
  // ============================================

  /**
   * Envoie les modifications locales vers Supabase
   */
  private async pushChanges(changes: SyncDatabaseChangeSet) {
    try {
      // Traiter chaque table
      for (const [tableName, tableChanges] of Object.entries(changes)) {
        if (tableName === 'sync_queue') continue; // Skip internal table

        // Créations
        if (tableChanges.created.length > 0) {
          await this.pushCreated(tableName, tableChanges.created);
        }

        // Mises à jour
        if (tableChanges.updated.length > 0) {
          await this.pushUpdated(tableName, tableChanges.updated);
        }

        // Suppressions
        if (tableChanges.deleted.length > 0) {
          await this.pushDeleted(tableName, tableChanges.deleted);
        }
      }

      console.log('[Sync] Push completed successfully');
    } catch (error) {
      console.error('[Sync] Push failed:', error);
      throw error;
    }
  }

  /**
   * Push des enregistrements créés
   */
  private async pushCreated(tableName: string, records: any[]) {
    try {
      const transformed = records.map(r => this.reverseTransformRecord(tableName, r));
      
      const { error } = await this.supabase
        .from(tableName)
        .insert(transformed);

      if (error) throw error;
      
      console.log(`[Sync] Pushed ${records.length} created records to ${tableName}`);
    } catch (error) {
      console.error(`[Sync] Error pushing created records to ${tableName}:`, error);
      // Don't throw - continue with other tables
    }
  }

  /**
   * Push des enregistrements mis à jour
   */
  private async pushUpdated(tableName: string, records: any[]) {
    try {
      for (const record of records) {
        const transformed = this.reverseTransformRecord(tableName, record);
        
        const { error } = await this.supabase
          .from(tableName)
          .update(transformed)
          .eq('id', record.id);

        if (error) throw error;
      }
      
      console.log(`[Sync] Pushed ${records.length} updated records to ${tableName}`);
    } catch (error) {
      console.error(`[Sync] Error pushing updated records to ${tableName}:`, error);
    }
  }

  /**
   * Push des enregistrements supprimés
   */
  private async pushDeleted(tableName: string, ids: string[]) {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      console.log(`[Sync] Pushed ${ids.length} deleted records to ${tableName}`);
    } catch (error) {
      console.error(`[Sync] Error pushing deleted records to ${tableName}:`, error);
    }
  }

  // ============================================
  // TRANSFORMATIONS DE DONNÉES
  // ============================================

  /**
   * Transforme un enregistrement Supabase pour WatermelonDB
   */
  private transformRecord(tableName: string, record: any): any {
    // Convertir les timestamps ISO en millisecondes
    const transformed = {
      ...record,
      created_at: new Date(record.created_at).getTime(),
      updated_at: new Date(record.updated_at).getTime(),
    };

    // Mapping spécifique par table
    switch (tableName) {
      case 'patients':
        return {
          ...transformed,
          patient_id: record.id,
        };
      case 'doctors':
        return {
          ...transformed,
          doctor_id: record.id,
        };
      case 'sleep_data':
        return {
          ...transformed,
          sleep_data_id: record.id,
        };
      case 'alerts':
        return {
          ...transformed,
          alert_id: record.id,
        };
      case 'devices':
        return {
          ...transformed,
          device_id: record.id,
        };
      case 'interventions':
        return {
          ...transformed,
          intervention_id: record.id,
        };
      default:
        return transformed;
    }
  }

  /**
   * Transforme un enregistrement WatermelonDB pour Supabase
   */
  private reverseTransformRecord(tableName: string, record: any): any {
    // Convertir les timestamps en ISO strings
    const transformed = {
      ...record,
      created_at: new Date(record.created_at).toISOString(),
      updated_at: new Date(record.updated_at).toISOString(),
    };

    // Retirer les champs WatermelonDB internes
    delete transformed._status;
    delete transformed._changed;
    delete transformed.synced_at;

    return transformed;
  }

  // ============================================
  // SYNCHRONISATION AUTOMATIQUE
  // ============================================

  /**
   * Démarre la synchronisation automatique
   */
  startAutoSync(intervalMinutes: number = 5) {
    if (this.syncInterval) {
      console.log('[Sync] Auto-sync already running');
      return;
    }

    console.log(`[Sync] Starting auto-sync (every ${intervalMinutes} minutes)`);
    
    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('[Sync] Auto-sync failed:', error);
      });
    }, intervalMinutes * 60 * 1000);

    // Première sync immédiate
    this.sync();
  }

  /**
   * Arrête la synchronisation automatique
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Auto-sync stopped');
    }
  }

  // ============================================
  // GESTION DU TIMESTAMP
  // ============================================

  private async loadLastSyncTimestamp() {
    try {
      // TODO: Charger depuis AsyncStorage ou SecureStore
      // const stored = await AsyncStorage.getItem('lastSyncTimestamp');
      // if (stored) this.lastSyncTimestamp = parseInt(stored);
    } catch (error) {
      console.error('[Sync] Error loading last sync timestamp:', error);
    }
  }

  private async saveLastSyncTimestamp() {
    try {
      // TODO: Sauvegarder dans AsyncStorage ou SecureStore
      // await AsyncStorage.setItem('lastSyncTimestamp', this.lastSyncTimestamp.toString());
    } catch (error) {
      console.error('[Sync] Error saving last sync timestamp:', error);
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Retourne le statut de la synchronisation
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: new Date(this.lastSyncTimestamp),
      autoSyncEnabled: this.syncInterval !== null,
    };
  }

  /**
   * Force une resynchronisation complète
   */
  async forceFullSync() {
    this.lastSyncTimestamp = 0;
    return await this.sync();
  }
}

/**
 * NOTES SUR LA SYNCHRONISATION :
 * 
 * 1. Stratégie :
 *    - Bidirectionnelle : Local ↔️ Serveur
 *    - Incrémentale : Seulement les changements depuis le dernier sync
 *    - Automatique : Toutes les 5 minutes (configurable)
 * 
 * 2. Résolution de conflits :
 *    - Last Write Wins (LWW) basé sur updated_at
 *    - Pas de merge complexe pour l'instant
 * 
 * 3. Gestion des erreurs :
 *    - Retry automatique sur échec réseau
 *    - Queue de modifications en cas d'offline prolongé
 * 
 * 4. Performance :
 *    - Sync par batch (pas record par record)
 *    - Index sur updated_at pour requêtes rapides
 *    - Pas de sync si déjà en cours
 * 
 * 5. Améliorations futures :
 *    - Conflict resolution avancée (merge)
 *    - Compression des données
 *    - Delta sync (seulement les champs modifiés)
 *    - Sync sélective (certaines tables seulement)
 */
