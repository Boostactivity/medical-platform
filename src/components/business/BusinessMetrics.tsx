/**
 * DASHBOARD BUSINESS METRICS
 * KPIs financiers pour prestataire (compliance + stocks)
 */

import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Package,
  Calendar,
  Activity
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface BusinessDashboard {
  compliance: {
    total_patients: number;
    compliant_patients: number;
    compliance_rate: number;
    revenue_at_risk: number;
    revenue_lost: number;
    patients_needing_action: any[];
  };
  stock: {
    renewals_30days: number;
    renewals_60days: number;
    overdue_renewals: number;
    revenue_30days: number;
    revenue_60days: number;
    revenue_lost_overdue: number;
    urgent_items: any[];
  };
  total_revenue: {
    monthly_recurring: number;
    renewals_30days: number;
    total_projected: number;
    at_risk: number;
  };
}

export function BusinessMetrics() {
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboard();
    // Refresh toutes les 10 minutes
    const interval = setInterval(fetchDashboard, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/business/dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erreur réseau');

      const data = await response.json();
      setDashboard(data.dashboard);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching business dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <p className="text-red-600">Impossible de charger les KPIs business</p>
      </Card>
    );
  }

  const metricsCards = [
    {
      title: 'CA Mensuel Récurrent',
      value: `${dashboard.total_revenue?.monthly_recurring?.toFixed(0) || 0}€`,
      subtitle: `${dashboard.compliance?.total_patients || 0} patients`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: null,
    },
    {
      title: 'Taux de Conformité',
      value: `${dashboard.compliance?.compliance_rate?.toFixed(1) || 0}%`,
      subtitle: `${dashboard.compliance?.compliant_patients || 0}/${dashboard.compliance?.total_patients || 0} conformes`,
      icon: Activity,
      color: (dashboard.compliance?.compliance_rate || 0) >= 90 ? 'text-green-600' : 'text-orange-600',
      bgColor: (dashboard.compliance?.compliance_rate || 0) >= 90 ? 'bg-green-50' : 'bg-orange-50',
      trend: (dashboard.compliance?.compliance_rate || 0) >= 90 ? 'up' : 'down',
    },
    {
      title: 'CA à Risque',
      value: `${dashboard.total_revenue?.at_risk?.toFixed(0) || 0}€`,
      subtitle: `${dashboard.compliance?.patients_needing_action?.length || 0} patients`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: 'down',
      alert: (dashboard.total_revenue?.at_risk || 0) > 500,
    },
    {
      title: 'CA Perdu (Échecs)',
      value: `${dashboard.compliance?.revenue_lost?.toFixed(0) || 0}€`,
      subtitle: 'Paiements refusés CPAM',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: null,
    },
    {
      title: 'Renouvellements 30j',
      value: `${dashboard.stock?.renewals_30days || 0}`,
      subtitle: `${dashboard.stock?.revenue_30days?.toFixed(0) || 0}€`,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'up',
    },
    {
      title: 'Renouvellements Urgents',
      value: `${dashboard.stock?.overdue_renewals || 0}`,
      subtitle: `${dashboard.stock?.revenue_lost_overdue?.toFixed(0) || 0}€ en retard`,
      icon: Calendar,
      color: (dashboard.stock?.overdue_renewals || 0) > 0 ? 'text-orange-600' : 'text-green-600',
      bgColor: (dashboard.stock?.overdue_renewals || 0) > 0 ? 'bg-orange-50' : 'bg-green-50',
      alert: (dashboard.stock?.overdue_renewals || 0) > 0,
    },
    {
      title: 'CA Projeté Total',
      value: `${dashboard.total_revenue?.total_projected?.toFixed(0) || 0}€`,
      subtitle: 'Mensuel + renouvellements',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: 'up',
    },
    {
      title: 'Actions Requises',
      value: `${(dashboard.compliance?.patients_needing_action?.length || 0) + (dashboard.stock?.urgent_items?.length || 0)}`,
      subtitle: 'Patients + équipements',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">📊 Business Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Vue d'ensemble financière • Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={index} 
              className={`p-6 border-2 ${metric.alert ? 'border-red-300 shadow-lg' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                {metric.trend && (
                  <div className={`flex items-center gap-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                <p className={`text-3xl ${metric.color} mb-1`}>
                  {metric.value}
                </p>
                <p className="text-xs text-gray-500">{metric.subtitle}</p>
              </div>

              {metric.alert && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ Action requise
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Patients à risque */}
        {(dashboard.compliance?.patients_needing_action?.length || 0) > 0 && (
          <Card className="p-6 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold">Top Patients à Risque CPAM</h3>
            </div>
            <div className="space-y-2">
              {(dashboard.compliance?.patients_needing_action || []).slice(0, 5).map((patient, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{patient.patient_name}</p>
                    <p className="text-xs text-gray-600">
                      {patient.average_usage?.toFixed(1) || 0}h/nuit • J-{patient.days_until_deadline || 0}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {patient.revenue_at_risk?.toFixed(0) || 0}€
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Renouvellements urgents */}
        {(dashboard.stock?.urgent_items?.length || 0) > 0 && (
          <Card className="p-6 border-2 border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold">Renouvellements Urgents</h3>
            </div>
            <div className="space-y-2">
              {(dashboard.stock?.urgent_items || []).slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{item.patient_name}</p>
                    <p className="text-xs text-gray-600">
                      {item.equipment_name} • 
                      {(item.days_until_renewal || 0) < 0 
                        ? ` Retard ${Math.abs(item.days_until_renewal || 0)}j`
                        : ` J-${item.days_until_renewal || 0}`
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.revenue?.toFixed(0) || 0}€
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Légende */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h4 className="text-sm font-semibold mb-2">📖 Légende</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-semibold">CA Mensuel Récurrent :</span> Forfait CPAM machine PPC (~160€/patient)
          </div>
          <div>
            <span className="font-semibold">CA à Risque :</span> Patients non-conformes proches de l'échéance
          </div>
          <div>
            <span className="font-semibold">Renouvellements :</span> Consommables à remplacer (masque, tubulure, filtres)
          </div>
        </div>
      </div>
    </div>
  );
}