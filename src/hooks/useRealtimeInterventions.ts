import { useState, useEffect } from 'react';
import prestataireApi from '../utils/api-prestataire';
import { toast } from 'sonner';

export interface Intervention {
  id: string;
  patientName: string;
  patientId: string;
  patientPhone?: string;
  type: 'installation' | 'maintenance' | 'repair' | 'mask_delivery' | 'phone_support';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  date: string;
  technicianName?: string;
  notes?: string;
  material?: string;
  completionNotes?: string;
  duration?: string;
  materialUsed?: string;
  patientSatisfaction?: number;
  patient?: {
    id: string;
    user: {
      name: string;
      phone: string;
      email: string;
    };
  };
  technician?: {
    name: string;
    email: string;
  };
}

export const useRealtimeInterventions = (filter: 'all' | 'scheduled' | 'in_progress' | 'completed' = 'all', isAuthenticated: boolean = false) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data - ONLY if authenticated
  useEffect(() => {
    const loadInterventions = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const response = await prestataireApi.interventions.getAll(filter);
        
        // Transform backend data to frontend format
        const transformedInterventions = response.interventions.map((intervention: any) => ({
          id: intervention.id,
          patientName: intervention.patient?.user?.name || 'Patient inconnu',
          patientId: intervention.patient_id,
          patientPhone: intervention.patient?.user?.phone,
          type: intervention.type,
          status: intervention.status,
          date: intervention.date,
          technicianName: intervention.technician?.name,
          notes: intervention.notes,
          material: intervention.material,
          completionNotes: intervention.completion_notes,
          duration: intervention.duration,
          materialUsed: intervention.material_used,
          patientSatisfaction: intervention.patient_satisfaction,
          patient: intervention.patient,
          technician: intervention.technician,
        }));

        setInterventions(transformedInterventions);
      } catch (err: any) {
        console.error('[useRealtimeInterventions] Error loading interventions:', err);
        const errorMsg = err.message || '';
        
        // Check if it's a table not found error (PGRST205)
        if (errorMsg.toLowerCase().includes('could not find') || 
            errorMsg.toLowerCase().includes('does not exist') ||
            errorMsg.includes('PGRST205')) {
          // Set error message so DashboardAdmin can detect PGRST205
          setError('PGRST205: Table does not exist');
        } else {
          setError(err.message);
          toast.error('Erreur de chargement des interventions');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInterventions();
  }, [filter, isAuthenticated]);

  // Subscribe to realtime updates - but only if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return; // Don't subscribe if not authenticated
    }
    
    const unsubscribe = prestataireApi.interventions.subscribe((payload) => {
      console.log('[useRealtimeInterventions] Realtime update:', payload);

      if (payload.eventType === 'INSERT') {
        // New intervention created
        const newIntervention = {
          id: payload.new.id,
          patientName: 'Patient', // Will be updated on next full fetch
          patientId: payload.new.patient_id,
          type: payload.new.type,
          status: payload.new.status,
          date: payload.new.date,
          notes: payload.new.notes,
          material: payload.new.material,
        };
        setInterventions((prev) => [newIntervention, ...prev]);
        toast.success('Nouvelle intervention créée');
      } else if (payload.eventType === 'UPDATE') {
        // Intervention updated
        setInterventions((prev) =>
          prev.map((intervention) =>
            intervention.id === payload.new.id
              ? {
                  ...intervention,
                  status: payload.new.status,
                  completionNotes: payload.new.completion_notes,
                  duration: payload.new.duration,
                  materialUsed: payload.new.material_used,
                  patientSatisfaction: payload.new.patient_satisfaction,
                }
              : intervention
          )
        );
        toast.info('Intervention mise à jour');
      } else if (payload.eventType === 'DELETE') {
        // Intervention deleted
        setInterventions((prev) =>
          prev.filter((intervention) => intervention.id !== payload.old.id)
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  // Refresh interventions manually
  const refresh = async () => {
    try {
      const response = await prestataireApi.interventions.getAll(filter);
      const transformedInterventions = response.interventions.map((intervention: any) => ({
        id: intervention.id,
        patientName: intervention.patient?.user?.name || 'Patient inconnu',
        patientId: intervention.patient_id,
        patientPhone: intervention.patient?.user?.phone,
        type: intervention.type,
        status: intervention.status,
        date: intervention.date,
        technicianName: intervention.technician?.name,
        notes: intervention.notes,
        material: intervention.material,
        completionNotes: intervention.completion_notes,
        duration: intervention.duration,
        materialUsed: intervention.material_used,
        patientSatisfaction: intervention.patient_satisfaction,
        patient: intervention.patient,
        technician: intervention.technician,
      }));
      setInterventions(transformedInterventions);
    } catch (err: any) {
      console.error('[useRealtimeInterventions] Error refreshing interventions:', err);
      toast.error('Erreur lors du rafraîchissement');
    }
  };

  return {
    interventions,
    loading,
    error,
    refresh,
  };
};