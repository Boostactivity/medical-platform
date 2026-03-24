import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * Dashboard Prestataire - Page d'accueil
 *
 * KPIs du jour, alertes urgentes, prochaines interventions, score prestataire
 */

// ============================================
// TYPES
// ============================================

type KPI = {
  label: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: string;
};

type UrgentAlert = {
  id: string;
  patientName: string;
  type: string;
  message: string;
  priority: 'critical' | 'high' | 'medium';
  time: string;
};

type Intervention = {
  id: string;
  patientName: string;
  type: string;
  time: string;
  address: string;
  status: 'planned' | 'in_progress' | 'done';
};

// ============================================
// MOCK DATA
// ============================================

const mockKPIs: KPI[] = [
  {
    label: 'Patients actifs',
    value: '147',
    subtitle: '+3 cette semaine',
    icon: 'people',
    color: '#3b82f6',
    trend: '+2.1%',
  },
  {
    label: 'Alertes ouvertes',
    value: '12',
    subtitle: '5 urgentes',
    icon: 'alert-circle',
    color: '#ef4444',
    trend: '-8%',
  },
  {
    label: 'Interventions',
    value: '6',
    subtitle: "Aujourd'hui",
    icon: 'construct',
    color: '#8b5cf6',
  },
  {
    label: 'Observance',
    value: '78%',
    subtitle: 'Taux global',
    icon: 'trending-up',
    color: '#10b981',
    trend: '+1.5%',
  },
];

const mockUrgentAlerts: UrgentAlert[] = [
  {
    id: '1',
    patientName: 'M. Dupont Jean',
    type: 'Non-utilisation',
    message: 'Aucune donnee depuis 5 jours',
    priority: 'critical',
    time: 'Il y a 2h',
  },
  {
    id: '2',
    patientName: 'Mme Martin Claire',
    type: 'Fuite excessive',
    message: 'Fuite > 50 L/min sur 3 nuits',
    priority: 'high',
    time: 'Il y a 4h',
  },
  {
    id: '3',
    patientName: 'M. Bernard Paul',
    type: 'IAH eleve',
    message: 'IAH moyen 12.3 sur 7 jours',
    priority: 'high',
    time: 'Il y a 6h',
  },
];

const mockInterventions: Intervention[] = [
  {
    id: '1',
    patientName: 'Mme Leroy Sophie',
    type: 'Installation',
    time: '09:00',
    address: '12 rue de la Paix, 75002 Paris',
    status: 'done',
  },
  {
    id: '2',
    patientName: 'M. Dupont Jean',
    type: 'Visite de suivi',
    time: '11:30',
    address: '45 avenue Victor Hugo, 75016 Paris',
    status: 'in_progress',
  },
  {
    id: '3',
    patientName: 'Mme Moreau Anne',
    type: 'Changement masque',
    time: '14:00',
    address: '8 boulevard Haussmann, 75009 Paris',
    status: 'planned',
  },
  {
    id: '4',
    patientName: 'M. Petit Luc',
    type: 'Maintenance',
    time: '16:30',
    address: '23 rue du Faubourg, 75011 Paris',
    status: 'planned',
  },
];

// ============================================
// COMPOSANTS
// ============================================

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconContainer, { backgroundColor: kpi.color + '12' }]}>
        <Ionicons name={kpi.icon} size={20} color={kpi.color} />
      </View>
      <Text style={styles.kpiValue}>{kpi.value}</Text>
      <Text style={styles.kpiLabel}>{kpi.label}</Text>
      <View style={styles.kpiFooter}>
        <Text style={styles.kpiSubtitle}>{kpi.subtitle}</Text>
        {kpi.trend && (
          <Text
            style={[
              styles.kpiTrend,
              { color: kpi.trend.startsWith('+') ? '#10b981' : '#ef4444' },
            ]}
          >
            {kpi.trend}
          </Text>
        )}
      </View>
    </View>
  );
}

function AlertCard({ alert }: { alert: UrgentAlert }) {
  const router = useRouter();
  const priorityColors = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
  };

  return (
    <TouchableOpacity style={styles.alertCard} activeOpacity={0.7}>
      <View
        style={[styles.alertPriority, { backgroundColor: priorityColors[alert.priority] }]}
      />
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertPatient} numberOfLines={1}>
            {alert.patientName}
          </Text>
          <Text style={styles.alertTime}>{alert.time}</Text>
        </View>
        <Text style={styles.alertType}>{alert.type}</Text>
        <Text style={styles.alertMessage} numberOfLines={1}>
          {alert.message}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function InterventionCard({ intervention }: { intervention: Intervention }) {
  const statusConfig = {
    planned: { label: 'A faire', color: '#3b82f6', bg: '#eff6ff' },
    in_progress: { label: 'En cours', color: '#f59e0b', bg: '#fffbeb' },
    done: { label: 'Termine', color: '#10b981', bg: '#ecfdf5' },
  };

  const status = statusConfig[intervention.status];

  return (
    <TouchableOpacity style={styles.interventionCard} activeOpacity={0.7}>
      <View style={styles.interventionTime}>
        <Text style={styles.interventionTimeText}>{intervention.time}</Text>
        <View
          style={[
            styles.interventionDot,
            { backgroundColor: status.color },
          ]}
        />
      </View>
      <View style={styles.interventionContent}>
        <Text style={styles.interventionPatient}>{intervention.patientName}</Text>
        <Text style={styles.interventionType}>{intervention.type}</Text>
        <View style={styles.interventionAddressRow}>
          <Ionicons name="location-outline" size={13} color="#94a3b8" />
          <Text style={styles.interventionAddress} numberOfLines={1}>
            {intervention.address}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function DashboardProvider() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Date du jour
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, Dr. Martin</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push('/scanner')}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={22} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        {/* Score prestataire */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>Score prestataire</Text>
            <Text style={styles.scoreValue}>92</Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, { width: '92%' }]} />
            </View>
            <Text style={styles.scoreDetail}>Reactivite: 95 | Observance: 89 | Satisfaction: 91</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {mockKPIs.map((kpi, index) => (
            <KPICard key={index} kpi={kpi} />
          ))}
        </View>

        {/* Alertes urgentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertes urgentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/alertes')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {mockUrgentAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </View>

        {/* Prochaines interventions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interventions du jour</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/planning')}>
              <Text style={styles.seeAll}>Planning</Text>
            </TouchableOpacity>
          </View>
          {mockInterventions.map((intervention) => (
            <InterventionCard key={intervention.id} intervention={intervention} />
          ))}
        </View>

        <View style={{ height: 24 }} />
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
    backgroundColor: '#FAFBFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Score card
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 20,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748b',
    position: 'absolute',
    top: -16,
    left: 0,
    width: 120,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#8b5cf6',
    letterSpacing: -1,
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 2,
  },
  scoreRight: {
    flex: 1,
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginBottom: 8,
  },
  scoreBarFill: {
    height: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  scoreDetail: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '47.5%' as any,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  kpiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },

  // Alert cards
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  alertPriority: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  alertTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
  },
  alertType: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Intervention cards
  interventionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  interventionTime: {
    alignItems: 'center',
    marginRight: 14,
    width: 48,
  },
  interventionTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  interventionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  interventionContent: {
    flex: 1,
  },
  interventionPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  interventionType: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  interventionAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  interventionAddress: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
