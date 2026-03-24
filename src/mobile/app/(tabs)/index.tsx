import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { SleepChart } from '../../components/charts/SleepChart';
import { IAHChart } from '../../components/charts/IAHChart';
import { Patient } from '../../database/models/Patient';
import { SleepData } from '../../database/models/SleepData';
import { Alert } from '../../database/models/Alert';
import { Device } from '../../database/models/Device';

/**
 * Dashboard Patient - Page d'accueil de l'application mobile
 * 
 * Affiche :
 * - Statistiques du jour (heures, IAH, fuites)
 * - Graphique d'observance 30 jours
 * - Graphique IAH 30 jours
 * - Alertes actives
 * - Statut appareil
 * - Score la plateforme
 */

export default function DashboardPatient() {
  // ============================================
  // STATE
  // ============================================

  const database = useDatabase();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Données
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [lastNight, setLastNight] = useState<SleepData | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  
  // Statistiques
  const [stats, setStats] = useState({
    avgHours: 0,
    avgAHI: 0,
    compliance: 0,
    expairScore: 0,
  });

  // Période d'affichage
  const [period, setPeriod] = useState<7 | 14 | 30>(30);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // TODO: Récupérer l'ID du patient connecté depuis le context auth
      const currentPatientId = 'PATIENT_ID_HERE';
      
      // Charger le patient
      const patientData = await database.get<Patient>('patients').find(currentPatientId);
      setPatient(patientData);
      
      // Charger les données de sommeil (30 derniers jours)
      const sleepDataRecords = await patientData.getRecentSleepData(30);
      setSleepData(sleepDataRecords);
      
      // Dernière nuit
      if (sleepDataRecords.length > 0) {
        setLastNight(sleepDataRecords[0]);
      }
      
      // Charger les alertes actives
      const alerts = await patientData.getActiveAlerts();
      setActiveAlerts(alerts);
      
      // Charger l'appareil
      const deviceData = await patientData.getCurrentDevice();
      setDevice(deviceData);
      
      // Calculer les statistiques
      await calculateStats(sleepDataRecords);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function calculateStats(data: SleepData[]) {
    if (data.length === 0) {
      setStats({ avgHours: 0, avgAHI: 0, compliance: 0, expairScore: 0 });
      return;
    }
    
    // Moyenne heures
    const totalHours = data.reduce((sum, d) => sum + d.hoursUsed, 0);
    const avgHours = totalHours / data.length;
    
    // Moyenne IAH
    const ahiData = data.filter(d => d.ahi !== undefined);
    const avgAHI = ahiData.length > 0
      ? ahiData.reduce((sum, d) => sum + d.ahi!, 0) / ahiData.length
      : 0;
    
    // Taux de compliance (≥4h)
    const compliantNights = data.filter(d => d.isCompliant).length;
    const compliance = (compliantNights / data.length) * 100;
    
    // Score la plateforme moyen
    const scoresData = data.filter(d => d.expairScore !== undefined);
    const expairScore = scoresData.length > 0
      ? scoresData.reduce((sum, d) => sum + d.expairScore!, 0) / scoresData.length
      : 0;
    
    setStats({ avgHours, avgAHI, compliance, expairScore });
  }

  // ============================================
  // REFRESH
  // ============================================

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5eb3d6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour !</Text>
            <Text style={styles.patientName}>{patient?.user?.name || 'Patient'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Statistiques du jour */}
        {lastNight && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dernière nuit</Text>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{lastNight.hoursUsed.toFixed(1)}h</Text>
                <Text style={styles.statLabel}>Utilisation</Text>
                <View style={[styles.statBadge, { backgroundColor: lastNight.isCompliant ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.statBadgeText, { color: lastNight.isCompliant ? '#16a34a' : '#dc2626' }]}>
                    {lastNight.isCompliant ? '✓ Conforme' : '✗ Non conforme'}
                  </Text>
                </View>
              </View>
              
              {lastNight.ahi !== undefined && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{lastNight.ahi.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>IAH</Text>
                  <View style={[styles.statBadge, { backgroundColor: getAHIBadgeColor(lastNight.ahi).bg }]}>
                    <Text style={[styles.statBadgeText, { color: getAHIBadgeColor(lastNight.ahi).text }]}>
                      {lastNight.ahiLevel === 'normal' ? 'Normal' :
                       lastNight.ahiLevel === 'mild' ? 'Léger' :
                       lastNight.ahiLevel === 'moderate' ? 'Modéré' : 'Sévère'}
                    </Text>
                  </View>
                </View>
              )}
              
              {lastNight.leakage !== undefined && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{lastNight.leakage.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Fuites (L/min)</Text>
                  <View style={[styles.statBadge, { backgroundColor: lastNight.hasAcceptableLeakage ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={[styles.statBadgeText, { color: lastNight.hasAcceptableLeakage ? '#16a34a' : '#ca8a04' }]}>
                      {lastNight.hasAcceptableLeakage ? 'Bon' : 'Moyen'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Alertes */}
        {activeAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alertes actives ({activeAlerts.length})</Text>
            {activeAlerts.slice(0, 3).map((alert) => (
              <TouchableOpacity key={alert.id} style={styles.alertCard}>
                <View style={[styles.alertDot, { backgroundColor: alert.severityColor }]} />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>{alert.ageFormatted}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Statistiques 30 jours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Statistiques ({period} jours)</Text>
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[styles.periodButton, period === 7 && styles.periodButtonActive]}
                onPress={() => setPeriod(7)}
              >
                <Text style={[styles.periodButtonText, period === 7 && styles.periodButtonTextActive]}>7j</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, period === 14 && styles.periodButtonActive]}
                onPress={() => setPeriod(14)}
              >
                <Text style={[styles.periodButtonText, period === 14 && styles.periodButtonTextActive]}>14j</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, period === 30 && styles.periodButtonActive]}
                onPress={() => setPeriod(30)}
              >
                <Text style={[styles.periodButtonText, period === 30 && styles.periodButtonTextActive]}>30j</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statsRowItem}>
              <Text style={styles.statsRowValue}>{stats.avgHours.toFixed(1)}h</Text>
              <Text style={styles.statsRowLabel}>Moyenne/nuit</Text>
            </View>
            <View style={styles.statsRowItem}>
              <Text style={styles.statsRowValue}>{stats.compliance.toFixed(0)}%</Text>
              <Text style={styles.statsRowLabel}>Observance</Text>
            </View>
            {stats.avgAHI > 0 && (
              <View style={styles.statsRowItem}>
                <Text style={styles.statsRowValue}>{stats.avgAHI.toFixed(1)}</Text>
                <Text style={styles.statsRowLabel}>IAH moyen</Text>
              </View>
            )}
          </View>
        </View>

        {/* Graphique observance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observance</Text>
          <SleepChart data={sleepData} period={period} showTarget={true} />
        </View>

        {/* Graphique IAH */}
        {sleepData.some(d => d.ahi !== undefined) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Évolution de l'IAH</Text>
            <IAHChart data={sleepData} period={period} showThresholds={true} />
          </View>
        )}

        {/* Statut appareil */}
        {device && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mon appareil</Text>
            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceIcon}>{device.manufacturerLogo}</Text>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.fullName}</Text>
                  <Text style={styles.deviceSerial}>S/N: {device.formattedSerialNumber}</Text>
                </View>
                <View style={[styles.deviceStatus, { backgroundColor: device.statusColor }]}>
                  <Text style={styles.deviceStatusText}>{device.statusLabel}</Text>
                </View>
              </View>
              
              {device.needsMaintenance && (
                <View style={styles.deviceMaintenance}>
                  <Text style={styles.deviceMaintenanceIcon}>⚠️</Text>
                  <Text style={styles.deviceMaintenanceText}>
                    Maintenance : {device.maintenanceStatus}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Score la plateforme */}
        {stats.expairScore > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Score la plateforme</Text>
            <View style={styles.scoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{Math.round(stats.expairScore)}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <Text style={styles.scoreLabel}>
                {stats.expairScore >= 85 ? 'Excellent !' :
                 stats.expairScore >= 70 ? 'Très bien !' :
                 stats.expairScore >= 50 ? 'Bien' : 'À améliorer'}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dernière synchronisation : {new Date().toLocaleTimeString('fr-FR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// HELPERS
// ============================================

function getAHIBadgeColor(ahi: number): { bg: string; text: string } {
  if (ahi < 5) return { bg: '#dcfce7', text: '#16a34a' };
  if (ahi < 15) return { bg: '#fef3c7', text: '#ca8a04' };
  if (ahi < 30) return { bg: '#fed7aa', text: '#ea580c' };
  return { bg: '#fee2e2', text: '#dc2626' };
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  patientName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a5f',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIcon: {
    fontSize: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButtonActive: {
    backgroundColor: '#5eb3d6',
    borderColor: '#5eb3d6',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  statBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 16,
  },
  statsRowItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsRowValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5eb3d6',
  },
  statsRowLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
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
    fontSize: 32,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  deviceSerial: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deviceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deviceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  deviceMaintenance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  deviceMaintenanceIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  deviceMaintenanceText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#5eb3d6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '700',
    color: 'white',
  },
  scoreMax: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
