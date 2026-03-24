/**
 * AUTH CONTEXT - Gestion globale de l'authentification
 *
 * Fournit :
 * - L'etat de connexion (user, session, loading)
 * - Les methodes de connexion/deconnexion
 * - La verification automatique de session au demarrage
 * - La verification MFA (TOTP) apres authentification
 * - La journalisation des connexions
 * - La verification du consentement RGPD
 *
 * Utilise Supabase Auth pour gerer les sessions
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '../utils/supabase/client'
import { toast } from 'sonner'

type UserRole = 'patient' | 'medecin' | 'admin' | 'prestataire' | 'infirmier'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  userRole: UserRole
  mfaEnabled: boolean
  mfaVerified: boolean
  needsMfaChallenge: boolean
  signIn: (email: string, password: string) => Promise<{ error: any; needsMfa?: boolean }>
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  completeMfaChallenge: () => void
  checkMfaStatus: () => Promise<{ enabled: boolean; verified: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('patient')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerified, setMfaVerified] = useState(false)
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false)
  const roleLoadedRef = useRef(false)

  const supabase = createClient()

  /**
   * Charge le role depuis la table profiles (ou users) dans la DB.
   * Fallback : user_metadata.role, puis 'patient'.
   * Si le profil n'existe pas, le creer a partir de user_metadata.
   */
  const loadUserRole = useCallback(async (u: User | null): Promise<UserRole> => {
    if (!u) return 'patient'

    // Tenter profiles d'abord
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', u.id)
      .maybeSingle()

    if (!profileErr && profile?.role) {
      return profile.role as UserRole
    }

    // Tenter users ensuite
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', u.id)
      .maybeSingle()

    if (!userErr && userRow?.role) {
      return userRow.role as UserRole
    }

    // Fallback : user_metadata
    const metaRole = u.user_metadata?.role as UserRole | undefined

    // Tenter de creer le profil si aucun n'existe
    if (metaRole) {
      const profileData = {
        id: u.id,
        email: u.email,
        role: metaRole,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
        nom: u.user_metadata?.nom || '',
        prenom: u.user_metadata?.prenom || '',
        updated_at: new Date().toISOString(),
      }
      // Try profiles table, ignore error (table might not exist)
      await supabase.from('profiles').upsert(profileData, { onConflict: 'id' }).then(() => {})
    }

    return metaRole || 'patient'
  }, [supabase])

  /**
   * Met a jour le state user + role.
   */
  const setUserWithRole = useCallback(async (u: User | null) => {
    setUser(u)
    if (u) {
      const role = await loadUserRole(u)
      setUserRole(role)
    } else {
      setUserRole('patient')
    }
  }, [loadUserRole])

  // Check MFA status
  const checkMfaStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) {
        console.warn('[Auth] MFA status check error:', error.message)
        return { enabled: false, verified: false }
      }

      const enabled = data.nextLevel === 'aal2' || data.currentLevel === 'aal2'
      const verified = data.currentLevel === 'aal2'

      setMfaEnabled(enabled)
      setMfaVerified(verified)
      setNeedsMfaChallenge(enabled && !verified)

      return { enabled, verified }
    } catch (err) {
      console.warn('[Auth] MFA check failed:', err)
      return { enabled: false, verified: false }
    }
  }, [supabase])

  // Log connection event
  const logConnection = useCallback(async (userId: string) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'login',
        user_agent: navigator.userAgent,
        metadata: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
        },
      })
    } catch (err) {
      // Non-blocking: log failure should not prevent login
      console.warn('[Auth] Connection logging failed:', err)
    }
  }, [supabase])

  // Verifier la session au demarrage
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      await setUserWithRole(s?.user ?? null)

      if (s?.user) {
        await checkMfaStatus()
      }

      setLoading(false)
    })

    // Ecouter les changements d'etat d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      await setUserWithRole(s?.user ?? null)

      if (s?.user) {
        await checkMfaStatus()
      } else {
        setMfaEnabled(false)
        setMfaVerified(false)
        setNeedsMfaChallenge(false)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, setUserWithRole, checkMfaStatus])

  // Connexion avec email/password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Message d'erreur en francais
        const friendlyMessage =
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : error.message
        toast.error('Erreur de connexion', {
          description: friendlyMessage,
        })
        return { error: { ...error, message: friendlyMessage } }
      }

      // Charger le role depuis la DB
      if (data.user) {
        const role = await loadUserRole(data.user)
        setUserRole(role)
        await logConnection(data.user.id)
      }

      // Check MFA status
      const mfaStatus = await checkMfaStatus()

      if (mfaStatus.enabled && !mfaStatus.verified) {
        // MFA is enabled but not yet verified - need challenge
        setNeedsMfaChallenge(true)
        return { error: null, needsMfa: true }
      }

      toast.success('Connexion reussie', {
        description: `Bienvenue ${data.user?.email}`
      })

      return { error: null, needsMfa: false }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  // Complete MFA challenge
  const completeMfaChallenge = () => {
    setMfaVerified(true)
    setNeedsMfaChallenge(false)
    toast.success('Authentification a deux facteurs validee')
  }

  // Connexion avec Magic Link
  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        }
      })

      if (error) {
        toast.error('Erreur Magic Link', {
          description: error.message
        })
        return { error }
      }

      toast.success('Magic Link envoye !', {
        description: 'Verifiez votre boite email'
      })

      return { error: null }
    } catch (error) {
      console.error('Magic link error:', error)
      return { error }
    }
  }

  // Inscription
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        toast.error('Erreur d\'inscription', {
          description: error.message
        })
        return { error }
      }

      toast.success('Inscription reussie', {
        description: 'Verifiez votre email pour confirmer votre compte'
      })

      return { error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error }
    }
  }

  // Deconnexion
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast.error('Erreur de deconnexion', {
          description: error.message
        })
        return
      }

      toast.success('Deconnexion reussie')
      setUser(null)
      setSession(null)
      setUserRole('patient')
      setMfaEnabled(false)
      setMfaVerified(false)
      setNeedsMfaChallenge(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Reinitialisation de mot de passe
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      })

      if (error) {
        toast.error('Erreur de reinitialisation', {
          description: error.message
        })
        return { error }
      }

      toast.success('Email envoye', {
        description: 'Verifiez votre boite email pour reinitialiser votre mot de passe'
      })

      return { error: null }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error }
    }
  }

  const value = {
    user,
    session,
    loading,
    userRole,
    mfaEnabled,
    mfaVerified,
    needsMfaChallenge,
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
    completeMfaChallenge,
    checkMfaStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook pour utiliser le contexte d'authentification
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
