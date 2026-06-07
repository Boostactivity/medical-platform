import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface AlertStatsProps {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedAlerts: number;
}

export function AlertStats({ totalAlerts, criticalAlerts, resolvedAlerts }: AlertStatsProps) {
  // Calculer le taux de résolution
  const resolutionRate = totalAlerts > 0 
    ? Math.round((resolvedAlerts / totalAlerts) * 100) 
    : 0;

  // Calculer les alertes actives
  const activeAlerts = totalAlerts - resolvedAlerts;

  // Déterminer si le taux de résolution est bon (>= 80%)
  const isGoodResolutionRate = resolutionRate >= 80;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Carte 1 : Total Alertes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-white to-[#FAFAF7] rounded-2xl p-6 shadow-sm border border-[#D9D5CC] hover:shadow-md transition-all"
      >
        {/* Gradient Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#007AFF]/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5C5C5C]">
              <span>Actives</span>
              <span className="px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] rounded-full">
                {activeAlerts}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-[#5C5C5C] mb-1">Total des Alertes</p>
            <p className="text-4xl text-[#1A1A1A] mb-2">
              {totalAlerts}
            </p>
            <p className="text-xs text-[#5C5C5C]">
              Toutes catégories confondues
            </p>
          </div>
        </div>
      </motion.div>

      {/* Carte 2 : Critiques Actives */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden bg-gradient-to-br from-white to-[#FFF5F5] rounded-2xl p-6 shadow-sm border border-[#FAF0EC] hover:shadow-md transition-all"
      >
        {/* Gradient Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#CE0500]/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#CE0500] to-[#FF6B60] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            {criticalAlerts > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-[#CE0500] rounded-full animate-pulse" />
                <span className="text-[#CE0500]">Urgentes</span>
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-[#5C5C5C] mb-1">Critiques Actives</p>
            <p className="text-4xl text-[#CE0500] mb-2">
              {criticalAlerts}
            </p>
            <p className="text-xs text-[#5C5C5C]">
              {criticalAlerts === 0 ? (
                <span className="text-[#18753C]">✓ Aucune alerte critique</span>
              ) : criticalAlerts === 1 ? (
                'Nécessite une action immédiate'
              ) : (
                'Nécessitent une action immédiate'
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Carte 3 : Taux de Résolution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`relative overflow-hidden bg-gradient-to-br ${
          isGoodResolutionRate 
            ? 'from-white to-[#F0FFF4]' 
            : 'from-white to-[#FFFBF0]'
        } rounded-2xl p-6 shadow-sm border ${
          isGoodResolutionRate 
            ? 'border-[#D1FAE5]' 
            : 'border-[#FEF3C7]'
        } hover:shadow-md transition-all`}
      >
        {/* Gradient Background */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
          isGoodResolutionRate 
            ? 'from-[#18753C]/10' 
            : 'from-[#B34000]/10'
        } to-transparent rounded-full blur-2xl`} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${
              isGoodResolutionRate 
                ? 'from-[#18753C] to-[#18753C]' 
                : 'from-[#B34000] to-[#B34000]'
            } rounded-xl flex items-center justify-center shadow-lg`}>
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {isGoodResolutionRate ? (
                <TrendingUp className="w-4 h-4 text-[#18753C]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#B34000]" />
              )}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-[#5C5C5C] mb-1">Taux de Résolution</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className={`text-4xl ${
                isGoodResolutionRate 
                  ? 'text-[#18753C]' 
                  : 'text-[#B34000]'
              }`}>
                {resolutionRate}%
              </p>
              <p className="text-sm text-[#5C5C5C]">
                ({resolvedAlerts}/{totalAlerts})
              </p>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full h-2 bg-[#D9D5CC] rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resolutionRate}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                className={`h-full rounded-full ${
                  isGoodResolutionRate 
                    ? 'bg-gradient-to-r from-[#18753C] to-[#18753C]' 
                    : 'bg-gradient-to-r from-[#B34000] to-[#B34000]'
                }`}
              />
            </div>
            
            <p className="text-xs text-[#5C5C5C]">
              {isGoodResolutionRate ? (
                <span className="text-[#18753C]">✓ Excellent taux de résolution</span>
              ) : resolutionRate >= 60 ? (
                <span className="text-[#B34000]">⚠ Taux acceptable</span>
              ) : (
                <span className="text-[#B34000]">⚠ À améliorer</span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
