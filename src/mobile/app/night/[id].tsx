import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SleepData } from '../../database/models/SleepData';

/**
 * Écran Détail d'une Nuit
 * 
 * Affiche toutes les informations d'une nuit spécifique :
 * - Métriques principales (heures, IAH, fuites, événements)
 * - Score de qualité détaillé
 * - Anomalies détectées
 * - Pression thérapeutique
 * - Données brutes (si disponibles)
 * - Recommandations
 */

export default function NightDetailPage() {
  // ============================================
  // STATE
  // ============================================

  const database = useDatabase();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [night, setNight] = useState<SleepData | null>(null);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    if (id) {
      loadNight();
    }
  }, [id]);

  async function loadNight() {
    try {
      setLoading(true);
      const nightData = await database.get<SleepData>('sleep_data').find(id!);
      setNight(nightData);
    } catch (error) {
      console.error('Error loading night detail:', error);
    } finally {
      setLoading(false);
    }
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

  if (!night) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😴</Text>
          <Text style={styles.errorText}>Nuit introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const anomalies = night.detectAnomalies();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <Text style={styles.backIconText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerDate}>{night.formattedDate}</Text>
            <Text style={styles.headerSubtitle}>{night.daysAgo === 0 ? 'Aujourd\'hui' : `Il y a ${night.daysAgo} jour${night.daysAgo > 1 ? 's' : ''}`}</Text>
          </View>
        </View>

        {/* Score de qualité */}
        <View style={styles.section}>
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: night.qualityColor }]}>
              <Text style={[styles.scoreValue, { color: night.qualityColor }]}>
                {Math.round(night.qualityScore)}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={[styles.scoreLabel, { color: night.qualityColor }]}>
              {night.qualityLabel}
            </Text>
            <Text style={styles.scoreSummary}>{night.generateSummary()}</Text>
          </View>
        </View>

        {/* Métriques principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métriques principales</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricIcon}>⏱️</Text>
              <Text style={styles.metricValue}>{night.hoursUsed.toFixed(1)}h</Text>
              <Text style={styles.metricLabel}>Utilisation</Text>
              <View style={[styles.metricBadge, { backgroundColor: night.isCompliant ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[styles.metricBadgeText, { color: night.isCompliant ? '#16a34a' : '#dc2626' }]}>
                  {night.isCompliant ? 'Conforme' : 'Non conforme'}
                </Text>
              </View>
            </View>

            {night.ahi !== undefined && (
              <View style={styles.metricCard}>
                <Text style={styles.metricIcon}>💤</Text>
                <Text style={[styles.metricValue, { color: getAHIColor(night.ahi) }]}>
                  {night.ahi.toFixed(1)}
                </Text>
                <Text style={styles.metricLabel}>IAH</Text>
                <View style={[styles.metricBadge, { backgroundColor: getAHIBadgeColor(night.ahi).bg }]}>
                  <Text style={[styles.metricBadgeText, { color: getAHIBadgeColor(night.ahi).text }]}>
                    {getAHILevelLabel(night.ahi)}
                  </Text>
                </View>
              </View>
            )}

            {night.leakage !== undefined && (
              <View style={styles.metricCard}>
                <Text style={styles.metricIcon}>💨</Text>
                <Text style={styles.metricValue}>{night.leakage.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>Fuites (L/min)</Text>
                <View style={[styles.metricBadge, { backgroundColor: night.hasAcceptableLeakage ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[styles.metricBadgeText, { color: night.hasAcceptableLeakage ? '#16a34a' : '#ca8a04' }]}>
                    {night.hasAcceptableLeakage ? 'Acceptables' : 'Élevées'}
                  </Text>
                </View>
              </View>
            )}

            {night.events !== undefined && (
              <View style={styles.metricCard}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={styles.metricValue}>{night.events}</Text>
                <Text style={styles.metricLabel}>Événements</Text>
                <View style={[styles.metricBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.metricBadgeText, { color: '#1e40af' }]}>
                    Total
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Pression thérapeutique */}
        {night.pressureP95 !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pression thérapeutique</Text>
            
            <View style={styles.pressureCard}>
              <View style={styles.pressureRow}>
                <Text style={styles.pressureLabel}>Pression (95e percentile)</Text>
                <Text style={styles.pressureValue}>{night.pressureP95.toFixed(1)} cmH₂O</Text>
              </View>
              <Text style={styles.pressureNote}>
                La pression au 95e percentile représente la pression thérapeutique maximale atteinte pendant 95% de la nuit.
              </Text>
            </View>
          </View>
        )}

        {/* Anomalies détectées */}
        {anomalies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anomalies détectées</Text>
            
            {anomalies.map((anomaly, index) => (
              <View 
                key={index}
                style={[
                  styles.anomalyCard,
                  {
                    backgroundColor: 
                      anomaly.severity === 'high' ? '#fee2e2' :
                      anomaly.severity === 'medium' ? '#fef3c7' : '#f0f9ff'
                  }
                ]}
              >
                <View style={styles.anomalyHeader}>
                  <Text style={styles.anomalyIcon}>
                    {anomaly.severity === 'high' ? '🚨' :
                     anomaly.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </Text>
                  <Text style={[
                    styles.anomalySeverity,
                    {
                      color:
                        anomaly.severity === 'high' ? '#dc2626' :
                        anomaly.severity === 'medium' ? '#ca8a04' : '#1e40af'
                    }
                  ]}>
                    {anomaly.severity === 'high' ? 'Critique' :
                     anomaly.severity === 'medium' ? 'Moyen' : 'Info'}
                  </Text>
                </View>
                <Text style={styles.anomalyMessage}>{anomaly.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommandations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommandations</Text>
          
          <View style={styles.recommendationsCard}>
            {night.isCompliant ? (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationIcon}>✅</Text>
                <Text style={styles.recommendationText}>
                  Excellente observance ! Continuez ainsi pour maintenir l'efficacité du traitement.
                </Text>
              </View>
            ) : (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationIcon}>⚠️</Text>
                <Text style={styles.recommendationText}>
                  Utilisation inférieure à 4h. Essayez d'identifier les obstacles à une utilisation optimale.
                </Text>
              </View>
            )}

            {night.ahi !== undefined && night.ahi > 15 && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationIcon}>🏥</Text>
                <Text style={styles.recommendationText}>
                  IAH élevé. Consultez votre médecin pour évaluer un ajustement du traitement.
                </Text>
              </View>
            )}

            {night.leakage !== undefined && night.leakage > 24 && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationIcon}>😷</Text>
                <Text style={styles.recommendationText}>
                  Fuites importantes. Vérifiez l'ajustement de votre masque ou contactez votre prestataire.
                </Text>
              </View>
            )}

            {anomalies.length === 0 && night.isCompliant && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationIcon}>🌟</Text>
                <Text style={styles.recommendationText}>
                  Nuit parfaite ! Aucune anomalie détectée. Continuez ainsi.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Données brutes (si disponibles) */}
        {night.rawData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Données brutes</Text>
            
            <TouchableOpacity style={styles.rawDataCard}>
              <Text style={styles.rawDataTitle}>Voir les données brutes</Text>
              <Text style={styles.rawDataSubtitle}>
                Données complètes de l'appareil PPC
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 Comparer avec d'autres nuits</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📄 Exporter en PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📤 Partager avec mon médecin</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Données enregistrées le {new Date(night.createdAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// HELPERS
// ============================================

function getAHIColor(ahi: number): string {
  if (ahi < 5) return '#4ade80';
  if (ahi < 15) return '#fbbf24';
  if (ahi < 30) return '#f97316';
  return '#ef4444';
}

function getAHIBadgeColor(ahi: number): { bg: string; text: string } {
  if (ahi < 5) return { bg: '#dcfce7', text: '#16a34a' };
  if (ahi < 15) return { bg: '#fef3c7', text: '#ca8a04' };
  if (ahi < 30) return { bg: '#fed7aa', text: '#ea580c' };
  return { bg: '#fee2e2', text: '#dc2626' };
}

function getAHILevelLabel(ahi: number): string {
  if (ahi < 5) return 'Normal';
  if (ahi < 15) return 'Léger';
  if (ahi < 30) return 'Modéré';
  return 'Sévère';
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#5eb3d6',
    borderRadius: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIconText: {
    fontSize: 32,
    color: '#5eb3d6',
  },
  headerContent: {
    flex: 1,
  },
  headerDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 18,
    color: '#64748b',
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  scoreSummary: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 8,
  },
  metricBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metricBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pressureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pressureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pressureLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  pressureValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a5f',
  },
  pressureNote: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  anomalyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  anomalyIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  anomalySeverity: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  anomalyMessage: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendation: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recommendationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#1e3a5f',
    lineHeight: 20,
  },
  rawDataCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rawDataTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a5f',
    marginBottom: 4,
  },
  rawDataSubtitle: {
    fontSize: 13,
    color: '#64748b',
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
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a5f',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
