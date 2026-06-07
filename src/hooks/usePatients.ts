import { useState, useEffect } from 'react';
import { adminApi } from '../utils/api';
import { toast } from 'sonner';

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
}

export const usePatients = (isAuthenticated: boolean = false) => {
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

        const data = await adminApi.getUsers(token);
        
        // Extract only patients
        const patientsList = data.users
          .filter((user: any) => user.role === 'patient')
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            patientData: user.patients?.[0] || null,
          }));

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
  }, [isAuthenticated]);

  const refresh = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const data = await adminApi.getUsers(token);
      const patientsList = data.users
        .filter((user: any) => user.role === 'patient')
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          patientData: user.patients?.[0] || null,
        }));

      setPatients(patientsList);
    } catch (err: any) {
      console.error('[usePatients] Error refreshing patients:', err);
      toast.error('Erreur lors du rafraîchissement');
    }
  };

  return {
    patients,
    loading,
    error,
    refresh,
  };
};