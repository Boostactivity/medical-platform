import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * Ecran Patients - Liste avec recherche et filtres
 * Pastilles couleur (vert/orange/rouge), score observance par patient
 */

// ============================================
// TYPES
// ============================================

type Patient = {
  id: string;
  name: string;
  age: number;
  observance: number; // 0-100
  ahi: number;
  lastTransmission: string;
  machine: string;
  alertCount: number;
  status: 'good' | 'warning' | 'critical';
  city: string;
};

type FilterType = 'all' | 'critical' | 'warning' | 'good';

// ============================================
// MOCK DATA
// ============================================

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Dupont Jean',
    age: 62,
    observance: 92,
    ahi: 3.2,
    lastTransmission: 'Aujourd\'hui',
    machine: 'ResMed AirSense 11',
    alertCount: 0,
    status: 'good',
    city: 'Paris 16e',
  },
  {
    id: '2',
    name: 'Martin Claire',
    age: 55,
    observance: 68,
    ahi: 8.5,
    lastTransmission: 'Hier',
    machine: 'Philips DreamStation 2',
    alertCount: 2,
    status: 'warning',
    city: 'Paris 9e',
  },
  {
    id: '3',
    name: 'Bernard Paul',
    age: 71,
    observance: 45,
    ahi: 12.3,
    lastTransmission: 'Il y a 3 jours',
    machine: 'ResMed AirSense 10',
    alertCount: 3,
    status: 'critical',
    city: 'Boulogne',
  },
  {
    id: '4',
    name: 'Leroy Sophie',
    age: 48,
    observance: 88,
    ahi: 4.1,
    lastTransmission: 'Aujourd\'hui',
    machine: 'Lowenstein Prisma Smart',
    alertCount: 0,
    status: 'good',
    city: 'Paris 2e',
  },
  {
    id: '5',
    name: 'Moreau Anne',
    age: 59,
    observance: 72,
    ahi: 6.8,
    lastTransmission: 'Hier',
    machine: 'ResMed AirSense 11',
    alertCount: 1,
    status: 'warning',
    city: 'Paris 11e',
  },
  {
    id: '6',
    name: 'Petit Luc',
    age: 67,
    observance: 34,
    ahi: 15.2,
    lastTransmission: 'Il y a 5 jours',
    machine: 'Philips DreamStation 2',
    alertCount: 4,
    status: 'critical',
    city: 'Neuilly',
  },
  {
    id: '7',
    name: 'Roux Catherine',
    age: 52,
    observance: 95,
    ahi: 2.8,
    lastTransmission: 'Aujourd\'hui',
    machine: 'ResMed AirSense 11',
    alertCount: 0,
    status: 'good',
    city: 'Paris 7e',
  },
  {
    id: '8',
    name: 'Fournier Marc',
    age: 64,
    observance: 61,
    ahi: 9.4,
    lastTransmission: 'Il y a 2 jours',
    machine: 'Lowenstein Prisma Smart',
    alertCount: 2,
    status: 'warning',
    city: 'Vincennes',
  },
];

// ============================================
// COMPOSANTS
// ============================================

function StatusDot({ status }: { status: Patient['status'] }) {
  const colors = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  };
  return <View style={[styles.statusDot, { backgroundColor: colors[status] }]} />;
}

function ObservanceBar({ value }: { value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <View style={styles.observanceBarBg}>
      <View style={[styles.observanceBarFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

function PatientCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.patientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.patientRow}>
        <StatusDot status={patient.status} />
        <View style={styles.patientInfo}>
          <View style={styles.patientNameRow}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientAge}>{patient.age} ans</Text>
          </View>
          <Text style={styles.patientCity}>
            <Ionicons name="location-outline" size={11} color="#94a3b8" /> {patient.city}
          </Text>
        </View>
        {patient.alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{patient.alertCount}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </View>

      <View style={styles.patientStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Observance</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{patient.observance}%</Text>
            <ObservanceBar value={patient.observance} />
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>IAH</Text>
          <Text style={styles.statValue}>{patient.ahi}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Transmission</Text>
          <Text style={styles.statValueSmall}>{patient.lastTransmission}</Text>
        </View>
      </View>

      <Text style={styles.machineName}>
        <Ionicons name="hardware-chip-outline" size={11} color="#94a3b8" /> {patient.machine}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function PatientsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const router = useRouter();

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: mockPatients.length },
    {
      key: 'critical',
      label: 'Critiques',
      count: mockPatients.filter((p) => p.status === 'critical').length,
    },
    {
      key: 'warning',
      label: 'Attention',
      count: mockPatients.filter((p) => p.status === 'warning').length,
    },
    {
      key: 'good',
      label: 'OK',
      count: mockPatients.filter((p) => p.status === 'good').length,
    },
  ];

  const filteredPatients = mockPatients
    .filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(s) ||
          p.city.toLowerCase().includes(s) ||
          p.machine.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, good: 2 };
      return order[a.status] - order[b.status];
    });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <Text style={styles.subtitle}>{mockPatients.length} patients actifs</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un patient, ville, machine..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
            <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
              <Text
                style={[
                  styles.filterCountText,
                  filter === f.key && styles.filterCountTextActive,
                ]}
              >
                {f.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PatientCard
            patient={item}
            onPress={() => router.push(`/patient/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucun patient trouve</Text>
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

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0f172a',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
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
  filterCount: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterCountTextActive: {
    color: '#ffffff',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Patient card
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  patientAge: {
    fontSize: 13,
    color: '#94a3b8',
  },
  patientCity: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Stats row
  patientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  statValueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 12,
  },

  // Observance bar
  observanceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  observanceBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Machine
  machineName: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 10,
  },

  // Empty state
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
