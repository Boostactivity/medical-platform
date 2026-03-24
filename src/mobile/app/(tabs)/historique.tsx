import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// DONNEES MOCK
// ============================================

const MOCK_DATA_7J = [
  { day: 'Lun', hours: 7.1, ahi: 3.2, leaks: 11.5 },
  { day: 'Mar', hours: 5.3, ahi: 4.1, leaks: 15.2 },
  { day: 'Mer', hours: 6.8, ahi: 2.8, leaks: 9.3 },
  { day: 'Jeu', hours: 3.2, ahi: 5.6, leaks: 22.1 },
  { day: 'Ven', hours: 7.5, ahi: 2.1, leaks: 8.7 },
  { day: 'Sam', hours: 6.1, ahi: 3.9, leaks: 13.4 },
  { day: 'Dim', hours: 6.5, ahi: 3.0, leaks: 10.2 },
];

const MOCK_BADGES = [
  { id: '1', name: '1ere nuit', icon: 'star-outline', unlocked: true, date: '15 Jan' },
  { id: '2', name: '7 jours', icon: 'flame-outline', unlocked: true, date: '22 Jan' },
  { id: '3', name: '30 jours', icon: 'trophy-outline', unlocked: true, date: '15 Fev' },
  { id: '4', name: 'Score 90+', icon: 'ribbon-outline', unlocked: true, date: '02 Mar' },
  { id: '5', name: '90 jours', icon: 'medal-outline', unlocked: false, date: null },
  { id: '6', name: '100% semaine', icon: 'shield-checkmark-outline', unlocked: false, date: null },
  { id: '7', name: 'IAH < 2', icon: 'heart-outline', unlocked: false, date: null },
  { id: '8', name: '365 jours', icon: 'diamond-outline', unlocked: false, date: null },
];

const MOCK_CUMUL = {
  totalHours: 485,
  consecutiveDays: 12,
  bestStreak: 23,
  totalNights: 68,
  avgScore: 76,
};

// ============================================
// BAR CHART COMPONENT
// ============================================

function BarChart({
  data,
  valueKey,
  color,
  unit,
  target,
}: {
  data: any[];
  valueKey: string;
  color: string;
  unit: string;
  target?: number;
}) {
  const maxVal = Math.max(...data.map((d: any) => d[valueKey]), target || 0);
  const barWidth = Math.min(32, (SCREEN_WIDTH - 100) / data.length - 8);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((d: any, i: number) => {
          const val = d[valueKey];
          const height = (val / maxVal) * 100;
          const isGood = target ? val >= target : true;
          return (
            <View key={i} style={chartStyles.barCol}>
              <Text style={chartStyles.barValue}>{val.toFixed(1)}</Text>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height,
                    width: barWidth,
                    backgroundColor: isGood ? color : color + '40',
                    borderRadius: 5,
                  },
                ]}
              />
              <Text style={chartStyles.barLabel}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      {target && (
        <View style={[chartStyles.targetLine, { bottom: (target / maxVal) * 100 + 30 }]}>
          <View style={chartStyles.targetDash} />
          <Text style={chartStyles.targetText}>{target}{unit}</Text>
        </View>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { marginTop: 8, position: 'relative' },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingBottom: 24,
  },
  barCol: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },
  bar: { marginBottom: 4 },
  barLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetDash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#cbd5e1' },
  targetText: { fontSize: 9, color: '#94a3b8', marginLeft: 4 },
});

// ============================================
// FLEUR QUI POUSSE (Observance)
// ============================================

