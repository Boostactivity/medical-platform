/**
 * HOOK AUTHENTIFICATION
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Logique d'auth abstraite - Compatible Supabase
 */

import { useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';

/**
 * Hook personnalisé pour gérer l'authentification
 * 
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated, login, logout } = useAuth();
 * ```
 */
export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérifier la session au montage
  useEffect(() => {
    checkSession();
  }, []);

  /**
   * Vérifier si l'utilisateur est connecté
   */
  async function checkSession() {
    try {
      setIsLoading(true);
      
      // PLACEHOLDER - À remplacer par votre logique Supabase
      const session = localStorage.getItem('supabase.auth.token');
      
      if (session) {
        const parsed = JSON.parse(session);
        setUser(parsed.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] Error checking session:', err);
      setError('Erreur de vérification de session');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Connexion
   */
  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      setIsLoading(true);
      setError(null);

      // PLACEHOLDER - Remplacer par appel Supabase réel
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      // Simulation
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Identifiants invalides');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('supabase.auth.token', JSON.stringify(data));

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur de connexion';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Déconnexion
   */
  async function logout(): Promise<void> {
    try {
      setIsLoading(true);
      
      // PLACEHOLDER - Remplacer par appel Supabase réel
      // await supabase.auth.signOut();
      
      localStorage.removeItem('supabase.auth.token');
      setUser(null);
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Inscription
   */
  async function signup(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      setIsLoading(true);
      setError(null);

      // PLACEHOLDER - Remplacer par appel Supabase réel
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, metadata }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'inscription');
      }

      const data = await response.json();
      setUser(data.user);

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur d\'inscription';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Réinitialisation mot de passe
   */
  async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      setIsLoading(true);
      setError(null);

      // PLACEHOLDER
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur de réinitialisation';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  function hasRole(role: UserRole): boolean {
    return user?.role === role;
  }

  /**
   * Vérifier si l'utilisateur a l'un des rôles
   */
  function hasAnyRole(roles: UserRole[]): boolean {
    return user ? roles.includes(user.role) : false;
  }

  return {
    // État
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    
    // Méthodes
    login,
    logout,
    signup,
    resetPassword,
    checkSession,
    hasRole,
    hasAnyRole,
  };
}
