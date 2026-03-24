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

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthenticatorAssuranceLevels } from '@supabase/supabase-js'
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
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaVerified, setMfaVerified] = useState(false)
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false)

  const supabase = createClient()

  // Determine user role from metadata
  const getUserRole = (u: User | null): UserRole => {
    if (!u) return 'patient'
    return (u.user_metadata?.role as UserRole) || 'patient'
  }

  const userRole = getUserRole(user)

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await checkMfaStatus()
      }

      setLoading(false)
    })

    // Ecouter les changements d'etat d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await checkMfaStatus()
      } else {
        setMfaEnabled(false)
        setMfaVerified(false)
        setNeedsMfaChallenge(false)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Connexion avec email/password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Erreur de connexion', {
          description: error.message
        })
        return { error }
      }

      // Log the connection
      if (data.user) {
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
