/**
 * PROTECTED ROUTE - Composant de protection des routes
 * 
 * Vérifie si l'utilisateur est connecté avant d'afficher le contenu
 * Redirige automatiquement vers /auth/login si non connecté
 * 
 * Usage :
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingSpinner } from '../LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'patient' | 'medecin' | 'admin' | 'prestataire'
  /**
   * Liste de rôles autorisés (user_metadata.role).
   * Si fournie et que le rôle du user n'y figure pas,
   * redirection vers la page de connexion de SON audience.
   */
  roles?: string[]
}

/** Page de connexion de l'audience d'un rôle donné */
function loginPathForRole(role: string): string {
  switch (role) {
    case 'patient':
      return '/patient/connexion'
    case 'doctor':
      return '/medecin/connexion'
    case 'admin':
    case 'prestataire':
      return '/pro/connexion'
    default:
      return '/auth/login'
  }
}

export function ProtectedRoute({ children, requiredRole, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Afficher un spinner pendant la vérification de la session
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-primary-foreground font-semibold text-2xl">E</span>
          </div>
          <p className="text-muted-foreground">Vérification de la session...</p>
        </div>
      </div>
    )
  }

  // Rediriger vers login si non connecté
  if (!user) {
    // Sauvegarder l'URL demandée pour rediriger après connexion
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Vérifier l'appartenance à la liste de rôles autorisés (nouveau guard par audience)
  if (roles && roles.length > 0) {
    const userRole = user.user_metadata?.role || 'patient'
    if (!roles.includes(userRole)) {
      // Rediriger vers la page de connexion de l'audience du user
      return <Navigate to={loginPathForRole(userRole)} state={{ from: location }} replace />
    }
  }

  // Vérifier le rôle si requis
  if (requiredRole) {
    const userRole = user.user_metadata?.role || 'patient'
    if (userRole !== requiredRole) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Accès refusé
            </h2>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <a
              href="/"
              className="inline-block w-full bg-primary text-primary-foreground text-center py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      )
    }
  }

  // Afficher le contenu protégé
  return <>{children}</>
}
