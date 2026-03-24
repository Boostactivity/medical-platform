/**
 * SUIVI ÉQUIPEMENTS & RENOUVELLEMENTS
 * Calendrier des renouvellements de consommables
 */

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Package, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Equipment {
  id: string;
  patient_id: string;
  equipment_type: string;
  installation_date: string;
  expected_renewal_date: string;
  actual_renewal_date: string | null;
  status: 'active' | 'renewed' | 'overdue';
  manufacturer: string;
  serial_number: string | null;
  notes: string | null;
  config: {
    name: string;
    lifespan_months: number;
    price_euro: number;
  };
  days_until_renewal: number;
}

interface EquipmentTrackerProps {
  patientId: string;
  showActions?: boolean;
}

export function EquipmentTracker({ patientId, showActions = false }: EquipmentTrackerProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, [patientId]);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/business/patient/${patientId}/equipment`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur réseau');

      const data = await response.json();
      setEquipment(data.equipment || []);
    } catch (err: any) {
      console.error('Error fetching equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async (equipmentId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/business/equipment/renew`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            equipment_id: equipmentId,
            renewal_date: new Date().toISOString().split('T')[0],
          }),
        }
      );

      if (!response.ok) throw new Error('Erreur lors du renouvellement');

      // Refresh data
      fetchEquipment();
    } catch (err) {
      console.error('Error renewing equipment:', err);
      alert('Erreur lors du renouvellement');
    }
  };

  const getStatusConfig = (item: Equipment) => {
    if (item.status === 'overdue' || item.days_until_renewal < 0) {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        badgeVariant: 'destructive' as const,
        badgeText: 'En retard',
      };
    } else if (item.days_until_renewal <= 7) {
      return {
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        badgeVariant: 'outline' as const,
        badgeText: 'Urgent',
      };
    } else if (item.days_until_renewal <= 30) {
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        badgeVariant: 'outline' as const,
        badgeText: 'Bientôt',
      };
    } else {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        badgeVariant: 'default' as const,
        badgeText: 'OK',
      };
    }
  };

  const getEquipmentIcon = (type: string) => {
    // Tous les équipements utilisent l'icône Package
    return Package;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-600">Impossible de charger les équipements</p>
      </Card>
    );
  }

  const activeEquipment = equipment.filter(e => e.status === 'active');
  const upcomingRenewals = activeEquipment.filter(e => e.days_until_renewal <= 30);

  return (
    <div className="space-y-4">
      {/* Header avec résumé */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Équipements installés</h3>
              <p className="text-sm text-gray-600">
                {activeEquipment.length} équipement(s) actif(s)
              </p>
            </div>
          </div>
          {upcomingRenewals.length > 0 && (
            <Badge variant="outline" className="text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              {upcomingRenewals.length} renouvellement(s) à venir
            </Badge>
          )}
        </div>
      </Card>

      {/* Liste équipements */}
      <div className="space-y-3">
        {activeEquipment.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">Aucun équipement enregistré</p>
            <p className="text-sm text-gray-500 mt-1">
              Les équipements seront ajoutés lors de l'installation initiale
            </p>
          </Card>
        ) : (
          activeEquipment.map((item) => {
            const statusConfig = getStatusConfig(item);
            const StatusIcon = statusConfig.icon;
            const EquipmentIcon = getEquipmentIcon(item.equipment_type);
            
            const daysUsed = Math.ceil(
              (new Date().getTime() - new Date(item.installation_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            const totalDays = item.config.lifespan_months * 30;
            const usagePercentage = (daysUsed / totalDays) * 100;

            return (
              <Card 
                key={item.id} 
                className={`p-4 border ${statusConfig.borderColor} ${statusConfig.bgColor}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                      <EquipmentIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{item.config.name}</h4>
                      <p className="text-sm text-gray-600">{item.manufacturer}</p>
                      {item.serial_number && (
                        <p className="text-xs text-gray-500 mt-1">S/N: {item.serial_number}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusConfig.badgeVariant}>
                    {statusConfig.badgeText}
                  </Badge>
                </div>

                {/* Progression */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Durée d'utilisation</span>
                    <span className={statusConfig.color}>
                      {daysUsed} / {totalDays} jours
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(usagePercentage, 100)} 
                    className="h-2"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-500 text-xs">Installation</p>
                    <p className="font-medium">
                      {new Date(item.installation_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Renouvellement</p>
                    <p className={`font-medium ${statusConfig.color}`}>
                      {new Date(item.expected_renewal_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Jours restants */}
                <div className={`p-2 rounded-lg border ${statusConfig.borderColor} bg-white mb-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {item.days_until_renewal < 0 
                        ? `Dépassé de ${Math.abs(item.days_until_renewal)} jours`
                        : item.days_until_renewal === 0
                        ? "À renouveler aujourd'hui"
                        : `${item.days_until_renewal} jours restants`
                      }
                    </span>
                    <span className={`text-sm font-semibold ${statusConfig.color}`}>
                      {item.config.price_euro.toFixed(2)}€
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRenewal(item.id)}
                      disabled={item.days_until_renewal > 30}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Marquer renouvelé
                    </Button>
                    {item.days_until_renewal <= 7 && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Planifier visite
                      </Button>
                    )}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-2 p-2 bg-white rounded border">
                    📝 {item.notes}
                  </p>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
