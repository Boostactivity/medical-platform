import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useRouter } from 'expo-router';
import { SleepData } from '../../database/models/SleepData';
import { Patient } from '../../database/models/Patient';

/**
 * Écran Historique du Sommeil
 * 
 * Affiche la liste complète des nuits avec :
 * - Date et jour de la semaine
 * - Heures d'utilisation
 * - IAH
 * - Score de qualité
 * - Filtres par période
 * - Navigation vers détail
 */

export default function HistoriquePage() {
  // ============================================
  // STATE
  // ============================================

  const database = useDatabase();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [filteredData, setFilteredData] = useState<SleepData[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  
  // Filtres
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const [selectedQuality, setSelectedQuality] = useState<'all' | 'excellent' | 'good' | 'average' | 'poor'>('all');

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    avgHours: 0,
    compliantDays: 0,
    excellentDays: 0,
  });

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [sleepData, selectedPeriod, selectedQuality]);

  async function loadData() {
    try {
      setLoading(true);
      
      // TODO: Récupérer l'ID du patient connecté
      const currentPatientId = 'PATIENT_ID_HERE';
      
      // Charger le patient
      const patientData = await database.get<Patient>('patients').find(currentPatientId);
      setPatient(patientData);
      
      // Charger toutes les données de sommeil (90 derniers jours max)
      const sleepDataRecords = await patientData.getRecentSleepData(90);
      setSleepData(sleepDataRecords);
      
      // Calculer les statistiques
      calculateStats(sleepDataRecords);
      
    } catch (error) {
      console.error('Error loading historique:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // ============================================
  // FILTRAGE
  // ============================================

  function filterData() {
    let filtered = [...sleepData];
    
    // Filtre par période
    if (selectedPeriod !== 'all') {
      const days = parseInt(selectedPeriod);
      filtered = filtered.slice(0, days);
    }
    
    // Filtre par qualité
    if (selectedQuality !== 'all') {
      filtered = filtered.filter(data => {
        const quality = data.qualityLabel.toLowerCase();
        switch (selectedQuality) {
          case 'excellent':
            return quality === 'excellente';
          case 'good':
            return quality === 'bonne';
          case 'average':
            return quality === 'moyenne';
          case 'poor':
            return quality === 'faible';
          default:
            return true;
        }
      });
    }
    
    setFilteredData(filtered);
  }

  function calculateStats(data: SleepData[]) {
    if (data.length === 0) {
      setStats({ total: 0, avgHours: 0, compliantDays: 0, excellentDays: 0 });
      return;
    }
    
    const totalHours = data.reduce((sum, d) => sum + d.hoursUsed, 0);
    const avgHours = totalHours / data.length;
    const compliantDays = data.filter(d => d.isCompliant).length;
    const excellentDays = data.filter(d => d.qualityScore >= 85).length;
    
    setStats({
      total: data.length,
      avgHours,
      compliantDays,
      excellentDays,
    });
  }

  // ============================================
  // NAVIGATION
  // ============================================

  function handleNightPress(night: SleepData) {
    router.push(`/night/${night.id}`);
  }

  // ============================================
  // RENDER ITEM
  // ============================================

  function renderNightItem({ item }: { item: SleepData }) {
    return (
      <TouchableOpacity
        style={styles.nightCard}
        onPress={() => handleNightPress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.nightHeader}>
          <View style={styles.nightDateContainer}>
            <Text style={styles.nightDate}>{item.shortDate}</Text>
            <Text style={styles.nightDay}>{getDayOfWeek(item.date)}</Text>
          </View>
          
          <View style={[styles.qualityBadge, { backgroundColor: item.qualityColor + '20' }]}>
            <Text style={[styles.qualityBadgeText, { color: item.qualityColor }]}>
              {item.qualityLabel}
            </Text>
          </View>
        </View>

        {/* Métriques */}
        <View style={styles.nightMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.hoursUsed.toFixed(1)}h</Text>
            <Text style={styles.metricLabel}>Utilisation</Text>
          </View>
          
          {item.ahi !== undefined && (
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: getAHIColor(item.ahi) }]}>
                {item.ahi.toFixed(1)}
              </Text>
              <Text style={styles.metricLabel}>IAH</Text>
            </View>
          )}
          
          {item.leakage !== undefined && (
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{item.leakage.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Fuites</Text>
            </View>
          )}
          
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { fontSize: 20 }]}>
              {Math.round(item.qualityScore)}
            </Text>
            <Text style={styles.metricLabel}>Score</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.nightBadges}>
          {item.isCompliant && (
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeText}>✓ Conforme</Text>
            </View>
          )}
          {item.isAHINormal && (
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeText}>IAH Normal</Text>
            </View>
          )}
          {!item.isCompliant && (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text style={styles.badgeText}>Non conforme</Text>
            </View>
          )}
          {item.isRecent && (
            <View style={[styles.badge, styles.badgeInfo]}>
              <Text style={styles.badgeText}>Récent</Text>
            </View>
          )}
        </View>

        {/* Flèche */}
        <View style={styles.nightArrow}>
          <Text style={styles.nightArrowText}>›</Text>
        </View>
      </TouchableOpacity>
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
          <Text style={styles.loadingText}>Chargement de l'historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>📄 Export PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques résumées */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Nuits</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.avgHours.toFixed(1)}h</Text>
          <Text style={styles.statLabel}>Moyenne</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.compliantDays}</Text>
          <Text style={styles.statLabel}>Conformes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.excellentDays}</Text>
          <Text style={styles.statLabel}>Excellentes</Text>
        </View>
      </View>

      {/* Filtres - Période */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Période</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === '7' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('7')}
          >
            <Text style={[styles.filterButtonText, selectedPeriod === '7' && styles.filterButtonTextActive]}>
              7 jours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === '30' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('30')}
          >
            <Text style={[styles.filterButtonText, selectedPeriod === '30' && styles.filterButtonTextActive]}>
              30 jours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === '90' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('90')}
          >
            <Text style={[styles.filterButtonText, selectedPeriod === '90' && styles.filterButtonTextActive]}>
              90 jours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedPeriod === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedPeriod('all')}
          >
            <Text style={[styles.filterButtonText, selectedPeriod === 'all' && styles.filterButtonTextActive]}>
              Tout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres - Qualité */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Qualité</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedQuality === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedQuality('all')}
          >
            <Text style={[styles.filterButtonText, selectedQuality === 'all' && styles.filterButtonTextActive]}>
              Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedQuality === 'excellent' && styles.filterButtonActive]}
            onPress={() => setSelectedQuality('excellent')}
          >
            <Text style={[styles.filterButtonText, selectedQuality === 'excellent' && styles.filterButtonTextActive]}>
              Excellentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedQuality === 'good' && styles.filterButtonActive]}
            onPress={() => setSelectedQuality('good')}
          >
            <Text style={[styles.filterButtonText, selectedQuality === 'good' && styles.filterButtonTextActive]}>
              Bonnes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Résultats */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredData.length} nuit{filteredData.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Liste des nuits */}
      <FlatList
        data={filteredData}
        renderItem={renderNightItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💤</Text>
            <Text style={styles.emptyText}>Aucune nuit trouvée</Text>
            <Text style={styles.emptySubtext}>
              Essayez de changer les filtres
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ============================================
// HELPERS
// ============================================

function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return days[date.getDay()];
}

function getAHIColor(ahi: number): string {
  if (ahi < 5) return '#4ade80';
  if (ahi < 15) return '#fbbf24';
  if (ahi < 30) return '#f97316';
  return '#ef4444';
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e3a5f',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5eb3d6',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  filtersSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#5eb3d6',
    borderColor: '#5eb3d6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 13,
    color: '#64748b',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  nightCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nightDateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  nightDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  nightDay: {
    fontSize: 14,
    color: '#64748b',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nightMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  nightBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  nightArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
  },
  nightArrowText: {
    fontSize: 32,
    color: '#cbd5e1',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});
