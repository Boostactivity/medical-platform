/**
 * PROTECTED ROUTE - Composant de protection des routes avec gestion fine des droits
 *
 * Verifie :
 * 1. L'utilisateur est connecte
 * 2. Le MFA est valide (si active)
 * 3. Le consentement RGPD est donne (pour les patients)
 * 4. Le role de l'utilisateur correspond aux permissions requises
 *
 * Roles :
 * - patient : voit uniquement SES donnees
 * - medecin : voit uniquement les donnees de SES patients
 * - prestataire : voit les donnees techniques (pas les notes medicales)
 * - admin : tout acces
 */

import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { MFAChallenge } from '../security/MFASetup'
import { RGPDConsent, useRGPDConsent } from './RGPDConsent'

type UserRole = 'patient' | 'medecin' | 'admin' | 'prestataire' | 'infirmier'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
  requireMfa?: boolean
}

export function ProtectedRoute({ children, requiredRole, allowedRoles, requireMfa }: ProtectedRouteProps) {
  const { user, loading, userRole, needsMfaChallenge, completeMfaChallenge, mfaEnabled } = useAuth()
  const location = useLocation()

  // RGPD consent check for patients
  const { hasConsented, loading: consentLoading, setHasConsented } = useRGPDConsent(user?.id)

  // Afficher un spinner pendant la verification de la session
  if (loading || consentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-primary-foreground font-semibold text-2xl">M</span>
          </div>
          <p className="text-muted-foreground">Verification de la session...</p>
        </div>
      </div>
    )
  }

  // Rediriger vers login si non connecte
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // MFA Challenge: if user has MFA enabled and hasn't verified yet
  if (needsMfaChallenge || (requireMfa && mfaEnabled && !needsMfaChallenge === false)) {
    if (needsMfaChallenge) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <MFAChallenge onSuccess={completeMfaChallenge} />
        </div>
      )
    }
  }

  // RGPD consent for patient users
  if (userRole === 'patient' && hasConsented === false) {
    return (
      <RGPDConsent
        userId={user.id}
        onConsented={() => setHasConsented(true)}
      />
    )
  }

  // Verifier le role si requis (single role)
  if (requiredRole) {
    if (userRole !== requiredRole && userRole !== 'admin') {
      return <AccessDenied />
    }
  }

  // Verifier les roles autorises (multi-role)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return <AccessDenied />
    }
  }

  // Afficher le contenu protege
  return <>{children}</>
}

/**
 * Composant d'acces refuse
 */
function AccessDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-destructive mb-2">
          Acces refuse
        </h2>
        <p className="text-muted-foreground mb-4">
          Vous n'avez pas les permissions necessaires pour acceder a cette page.
          Votre role ne permet pas l'acces a cette ressource.
        </p>
        <a
          href="/"
          className="inline-block w-full bg-primary text-primary-foreground text-center py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retour a l'accueil
        </a>
      </div>
    </div>
  )
}

/**
 * HOC pour proteger les donnees selon le role
 * Utile dans les composants qui affichent des donnees sensibles
 */
export function useDataAccess() {
  const { user, userRole } = useAuth()

  return {
    /** Le patient ne voit que SES donnees */
    canAccessPatientData: (patientId: string): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'patient') return user?.id === patientId
      if (userRole === 'medecin') return true // Filtre cote serveur via RLS
      if (userRole === 'prestataire') return true // Filtre cote serveur via RLS
      if (userRole === 'infirmier') return true // Comme le medecin, filtre RLS
      return false
    },

    /** Le prestataire ne voit PAS les notes medicales */
    canAccessMedicalNotes: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'medecin') return true
      if (userRole === 'infirmier') return true // Acces lecture notes medicales
      if (userRole === 'patient') return true // Ses propres notes
      return false // prestataire: non
    },

    /** Seuls medecin et admin voient les donnees cliniques */
    canAccessClinicalData: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'medecin') return true
      if (userRole === 'infirmier') return true // Acces lecture donnees cliniques
      return false
    },

    /** Prestataire et admin voient les donnees techniques */
    canAccessTechnicalData: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'prestataire') return true
      if (userRole === 'medecin') return true
      if (userRole === 'infirmier') return true
      return false
    },

    /** Infirmier: peut envoyer messages et planifier RDV, mais PAS modifier prescriptions/machine */
    canModifyPrescriptions: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'medecin') return true
      return false // infirmier, prestataire, patient: non
    },

    /** Infirmier: peut envoyer messages et planifier RDV */
    canSendMessages: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'medecin') return true
      if (userRole === 'infirmier') return true
      if (userRole === 'prestataire') return true
      return false
    },

    /** Infirmier: peut planifier des RDV */
    canScheduleAppointments: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'medecin') return true
      if (userRole === 'infirmier') return true
      return false
    },

    /** Modification parametres machine: pas pour infirmier */
    canModifyDeviceSettings: (): boolean => {
      if (userRole === 'admin') return true
      if (userRole === 'prestataire') return true
      return false
    },

    /** Seul l'admin a acces total */
    isAdmin: (): boolean => userRole === 'admin',

    /** Role courant */
    role: userRole,

    /** User ID courant */
    currentUserId: user?.id || null,
  }
}
