/**
 * ALERTE ROUGE RISQUE CA
 * Bannière d'alerte pour patients à risque de non-paiement CPAM
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, TrendingDown, Phone, Calendar } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface RevenueAtRiskData {
  total_monthly_revenue: number;
  revenue_at_risk: number;
  revenue_lost: number;
  risk_percentage: number;
  patients_at_risk: PatientRisk[];
}

interface PatientRisk {
  patient_id: string;
  patient_name: string;
  panel_code: string;
  average_usage: number;
  days_until_deadline: number;
  status: 'safe' | 'warning' | 'critical' | 'failed';
  revenue_at_risk: number;
  action_priority: number;
}

interface RevenueRiskAlertProps {
  onPatientClick?: (patientId: string) => void;
}

export function RevenueRiskAlert({ onPatientClick }: RevenueRiskAlertProps) {
  const [data, setData] = useState<RevenueAtRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchRevenueRisk();
    // Refresh toutes les 5 minutes
    const interval = setInterval(fetchRevenueRisk, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRevenueRisk = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/business/revenue-at-risk`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur réseau');

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching revenue risk:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!data) return null;

  const criticalPatients = data.patients_at_risk?.filter(p => p.status === 'critical' || p.status === 'failed') || [];
  if (criticalPatients.length === 0) return null; // Pas d'alerte si tout va bien

  const alertVariant = data.risk_percentage > 10 ? 'destructive' : 'default';

  return (
    <div className="space-y-3">
      {/* Bannière principale */}
      <Alert variant={alertVariant} className="border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="flex items-center justify-between">
          <span className="text-lg">⚠️ Alerte CA à Risque</span>
          <Badge variant="destructive" className="text-base px-3">
            {data.revenue_at_risk.toFixed(0)}€
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm opacity-90">
                  <span className="font-semibold">{criticalPatients.length} patient(s)</span> en risque de non-paiement CPAM
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {data.risk_percentage.toFixed(1)}% du CA mensuel total ({data.total_monthly_revenue.toFixed(0)}€)
                </p>
              </div>
              {data.revenue_lost > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-lg">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {data.revenue_lost.toFixed(0)}€ perdus
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="bg-white"
            >
              {expanded ? 'Masquer' : 'Voir détails'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Liste patients à risque (si expanded) */}
      {expanded && (
        <div className="bg-white rounded-lg border-2 border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <h4 className="font-semibold text-red-900">
              Patients nécessitant une action immédiate
            </h4>
          </div>
          <div className="divide-y">
            {criticalPatients.slice(0, 10).map((patient) => (
              <div
                key={patient.patient_id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onPatientClick?.(patient.patient_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-semibold">{patient.patient_name}</h5>
                      <Badge variant="outline" className="text-xs">
                        {patient.panel_code}
                      </Badge>
                      <Badge 
                        variant={patient.status === 'failed' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {patient.status === 'failed' ? 'Échec confirmé' :
                         patient.status === 'critical' ? 'J-2' : 'Alerte'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Usage moyen</p>
                        <p className={patient.average_usage < 3 ? 'text-red-600 font-semibold' : ''}>
                          {patient.average_usage.toFixed(1)}h / 3.0h
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Échéance</p>
                        <p className={patient.days_until_deadline <= 2 ? 'text-orange-600 font-semibold' : ''}>
                          {patient.days_until_deadline > 0 
                            ? `J-${patient.days_until_deadline}`
                            : `Dépassée de ${Math.abs(patient.days_until_deadline)}j`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">CA à risque</p>
                        <p className="text-red-600 font-semibold">
                          {patient.revenue_at_risk.toFixed(0)}€
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:+33600000000`;
                      }}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Appeler
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Ouvrir modal planification
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Planifier
                    </Button>
                  </div>
                </div>

                {/* Barre de priorité */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Priorité :</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 w-8 rounded ${
                          level <= patient.action_priority
                            ? 'bg-red-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-red-600">
                    {patient.action_priority === 5 ? 'URGENT' :
                     patient.action_priority === 4 ? 'Très haute' :
                     patient.action_priority === 3 ? 'Haute' : 'Normale'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {criticalPatients.length > 10 && (
            <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600 border-t">
              + {criticalPatients.length - 10} autres patient(s) à risque
            </div>
          )}
        </div>
      )}
    </div>
  );
}