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
        className="relative overflow-hidden bg-gradient-to-br from-white to-[#F8F9FA] rounded-2xl p-6 shadow-sm border border-[#E5E5EA] hover:shadow-md transition-all"
      >
        {/* Gradient Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#007AFF]/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#86868B]">
              <span>Actives</span>
              <span className="px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] rounded-full">
                {activeAlerts}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-[#86868B] mb-1">Total des Alertes</p>
            <p className="text-4xl text-[#1D1D1F] mb-2">
              {totalAlerts}
            </p>
            <p className="text-xs text-[#86868B]">
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
        className="relative overflow-hidden bg-gradient-to-br from-white to-[#FFF5F5] rounded-2xl p-6 shadow-sm border border-[#FFE5E5] hover:shadow-md transition-all"
      >
        {/* Gradient Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF3B30]/10 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FF3B30] to-[#FF6B60] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            {criticalAlerts > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-[#FF3B30] rounded-full animate-pulse" />
                <span className="text-[#FF3B30]">Urgentes</span>
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-[#86868B] mb-1">Critiques Actives</p>
            <p className="text-4xl text-[#FF3B30] mb-2">
              {criticalAlerts}
            </p>
            <p className="text-xs text-[#86868B]">
              {criticalAlerts === 0 ? (
                <span className="text-[#34C759]">✓ Aucune alerte critique</span>
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
            ? 'from-[#34C759]/10' 
            : 'from-[#FFD60A]/10'
        } to-transparent rounded-full blur-2xl`} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${
              isGoodResolutionRate 
                ? 'from-[#34C759] to-[#30D158]' 
                : 'from-[#FFD60A] to-[#FFCC00]'
            } rounded-xl flex items-center justify-center shadow-lg`}>
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {isGoodResolutionRate ? (
                <TrendingUp className="w-4 h-4 text-[#34C759]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#FF9500]" />
              )}
            </div>
          </div>
          
          <div>
            <p className="text-sm text-[#86868B] mb-1">Taux de Résolution</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className={`text-4xl ${
                isGoodResolutionRate 
                  ? 'text-[#34C759]' 
                  : 'text-[#FFD60A]'
              }`}>
                {resolutionRate}%
              </p>
              <p className="text-sm text-[#86868B]">
                ({resolvedAlerts}/{totalAlerts})
              </p>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full h-2 bg-[#E5E5EA] rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resolutionRate}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                className={`h-full rounded-full ${
                  isGoodResolutionRate 
                    ? 'bg-gradient-to-r from-[#34C759] to-[#30D158]' 
                    : 'bg-gradient-to-r from-[#FFD60A] to-[#FFCC00]'
                }`}
              />
            </div>
            
            <p className="text-xs text-[#86868B]">
              {isGoodResolutionRate ? (
                <span className="text-[#34C759]">✓ Excellent taux de résolution</span>
              ) : resolutionRate >= 60 ? (
                <span className="text-[#FFD60A]">⚠ Taux acceptable</span>
              ) : (
                <span className="text-[#FF9500]">⚠ À améliorer</span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
