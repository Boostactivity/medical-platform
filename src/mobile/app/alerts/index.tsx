import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// DONNEES MOCK
// ============================================

type AlertPriority = 'critical' | 'warning' | 'info';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  priority: AlertPriority;
  type: 'mask' | 'filter' | 'observance' | 'maintenance' | 'medical';
  date: string;
  read: boolean;
  actions: { label: string; type: 'primary' | 'secondary' | 'link' }[];
}

const MOCK_ALERTS: AlertItem[] = [
  {
    id: '1',
    title: 'Masque a changer',
    message: 'Votre masque AirFit F20 a atteint 6 mois d utilisation. Il est recommande de le remplacer.',
    priority: 'critical',
    type: 'mask',
    date: 'Aujourd hui',
    read: false,
    actions: [
      { label: 'Commander', type: 'primary' },
      { label: 'Reporter', type: 'secondary' },
    ],
  },
  {
    id: '2',
    title: 'Filtre a remplacer',
    message: 'Le filtre de votre machine doit etre change. Cela garantit une bonne qualite d air.',
    priority: 'warning',
    type: 'filter',
    date: 'Hier',
    read: false,
    actions: [
      { label: 'Commander un filtre', type: 'primary' },
      { label: 'Ignorer', type: 'link' },
    ],
  },
  {
    id: '3',
    title: 'Non-observance detectee',
    message: 'Vous n avez pas atteint les 4h de port minimum ces 3 dernieres nuits. N hesitez pas a nous contacter si vous rencontrez des difficultes.',
    priority: 'critical',
    type: 'observance',
    date: 'Il y a 2 jours',
    read: true,
    actions: [
      { label: 'Contacter mon prestataire', type: 'primary' },
      { label: 'J ai un probleme', type: 'secondary' },
    ],
  },
  {
    id: '4',
    title: 'Rendez-vous de suivi',
    message: 'Votre prochain rendez-vous avec le Dr. Martin est prevu le 28 mars a 14h00.',
    priority: 'info',
    type: 'medical',
    date: 'Il y a 3 jours',
    read: true,
    actions: [
      { label: 'Voir les details', type: 'link' },
    ],
  },
  {
    id: '5',
    title: 'Maintenance preventive',
    message: 'Un technicien passera verifier votre equipement dans les prochaines semaines.',
    priority: 'info',
    type: 'maintenance',
    date: 'Il y a 5 jours',
    read: true,
    actions: [
      { label: 'Confirmer le creneau', type: 'primary' },
      { label: 'Reporter', type: 'secondary' },
    ],
  },
];

function getPriorityConfig(priority: AlertPriority) {
  switch (priority) {
    case 'critical':
      return { color: '#ef4444', bg: '#fef2f2', icon: 'alert-circle' as const, label: 'Urgent' };
    case 'warning':
      return { color: '#f97316', bg: '#fff7ed', icon: 'warning' as const, label: 'Attention' };
    case 'info':
      return { color: BLUE, bg: '#eff6ff', icon: 'information-circle' as const, label: 'Info' };
  }
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'mask': return 'glasses-outline';
    case 'filter': return 'funnel-outline';
    case 'observance': return 'time-outline';
    case 'maintenance': return 'build-outline';
    case 'medical': return 'medkit-outline';
    default: return 'notifications-outline';
  }
}

// ============================================
// ECRAN ALERTES
// ============================================

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [filter, setFilter] = useState<'all' | AlertPriority>('all');

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.priority === filter);
  const unreadCount = alerts.filter((a) => !a.read).length;

  function handleAction(alert: AlertItem, action: AlertItem['actions'][0]) {
    Alert.alert(action.label, `Action "${action.label}" pour : ${alert.title}`);
  }

  function handleDismiss(alertId: string) {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  }

  function renderAlert({ item }: { item: AlertItem }) {
    const config = getPriorityConfig(item.priority);
    return (
      <View style={[alertStyles.card, !item.read && alertStyles.cardUnread]}>
        {/* Barre couleur */}
        <View style={[alertStyles.priorityBar, { backgroundColor: config.color }]} />

        <View style={alertStyles.content}>
          {/* Header */}
          <View style={alertStyles.header}>
            <View style={[alertStyles.typeIcon, { backgroundColor: config.bg }]}>
              <Ionicons name={getTypeIcon(item.type)} size={18} color={config.color} />
            </View>
            <View style={alertStyles.headerText}>
              <Text style={alertStyles.title}>{item.title}</Text>
              <Text style={alertStyles.date}>{item.date}</Text>
            </View>
            <View style={[alertStyles.priorityBadge, { backgroundColor: config.bg }]}>
              <Text style={[alertStyles.priorityText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          {/* Message */}
          <Text style={alertStyles.message}>{item.message}</Text>

          {/* Actions */}
          <View style={alertStyles.actionsRow}>
            {item.actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  alertStyles.actionButton,
                  action.type === 'primary' && { backgroundColor: BLUE },
                  action.type === 'secondary' && { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
                  action.type === 'link' && { backgroundColor: 'transparent' },
                ]}
                onPress={() => handleAction(item, action)}
              >
                <Text
                  style={[
                    alertStyles.actionText,
                    action.type === 'primary' && { color: '#ffffff' },
                    action.type === 'secondary' && { color: '#64748b' },
                    action.type === 'link' && { color: BLUE },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Alertes</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {([
          { key: 'all' as const, label: 'Toutes' },
          { key: 'critical' as const, label: 'Urgentes' },
          { key: 'warning' as const, label: 'Attention' },
          { key: 'info' as const, label: 'Infos' },
        ]).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptySubtext}>Tout est en ordre !</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const alertStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: {
    shadowOpacity: 0.08,
    elevation: 3,
  },
  priorityBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
