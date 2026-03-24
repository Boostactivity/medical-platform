import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

/**
 * Fiche Patient rapide
 * Resume, machine, alertes actives, historique interventions,
 * actions (appeler, message), notes technicien
 */

// ============================================
// TYPES
// ============================================

type PatientDetail = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  city: string;
  prescriber: string;
  startDate: string;
  score: number;
  observance28: number;
  avgAHI: number;
  avgHours: number;
  lastTransmission: string;
  machine: {
    model: string;
    serial: string;
    installDate: string;
    pressure: string;
    mask: string;
    hours: number;
  };
  alerts: {
    id: string;
    type: string;
    message: string;
    priority: 'critical' | 'high' | 'medium';
    date: string;
  }[];
  interventions: {
    id: string;
    date: string;
    type: string;
    technician: string;
    notes: string;
  }[];
  techNotes: string;
};

// ============================================
// MOCK DATA
// ============================================

const mockPatient: PatientDetail = {
  id: '3',
  name: 'M. Bernard Paul',
  age: 71,
  phone: '06 23 45 67 89',
  email: 'paul.bernard@email.fr',
  address: '8 rue des Lilas',
  city: '92100 Boulogne-Billancourt',
  prescriber: 'Dr. Leblanc - Pneumologue',
  startDate: '15/09/2024',
  score: 42,
  observance28: 45,
  avgAHI: 12.3,
  avgHours: 3.8,
  lastTransmission: 'Il y a 3 jours',
  machine: {
    model: 'ResMed AirSense 10 AutoSet',
    serial: 'RS10-2024-78542',
    installDate: '15/09/2024',
    pressure: '8-16 cmH2O (Auto)',
    mask: 'ResMed AirFit F20 - Taille M',
    hours: 1240,
  },
  alerts: [
    {
      id: '1',
      type: 'IAH eleve',
      message: 'IAH moyen 12.3 sur 7 jours - Reglage a verifier',
      priority: 'critical',
      date: 'Il y a 4h',
    },
    {
      id: '2',
      type: 'Observance faible',
      message: 'Utilisation < 4h sur 5/7 derniers jours',
      priority: 'high',
      date: 'Il y a 1j',
    },
    {
      id: '3',
      type: 'Fuite intermittente',
      message: 'Fuites > 30L/min 2 nuits sur 7',
      priority: 'medium',
      date: 'Il y a 2j',
    },
  ],
  interventions: [
    {
      id: '1',
      date: '10/03/2025',
      type: 'Visite de suivi M6',
      technician: 'Dr. Martin',
      notes: 'Patient motive mais difficulte adaptation masque. Ajustement sangle.',
    },
    {
      id: '2',
      date: '15/12/2024',
      type: 'Changement masque',
      technician: 'Dr. Martin',
      notes: 'Passage masque nasal -> facial F20. Fuites reduites.',
    },
    {
      id: '3',
      date: '15/09/2024',
      type: 'Installation PPC',
      technician: 'Dr. Durand',
      notes: 'Installation initiale. Formation patient et epouse. Pression initiale 8 cmH2O.',
    },
  ],
  techNotes:
    'Patient age, vit seul. Motivation variable. Epouse aide au quotidien mais absente la semaine. Prefere les appels le matin.',
};

// ============================================
// COMPOSANTS
// ============================================

function StatCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patient = mockPatient; // TODO: fetch by id

  const [notesModal, setNotesModal] = useState(false);
  const [notes, setNotes] = useState(patient.techNotes);

  const scoreColor =
    patient.score >= 70 ? '#10b981' : patient.score >= 50 ? '#f59e0b' : '#ef4444';

  const priorityColors = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fiche patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient identity */}
        <View style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>{patient.score}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientDetail}>{patient.age} ans</Text>
              <Text style={styles.patientDetail}>{patient.prescriber}</Text>
              <Text style={styles.patientDetail}>
                Debut traitement : {patient.startDate}
              </Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => Linking.openURL(`tel:${patient.phone.replace(/\s/g, '')}`)}
            >
              <Ionicons name="call" size={18} color="#3b82f6" />
              <Text style={styles.quickActionText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => Linking.openURL(`sms:${patient.phone.replace(/\s/g, '')}`)}
            >
              <Ionicons name="chatbubble" size={18} color="#8b5cf6" />
              <Text style={[styles.quickActionText, { color: '#8b5cf6' }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => {
                const address = encodeURIComponent(`${patient.address}, ${patient.city}`);
                Linking.openURL(`https://maps.google.com/?q=${address}`);
              }}
            >
              <Ionicons name="navigate" size={18} color="#10b981" />
              <Text style={[styles.quickActionText, { color: '#10b981' }]}>GPS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Indicateurs 28 jours</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Observance"
            value={`${patient.observance28}`}
            unit="%"
            color={patient.observance28 >= 70 ? '#10b981' : '#ef4444'}
            icon="moon"
          />
          <StatCard label="IAH moyen" value={`${patient.avgAHI}`} color="#8b5cf6" icon="pulse" />
          <StatCard
            label="Duree moy."
            value={`${patient.avgHours}`}
            unit="h"
            color="#3b82f6"
            icon="time"
          />
          <StatCard
            label="Transmission"
            value={patient.lastTransmission.replace('Il y a ', '')}
            color="#f59e0b"
            icon="cloud-upload"
          />
        </View>

        {/* Machine */}
        <Text style={styles.sectionTitle}>Machine</Text>
        <View style={styles.machineCard}>
          <View style={styles.machineHeader}>
            <Ionicons name="hardware-chip" size={20} color="#8b5cf6" />
            <Text style={styles.machineModel}>{patient.machine.model}</Text>
          </View>
          <View style={styles.machineDetails}>
            <View style={styles.machineRow}>
              <Text style={styles.machineLabel}>N/S</Text>
              <Text style={styles.machineValue}>{patient.machine.serial}</Text>
            </View>
            <View style={styles.machineRow}>
              <Text style={styles.machineLabel}>Installation</Text>
              <Text style={styles.machineValue}>{patient.machine.installDate}</Text>
            </View>
            <View style={styles.machineRow}>
              <Text style={styles.machineLabel}>Pression</Text>
              <Text style={styles.machineValue}>{patient.machine.pressure}</Text>
            </View>
            <View style={styles.machineRow}>
              <Text style={styles.machineLabel}>Masque</Text>
              <Text style={styles.machineValue}>{patient.machine.mask}</Text>
            </View>
            <View style={styles.machineRow}>
              <Text style={styles.machineLabel}>Heures</Text>
              <Text style={styles.machineValue}>{patient.machine.hours}h</Text>
            </View>
          </View>
        </View>

        {/* Alertes actives */}
        <Text style={styles.sectionTitle}>Alertes actives ({patient.alerts.length})</Text>
        {patient.alerts.map((alert) => (
          <View
            key={alert.id}
            style={[styles.alertItem, { borderLeftColor: priorityColors[alert.priority] }]}
          >
            <View style={styles.alertItemHeader}>
              <Text style={[styles.alertType, { color: priorityColors[alert.priority] }]}>
                {alert.type}
              </Text>
              <Text style={styles.alertDate}>{alert.date}</Text>
            </View>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
        ))}

        {/* Historique interventions */}
        <Text style={styles.sectionTitle}>
          Historique interventions ({patient.interventions.length})
        </Text>
        {patient.interventions.map((intervention) => (
          <View key={intervention.id} style={styles.interventionItem}>
            <View style={styles.interventionHeader}>
              <Text style={styles.interventionDate}>{intervention.date}</Text>
              <Text style={styles.interventionType}>{intervention.type}</Text>
            </View>
            <Text style={styles.interventionTech}>Par {intervention.technician}</Text>
            <Text style={styles.interventionNotes}>{intervention.notes}</Text>
          </View>
        ))}

        {/* Notes technicien */}
        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Text style={styles.sectionTitle}>Notes technicien</Text>
            <TouchableOpacity onPress={() => setNotesModal(true)}>
              <Ionicons name="create-outline" size={20} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
          <View style={styles.notesCard}>
            <Text style={styles.notesContent}>{notes}</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Notes Modal */}
      <Modal
        visible={notesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notes technicien</Text>
              <TouchableOpacity onPress={() => setNotesModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              placeholder="Notes sur le patient..."
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setNotesModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Identity card
  identityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
  },
  identityInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47.5%' as any,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 6,
  },
  statUnit: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: -4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Machine
  machineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  machineModel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  machineDetails: {
    gap: 8,
  },
  machineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  machineLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  machineValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Alerts
  alertItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  alertItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  // Interventions
  interventionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  interventionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  interventionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  interventionType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  interventionTech: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  interventionNotes: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  // Notes
  notesSection: {
    marginTop: 12,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  notesContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 48,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
