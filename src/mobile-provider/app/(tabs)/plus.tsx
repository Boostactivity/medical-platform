import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * Ecran Plus - Menu secondaire
 * Stock, rapports CPAM, parametres, support, deconnexion
 */

// ============================================
// TYPES
// ============================================

type MenuItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  color: string;
  badge?: string;
  onPress?: () => void;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function PlusScreen() {
  const router = useRouter();

  const handleLogout = () => {
    RNAlert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: () => {
            // TODO: implement logout
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Outils',
      items: [
        {
          id: 'scanner',
          icon: 'scan-outline',
          label: 'Scanner machine',
          subtitle: 'Scanner le code-barre d\'un appareil',
          color: '#8b5cf6',
          onPress: () => router.push('/scanner'),
        },
        {
          id: 'stock',
          icon: 'cube-outline',
          label: 'Stock consommables',
          subtitle: '23 articles en stock',
          color: '#3b82f6',
          badge: '3 bas',
        },
        {
          id: 'rapports',
          icon: 'document-text-outline',
          label: 'Rapports CPAM',
          subtitle: 'Generer et envoyer les rapports',
          color: '#10b981',
          badge: '2 en attente',
        },
      ],
    },
    {
      title: 'Statistiques',
      items: [
        {
          id: 'performance',
          icon: 'bar-chart-outline',
          label: 'Mes performances',
          subtitle: 'Indicateurs et objectifs',
          color: '#8b5cf6',
        },
        {
          id: 'observance',
          icon: 'trending-up-outline',
          label: 'Observance parc',
          subtitle: 'Vue globale patients',
          color: '#3b82f6',
        },
      ],
    },
    {
      title: 'Parametres',
      items: [
        {
          id: 'profil',
          icon: 'person-outline',
          label: 'Mon profil',
          subtitle: 'Dr. Martin - Technicien PPC',
          color: '#64748b',
        },
        {
          id: 'notifications',
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Gerer les alertes push',
          color: '#f59e0b',
        },
        {
          id: 'settings',
          icon: 'settings-outline',
          label: 'Parametres',
          subtitle: 'Langue, unite, preferences',
          color: '#64748b',
        },
      ],
    },
    {
      title: 'Aide',
      items: [
        {
          id: 'support',
          icon: 'help-circle-outline',
          label: 'Support technique',
          subtitle: 'Contacter l\'equipe support',
          color: '#3b82f6',
        },
        {
          id: 'guide',
          icon: 'book-outline',
          label: 'Guide utilisateur',
          subtitle: 'Tutoriels et documentation',
          color: '#8b5cf6',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / profil card */}
        <View style={styles.profilCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>DM</Text>
          </View>
          <View style={styles.profilInfo}>
            <Text style={styles.profilName}>Dr. Martin</Text>
            <Text style={styles.profilRole}>Technicien PPC - Ile-de-France</Text>
            <View style={styles.profilBadge}>
              <View style={styles.profilDot} />
              <Text style={styles.profilStatus}>En service</Text>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>147</Text>
            <Text style={styles.quickStatLabel}>Patients</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>92</Text>
            <Text style={styles.quickStatLabel}>Score</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>4.8</Text>
            <Text style={styles.quickStatLabel}>Satisfaction</Text>
          </View>
        </View>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Deconnexion</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>MedConnect Pro v1.0.0</Text>

        <View style={{ height: 32 }} />
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
    backgroundColor: '#FAFBFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Profil card
  profilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  profilInfo: {
    flex: 1,
  },
  profilName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  profilRole: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  profilBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  profilDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  profilStatus: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#f1f5f9',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  menuBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 16,
  },
});
