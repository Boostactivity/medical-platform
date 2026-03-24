import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert as RNAlert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

/**
 * Ecran Planning - Vue jour avec interventions chronologiques
 * Navigation GPS, statuts, notes post-intervention
 */

// ============================================
// TYPES
// ============================================

type InterventionStatus = 'todo' | 'en_route' | 'in_progress' | 'done';

type PlanningIntervention = {
  id: string;
  patientName: string;
  patientId: string;
  type: string;
  time: string;
  endTime: string;
  estimatedDuration: string;
  address: string;
  city: string;
  phone: string;
  status: InterventionStatus;
  notes?: string;
};

// ============================================
// MOCK DATA
// ============================================

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getWeekDates(): { day: string; date: number; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  return weekDays.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      day,
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

const initialInterventions: PlanningIntervention[] = [
  {
    id: '1',
    patientName: 'Mme Leroy Sophie',
    patientId: '4',
    type: 'Installation PPC',
    time: '09:00',
    endTime: '10:00',
    estimatedDuration: '1h00',
    address: '12 rue de la Paix',
    city: '75002 Paris',
    phone: '06 78 90 12 34',
    status: 'done',
    notes: 'Installation OK. Patiente bien formee. Masque nasal F20.',
  },
  {
    id: '2',
    patientName: 'M. Dupont Jean',
    patientId: '1',
    type: 'Visite de suivi J30',
    time: '10:30',
    endTime: '11:15',
    estimatedDuration: '45min',
    address: '45 avenue Victor Hugo',
    city: '75016 Paris',
    phone: '06 67 89 01 23',
    status: 'done',
  },
  {
    id: '3',
    patientName: 'M. Bernard Paul',
    patientId: '3',
    type: 'Reglage pression',
    time: '11:30',
    endTime: '12:15',
    estimatedDuration: '45min',
    address: '8 rue des Lilas',
    city: '92100 Boulogne',
    phone: '06 23 45 67 89',
    status: 'in_progress',
  },
  {
    id: '4',
    patientName: 'Mme Moreau Anne',
    patientId: '5',
    type: 'Changement masque',
    time: '14:00',
    endTime: '14:30',
    estimatedDuration: '30min',
    address: '8 boulevard Haussmann',
    city: '75009 Paris',
    phone: '06 56 78 90 12',
    status: 'todo',
  },
  {
    id: '5',
    patientName: 'M. Fournier Marc',
    patientId: '8',
    type: 'Entretien motivation',
    time: '15:00',
    endTime: '15:45',
    estimatedDuration: '45min',
    address: '15 avenue de Paris',
    city: '94300 Vincennes',
    phone: '06 45 67 89 01',
    status: 'todo',
  },
  {
    id: '6',
    patientName: 'M. Petit Luc',
    patientId: '6',
    type: 'Maintenance machine',
    time: '16:30',
    endTime: '17:15',
    estimatedDuration: '45min',
    address: '23 rue du Faubourg',
    city: '92200 Neuilly',
    phone: '06 12 34 56 78',
    status: 'todo',
  },
];

// ============================================
// COMPOSANTS
// ============================================

function WeekSelector({
  selectedDay,
  onSelect,
}: {
  selectedDay: number;
  onSelect: (idx: number) => void;
}) {
  const dates = getWeekDates();
  return (
    <View style={styles.weekRow}>
      {dates.map((d, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.dayCell,
            d.isToday && styles.dayCellToday,
            selectedDay === i && styles.dayCellSelected,
          ]}
          onPress={() => onSelect(i)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayLabel,
              (d.isToday || selectedDay === i) && styles.dayLabelActive,
            ]}
          >
            {d.day}
          </Text>
          <Text
            style={[
              styles.dayDate,
              (d.isToday || selectedDay === i) && styles.dayDateActive,
            ]}
          >
            {d.date}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function InterventionCard({
  intervention,
  onStatusChange,
  onOpenNotes,
}: {
  intervention: PlanningIntervention;
  onStatusChange: (id: string, status: InterventionStatus) => void;
  onOpenNotes: (id: string) => void;
}) {
  const statusConfig: Record<
    InterventionStatus,
    { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    todo: { label: 'A faire', color: '#3b82f6', bg: '#eff6ff', icon: 'ellipse-outline' },
    en_route: { label: 'En route', color: '#f59e0b', bg: '#fffbeb', icon: 'navigate-outline' },
    in_progress: { label: 'En cours', color: '#8b5cf6', bg: '#f5f3ff', icon: 'construct-outline' },
    done: { label: 'Termine', color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle' },
  };

  const s = statusConfig[intervention.status];

  const nextStatus: Record<InterventionStatus, InterventionStatus | null> = {
    todo: 'en_route',
    en_route: 'in_progress',
    in_progress: 'done',
    done: null,
  };

  const nextLabel: Record<InterventionStatus, string> = {
    todo: 'En route',
    en_route: 'Commencer',
    in_progress: 'Terminer',
    done: '',
  };

  const openMaps = () => {
    const address = encodeURIComponent(`${intervention.address}, ${intervention.city}`);
    const url = Platform.select({
      ios: `maps:?q=${address}`,
      android: `google.navigation:q=${address}`,
      default: `https://maps.google.com/?q=${address}`,
    });
    Linking.openURL(url as string);
  };

  return (
    <View
      style={[
        styles.interventionCard,
        intervention.status === 'done' && styles.interventionDone,
      ]}
    >
      {/* Time + status line */}
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{intervention.time}</Text>
        <View style={[styles.timeLine, { backgroundColor: s.color }]} />
        <Text style={styles.timeEndText}>{intervention.endTime}</Text>
      </View>

      {/* Content */}
      <View style={styles.interventionContent}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Ionicons name={s.icon} size={12} color={s.color} />
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>

        <Text style={styles.interventionPatient}>{intervention.patientName}</Text>
        <Text style={styles.interventionType}>{intervention.type}</Text>
        <Text style={styles.durationText}>
          <Ionicons name="time-outline" size={11} color="#94a3b8" /> {intervention.estimatedDuration}
        </Text>

        {/* Address */}
        <TouchableOpacity style={styles.addressRow} onPress={openMaps} activeOpacity={0.7}>
          <Ionicons name="navigate-outline" size={13} color="#3b82f6" />
          <Text style={styles.addressText}>
            {intervention.address}, {intervention.city}
          </Text>
        </TouchableOpacity>

        {/* Notes */}
        {intervention.notes && (
          <View style={styles.notesPreview}>
            <Ionicons name="document-text-outline" size={12} color="#94a3b8" />
            <Text style={styles.notesText} numberOfLines={1}>
              {intervention.notes}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => Linking.openURL(`tel:${intervention.phone.replace(/\s/g, '')}`)}
          >
            <Ionicons name="call-outline" size={16} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionBtn} onPress={openMaps}>
            <Ionicons name="map-outline" size={16} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionBtn} onPress={() => onOpenNotes(intervention.id)}>
            <Ionicons name="create-outline" size={16} color="#8b5cf6" />
          </TouchableOpacity>

          {nextStatus[intervention.status] && (
            <TouchableOpacity
              style={[styles.progressButton, { backgroundColor: s.color }]}
              onPress={() => {
                const next = nextStatus[intervention.status];
                if (next === 'done') {
                  onOpenNotes(intervention.id);
                } else if (next) {
                  onStatusChange(intervention.id, next);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.progressButtonText}>{nextLabel[intervention.status]}</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function PlanningScreen() {
  const dates = getWeekDates();
  const todayIdx = dates.findIndex((d) => d.isToday);
  const [selectedDay, setSelectedDay] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [interventions, setInterventions] = useState(initialInterventions);
  const [notesModal, setNotesModal] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  const doneCount = interventions.filter((i) => i.status === 'done').length;
  const totalCount = interventions.length;

  const handleStatusChange = (id: string, status: InterventionStatus) => {
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const openNotesModal = (id: string) => {
    const intervention = interventions.find((i) => i.id === id);
    setNotesText(intervention?.notes || '');
    setNotesModal(id);
  };

  const saveNotes = () => {
    if (notesModal) {
      setInterventions((prev) =>
        prev.map((i) =>
          i.id === notesModal ? { ...i, notes: notesText, status: 'done' as InterventionStatus } : i
        )
      );
      setNotesModal(null);
      setNotesText('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle}>
            {doneCount}/{totalCount} interventions terminees
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{Math.round((doneCount / totalCount) * 100)}%</Text>
        </View>
      </View>

      {/* Semainier */}
      <WeekSelector selectedDay={selectedDay} onSelect={setSelectedDay} />

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(doneCount / totalCount) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Liste interventions */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {interventions.map((intervention) => (
          <InterventionCard
            key={intervention.id}
            intervention={intervention}
            onStatusChange={handleStatusChange}
            onOpenNotes={openNotesModal}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Notes Modal */}
      <Modal
        visible={notesModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setNotesModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notes post-intervention</Text>
              <TouchableOpacity onPress={() => setNotesModal(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Decrivez l'intervention, les observations, les actions realisees..."
              placeholderTextColor="#94a3b8"
              value={notesText}
              onChangeText={setNotesText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveNotes} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>Terminer et sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b5cf6',
  },

  // Week selector
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 12,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  dayCellToday: {
    backgroundColor: '#f5f3ff',
  },
  dayCellSelected: {
    backgroundColor: '#8b5cf6',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 4,
  },
  dayLabelActive: {
    color: '#ffffff',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  dayDateActive: {
    color: '#ffffff',
  },

  // Progress bar
  progressBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Intervention card
  interventionCard: {
    flexDirection: 'row',
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
  interventionDone: {
    opacity: 0.7,
  },
  timeColumn: {
    alignItems: 'center',
    width: 48,
    marginRight: 14,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  timeLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    borderRadius: 1,
  },
  timeEndText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  interventionContent: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  interventionPatient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  interventionType: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  durationText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#3b82f6',
    flex: 1,
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },

  // Card actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 10,
    gap: 6,
  },
  progressButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    minHeight: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    height: 150,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
