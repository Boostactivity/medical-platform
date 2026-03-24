/**
 * BILAN MENSUEL PDF PATIENT
 *
 * Genere automatiquement un PDF a la fin de chaque mois
 * Contenu : temps total, nuits observantes %, IAH moyen, heures repos regagnees
 * Graphique du mois, message motivationnel, bouton telecharger
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Download, Calendar, Clock, Activity, Moon, TrendingUp,
  Award, ChevronLeft, ChevronRight, Heart, Zap, BarChart3
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../../supabase/client';

// ---- Types ----

interface MonthlyData {
  month: string; // YYYY-MM
  label: string;
  totalNights: number;
  observantNights: number;
  totalHours: number;
  avgIAH: number;
  avgUsagePerNight: number;
  avgLeaks: number;
  bestStreak: number;
  dailyData: { day: number; hours: number; iah: number; observant: boolean }[];
}

// ---- Mock Data ----

function generateMonthlyData(): MonthlyData[] {
  const months: MonthlyData[] = [];
  const monthNames = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
  ];

  for (let m = 0; m < 6; m++) {
    const date = new Date(2026, 2 - m, 1); // March 2026 backwards
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const isCurrentMonth = m === 0;
    const daysToGenerate = isCurrentMonth ? new Date().getDate() - 1 : daysInMonth;

    const dailyData: MonthlyData['dailyData'] = [];
    let streak = 0;
    let bestStreak = 0;

    for (let d = 1; d <= daysToGenerate; d++) {
      const baseHours = 5.5 + Math.random() * 2.5 + m * 0.1; // Improving over time
      const hours = Math.max(0, +(baseHours + (Math.random() - 0.5) * 3).toFixed(1));
      const iah = +(1 + Math.random() * 5).toFixed(1);
      const observant = hours >= 4;

      if (observant) {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }

      dailyData.push({ day: d, hours, iah, observant });
    }

    const observantNights = dailyData.filter(d => d.observant).length;
    const totalHours = +dailyData.reduce((s, d) => s + d.hours, 0).toFixed(1);
    const avgIAH = +(dailyData.reduce((s, d) => s + d.iah, 0) / dailyData.length).toFixed(1);
    const avgUsage = +(totalHours / dailyData.length).toFixed(1);

    months.push({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${monthNames[month]} ${year}`,
      totalNights: daysToGenerate,
      observantNights,
      totalHours,
      avgIAH,
      avgUsagePerNight: avgUsage,
      avgLeaks: +(5 + Math.random() * 12).toFixed(1),
      bestStreak,
      dailyData,
    });
  }

  return months;
}

// ---- Motivational messages ----

function getMotivationalMessage(observanceRate: number, avgUsage: number): string {
  if (observanceRate >= 90 && avgUsage >= 6) {
    return 'Exceptionnel ! Vous etes un modele d\'observance. Votre sante vous remercie. Continuez ainsi, chaque nuit compte !';
  }
  if (observanceRate >= 70) {
    return 'Bravo ! Votre regularite est tres bonne. Vous etes sur la bonne voie pour un sommeil de qualite durable. Quelques nuits supplementaires et vous atteindrez l\'excellence !';
  }
  if (observanceRate >= 50) {
    return 'Bon effort ce mois-ci ! Essayez d\'atteindre 4 heures chaque nuit pour maximiser les benefices du traitement. Chaque heure supplementaire ameliore votre sante cardiovasculaire.';
  }
  return 'Ce mois a ete difficile, mais ne vous decouragez pas. Contactez votre technicien si le masque est inconfortable. Nous sommes la pour vous aider a trouver des solutions.';
}

// ---- PDF Generation ----

function generatePDF(data: MonthlyData) {
  const doc = new jsPDF();
  const obsRate = Math.round((data.observantNights / data.totalNights) * 100);

  // Header gradient
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setFillColor(139, 92, 246);
  doc.rect(140, 0, 70, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Bilan Mensuel', 20, 22);
  doc.setFontSize(14);
  doc.text(data.label, 20, 33);
  doc.setFontSize(10);
  doc.text('Traitement PPC - Suivi Apnee du Sommeil', 20, 40);

  // KPIs section
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.text('Indicateurs cles', 20, 58);

  const kpis = [
    { label: 'Nuits observantes', value: `${data.observantNights}/${data.totalNights} (${obsRate}%)` },
    { label: 'Temps total de traitement', value: `${data.totalHours} heures` },
    { label: 'Usage moyen par nuit', value: `${data.avgUsagePerNight} heures` },
    { label: 'IAH moyen residuel', value: `${data.avgIAH} evenements/h` },
    { label: 'Fuites moyennes', value: `${data.avgLeaks} L/min` },
    { label: 'Meilleure serie', value: `${data.bestStreak} nuits consecutives` },
  ];

  let y = 68;
  doc.setFontSize(10);
  kpis.forEach(kpi => {
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.label, 20, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, 120, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Observance bar chart (simplified)
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('Usage quotidien (heures)', 20, y);
  y += 8;

  const chartWidth = 170;
  const barWidth = Math.min(5, chartWidth / data.dailyData.length - 0.5);
  const maxH = 30;

  // Seuil 4h line
  doc.setDrawColor(239, 68, 68);
  doc.setLineDash([2, 2]);
  const thresholdY = y + maxH - (4 / 10) * maxH;
  doc.line(20, thresholdY, 20 + chartWidth, thresholdY);
  doc.setFontSize(7);
  doc.setTextColor(239, 68, 68);
  doc.text('4h (seuil)', 20 + chartWidth + 2, thresholdY + 2);
  doc.setLineDash([]);

  data.dailyData.forEach((d, i) => {
    const barH = Math.min((d.hours / 10) * maxH, maxH);
    const x = 20 + i * (chartWidth / data.dailyData.length);
    const barY = y + maxH - barH;

    if (d.observant) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(251, 146, 60);
    }
    doc.rect(x, barY, barWidth, barH, 'F');
  });

  // X axis labels
  y += maxH + 5;
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  for (let d = 1; d <= data.dailyData.length; d += 5) {
    const x = 20 + (d - 1) * (chartWidth / data.dailyData.length);
    doc.text(String(d), x, y);
  }

  // Legend
  y += 8;
  doc.setFontSize(8);
  doc.setFillColor(34, 197, 94);
  doc.rect(20, y - 3, 4, 4, 'F');
  doc.setTextColor(80, 80, 80);
  doc.text('Nuit observante (>= 4h)', 26, y);
  doc.setFillColor(251, 146, 60);
  doc.rect(80, y - 3, 4, 4, 'F');
  doc.text('Nuit non observante (< 4h)', 86, y);

  // Motivational message
  y += 15;
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(20, y, 170, 25, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(59, 130, 246);
  doc.text('Message de votre equipe :', 25, y + 7);
  doc.setTextColor(60, 60, 60);
  const msg = getMotivationalMessage(obsRate, data.avgUsagePerNight);
  const splitMsg = doc.splitTextToSize(msg, 160);
  doc.text(splitMsg, 25, y + 14);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('Document genere automatiquement - Ne remplace pas un avis medical', 20, 285);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 150, 285);

  doc.save(`Bilan_${data.label.replace(/\s/g, '_')}.pdf`);
}

// ---- Composant Principal ----

export function MonthlyReport() {
  const [monthsData, setMonthsData] = useState<MonthlyData[]>(generateMonthlyData);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  useEffect(() => {
    const fetchFromSupabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: therapyData, error } = await supabase
          .from('therapy_data')
          .select('date, usage_hours, ahi, leaks')
          .eq('patient_id', user.id)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });
        if (!error && therapyData?.length) {
          // Build current month from real data
          const dailyData = therapyData.map((d: any) => ({
            day: new Date(d.date).getDate(),
            hours: d.usage_hours ?? 0,
            iah: d.ahi ?? 0,
            observant: (d.usage_hours ?? 0) >= 4,
          }));
          const observantNights = dailyData.filter((d: any) => d.observant).length;
          const totalHours = +dailyData.reduce((s: number, d: any) => s + d.hours, 0).toFixed(1);
          const avgIAH = dailyData.length > 0
            ? +(dailyData.reduce((s: number, d: any) => s + d.iah, 0) / dailyData.length).toFixed(1)
            : 0;
          const avgUsage = dailyData.length > 0 ? +(totalHours / dailyData.length).toFixed(1) : 0;
          const now = new Date();
          const monthNames = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
          const currentMonthData: MonthlyData = {
            month: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,
            label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
            totalNights: dailyData.length,
            observantNights,
            totalHours,
            avgIAH,
            avgUsagePerNight: avgUsage,
            avgLeaks: therapyData.reduce((s: number, d: any) => s + (d.leaks ?? 0), 0) / therapyData.length,
            bestStreak: 0,
            dailyData,
          };
          // Replace first month (current) with real data, keep mock for older
          setMonthsData(prev => [currentMonthData, ...prev.slice(1)]);
        }
      } catch (e) {
        console.warn('MonthlyReport: Using mock data', e);
      }
    };
    fetchFromSupabase();
  }, []);

  const currentMonth = monthsData[selectedMonthIdx];
  const obsRate = Math.round((currentMonth.observantNights / currentMonth.totalNights) * 100);
  const hoursGained = +(currentMonth.avgUsagePerNight * currentMonth.observantNights * 0.15).toFixed(0); // heures de repos qualite regagnees

  const maxDailyHours = Math.max(...currentMonth.dailyData.map(d => d.hours), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Mon bilan mensuel
          </h2>
          <p className="text-sm text-gray-500 mt-1">Recapitulatif de votre traitement PPC</p>
        </div>
        <button
          onClick={() => generatePDF(currentMonth)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Telecharger mon bilan
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setSelectedMonthIdx(Math.min(selectedMonthIdx + 1, monthsData.length - 1))}
          disabled={selectedMonthIdx >= monthsData.length - 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{currentMonth.label}</p>
          <p className="text-xs text-gray-400">{currentMonth.totalNights} nuits analysees</p>
        </div>
        <button
          onClick={() => setSelectedMonthIdx(Math.max(selectedMonthIdx - 1, 0))}
          disabled={selectedMonthIdx <= 0}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          key={`obs-${currentMonth.month}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-xl p-4 ${obsRate >= 70 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}
        >
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Moon className="w-4 h-4" /> Nuits observantes
          </div>
          <p className="text-3xl font-bold text-gray-900">{obsRate}%</p>
          <p className="text-xs text-gray-500">{currentMonth.observantNights}/{currentMonth.totalNights} nuits</p>
        </motion.div>

        <motion.div
          key={`hours-${currentMonth.month}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Clock className="w-4 h-4" /> Temps total
          </div>
          <p className="text-3xl font-bold text-gray-900">{currentMonth.totalHours}h</p>
          <p className="text-xs text-gray-500">{currentMonth.avgUsagePerNight}h/nuit en moyenne</p>
        </motion.div>

        <motion.div
          key={`iah-${currentMonth.month}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Activity className="w-4 h-4" /> IAH moyen
          </div>
          <p className="text-3xl font-bold text-gray-900">{currentMonth.avgIAH}</p>
          <p className="text-xs text-gray-500">evenements/h</p>
        </motion.div>

        <motion.div
          key={`rest-${currentMonth.month}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Heart className="w-4 h-4" /> Repos regagne
          </div>
          <p className="text-3xl font-bold text-gray-900">~{hoursGained}h</p>
          <p className="text-xs text-gray-500">de sommeil reparateur</p>
        </motion.div>
      </div>

      {/* Daily chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Usage quotidien
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Observant</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full" /> Non observant</span>
            <span className="flex items-center gap-1"><span className="w-3 h-px bg-red-400" /> Seuil 4h</span>
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="relative">
          {/* 4h threshold line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-red-300 z-10"
            style={{ bottom: `${(4 / Math.max(maxDailyHours, 8)) * 100}%` }}
          >
            <span className="absolute -top-3 right-0 text-xs text-red-400">4h</span>
          </div>

          <div className="flex items-end gap-px" style={{ height: '160px' }}>
            {currentMonth.dailyData.map((d, i) => {
              const heightPct = (d.hours / Math.max(maxDailyHours, 8)) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  style={{ height: '100%' }}
                >
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${
                      d.observant ? 'bg-green-400 hover:bg-green-500' : 'bg-orange-400 hover:bg-orange-500'
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: d.hours > 0 ? '2px' : '0' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      J{d.day}: {d.hours}h (IAH: {d.iah})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex mt-1">
            {currentMonth.dailyData.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                {(d.day === 1 || d.day % 5 === 0) && (
                  <span className="text-[9px] text-gray-400">{d.day}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streak + additional stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-700 mb-2">
            <Zap className="w-4 h-4" /> Meilleure serie du mois
          </div>
          <p className="text-3xl font-bold text-yellow-800">{currentMonth.bestStreak} nuits</p>
          <p className="text-sm text-yellow-600">consecutives d'observance</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-indigo-700 mb-2">
            <TrendingUp className="w-4 h-4" /> Fuites moyennes
          </div>
          <p className="text-3xl font-bold text-indigo-800">{currentMonth.avgLeaks} L/min</p>
          <p className="text-sm text-indigo-600">
            {currentMonth.avgLeaks < 10 ? 'Excellent niveau de fuites' :
              currentMonth.avgLeaks < 20 ? 'Niveau acceptable' : 'A verifier avec votre technicien'}
          </p>
        </div>
      </div>

      {/* Motivational message */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Message de votre equipe</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {getMotivationalMessage(obsRate, currentMonth.avgUsagePerNight)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
