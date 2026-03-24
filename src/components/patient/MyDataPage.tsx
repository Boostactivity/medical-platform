/**
 * Page "Mes Données" - Dashboard IoT Patient
 * Affichage score + historique + upload fichiers
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ExpAirScoreCard } from '../iot/ExpAirScoreCard';
import { ScoreCriteriaBreakdown } from '../iot/ScoreCriteriaBreakdown';
import { ScoreHistoryChart } from '../iot/ScoreHistoryChart';
import { FileUploadZone } from '../iot/FileUploadZone';
import { Loader2, Upload, TrendingUp, Award } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface MyDataPageProps {
  userId: string;
}

export function MyDataPage({ userId }: MyDataPageProps) {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger données score
  const loadScoreData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/iot/score/${userId}?days=30`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScoreData(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur chargement données');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScoreData();
  }, [userId]);

  // Recharger après upload
  const handleUploadComplete = () => {
    loadScoreData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  const latestScore = scoreData?.scores?.[0];
  const hasData = scoreData?.scores && scoreData.scores.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Données</h1>
          <p className="text-gray-600">
            Suivez votre score la plateforme et importez vos données machine
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={hasData ? "dashboard" : "upload"} className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
            <TabsTrigger 
              value="dashboard" 
              className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="upload"
              className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer données
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {!hasData ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucune donnée disponible
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Importez vos données depuis votre machine PPC pour voir votre score la plateforme
                  </p>
                  <button
                    onClick={() => {
                      const uploadTab = document.querySelector('[value="upload"]') as HTMLElement;
                      uploadTab?.click();
                    }}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    Importer maintenant
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Score principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <ExpAirScoreCard
                      score={latestScore.total_score}
                      grade={latestScore.grade}
                      trend={latestScore.trend}
                      date={latestScore.date}
                      previousScore={latestScore.previous_score}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl border border-gray-200 p-6">
                      <ScoreCriteriaBreakdown criteria={latestScore.criteria} />
                    </div>
                  </div>
                </div>

                {/* Historique */}
                <ScoreHistoryChart scores={scoreData.scores} />

                {/* Stats résumé */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-blue-100">Score moyen</p>
                      <TrendingUp className="w-5 h-5 text-blue-200" />
                    </div>
                    <p className="text-4xl font-bold">{scoreData.summary.averageScore}</p>
                    <p className="text-sm text-blue-100 mt-2">Sur {scoreData.summary.totalDays} jours</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-purple-100">Grade actuel</p>
                      <Award className="w-5 h-5 text-purple-200" />
                    </div>
                    <p className="text-4xl font-bold">{scoreData.summary.currentGrade}</p>
                    <p className="text-sm text-purple-100 mt-2">
                      {scoreData.summary.currentTrend === 'improving' && '↗ En amélioration'}
                      {scoreData.summary.currentTrend === 'stable' && '→ Stable'}
                      {scoreData.summary.currentTrend === 'declining' && '↘ En baisse'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-emerald-100">Dernière MAJ</p>
                      <Upload className="w-5 h-5 text-emerald-200" />
                    </div>
                    <p className="text-lg font-bold">
                      {new Date(latestScore.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </p>
                    <p className="text-sm text-emerald-100 mt-2">
                      {scoreData.summary.totalDays} nuits enregistrées
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <div className="bg-white rounded-3xl border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Importer vos données
                </h2>
                <p className="text-gray-600">
                  Téléchargez vos données depuis votre machine PPC pour mettre à jour votre score
                </p>
              </div>

              <FileUploadZone
                patientId={userId}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
