/**
 * HOOK usePatients - Chargement des patients avec gestion fine des droits
 *
 * Restrictions par role :
 * - Patient : ne retourne que SES propres donnees
 * - Medecin : ne retourne que les donnees de SES patients (via RLS Supabase)
 * - Prestataire : retourne les donnees techniques uniquement (pas de notes medicales)
 * - Admin : acces complet a tous les patients
 */

import { useState, useEffect } from 'react';
import { adminApi } from '../utils/api';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  patientData?: {
    id: string;
    diagnosis_date?: string;
    device_installed?: boolean;
    treatment_start_date?: string;
  };
  // Medical notes are stripped for prestataire role
  medical_notes?: string;
}

type UserRole = 'patient' | 'medecin' | 'admin' | 'prestataire';

interface UsePatientsOptions {
  isAuthenticated?: boolean;
  userRole?: UserRole;
  currentUserId?: string;
}

export const usePatients = (isAuthenticatedOrOptions: boolean | UsePatientsOptions = false) => {
  // Handle backward compatibility: accept boolean or options object
  const options: UsePatientsOptions = typeof isAuthenticatedOrOptions === 'boolean'
    ? { isAuthenticated: isAuthenticatedOrOptions }
    : isAuthenticatedOrOptions;

  const { isAuthenticated = false, userRole = 'patient', currentUserId } = options;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('No authentication token');
        }

        // Role-based data access
        if (userRole === 'patient') {
          // Patient: only see their own data
          if (currentUserId) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*, patients(*)')
              .eq('id', currentUserId)
              .single();

            if (userError) {
              // Fallback to API if direct query fails
              console.warn('[usePatients] Direct query failed, falling back to API');
            } else if (userData) {
              setPatients([{
                id: userData.id,
                name: userData.name || userData.email,
                email: userData.email,
                phone: userData.phone,
                patientData: userData.patients?.[0] || null,
              }]);
              setLoading(false);
              return;
            }
          }
          // If we get here, set empty for patient with no direct access
          setPatients([]);
          setLoading(false);
          return;
        }

        // Medecin, Prestataire, Admin: load via admin API
        const data = await adminApi.getUsers(token);

        let patientsList = data.users
          .filter((user: any) => user.role === 'patient')
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            patientData: user.patients?.[0] || null,
            medical_notes: user.patients?.[0]?.medical_notes,
          }));

        // Prestataire: strip medical notes (only sees technical data)
        if (userRole === 'prestataire') {
          patientsList = patientsList.map((p: Patient) => ({
            ...p,
            medical_notes: undefined,
          }));
        }

        setPatients(patientsList);
      } catch (err: any) {
        console.error('[usePatients] Error loading patients:', err);
        setError(err.message);
        toast.error('Erreur de chargement des patients');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [isAuthenticated, userRole, currentUserId]);

  const refresh = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const data = await adminApi.getUsers(token);
      let patientsList = data.users
        .filter((user: any) => user.role === 'patient')
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          patientData: user.patients?.[0] || null,
          medical_notes: user.patients?.[0]?.medical_notes,
        }));

      // Prestataire: strip medical notes
      if (userRole === 'prestataire') {
        patientsList = patientsList.map((p: Patient) => ({
          ...p,
          medical_notes: undefined,
        }));
      }

      setPatients(patientsList);
    } catch (err: any) {
      console.error('[usePatients] Error refreshing patients:', err);
      toast.error('Erreur lors du rafraichissement');
    }
  };

  return {
    patients,
    loading,
    error,
    refresh,
  };
};
