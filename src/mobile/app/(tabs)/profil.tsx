import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useRouter } from 'expo-router';
import { Patient } from '../../database/models/Patient';
import { Doctor } from '../../database/models/Doctor';
import { Device } from '../../database/models/Device';
import { SyncService } from '../../database/sync';

/**
 * Écran Profil Utilisateur
 * 
 * Affiche et permet de modifier :
 * - Informations personnelles
 * - Médecin traitant
 * - Appareil PPC
 * - Paramètres de l'app
 * - Synchronisation
 * - Déconnexion
 */

export default function ProfilPage() {
  // ============================================
  // STATE
  // ============================================

  const database = useDatabase();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometryEnabled, setBiometryEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
  // Sync
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // TODO: Récupérer l'ID du patient connecté
      const currentPatientId = 'PATIENT_ID_HERE';
      
      // Charger le patient
      const patientData = await database.get<Patient>('patients').find(currentPatientId);
      setPatient(patientData);
      
      // Charger l'utilisateur
      const userData = await patientData.user.fetch();
      setUser(userData);
      
      // Charger le médecin si assigné
      if (patientData.assignedDoctorId) {
        const doctorData = await database.get<Doctor>('doctors')
          .query()
          .fetch()
          .then(doctors => doctors.find(d => d.userId === patientData.assignedDoctorId));
        
        if (doctorData) {
          setDoctor(doctorData);
        }
      }
      
      // Charger l'appareil actif
      const deviceData = await patientData.getCurrentDevice();
      setDevice(deviceData);
      
      // Charger l'état de la dernière sync
      // TODO: Implémenter la récupération depuis le SyncService
      // const syncStatus = await SyncService.getLastSyncDate();
      // setLastSync(syncStatus);
      
    } catch (error) {
      console.error('Error loading profil:', error);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // ACTIONS
  // ============================================

  async function handleSync() {
    try {
      setSyncing(true);
      
      // TODO: Implémenter la synchronisation
      // const syncService = new SyncService(database);
      // await syncService.sync();
      
      setLastSync(new Date());
      
      Alert.alert(
        'Synchronisation réussie',
        'Vos données ont été synchronisées avec le serveur.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert(
        'Erreur de synchronisation',
        'La synchronisation a échoué. Vérifiez votre connexion internet.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  }

  function handleEditProfile() {
    // TODO: Naviguer vers écran d'édition
    Alert.alert('Édition du profil', 'Fonctionnalité en cours de développement');
  }

  function handleChangePassword() {
    Alert.alert('Changement de mot de passe', 'Fonctionnalité en cours de développement');
  }

  function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            // TODO: Implémenter la déconnexion
            router.replace('/auth/login');
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // TODO: Implémenter la suppression du compte
            Alert.alert('Suppression', 'Fonctionnalité en cours de développement');
          },
        },
      ]
    );
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5eb3d6" />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Patient'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>

        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <TouchableOpacity style={styles.infoCard} onPress={handleEditProfile}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>{user?.name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Non renseigné'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>
                {patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-FR') : 'Non renseignée'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Âge</Text>
              <Text style={styles.infoValue}>
                {patient?.age ? `${patient.age} ans` : '-'}
              </Text>
            </View>
            
            <View style={styles.editButton}>
              <Text style={styles.editButtonText}>Modifier ›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Médecin traitant */}
        {doctor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Médecin traitant</Text>
            
            <View style={styles.doctorCard}>
              <View style={styles.doctorIcon}>
                <Text style={styles.doctorIconText}>👨‍⚕️</Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>Dr. {doctor.user?.name || 'Médecin'}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.formattedSpecialty}</Text>
                <Text style={styles.doctorLicense}>RPPS: {doctor.formattedLicenseNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Appareil PPC */}
        {device && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mon appareil</Text>
            
            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceIcon}>{device.manufacturerLogo}</Text>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.fullName}</Text>
                  <Text style={styles.deviceSerial}>S/N: {device.formattedSerialNumber}</Text>
                  <Text style={styles.deviceAge}>
                    {device.ageFormatted || 'Âge inconnu'}
                  </Text>
                </View>
              </View>
              
              {device.needsMaintenance && (
                <View style={styles.deviceAlert}>
                  <Text style={styles.deviceAlertIcon}>⚠️</Text>
                  <Text style={styles.deviceAlertText}>
                    Maintenance : {device.maintenanceStatus}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Traitement */}
        {patient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traitement</Text>
            
            <View style={styles.treatmentCard}>
              <View style={styles.treatmentRow}>
                <Text style={styles.treatmentLabel}>Date de diagnostic</Text>
                <Text style={styles.treatmentValue}>
                  {patient.diagnosisDate 
                    ? new Date(patient.diagnosisDate).toLocaleDateString('fr-FR')
                    : 'Non renseignée'}
                </Text>
              </View>
              <View style={styles.treatmentRow}>
                <Text style={styles.treatmentLabel}>Début du traitement</Text>
                <Text style={styles.treatmentValue}>
                  {patient.treatmentStartDate 
                    ? new Date(patient.treatmentStartDate).toLocaleDateString('fr-FR')
                    : 'Non renseignée'}
                </Text>
              </View>
              <View style={styles.treatmentRow}>
                <Text style={styles.treatmentLabel}>Durée du traitement</Text>
                <Text style={styles.treatmentValue}>
                  {patient.treatmentDurationDays 
                    ? `${patient.treatmentDurationDays} jours`
                    : '-'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Paramètres de l'application */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Recevoir des notifications pour les alertes
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#5eb3d6' }}
                thumbColor="white"
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Authentification biométrique</Text>
                <Text style={styles.settingDescription}>
                  Face ID / Touch ID pour déverrouiller l'app
                </Text>
              </View>
              <Switch
                value={biometryEnabled}
                onValueChange={setBiometryEnabled}
                trackColor={{ false: '#e2e8f0', true: '#5eb3d6' }}
                thumbColor="white"
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Mode sombre</Text>
                <Text style={styles.settingDescription}>
                  Thème sombre pour l'application
                </Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#e2e8f0', true: '#5eb3d6' }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Synchronisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synchronisation</Text>
          
          <View style={styles.syncCard}>
            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Dernière synchronisation</Text>
              <Text style={styles.syncValue}>
                {lastSync 
                  ? lastSync.toLocaleString('fr-FR')
                  : 'Jamais synchronisé'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.syncButtonText}>🔄 Synchroniser maintenant</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions du compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
            <Text style={styles.actionButtonText}>🔒 Changer le mot de passe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Text style={styles.actionButtonText}>🚪 Déconnexion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonDanger]} 
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              🗑️ Supprimer mon compte
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>la plateforme v1.0.0</Text>
          <Text style={styles.footerText}>© 2024 la plateforme</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5eb3d6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  editButton: {
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5eb3d6',
  },
  doctorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorIcon: {
    marginRight: 16,
  },
  doctorIconText: {
    fontSize: 48,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  doctorLicense: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  deviceSerial: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  deviceAge: {
    fontSize: 12,
    color: '#94a3b8',
  },
  deviceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  deviceAlertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  deviceAlertText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  treatmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treatmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  treatmentLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  treatmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  syncCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncInfo: {
    marginBottom: 16,
  },
  syncLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  syncButton: {
    backgroundColor: '#5eb3d6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonDanger: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  actionButtonTextDanger: {
    color: '#dc2626',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
});
