import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * Ecran Scanner - Code-barre machine (expo-camera)
 * Affiche fiche machine, actions : signaler panne, programmer remplacement
 */

// ============================================
// TYPES
// ============================================

type MachineInfo = {
  serial: string;
  model: string;
  patientName: string;
  patientId: string;
  status: 'active' | 'maintenance' | 'defective';
  installDate: string;
  lastMaintenance: string;
  hours: number;
  firmware: string;
  pressure: string;
  history: {
    date: string;
    event: string;
  }[];
};

// ============================================
// MOCK DATA
// ============================================

const mockMachine: MachineInfo = {
  serial: 'RS10-2024-78542',
  model: 'ResMed AirSense 10 AutoSet',
  patientName: 'M. Bernard Paul',
  patientId: '3',
  status: 'active',
  installDate: '15/09/2024',
  lastMaintenance: '10/01/2025',
  hours: 1240,
  firmware: 'v4.2.1',
  pressure: '8-16 cmH2O (Auto)',
  history: [
    { date: '10/01/2025', event: 'Maintenance preventive' },
    { date: '15/12/2024', event: 'Changement masque' },
    { date: '15/09/2024', event: 'Installation initiale' },
  ],
};

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function ScannerScreen() {
  const router = useRouter();
  const [scanned, setScanned] = useState(false);
  const [machine, setMachine] = useState<MachineInfo | null>(null);

  // Simule un scan
  const simulateScan = () => {
    setScanned(true);
    setMachine(mockMachine);
  };

  const resetScan = () => {
    setScanned(false);
    setMachine(null);
  };

  const handleReportDefect = () => {
    RNAlert.alert(
      'Signaler une panne',
      'Voulez-vous signaler cette machine comme defectueuse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          style: 'destructive',
          onPress: () => {
            RNAlert.alert('Panne signalee', 'L\'equipe logistique a ete notifiee.');
          },
        },
      ]
    );
  };

  const handleReplacement = () => {
    RNAlert.alert(
      'Programmer un remplacement',
      'Planifier le remplacement de cette machine ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Programmer',
          onPress: () => {
            RNAlert.alert('Remplacement programme', 'L\'intervention a ete ajoutee au planning.');
          },
        },
      ]
    );
  };

  const statusConfig = {
    active: { label: 'Active', color: '#10b981', bg: '#ecfdf5' },
    maintenance: { label: 'Maintenance', color: '#f59e0b', bg: '#fffbeb' },
    defective: { label: 'Defectueuse', color: '#ef4444', bg: '#fef2f2' },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner machine</Text>
        <View style={{ width: 40 }} />
      </View>

      {!scanned ? (
        /* Scanner view */
        <View style={styles.scannerContainer}>
          <View style={styles.cameraPlaceholder}>
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.topLeft]} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
            </View>
            <Ionicons name="scan-outline" size={64} color="#8b5cf6" style={{ opacity: 0.4 }} />
            <Text style={styles.scanText}>
              Placez le code-barre de la machine dans le cadre
            </Text>
            {/*
              TODO: Remplacer par CameraView d'expo-camera
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['code128', 'ean13', 'qr'] }}
              />
            */}
          </View>

          <TouchableOpacity
            style={styles.simulateButton}
            onPress={simulateScan}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={20} color="#ffffff" />
            <Text style={styles.simulateButtonText}>Simuler un scan</Text>
          </TouchableOpacity>

          <Text style={styles.hintText}>
            Vous pouvez aussi saisir manuellement le numero de serie
          </Text>
        </View>
      ) : machine ? (
        /* Machine info */
        <View style={styles.resultContainer}>
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.successText}>Machine identifiee</Text>
          </View>

          {/* Machine card */}
          <View style={styles.machineCard}>
            <View style={styles.machineHeader}>
              <Ionicons name="hardware-chip" size={24} color="#8b5cf6" />
              <View style={styles.machineHeaderInfo}>
                <Text style={styles.machineModel}>{machine.model}</Text>
                <Text style={styles.machineSerial}>S/N: {machine.serial}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig[machine.status].bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusConfig[machine.status].color },
                  ]}
                >
                  {statusConfig[machine.status].label}
                </Text>
              </View>
            </View>

            {/* Patient link */}
            <TouchableOpacity
              style={styles.patientLink}
              onPress={() => router.push(`/patient/${machine.patientId}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={16} color="#3b82f6" />
              <Text style={styles.patientLinkText}>{machine.patientName}</Text>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>

            {/* Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Installation</Text>
                <Text style={styles.detailValue}>{machine.installDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Derniere maintenance</Text>
                <Text style={styles.detailValue}>{machine.lastMaintenance}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Heures totales</Text>
                <Text style={styles.detailValue}>{machine.hours}h</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Firmware</Text>
                <Text style={styles.detailValue}>{machine.firmware}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pression</Text>
                <Text style={styles.detailValue}>{machine.pressure}</Text>
              </View>
            </View>

            {/* History */}
            <Text style={styles.historyTitle}>Historique</Text>
            {machine.history.map((entry, idx) => (
              <View key={idx} style={styles.historyItem}>
                <Text style={styles.historyDate}>{entry.date}</Text>
                <Text style={styles.historyEvent}>{entry.event}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReportDefect}
              activeOpacity={0.7}
            >
              <Ionicons name="warning-outline" size={20} color="#ef4444" />
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                Signaler panne
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.replaceButton]}
              onPress={handleReplacement}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#ffffff" />
              <Text style={[styles.actionButtonText, { color: '#ffffff' }]}>
                Remplacement
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.rescanButton} onPress={resetScan} activeOpacity={0.7}>
            <Ionicons name="scan-outline" size={18} color="#8b5cf6" />
            <Text style={styles.rescanText}>Scanner une autre machine</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  closeButton: {
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

  // Scanner
  scannerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraPlaceholder: {
    width: 280,
    height: 280,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  scanFrame: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
  },
  scanCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#8b5cf6',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 48,
    gap: 8,
  },
  simulateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  hintText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 16,
    textAlign: 'center',
  },

  // Result
  resultContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },

  // Machine card
  machineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  machineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  machineHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  machineModel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  machineSerial: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Patient link
  patientLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  patientLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    flex: 1,
  },

  // Details
  detailsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },

  // History
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  historyDate: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
    width: 80,
  },
  historyEvent: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  replaceButton: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Rescan
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  rescanText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6',
  },
});
