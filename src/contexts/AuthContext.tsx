/**
 * AUTH CONTEXT - Gestion globale de l'authentification
 * 
 * Fournit :
 * - L'état de connexion (user, session, loading)
 * - Les méthodes de connexion/déconnexion
 * - La vérification automatique de session au démarrage
 * 
 * Utilise Supabase Auth pour gérer les sessions
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '../utils/supabase/client'
import { toast } from 'sonner@2.0.3'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  // Vérifier la session au démarrage
  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
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

      toast.success('Connexion réussie', {
        description: `Bienvenue ${data.user?.email}`
      })
      
      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  // Connexion avec Magic Link (lien envoyé par email)
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

      toast.success('Magic Link envoyé !', {
        description: 'Vérifiez votre boîte email'
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

      toast.success('Inscription réussie', {
        description: 'Vérifiez votre email pour confirmer votre compte'
      })
      
      return { error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error }
    }
  }

  // Déconnexion
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error('Erreur de déconnexion', {
          description: error.message
        })
        return
      }

      toast.success('Déconnexion réussie')
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Réinitialisation de mot de passe
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      })
      
      if (error) {
        toast.error('Erreur de réinitialisation', {
          description: error.message
        })
        return { error }
      }

      toast.success('Email envoyé', {
        description: 'Vérifiez votre boîte email pour réinitialiser votre mot de passe'
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
    signIn,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
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
