import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useRouter } from 'expo-router';
import { Alert } from '../../database/models/Alert';
import { Patient } from '../../database/models/Patient';

/**
 * Écran Liste des Alertes
 * 
 * Affiche toutes les alertes du patient avec :
 * - Filtres par sévérité, type, statut
 * - Actions : marquer comme lu, acquitter, résoudre
 * - Badge de compteur non lues
 * - Navigation vers détail patient
 * - Pull to refresh
 */

export default function AlertsPage() {
  // ============================================
  // STATE
  // ============================================

  const database = useDatabase();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  
  // Filtres
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'observance' | 'technical' | 'medical' | 'maintenance'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'resolved'>('active');
  
  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    needsAction: 0,
  });

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, selectedSeverity, selectedType, selectedStatus]);

  async function loadData() {
    try {
      setLoading(true);
      
      // TODO: Récupérer l'ID du patient connecté
      const currentPatientId = 'PATIENT_ID_HERE';
      
      // Charger le patient
      const patientData = await database.get<Patient>('patients').find(currentPatientId);
      setPatient(patientData);
      
      // Charger toutes les alertes du patient
      const alertsCollection = database.get<Alert>('alerts');
      const alertsData = await alertsCollection
        .query()
        // @ts-ignore
        .where('patient_id', currentPatientId)
        .fetch();
      
      // Trier par priorité puis par date
      const sortedAlerts = alertsData.sort((a, b) => {
        // Priorité d'abord
        if (a.displayPriority !== b.displayPriority) {
          return a.displayPriority - b.displayPriority;
        }
        // Puis par date (plus récent en premier)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setAlerts(sortedAlerts);
      calculateStats(sortedAlerts);
      
    } catch (error) {
      console.error('Error loading alerts:', error);
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

  function filterAlerts() {
    let filtered = [...alerts];
    
    // Filtre par sévérité
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === selectedSeverity);
    }
    
    // Filtre par type
    if (selectedType !== 'all') {
      filtered = filtered.filter(alert => alert.type === selectedType);
    }
    
    // Filtre par statut
    if (selectedStatus === 'active') {
      filtered = filtered.filter(alert => !alert.isResolved);
    } else if (selectedStatus === 'resolved') {
      filtered = filtered.filter(alert => alert.isResolved);
    }
    
    setFilteredAlerts(filtered);
  }

  function calculateStats(data: Alert[]) {
    setStats({
      total: data.length,
      unread: data.filter(a => !a.isRead).length,
      critical: data.filter(a => a.severity === 'critical' && !a.isResolved).length,
      needsAction: data.filter(a => a.needsAction).length,
    });
  }

  // ============================================
  // ACTIONS
  // ============================================

  async function handleMarkAsRead(alert: Alert) {
    try {
      await alert.markAsRead();
      await loadData(); // Recharger pour mettre à jour
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }

  async function handleAcknowledge(alert: Alert) {
    try {
      // TODO: Récupérer l'ID utilisateur connecté
      const userId = 'USER_ID_HERE';
      await alert.acknowledge(userId);
      await loadData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }

  async function handleResolve(alert: Alert) {
    try {
      // TODO: Récupérer l'ID utilisateur connecté
      const userId = 'USER_ID_HERE';
      await alert.resolve(userId, 'Résolu depuis l\'application mobile');
      await loadData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }

  async function handleReopen(alert: Alert) {
    try {
      await alert.reopen();
      await loadData();
    } catch (error) {
      console.error('Error reopening alert:', error);
    }
  }

  // ============================================
  // RENDER ITEM
  // ============================================

  function renderAlertItem({ item }: { item: Alert }) {
    return (
      <View style={styles.alertCard}>
        {/* Indicateur de statut */}
        <View style={[styles.statusIndicator, { backgroundColor: item.severityColor }]} />
        
        {/* Contenu */}
        <View style={styles.alertContent}>
          {/* Header */}
          <View style={styles.alertHeader}>
            <View style={styles.alertHeaderLeft}>
              <Text style={styles.alertIcon}>{getTypeIcon(item.type)}</Text>
              <View style={styles.alertHeaderText}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertTime}>{item.ageFormatted}</Text>
              </View>
            </View>
            
            {!item.isRead && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>●</Text>
              </View>
            )}
          </View>

          {/* Message */}
          <Text style={styles.alertMessage}>{item.message}</Text>

          {/* Badges */}
          <View style={styles.alertBadges}>
            <View style={[styles.badge, { backgroundColor: item.severityColor + '20' }]}>
              <Text style={[styles.badgeText, { color: item.severityColor }]}>
                {item.severityLabel}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.typeLabel}</Text>
            </View>
            {item.isAcknowledged && (
              <View style={[styles.badge, styles.badgeSuccess]}>
                <Text style={[styles.badgeText, { color: '#16a34a' }]}>Acquittée</Text>
              </View>
            )}
            {item.isResolved && (
              <View style={[styles.badge, styles.badgeResolved]}>
                <Text style={[styles.badgeText, { color: '#64748b' }]}>Résolue</Text>
              </View>
            )}
          </View>

          {/* Action recommandée */}
          {!item.isResolved && (
            <View style={styles.recommendedAction}>
              <Text style={styles.recommendedActionIcon}>💡</Text>
              <Text style={styles.recommendedActionText}>
                {item.getRecommendedAction()}
              </Text>
            </View>
          )}

          {/* Escalade warning */}
          {item.needsEscalation() && (
            <View style={styles.escalationWarning}>
              <Text style={styles.escalationIcon}>⚠️</Text>
              <Text style={styles.escalationText}>
                Escalade nécessaire ! Non résolue depuis {item.ageInHours}h
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.alertActions}>
            {!item.isRead && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => handleMarkAsRead(item)}
              >
                <Text style={styles.actionButtonTextSecondary}>Marquer comme lu</Text>
              </TouchableOpacity>
            )}
            
            {!item.isAcknowledged && !item.isResolved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={() => handleAcknowledge(item)}
              >
                <Text style={styles.actionButtonTextSecondary}>Acquitter</Text>
              </TouchableOpacity>
            )}
            
            {!item.isResolved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => handleResolve(item)}
              >
                <Text style={styles.actionButtonTextPrimary}>Résoudre</Text>
              </TouchableOpacity>
            )}
            
            {item.isResolved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonWarning]}
                onPress={() => handleReopen(item)}
              >
                <Text style={styles.actionButtonTextWarning}>Rouvrir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
          <Text style={styles.loadingText}>Chargement des alertes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alertes</Text>
          {stats.unread > 0 && (
            <Text style={styles.subtitle}>
              {stats.unread} non lue{stats.unread > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerBadges}>
          {stats.critical > 0 && (
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalBadgeText}>{stats.critical} 🚨</Text>
            </View>
          )}
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.critical}</Text>
          <Text style={styles.statLabel}>Critiques</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.needsAction}</Text>
          <Text style={styles.statLabel}>À traiter</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Non lues</Text>
        </View>
      </View>

      {/* Filtres - Statut */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Statut</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.filterButtonText, selectedStatus === 'all' && styles.filterButtonTextActive]}>
              Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'active' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('active')}
          >
            <Text style={[styles.filterButtonText, selectedStatus === 'active' && styles.filterButtonTextActive]}>
              Actives
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'resolved' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('resolved')}
          >
            <Text style={[styles.filterButtonText, selectedStatus === 'resolved' && styles.filterButtonTextActive]}>
              Résolues
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres - Sévérité */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Sévérité</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedSeverity === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedSeverity('all')}
          >
            <Text style={[styles.filterButtonText, selectedSeverity === 'all' && styles.filterButtonTextActive]}>
              Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedSeverity === 'critical' && styles.filterButtonActive]}
            onPress={() => setSelectedSeverity('critical')}
          >
            <Text style={[styles.filterButtonText, selectedSeverity === 'critical' && styles.filterButtonTextActive]}>
              Critiques
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedSeverity === 'high' && styles.filterButtonActive]}
            onPress={() => setSelectedSeverity('high')}
          >
            <Text style={[styles.filterButtonText, selectedSeverity === 'high' && styles.filterButtonTextActive]}>
              Élevées
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres - Type */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'observance' && styles.filterButtonActive]}
            onPress={() => setSelectedType('observance')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'observance' && styles.filterButtonTextActive]}>
              Observance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'technical' && styles.filterButtonActive]}
            onPress={() => setSelectedType('technical')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'technical' && styles.filterButtonTextActive]}>
              Technique
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Résultats */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Liste des alertes */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>Aucune alerte</Text>
            <Text style={styles.emptySubtext}>
              {selectedStatus === 'resolved' 
                ? 'Aucune alerte résolue'
                : 'Tout va bien ! Aucune alerte active.'}
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

function getTypeIcon(type: string): string {
  const icons: { [key: string]: string } = {
    observance: '⏱️',
    technical: '🔧',
    medical: '🏥',
    maintenance: '⚙️',
  };
  return icons[type] || '📌';
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
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  criticalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 16,
  },
  criticalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
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
    paddingVertical: 8,
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
    flexWrap: 'wrap',
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
  alertCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertHeaderText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  unreadBadge: {
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 16,
    color: '#5eb3d6',
  },
  alertMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeResolved: {
    backgroundColor: '#f1f5f9',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  recommendedAction: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendedActionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  recommendedActionText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  escalationWarning: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  escalationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  escalationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    lineHeight: 18,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    backgroundColor: 'white',
    borderColor: '#e2e8f0',
  },
  actionButtonPrimary: {
    backgroundColor: '#5eb3d6',
    borderColor: '#5eb3d6',
  },
  actionButtonWarning: {
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
  },
  actionButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  actionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  actionButtonTextWarning: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
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
