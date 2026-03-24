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
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// DONNEES MOCK
// ============================================

const MOCK_NIGHT = {
  date: '23 mars 2026',
  startTime: '22:45',
  endTime: '06:30',
  totalDuration: 7.75, // heures totales au lit
  wearDuration: 6.5,   // heures avec masque
  score: 82,
  events: [
    { time: '22:45', type: 'start', label: 'Masque mis' },
    { time: '01:15', type: 'leak', label: 'Fuite detectee (22 L/min)' },
    { time: '02:30', type: 'remove', label: 'Masque retire (12 min)' },
    { time: '02:42', type: 'start', label: 'Masque remis' },
    { time: '04:10', type: 'alarm', label: 'Apnee detectee (IAH 8.2)' },
    { time: '06:30', type: 'end', label: 'Masque retire - reveil' },
  ],
};

const SMILEY_OPTIONS = [
  { emoji: 'sad-outline', label: 'Mauvaise', color: '#ef4444' },
  { emoji: 'sad-outline', label: 'Moyenne', color: '#f97316' },
  { emoji: 'happy-outline', label: 'Correcte', color: '#eab308' },
  { emoji: 'happy-outline', label: 'Bonne', color: '#22c55e' },
  { emoji: 'happy-outline', label: 'Excellente', color: '#3b82f6' },
] as const;

// ============================================
// TIMELINE COMPONENT
// ============================================

function NightTimeline({ events }: { events: typeof MOCK_NIGHT.events }) {
  return (
    <View style={tlStyles.container}>
      {/* Axe horaire */}
      <View style={tlStyles.axisRow}>
        {['21h', '23h', '1h', '3h', '5h', '7h', '9h'].map((h, i) => (
          <Text key={i} style={tlStyles.axisLabel}>{h}</Text>
        ))}
      </View>

      {/* Barre de fond */}
      <View style={tlStyles.trackContainer}>
        <View style={tlStyles.track} />
        {/* Zone de port (simulee: 22h45 a 06h30 = ~65% de 21h-9h) */}
        <View style={[tlStyles.wearZone, { left: '14.5%', width: '64.5%' }]} />
        {/* Zone sans masque */}
        <View style={[tlStyles.noWearZone, { left: '37.5%', width: '1.7%' }]} />
      </View>

      {/* Evenements */}
      <View style={tlStyles.eventsContainer}>
        {events.map((event, i) => (
          <View key={i} style={tlStyles.eventRow}>
            <View style={[tlStyles.eventDot, { backgroundColor: getEventColor(event.type) }]} />
            <View style={tlStyles.eventLine} />
            <View style={tlStyles.eventContent}>
              <Text style={tlStyles.eventTime}>{event.time}</Text>
              <Text style={tlStyles.eventLabel}>{event.label}</Text>
            </View>
            <Ionicons
              name={getEventIcon(event.type)}
              size={16}
              color={getEventColor(event.type)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function getEventColor(type: string): string {
  switch (type) {
    case 'start': return '#22c55e';
    case 'end': return '#64748b';
    case 'leak': return '#f97316';
    case 'remove': return '#ef4444';
    case 'alarm': return '#ef4444';
    default: return '#94a3b8';
  }
}

function getEventIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'start': return 'play-circle-outline';
    case 'end': return 'stop-circle-outline';
    case 'leak': return 'water-outline';
    case 'remove': return 'close-circle-outline';
    case 'alarm': return 'alert-circle-outline';
    default: return 'ellipse-outline';
  }
}

const tlStyles = StyleSheet.create({
  container: { marginTop: 8 },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  axisLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  trackContainer: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  track: { position: 'absolute', inset: 0 },
  wearZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: BLUE + '40',
    borderRadius: 6,
  },
  noWearZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#ef444440',
    borderRadius: 2,
  },
  eventsContainer: { gap: 0 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventLine: {
    width: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  eventLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    marginTop: 1,
  },
});

// ============================================
// ECRAN MA NUIT
// ============================================

export default function MaNuitPage() {
  const [selectedSmiley, setSelectedSmiley] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  const nightScoreColor = MOCK_NIGHT.score >= 80 ? '#22c55e' : MOCK_NIGHT.score >= 60 ? '#eab308' : '#ef4444';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ma Nuit</Text>
          <Text style={styles.dateText}>{MOCK_NIGHT.date}</Text>
        </View>

        {/* Score de la nuit */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.nightScoreRow}>
            <View>
              <Text style={styles.cardTitle}>Score de la nuit</Text>
              <Text style={styles.nightScoreSubtext}>
                {MOCK_NIGHT.score >= 80 ? 'Excellente nuit !' : MOCK_NIGHT.score >= 60 ? 'Nuit correcte' : 'Nuit a ameliorer'}
              </Text>
            </View>
            <View style={[styles.nightScoreCircle, { borderColor: nightScoreColor }]}>
              <Text style={[styles.nightScoreValue, { color: nightScoreColor }]}>{MOCK_NIGHT.score}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Durees */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Durees</Text>
          <View style={styles.durationsRow}>
            <View style={styles.durationItem}>
              <Ionicons name="bed-outline" size={22} color={VIOLET} />
              <Text style={styles.durationValue}>{MOCK_NIGHT.totalDuration}h</Text>
              <Text style={styles.durationLabel}>Au lit</Text>
            </View>
            <View style={styles.durationDivider} />
            <View style={styles.durationItem}>
              <Ionicons name="shield-checkmark-outline" size={22} color={BLUE} />
              <Text style={styles.durationValue}>{MOCK_NIGHT.wearDuration}h</Text>
              <Text style={styles.durationLabel}>Port masque</Text>
            </View>
            <View style={styles.durationDivider} />
            <View style={styles.durationItem}>
              <Ionicons name="analytics-outline" size={22} color="#06b6d4" />
              <Text style={styles.durationValue}>{((MOCK_NIGHT.wearDuration / MOCK_NIGHT.totalDuration) * 100).toFixed(0)}%</Text>
              <Text style={styles.durationLabel}>Couverture</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline 21h - 9h</Text>
          <NightTimeline events={MOCK_NIGHT.events} />
        </View>

        {/* Legende */}
        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: BLUE + '40' }]} />
            <Text style={styles.legendText}>Port du masque</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#ef444440' }]} />
            <Text style={styles.legendText}>Sans masque</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Fuite</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Alarme / Apnee</Text>
          </View>
        </View>

        {/* Auto-evaluation matin */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comment vous sentez-vous ce matin ?</Text>
          <View style={styles.smileyRow}>
            {SMILEY_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.smileyButton,
                  selectedSmiley === i && { backgroundColor: opt.color + '15', borderColor: opt.color },
                ]}
                onPress={() => setSelectedSmiley(i)}
              >
                <Ionicons
                  name={opt.emoji as keyof typeof Ionicons.glyphMap}
                  size={28}
                  color={selectedSmiley === i ? opt.color : '#cbd5e1'}
                />
                <Text
                  style={[
                    styles.smileyLabel,
                    selectedSmiley === i && { color: opt.color },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedSmiley !== null && (
            <TouchableOpacity style={styles.submitEvalButton}>
              <Text style={styles.submitEvalText}>Enregistrer</Text>
            </TouchableOpacity>
          )}
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
  dateText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 4,
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
  nightScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nightScoreSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 4,
  },
  nightScoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  nightScoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  durationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  durationValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  durationLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  durationDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#f1f5f9',
  },
  legendCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  smileyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  smileyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  smileyLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  submitEvalButton: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitEvalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
