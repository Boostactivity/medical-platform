import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

/**
 * Écran d'Inscription
 * 
 * Permet à un nouvel utilisateur de créer un compte avec :
 * - Nom complet
 * - Email
 * - Mot de passe (avec confirmation)
 * - Téléphone
 * - Date de naissance
 * - Acceptation CGU/RGPD
 * - Validation complète
 */

export default function RegisterPage() {
  // ============================================
  // STATE
  // ============================================

  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRGPD, setAcceptRGPD] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  // ============================================
  // VALIDATION
  // ============================================

  function validateForm(): boolean {
    // Nom
    if (!formData.name.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir votre nom complet.');
      return false;
    }
    
    if (formData.name.trim().length < 3) {
      Alert.alert('Nom trop court', 'Le nom doit contenir au moins 3 caractères.');
      return false;
    }
    
    // Email
    if (!formData.email.trim()) {
      Alert.alert('Email requis', 'Veuillez saisir votre adresse email.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return false;
    }
    
    // Téléphone (optionnel mais format si renseigné)
    if (formData.phone && !formData.phone.match(/^[\d\s\+\-\(\)]+$/)) {
      Alert.alert('Téléphone invalide', 'Veuillez saisir un numéro de téléphone valide.');
      return false;
    }
    
    // Date de naissance (optionnel mais format si renseigné)
    if (formData.birthDate) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(formData.birthDate)) {
        Alert.alert('Date invalide', 'Format de date attendu : JJ/MM/AAAA');
        return false;
      }
      
      // Vérifier que la date est cohérente (> 18 ans)
      const parts = formData.birthDate.split('/');
      const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const age = new Date().getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        Alert.alert('Âge minimum', 'Vous devez avoir au moins 18 ans pour créer un compte.');
        return false;
      }
    }
    
    // Mot de passe
    if (!formData.password) {
      Alert.alert('Mot de passe requis', 'Veuillez saisir un mot de passe.');
      return false;
    }
    
    if (formData.password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
    
    // Vérifier la force du mot de passe
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Mot de passe faible',
        'Le mot de passe doit contenir au moins :\n- Une majuscule\n- Une minuscule\n- Un chiffre'
      );
      return false;
    }
    
    // Confirmation mot de passe
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Mots de passe différents', 'Les mots de passe ne correspondent pas.');
      return false;
    }
    
    // CGU
    if (!acceptTerms) {
      Alert.alert('CGU non acceptées', 'Vous devez accepter les conditions d\'utilisation.');
      return false;
    }
    
    // RGPD
    if (!acceptRGPD) {
      Alert.alert('RGPD non accepté', 'Vous devez accepter la politique de confidentialité.');
      return false;
    }
    
    return true;
  }

  // ============================================
  // ACTIONS
  // ============================================

  async function handleRegister() {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // TODO: Implémenter l'inscription Supabase
      // 1. Créer l'utilisateur dans Supabase Auth
      // const { data: authData, error: authError } = await supabase.auth.signUp({
      //   email: formData.email.trim().toLowerCase(),
      //   password: formData.password,
      //   options: {
      //     data: {
      //       name: formData.name.trim(),
      //       phone: formData.phone,
      //       birth_date: formData.birthDate,
      //     },
      //   },
      // });
      
      // if (authError) throw authError;
      
      // 2. Créer l'entrée dans la table users
      // const { error: userError } = await supabase
      //   .from('users')
      //   .insert({
      //     user_id: authData.user.id,
      //     name: formData.name.trim(),
      //     email: formData.email.trim().toLowerCase(),
      //     phone: formData.phone,
      //     role: 'patient',
      //   });
      
      // if (userError) throw userError;
      
      // 3. Créer l'entrée dans la table patients
      // const { error: patientError } = await supabase
      //   .from('patients')
      //   .insert({
      //     user_id: authData.user.id,
      //     birth_date: formData.birthDate,
      //   });
      
      // if (patientError) throw patientError;
      
      // Simulation de délai
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Succès
      Alert.alert(
        'Inscription réussie !',
        'Votre compte a été créé avec succès.\n\nVeuillez vérifier votre email pour confirmer votre adresse.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
      
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Erreur d\'inscription',
        error.message || 'Une erreur est survenue lors de l\'inscription.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    router.back();
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLogin} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹ Retour</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez la plateforme</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Nom complet */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jean Dupont"
                  placeholderTextColor="#94a3b8"
                  value={formData.name}
                  onChangeText={(value) => updateField('name', value)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jean.dupont@exemple.com"
                  placeholderTextColor="#94a3b8"
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Téléphone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📞</Text>
                <TextInput
                  style={styles.input}
                  placeholder="06 12 34 56 78"
                  placeholderTextColor="#94a3b8"
                  value={formData.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Date de naissance */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date de naissance</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📅</Text>
                <TextInput
                  style={styles.input}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor="#94a3b8"
                  value={formData.birthDate}
                  onChangeText={(value) => updateField('birthDate', value)}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
              <Text style={styles.hint}>Vous devez avoir au moins 18 ans</Text>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
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
              <Text style={styles.hint}>
                Min. 8 caractères avec majuscule, minuscule et chiffre
              </Text>
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Acceptation CGU */}
            <TouchableOpacity
              style={styles.checkboxGroup}
              onPress={() => setAcceptTerms(!acceptTerms)}
              disabled={loading}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                J'accepte les{' '}
                <Text style={styles.link}>Conditions d'utilisation</Text>
              </Text>
            </TouchableOpacity>

            {/* Acceptation RGPD */}
            <TouchableOpacity
              style={styles.checkboxGroup}
              onPress={() => setAcceptRGPD(!acceptRGPD)}
              disabled={loading}
            >
              <View style={[styles.checkbox, acceptRGPD && styles.checkboxChecked]}>
                {acceptRGPD && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                J'accepte la{' '}
                <Text style={styles.link}>Politique de confidentialité</Text> et le
                traitement de mes données
              </Text>
            </TouchableOpacity>

            {/* Bouton Inscription */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.registerButtonText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>

            {/* Lien connexion */}
            <View style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Vous avez déjà un compte ?</Text>
              <TouchableOpacity onPress={handleLogin} disabled={loading}>
                <Text style={styles.loginLinkButton}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              * Champs obligatoires
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
    paddingVertical: 20,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5eb3d6',
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
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginLeft: 4,
  },
  checkboxGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
  checkboxText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    flex: 1,
  },
  link: {
    color: '#5eb3d6',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#5eb3d6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#5eb3d6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLinkButton: {
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
  },
});
