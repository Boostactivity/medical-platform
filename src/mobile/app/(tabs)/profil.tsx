import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// DONNEES MOCK
// ============================================

const MOCK_PATIENT = {
  name: 'Marie Dupont',
  email: 'marie.dupont@email.com',
  phone: '06 12 34 56 78',
  initials: 'MD',
};

const MOCK_DOCTOR = {
  name: 'Dr. Laurent Martin',
  specialty: 'Pneumologue',
  rpps: '10100000001',
};

const MOCK_PROVIDER = {
  name: 'Oxynov Sante',
  phone: '01 23 45 67 89',
};

const MOCK_DEVICE = {
  machine: 'ResMed AirSense 11',
  mask: 'AirFit F20 - Taille M',
  installDate: '15 janvier 2026',
  serialNumber: 'RS11-2026-XXXXX',
};

const MOCK_MILESTONES = [
  { label: 'J7', date: '22 Jan 2026', reached: true, icon: 'checkmark-circle' as const },
  { label: 'J30', date: '15 Fev 2026', reached: true, icon: 'checkmark-circle' as const },
  { label: 'J90', date: null, reached: false, icon: 'time-outline' as const, target: '15 Avr 2026' },
];

// ============================================
// ECRAN PROFIL
// ============================================

export default function ProfilPage() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [language, setLanguage] = useState('Francais');

  function handleLogout() {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnexion',
          style: 'destructive',
          onPress: () => router.replace('/auth/login'),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{MOCK_PATIENT.initials}</Text>
          </View>
          <Text style={styles.userName}>{MOCK_PATIENT.name}</Text>
          <Text style={styles.userEmail}>{MOCK_PATIENT.email}</Text>
        </View>

        {/* Infos patient */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person-outline" size={18} color={BLUE} />
            <Text style={styles.cardTitle}>Informations patient</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom</Text>
            <Text style={styles.infoValue}>{MOCK_PATIENT.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{MOCK_PATIENT.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telephone</Text>
            <Text style={styles.infoValue}>{MOCK_PATIENT.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Medecin</Text>
            <Text style={styles.infoValue}>{MOCK_DOCTOR.name}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Prestataire</Text>
            <Text style={styles.infoValue}>{MOCK_PROVIDER.name}</Text>
          </View>
        </View>

        {/* Mon materiel */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={VIOLET} />
            <Text style={styles.cardTitle}>Mon materiel</Text>
          </View>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="fitness-outline" size={20} color={BLUE} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Machine PPC</Text>
              <Text style={styles.deviceValue}>{MOCK_DEVICE.machine}</Text>
            </View>
          </View>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="glasses-outline" size={20} color={VIOLET} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Masque</Text>
              <Text style={styles.deviceValue}>{MOCK_DEVICE.mask}</Text>
            </View>
          </View>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#06b6d4" />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Date d'installation</Text>
              <Text style={styles.deviceValue}>{MOCK_DEVICE.installDate}</Text>
            </View>
          </View>
          <View style={[styles.deviceRow, { borderBottomWidth: 0 }]}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="barcode-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Numero de serie</Text>
              <Text style={styles.deviceValue}>{MOCK_DEVICE.serialNumber}</Text>
            </View>
          </View>
        </View>

        {/* Mes jalons */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flag-outline" size={18} color={BLUE} />
            <Text style={styles.cardTitle}>Mes jalons</Text>
          </View>
          <View style={styles.milestonesRow}>
            {MOCK_MILESTONES.map((ms, i) => (
              <View key={i} style={styles.milestoneItem}>
                <View
                  style={[
                    styles.milestoneCircle,
                    { backgroundColor: ms.reached ? BLUE : '#f1f5f9', borderColor: ms.reached ? BLUE : '#e2e8f0' },
                  ]}
                >
                  <Ionicons
                    name={ms.icon}
                    size={20}
                    color={ms.reached ? '#ffffff' : '#cbd5e1'}
                  />
                </View>
                <Text style={[styles.milestoneLabel, ms.reached && { color: BLUE, fontWeight: '700' }]}>
                  {ms.label}
                </Text>
                <Text style={styles.milestoneDate}>
                  {ms.reached ? ms.date : ms.target}
                </Text>
                {!ms.reached && (
                  <View style={styles.milestonePending}>
                    <Text style={styles.milestonePendingText}>En cours</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          {/* Ligne de progression */}
          <View style={styles.progressLineContainer}>
            <View style={styles.progressLineBg} />
            <View style={[styles.progressLineFill, { width: '66%' }]} />
          </View>
        </View>

        {/* Parametres */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="settings-outline" size={18} color="#64748b" />
            <Text style={styles.cardTitle}>Parametres</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={18} color={BLUE} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e2e8f0', true: BLUE + '40' }}
              thumbColor={notificationsEnabled ? BLUE : '#f4f4f5'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={18} color={VIOLET} />
              <Text style={styles.settingLabel}>Langue</Text>
            </View>
            <TouchableOpacity style={styles.settingValueButton}>
              <Text style={styles.settingValueText}>{language}</Text>
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={18} color="#64748b" />
              <Text style={styles.settingLabel}>Mode sombre</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#e2e8f0', true: VIOLET + '40' }}
              thumbColor={darkModeEnabled ? VIOLET : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Deconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Deconnexion</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MedConnect v1.0.0</Text>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 14,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  deviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
  },
  deviceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  milestoneItem: {
    alignItems: 'center',
    gap: 6,
  },
  milestoneCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  milestoneDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '400',
  },
  milestonePending: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  milestonePendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ca8a04',
  },
  progressLineContainer: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  progressLineFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: BLUE,
    borderRadius: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  settingValueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '400',
  },
});
