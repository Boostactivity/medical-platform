/**
 * Carte {`Score ${branding.name}`} - Affichage principal du score quotidien
 * Style inspiré Apple Health / Oura Ring
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { branding } from '../../config/branding';

interface ExpAirScoreCardProps {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'declining';
  date: string;
  previousScore?: number;
}

export function ExpAirScoreCard({ score, grade, trend, date, previousScore }: ExpAirScoreCardProps) {
  // Couleur selon grade
  const gradeColors = {
    'A+': 'from-emerald-500 to-teal-500',
    'A': 'from-emerald-400 to-green-500',
    'B': 'from-blue-400 to-cyan-500',
    'C': 'from-yellow-400 to-orange-400',
    'D': 'from-orange-500 to-red-500',
    'F': 'from-red-600 to-rose-600',
  };

  const textColors = {
    'A+': 'text-emerald-600',
    'A': 'text-emerald-500',
    'B': 'text-blue-500',
    'C': 'text-yellow-600',
    'D': 'text-orange-600',
    'F': 'text-red-600',
  };

  // Icône trend
  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-green-600' : trend === 'declining' ? 'text-red-600' : 'text-gray-500';
  const trendLabel = trend === 'improving' ? 'En amélioration' : trend === 'declining' ? 'En baisse' : 'Stable';

  // Calcul différence
  const diff = previousScore ? score - previousScore : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-100 p-8">
      {/* Gradient background subtil */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradeColors[grade]} opacity-5`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">{`Score ${branding.name}`}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(date).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
          
          {/* Badge Grade */}
          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${gradeColors[grade]} text-white font-semibold text-lg`}>
            {grade}
          </div>
        </div>

        {/* Score principal avec cercle */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {/* Cercle de progression */}
            <svg className="w-48 h-48 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - score / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={gradeColors[grade].split(' ')[0].replace('from-', '')} />
                  <stop offset="100%" className={gradeColors[grade].split(' ')[1].replace('to-', '')} />
                </linearGradient>
              </defs>
            </svg>

            {/* Score au centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-bold ${textColors[grade]}`}>
                {score}
              </span>
              <span className="text-2xl text-gray-400">/100</span>
            </div>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendLabel}
          </span>
          {diff !== 0 && (
            <span className={`text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({diff > 0 ? '+' : ''}{diff} pts)
            </span>
          )}
        </div>

        {/* Message d'encouragement */}
        <div className="text-center">
          {grade === 'A+' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Award className="w-5 h-5" />
              <p className="font-medium">Performance exceptionnelle !</p>
            </div>
          )}
          {grade === 'A' && (
            <p className="text-green-600 font-medium">Excellent travail !</p>
          )}
          {grade === 'B' && (
            <p className="text-blue-600 font-medium">Bon traitement, continuez !</p>
          )}
          {grade === 'C' && (
            <p className="text-yellow-600 font-medium">Quelques améliorations possibles</p>
          )}
          {(grade === 'D' || grade === 'F') && (
            <p className="text-red-600 font-medium">Contactez votre prestataire</p>
          )}
        </div>
      </div>
    </div>
  );
}
