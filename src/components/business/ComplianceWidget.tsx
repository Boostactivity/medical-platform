/**
 * WIDGET CONFORMITÉ CPAM
 * Affiche le statut de conformité CPAM d'un patient
 */

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiPublic } from '../../utils/api';

interface CPAMComplianceData {
  patient_id: string;
  period_start: string;
  period_end: string;
  average_usage_hours: number;
  is_compliant: boolean;
  compliance_percentage: number;
  status: 'safe' | 'warning' | 'critical' | 'failed';
  revenue_at_risk: number;
  next_deadline: string | null;
  days_until_deadline: number | null;
  recommendation: string;
}

interface ComplianceWidgetProps {
  patientId: string;
  compact?: boolean;
}

export function ComplianceWidget({ patientId, compact = false }: ComplianceWidgetProps) {
  const [compliance, setCompliance] = useState<CPAMComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompliance();
  }, [patientId]);

  const fetchCompliance = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiPublic(`/business/compliance/${patientId}`);
      setCompliance(data.compliance);
    } catch (err: any) {
      console.error('Error fetching compliance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (error || !compliance) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-600">Impossible de charger les données de conformité</p>
      </Card>
    );
  }

  const getStatusConfig = () => {
    // Protection supplémentaire au cas où compliance serait null
    if (!compliance) {
      return {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeVariant: 'outline' as const,
        badgeText: 'Inconnu',
      };
    }

    switch (compliance.status) {
      case 'safe':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'default' as const,
          badgeText: 'Conforme',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeVariant: 'outline' as const,
          badgeText: 'Alerte',
        };
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'destructive' as const,
          badgeText: 'Critique',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          badgeText: 'Échec',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'outline' as const,
          badgeText: 'Inconnu',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
        <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">CPAM:</span>
            <Badge variant={statusConfig.badgeVariant} className="text-xs">
              {statusConfig.badgeText}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {(compliance.average_usage_hours || 0).toFixed(1)}h/nuit
          </p>
        </div>
        {compliance.days_until_deadline !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Échéance</p>
            <p className={`text-sm ${statusConfig.color}`}>
              J-{compliance.days_until_deadline}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-6 border ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
          <div>
            <h3 className="text-lg">Conformité CPAM</h3>
            <p className="text-sm text-gray-600">Remboursement forfaitaire</p>
          </div>
        </div>
        <Badge variant={statusConfig.badgeVariant}>
          {statusConfig.badgeText}
        </Badge>
      </div>

      {/* Usage moyen */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Usage moyen (28 jours)</span>
          <span className={`${statusConfig.color}`}>
            {(compliance.average_usage_hours || 0).toFixed(1)}h / 3.0h
          </span>
        </div>
        <Progress 
          value={Math.min(compliance.compliance_percentage || 0, 100)} 
          className="h-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          {(compliance.compliance_percentage || 0).toFixed(0)}% du seuil requis
        </p>
      </div>

      {/* Échéance */}
      {compliance.next_deadline && compliance.days_until_deadline !== null && (
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm">Prochaine échéance</span>
          </div>
          <div className="text-right">
            <p className={`${statusConfig.color}`}>
              {compliance.days_until_deadline > 0 
                ? `Dans ${compliance.days_until_deadline} jours`
                : compliance.days_until_deadline === 0
                ? "Aujourd'hui"
                : `Dépassée de ${Math.abs(compliance.days_until_deadline)} jours`
              }
            </p>
            <p className="text-xs text-gray-500">
              {new Date(compliance.next_deadline).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      )}

      {/* Revenu à risque */}
      {compliance.revenue_at_risk > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-600">
            ⚠️ CA à risque : <span className="font-semibold">{compliance.revenue_at_risk.toFixed(2)}€</span>
          </p>
        </div>
      )}

      {/* Recommandation */}
      <div className="p-3 bg-white rounded-lg border">
        <p className="text-sm text-gray-700">
          {compliance.recommendation}
        </p>
      </div>

      {/* Période */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Période analysée : {new Date(compliance.period_start).toLocaleDateString('fr-FR')} - {new Date(compliance.period_end).toLocaleDateString('fr-FR')}
      </div>
    </Card>
  );
}