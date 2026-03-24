import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert as RNAlert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * Ecran Alertes - Liste triee par priorite
 * Filtres, actions rapides, swipe pour resoudre
 */

// ============================================
// TYPES
// ============================================

type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
type AlertStatus = 'open' | 'in_progress' | 'resolved';

type AlertItem = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  type: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  createdAt: string;
  category: string;
};

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved';

// ============================================
// MOCK DATA
// ============================================

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    patientId: '6',
    patientName: 'M. Petit Luc',
    patientPhone: '06 12 34 56 78',
    type: 'Non-utilisation',
    message: 'Aucune donnee depuis 5 jours. Patient injoignable par telephone.',
    priority: 'critical',
    status: 'open',
    createdAt: 'Il y a 2h',
    category: 'observance',
  },
  {
    id: '2',
    patientId: '3',
    patientName: 'M. Bernard Paul',
    patientPhone: '06 23 45 67 89',
    type: 'IAH eleve',
    message: 'IAH moyen de 12.3 sur les 7 derniers jours. Reglage pression a verifier.',
    priority: 'critical',
    status: 'open',
    createdAt: 'Il y a 4h',
    category: 'medical',
  },
  {
    id: '3',
    patientId: '2',
    patientName: 'Mme Martin Claire',
    patientPhone: '06 34 56 78 90',
    type: 'Fuite excessive',
    message: 'Fuite > 50 L/min sur 3 nuits consecutives. Masque probablement mal ajuste.',
    priority: 'high',
    status: 'open',
    createdAt: 'Il y a 6h',
    category: 'equipement',
  },
  {
    id: '4',
    patientId: '8',
    patientName: 'M. Fournier Marc',
    patientPhone: '06 45 67 89 01',
    type: 'Observance faible',
    message: 'Utilisation < 4h sur 5 des 7 derniers jours.',
    priority: 'high',
    status: 'in_progress',
    createdAt: 'Il y a 1j',
    category: 'observance',
  },
  {
    id: '5',
    patientId: '5',
    patientName: 'Mme Moreau Anne',
    patientPhone: '06 56 78 90 12',
    type: 'Remplacement filtre',
    message: 'Filtre a changer (> 6 mois). Planifier livraison consommable.',
    priority: 'medium',
    status: 'open',
    createdAt: 'Il y a 2j',
    category: 'equipement',
  },
  {
    id: '6',
    patientId: '1',
    patientName: 'M. Dupont Jean',
    patientPhone: '06 67 89 01 23',
    type: 'Renouvellement',
    message: 'Renouvellement CPAM dans 30 jours. Bilan a preparer.',
    priority: 'low',
    status: 'open',
    createdAt: 'Il y a 3j',
    category: 'administratif',
  },
  {
    id: '7',
    patientId: '4',
    patientName: 'Mme Leroy Sophie',
    patientPhone: '06 78 90 12 34',
    type: 'Installation reussie',
    message: 'Premiere nuit : 6h42, IAH 3.1. Bonne adaptation.',
    priority: 'low',
    status: 'resolved',
    createdAt: 'Hier',
    category: 'suivi',
  },
];

// ============================================
// COMPOSANTS
// ============================================

function AlertCard({
  alert,
  onResolve,
  onCall,
  onSchedule,
}: {
  alert: AlertItem;
  onResolve: () => void;
  onCall: () => void;
  onSchedule: () => void;
}) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);

  const priorityConfig = {
    critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critique', icon: 'alert-circle' as const },
    high: { color: '#f59e0b', bg: '#fffbeb', label: 'Haute', icon: 'warning' as const },
    medium: { color: '#3b82f6', bg: '#eff6ff', label: 'Moyenne', icon: 'information-circle' as const },
    low: { color: '#64748b', bg: '#f8fafc', label: 'Basse', icon: 'ellipse' as const },
  };

  const statusConfig = {
    open: { label: 'Non traitee', color: '#ef4444' },
    in_progress: { label: 'En cours', color: '#f59e0b' },
    resolved: { label: 'Resolue', color: '#10b981' },
  };

  const priority = priorityConfig[alert.priority];
  const status = statusConfig[alert.status];

  return (
    <TouchableOpacity
      style={[styles.alertCard, { borderLeftColor: priority.color }]}
      activeOpacity={0.7}
      onPress={() => setShowActions(!showActions)}
    >
      {/* Header */}
      <View style={styles.alertHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Ionicons name={priority.icon} size={14} color={priority.color} />
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
        <View style={styles.alertHeaderRight}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={styles.alertTime}>{alert.createdAt}</Text>
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity
        onPress={() => router.push(`/patient/${alert.patientId}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.alertPatient}>{alert.patientName}</Text>
      </TouchableOpacity>
      <Text style={styles.alertType}>{alert.type}</Text>
      <Text style={styles.alertMessage}>{alert.message}</Text>

      {/* Category tag */}
      <View style={styles.categoryRow}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{alert.category}</Text>
        </View>
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
      </View>

      {/* Actions rapides */}
      {showActions && alert.status !== 'resolved' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onCall}>
            <Ionicons name="call-outline" size={16} color="#3b82f6" />
            <Text style={styles.actionText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onSchedule}>
            <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.actionText, { color: '#8b5cf6' }]}>Visite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cube-outline" size={16} color="#f59e0b" />
            <Text style={[styles.actionText, { color: '#f59e0b' }]}>Consommable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={onResolve}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
            <Text style={[styles.actionText, { color: '#10b981' }]}>Resoudre</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function AlertesScreen() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [alerts, setAlerts] = useState(mockAlerts);

  const filterOptions: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'open', label: 'Non traitees' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'resolved', label: 'Resolues' },
  ];

  const filteredAlerts = alerts
    .filter((a) => filter === 'all' || a.status === filter)
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const openCount = alerts.filter((a) => a.status === 'open').length;
  const criticalCount = alerts.filter((a) => a.priority === 'critical' && a.status !== 'resolved').length;

  const handleResolve = (id: string) => {
    RNAlert.alert(
      'Resoudre l\'alerte',
      'Voulez-vous marquer cette alerte comme resolue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Resoudre',
          onPress: () => {
            setAlerts((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: 'resolved' as AlertStatus } : a))
            );
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleSchedule = (_patientId: string) => {
    // TODO: navigation vers planning avec pre-remplissage
    RNAlert.alert('Planifier', 'Fonctionnalite de planification a venir.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alertes</Text>
          <Text style={styles.subtitle}>
            {openCount} ouvertes dont {criticalCount} critiques
          </Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {filterOptions.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onResolve={() => handleResolve(item.id)}
            onCall={() => handleCall(item.patientPhone)}
            onSchedule={() => handleSchedule(item.patientId)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
            <Text style={styles.emptyText}>Aucune alerte dans cette categorie</Text>
          </View>
        }
      />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Alert card
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertPatient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  alertType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  categoryTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  resolveButton: {
    backgroundColor: '#ecfdf5',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
  },
});
