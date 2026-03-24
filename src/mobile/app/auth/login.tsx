import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function validateForm(): boolean {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Veuillez saisir votre adresse email.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return false;
    }
    if (!password) {
      Alert.alert('Mot de passe requis', 'Veuillez saisir votre mot de passe.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return false;
    }
    return true;
  }

  async function handleLogin() {
    if (!validateForm()) return;
    try {
      setLoading(true);
      // TODO: Implementer l'authentification Supabase
      await new Promise((resolve) => setTimeout(resolve, 1200));
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }

  async function handleProSanteConnect() {
    Alert.alert(
      'Pro Sante Connect',
      'Connexion via Pro Sante Connect. Cette fonctionnalite sera disponible prochainement.',
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="medical-outline" size={36} color="#ffffff" />
            </View>
            <Text style={styles.appName}>MedConnect</Text>
            <Text style={styles.tagline}>Votre suivi PPC au quotidien</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, email.length > 0 && styles.inputContainerFocused]}>
                <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="votre.email@exemple.com"
                  placeholderTextColor="#cbd5e1"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.inputContainer, password.length > 0 && styles.inputContainerFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.input}
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#cbd5e1"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mot de passe oublie */}
            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Mot de passe oublie ?</Text>
            </TouchableOpacity>

            {/* Bouton Connexion */}
            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Separateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Pro Sante Connect */}
            <TouchableOpacity
              style={styles.pscButton}
              onPress={handleProSanteConnect}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={BLUE} />
              <Text style={styles.pscButtonText}>Pro Sante Connect</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Pas encore de compte ?{' '}
              <Text style={styles.footerLink} onPress={() => router.push('/auth/register')}>
                S'inscrire
              </Text>
            </Text>
            <Text style={styles.legalText}>
              En vous connectant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialite.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 6,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    gap: 10,
  },
  inputContainerFocused: {
    borderColor: BLUE + '60',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 14,
    fontWeight: '400',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: BLUE,
  },
  loginButton: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  separatorText: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  pscButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: BLUE,
    gap: 8,
  },
  pscButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: BLUE,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },
  footerLink: {
    color: BLUE,
    fontWeight: '700',
  },
  legalText: {
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 16,
  },
});
