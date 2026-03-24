import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/**
 * Écran de Connexion
 * 
 * Permet à l'utilisateur de se connecter avec :
 * - Email + mot de passe
 * - "Se souvenir de moi"
 * - "Mot de passe oublié"
 * - Pro Santé Connect (OAuth)
 * - Lien vers inscription
 */

export default function LoginPage() {
  // ============================================
  // STATE
  // ============================================

  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================
  // VALIDATION
  // ============================================

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
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return false;
    }
    
    return true;
  }

  // ============================================
  // ACTIONS
  // ============================================

  async function handleLogin() {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // TODO: Implémenter l'authentification Supabase
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email: email.trim().toLowerCase(),
      //   password,
      // });
      
      // if (error) throw error;
      
      // Simulation de délai
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Succès : naviguer vers le dashboard
      router.replace('/(tabs)');
      
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Erreur de connexion',
        error.message || 'Email ou mot de passe incorrect.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleProSanteConnect() {
    try {
      setLoading(true);
      
      // TODO: Implémenter Pro Santé Connect OAuth
      // const { data, error } = await supabase.auth.signInWithOAuth({
      //   provider: 'pro_sante_connect',
      //   options: {
      //     scopes: 'openid profile email',
      //   },
      // });
      
      Alert.alert(
        'Pro Santé Connect',
        'Cette fonctionnalité nécessite une configuration OAuth.\n\nVeuillez configurer Pro Santé Connect dans les paramètres Supabase.',
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('PSC OAuth error:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors de la connexion avec Pro Santé Connect.');
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    router.push('/auth/forgot-password');
  }

  function handleRegister() {
    router.push('/auth/register');
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Titre */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>💤</Text>
            </View>
            <Text style={styles.title}>la plateforme</Text>
            <Text style={styles.subtitle}>Connexion à votre espace patient</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="votre.email@exemple.com"
                  placeholderTextColor="#94a3b8"
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
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options */}
            <View style={styles.options}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Se souvenir de moi</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Connexion */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Pro Santé Connect */}
            <TouchableOpacity
              style={styles.pscButton}
              onPress={handleProSanteConnect}
              disabled={loading}
            >
              <Text style={styles.pscButtonIcon}>🏥</Text>
              <Text style={styles.pscButtonText}>Connexion Pro Santé Connect</Text>
            </TouchableOpacity>

            {/* Lien inscription */}
            <View style={styles.registerLink}>
              <Text style={styles.registerLinkText}>Vous n'avez pas de compte ?</Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerLinkButton}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              En vous connectant, vous acceptez nos{'\n'}
              <Text style={styles.footerLink}>Conditions d'utilisation</Text> et notre{' '}
              <Text style={styles.footerLink}>Politique de confidentialité</Text>
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
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5eb3d6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
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
    color: '#1e3a5f',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e3a5f',
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5eb3d6',
    borderColor: '#5eb3d6',
  },
  checkmark: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#64748b',
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5eb3d6',
  },
  loginButton: {
    backgroundColor: '#5eb3d6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#5eb3d6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
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
    fontSize: 14,
    color: '#94a3b8',
    marginHorizontal: 16,
  },
  pscButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#5eb3d6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pscButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  pscButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5eb3d6',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerLinkButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5eb3d6',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#5eb3d6',
    fontWeight: '600',
  },
});