function GrowingFlower({ consecutiveDays }: { consecutiveDays: number }) {
  const stage = consecutiveDays >= 30 ? 4 : consecutiveDays >= 14 ? 3 : consecutiveDays >= 7 ? 2 : consecutiveDays >= 3 ? 1 : 0;
  const stageLabels = ['Graine', 'Pousse', 'Bourgeon', 'Fleur', 'Pleine floraison'];
  const stageIcons: (keyof typeof Ionicons.glyphMap)[] = ['ellipse', 'leaf-outline', 'rose-outline', 'flower-outline', 'flower'];
  const stageColors = ['#94a3b8', '#22c55e', '#eab308', VIOLET, BLUE];

  return (
    <View style={flowerStyles.container}>
      <View style={[flowerStyles.circle, { borderColor: stageColors[stage] }]}>
        <Ionicons name={stageIcons[stage]} size={40} color={stageColors[stage]} />
      </View>
      <Text style={[flowerStyles.label, { color: stageColors[stage] }]}>{stageLabels[stage]}</Text>
      <Text style={flowerStyles.subtitle}>{consecutiveDays} jours consecutifs</Text>
      <View style={flowerStyles.progressBar}>
        {[3, 7, 14, 30].map((milestone, i) => (
          <View key={i} style={flowerStyles.milestoneRow}>
            <View
              style={[
                flowerStyles.milestoneDot,
                {
                  backgroundColor: consecutiveDays >= milestone ? stageColors[i + 1] : '#e2e8f0',
                },
              ]}
            />
            <Text style={flowerStyles.milestoneText}>{milestone}j</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const flowerStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '400', marginBottom: 16 },
  progressBar: { flexDirection: 'row', gap: 24 },
  milestoneRow: { alignItems: 'center', gap: 4 },
  milestoneDot: { width: 10, height: 10, borderRadius: 5 },
  milestoneText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
});

// ============================================
// ECRAN PROGRES
// ============================================

export default function HistoriquePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7j' | '30j' | '90j'>('7j');
  const [selectedMetric, setSelectedMetric] = useState<'usage' | 'ahi' | 'leaks'>('usage');

  const periods = [
    { key: '7j' as const, label: '7 jours' },
    { key: '30j' as const, label: '30 jours' },
    { key: '90j' as const, label: '90 jours' },
  ];

  const metrics = [
    { key: 'usage' as const, label: 'Usage', valueKey: 'hours', color: BLUE, unit: 'h', target: 4 },
    { key: 'ahi' as const, label: 'IAH', valueKey: 'ahi', color: VIOLET, unit: '', target: undefined },
    { key: 'leaks' as const, label: 'Fuites', valueKey: 'leaks', color: '#06b6d4', unit: ' L/min', target: undefined },
  ];

  const currentMetric = metrics.find((m) => m.key === selectedMetric)!;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progres</Text>
        </View>

        {/* Selecteur periode */}
        <View style={styles.periodRow}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, selectedPeriod === p.key && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(p.key)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === p.key && styles.periodButtonTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selecteur metrique */}
        <View style={styles.metricRow}>
          {metrics.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricChip, selectedMetric === m.key && { backgroundColor: m.color + '15', borderColor: m.color }]}
              onPress={() => setSelectedMetric(m.key)}
            >
              <Text style={[styles.metricChipText, selectedMetric === m.key && { color: m.color }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Graphique */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {currentMetric.label} - {selectedPeriod}
          </Text>
          <BarChart
            data={MOCK_DATA_7J}
            valueKey={currentMetric.valueKey}
            color={currentMetric.color}
            unit={currentMetric.unit}
            target={currentMetric.target}
          />
        </View>

        {/* Stats cumulees */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiques cumulees</Text>
          <View style={styles.cumulGrid}>
            <View style={styles.cumulItem}>
              <Text style={styles.cumulValue}>{MOCK_CUMUL.totalHours}h</Text>
              <Text style={styles.cumulLabel}>Heures totales</Text>
            </View>
            <View style={styles.cumulItem}>
              <Text style={styles.cumulValue}>{MOCK_CUMUL.totalNights}</Text>
              <Text style={styles.cumulLabel}>Nuits enregistrees</Text>
            </View>
            <View style={styles.cumulItem}>
              <Text style={[styles.cumulValue, { color: BLUE }]}>{MOCK_CUMUL.consecutiveDays}</Text>
              <Text style={styles.cumulLabel}>Jours consecutifs</Text>
            </View>
            <View style={styles.cumulItem}>
              <Text style={[styles.cumulValue, { color: VIOLET }]}>{MOCK_CUMUL.bestStreak}</Text>
              <Text style={styles.cumulLabel}>Meilleure serie</Text>
            </View>
          </View>
        </View>

        {/* Fleur qui pousse */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ma fleur d'observance</Text>
          <GrowingFlower consecutiveDays={MOCK_CUMUL.consecutiveDays} />
        </View>

        {/* Badges */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges obtenus</Text>
          <View style={styles.badgesGrid}>
            {MOCK_BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badgeItem, !badge.unlocked && styles.badgeItemLocked]}
              >
                <View
                  style={[
                    styles.badgeCircle,
                    { backgroundColor: badge.unlocked ? VIOLET : '#e2e8f0' },
                  ]}
                >
                  <Ionicons
                    name={badge.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={badge.unlocked ? '#ffffff' : '#cbd5e1'}
                  />
                </View>
                <Text
                  style={[
                    styles.badgeName,
                    !badge.unlocked && { color: '#cbd5e1' },
                  ]}
                >
                  {badge.name}
                </Text>
                {badge.date && (
                  <Text style={styles.badgeDate}>{badge.date}</Text>
                )}
                {!badge.unlocked && (
                  <Ionicons name="lock-closed-outline" size={10} color="#cbd5e1" />
                )}
              </View>
            ))}
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodButtonActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  metricChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  cumulGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cumulItem: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cumulValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  cumulLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  badgeDate: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '400',
  },
});
