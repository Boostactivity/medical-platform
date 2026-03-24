import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// COMPOSANT CERCLE ANIME (Score)
// ============================================

function AnimatedScoreCircle({ score, size = 140 }: { score: number; size?: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={BLUE}
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={(1 - score / 100) * circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, fontWeight: '700', color: '#1e293b' }}>{score}</Text>
        <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '500' }}>/100</Text>
      </View>
    </View>
  );
}

// ============================================
// MINI BAR CHART 7 JOURS
// ============================================

function MiniBarChart({ data }: { data: { day: string; hours: number }[] }) {
  const maxH = Math.max(...data.map((d) => d.hours), 8);
  const barWidth = (SCREEN_WIDTH - 80) / data.length - 6;

  return (
    <View style={miniStyles.container}>
      <View style={miniStyles.barsRow}>
        {data.map((d, i) => {
          const height = (d.hours / maxH) * 80;
          const isGood = d.hours >= 4;
          return (
            <View key={i} style={miniStyles.barWrapper}>
              <View
                style={[
                  miniStyles.bar,
                  {
                    height,
                    width: barWidth,
                    backgroundColor: isGood ? BLUE : '#e2e8f0',
                    borderRadius: 4,
                  },
                ]}
              />
              <Text style={miniStyles.barLabel}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={miniStyles.targetLine}>
        <View style={miniStyles.targetDash} />
        <Text style={miniStyles.targetText}>4h min</Text>
      </View>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: { marginTop: 8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, paddingBottom: 20 },
  barWrapper: { alignItems: 'center' },
  bar: { marginBottom: 6 },
  barLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  targetLine: { position: 'absolute', top: 100 - (4 / 8) * 80 - 20, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  targetDash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#cbd5e1' },
  targetText: { fontSize: 9, color: '#94a3b8', marginLeft: 4 },
});

// ============================================
// DONNEES MOCK
// ============================================

const MOCK_SCORE = 78;
const MOCK_LAST_NIGHT = { hours: 6.5, ahi: 3.2, leaks: 12.4, compliant: true };
const MOCK_WEEK = [
  { day: 'Lun', hours: 7.1 },
  { day: 'Mar', hours: 5.3 },
  { day: 'Mer', hours: 6.8 },
  { day: 'Jeu', hours: 3.2 },
  { day: 'Ven', hours: 7.5 },
  { day: 'Sam', hours: 6.1 },
  { day: 'Dim', hours: 6.5 },
];
const MOCK_BADGE = { name: '7 nuits consecutives', icon: 'flame-outline' as const };
const MOTIVATIONAL_MESSAGES = [
  'Chaque nuit compte. Vous etes sur la bonne voie !',
  'Bravo pour votre regularite, continuez ainsi !',
  'Votre sommeil s ameliore, gardez le cap !',
  'Une bonne nuit de plus, votre corps vous remercie.',
];

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function DashboardPatient() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const motivMessage = MOTIVATIONAL_MESSAGES[new Date().getDay() % MOTIVATIONAL_MESSAGES.length];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.patientName}>Marie Dupont</Text>
          </View>
          <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/alerts')}>
            <Ionicons name="notifications-outline" size={22} color="#1e293b" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* Message motivationnel */}
        <View style={styles.motivCard}>
          <Ionicons name="sunny-outline" size={20} color={VIOLET} />
          <Text style={styles.motivText}>{motivMessage}</Text>
        </View>

        {/* Score global */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score global</Text>
          <View style={styles.scoreContainer}>
            <AnimatedScoreCircle score={MOCK_SCORE} />
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>
                {MOCK_SCORE >= 85 ? 'Excellent !' : MOCK_SCORE >= 70 ? 'Tres bien !' : MOCK_SCORE >= 50 ? 'Bien' : 'A ameliorer'}
              </Text>
              <Text style={styles.scoreSubtext}>Basé sur vos 30 dernieres nuits</Text>
            </View>
          </View>
        </View>

        {/* Resume derniere nuit */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Derniere nuit</Text>
            <View style={[styles.complianceBadge, { backgroundColor: MOCK_LAST_NIGHT.compliant ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.complianceBadgeText, { color: MOCK_LAST_NIGHT.compliant ? '#16a34a' : '#dc2626' }]}>
                {MOCK_LAST_NIGHT.compliant ? 'Conforme' : 'Non conforme'}
              </Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={20} color={BLUE} />
              <Text style={styles.metricValue}>{MOCK_LAST_NIGHT.hours}h</Text>
              <Text style={styles.metricLabel}>Duree</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="pulse-outline" size={20} color={VIOLET} />
              <Text style={styles.metricValue}>{MOCK_LAST_NIGHT.ahi}</Text>
              <Text style={styles.metricLabel}>IAH</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="water-outline" size={20} color="#06b6d4" />
              <Text style={styles.metricValue}>{MOCK_LAST_NIGHT.leaks}</Text>
              <Text style={styles.metricLabel}>Fuites L/min</Text>
            </View>
          </View>
        </View>

        {/* Graphique 7 jours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>7 derniers jours</Text>
          <MiniBarChart data={MOCK_WEEK} />
        </View>

        {/* Badge recent */}
        <View style={styles.badgeCard}>
          <View style={styles.badgeIconCircle}>
            <Ionicons name={MOCK_BADGE.icon} size={24} color="#ffffff" />
          </View>
          <View style={styles.badgeInfo}>
            <Text style={styles.badgeTitle}>Badge debloque !</Text>
            <Text style={styles.badgeName}>{MOCK_BADGE.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </View>

        {/* Bouton probleme */}
        <TouchableOpacity style={styles.problemButton} onPress={() => router.push('/(tabs)/aide')}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#ffffff" />
          <Text style={styles.problemButtonText}>J'ai un probleme</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Derniere synchronisation : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '400',
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
    marginBottom: 20,
  },
  greeting: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '400',
  },
  patientName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  motivCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  motivText: {
    flex: 1,
    fontSize: 13,
    color: '#6d28d9',
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  scoreSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '400',
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  complianceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: VIOLET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: VIOLET,
    marginBottom: 2,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  problemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 8,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  problemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '400',
  },
});
