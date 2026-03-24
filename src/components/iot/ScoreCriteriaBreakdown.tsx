/**
 * Détail des critères du score la plateforme
 * Affichage des 6 critères avec leur pondération
 */

import React from 'react';
import { Clock, Activity, Wind, Circle, Gauge, Calendar } from 'lucide-react';

interface CriteriaScore {
  score: number;
  max_score: number;
  percentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

interface ScoreCriteria {
  usage: CriteriaScore;
  ahi: CriteriaScore;
  leak: CriteriaScore;
  mask_fit: CriteriaScore;
  pressure: CriteriaScore;
  consistency: CriteriaScore;
}

interface ScoreCriteriaBreakdownProps {
  criteria: ScoreCriteria;
}

export function ScoreCriteriaBreakdown({ criteria }: ScoreCriteriaBreakdownProps) {
  const criteriaConfig = [
    {
      key: 'usage',
      label: 'Utilisation',
      icon: Clock,
      description: 'Temps d\'utilisation quotidien',
      color: 'blue',
    },
    {
      key: 'ahi',
      label: 'Contrôle Apnées',
      icon: Activity,
      description: 'Indice apnée-hypopnée',
      color: 'purple',
    },
    {
      key: 'leak',
      label: 'Étanchéité',
      icon: Wind,
      description: 'Fuites masque',
      color: 'cyan',
    },
    {
      key: 'mask_fit',
      label: 'Stabilité Masque',
      icon: Circle,
      description: 'Nombre de retraits',
      color: 'indigo',
    },
    {
      key: 'pressure',
      label: 'Pression',
      icon: Gauge,
      description: 'Niveau de pression',
      color: 'teal',
    },
    {
      key: 'consistency',
      label: 'Régularité',
      icon: Calendar,
      description: 'Cohérence sur 7 jours',
      color: 'emerald',
    },
  ];

  const statusColors = {
    excellent: 'bg-emerald-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  const statusBgColors = {
    excellent: 'bg-emerald-50',
    good: 'bg-blue-50',
    fair: 'bg-yellow-50',
    poor: 'bg-red-50',
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 mb-4">Détail des critères</h3>
      
      {criteriaConfig.map(({ key, label, icon: Icon, description, color }) => {
        const criteriaData = criteria[key as keyof ScoreCriteria];
        
        return (
          <div 
            key={key}
            className={`rounded-2xl border border-gray-200 p-4 ${statusBgColors[criteriaData.status]}`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-xl bg-${color}-100`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{label}</h4>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {criteriaData.score.toFixed(1)}
                      <span className="text-sm text-gray-500">/{criteriaData.max_score}</span>
                    </p>
                    <p className="text-xs text-gray-500">{criteriaData.percentage}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusColors[criteriaData.status]} transition-all duration-500`}
                      style={{ width: `${criteriaData.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Message */}
                <p className="text-sm text-gray-600">{criteriaData.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
