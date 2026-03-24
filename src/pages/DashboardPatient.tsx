'use client';

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, TrendingUp, Zap, Target, Upload } from 'lucide-react';
import { patientApi } from '../utils/api';
import { ScoreCircle } from '../components/dashboard/ScoreCircle';
import { NightTimeline } from '../components/dashboard/NightTimeline';
import { MotivationalMessage } from '../components/dashboard/MotivationalMessage';
import { BadgeList, Badge } from '../components/dashboard/BadgeCard';
import { ObservanceChart } from '../components/dashboard/ObservanceChart';
import { ActivityRings } from '../components/dashboard/ProgressRing';
import { AssistanceCard } from '../components/dashboard/AssistanceCard';
import { DeviceStatus } from '../components/dashboard/DeviceStatus';
import { AchievementsBanner } from '../components/dashboard/AchievementsBanner';
import { AlertsCenter } from '../components/dashboard/AlertsCenter';

// PHASE 3: Import Business Components
import { ComplianceWidget } from '../components/business/ComplianceWidget';
import { EquipmentTracker } from '../components/business/EquipmentTracker';

// PHASE GAMIFICATION: Import Patient Engagement Components
import { Onboarding, isOnboardingDone } from '../components/patient/Onboarding';
import { DailyRating } from '../components/patient/DailyRating';
import { MotivationalEngine, buildMetricsFromDashboard } from '../components/patient/MotivationalEngine';
import { GrowthVisualization } from '../components/patient/GrowthVisualization';
import { BadgeSystem } from '../components/patient/BadgeSystem';
import { HealthQuiz } from '../components/patient/HealthQuiz';

export function DashboardPatient() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());
  const [showQuiz, setShowQuiz] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/espace-patient');
        return;
      }

      try {
        const data = await patientApi.getDashboard(token);
        setUserData(data);
        setUserId(data?.user?.id || '');
        setLoading(false);
      } catch (error: any) {
        console.log('[DASHBOARD] API call returned error, using fallback data:', error?.message);
        // Demo data fallback with enhanced data
        const demoUserId = 'demo-patient-' + Date.now();
        setUserData({
          user: { id: demoUserId, name: 'Jean Dupont', email: 'jean.dupont@demo.fr' },
          patientData: {
            device_installed: true,
            treatment_start_date: '2024-01-15',
            observance_data: generateDemoData(),
            last_night: {
              hours_used: 7.2,
              leakage: 12,
              events: 3,
              comfort_score: 4,
            },
          },
          doctor: { name: 'Dr. Martin', specialty: 'Pneumologie' },
        });
        setUserId(demoUserId);
        setLoading(false);
        setUsingFallback(true);
      }
    };

    loadData();
  }, [navigate]);

  const generateDemoData = () => {
    const data = [];
    for (let i = 30; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        hours_used: 5 + Math.random() * 3,
        leakage: Math.random() * 20,
        events: Math.floor(Math.random() * 10),
      });
    }
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    navigate('/espace-patient');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-[#007AFF] text-xl">Chargement de vos données...</div>
        </div>
      </div>
    );
  }

  // Calculate observance statistics
  const observanceStats = userData?.patientData?.observance_data || [];
  const last7Days = observanceStats.slice(-7);
  
  // Safety checks for empty data
  const avgHours = last7Days.length > 0 
    ? last7Days.reduce((acc: number, day: any) => acc + day.hours_used, 0) / last7Days.length 
    : 0;
  const compliance = last7Days.length > 0
    ? (last7Days.filter((day: any) => day.hours_used >= 4).length / last7Days.length) * 100
    : 0;
  const lastNight = userData?.patientData?.last_night || {
    hours_used: 0,
    leakage: 0,
    events: 0,
    comfort_score: 0
  };

  // Calculate score based on 4 criteria
  const calculateScore = () => {
    const hoursScore = Math.min((lastNight.hours_used / 7) * 100, 100);
    const leakageScore = Math.max(100 - (lastNight.leakage / 30) * 100, 0);
    const eventsScore = Math.max(100 - (lastNight.events / 10) * 100, 0);
    const comfortScore = (lastNight.comfort_score / 5) * 100;
    return Math.round((hoursScore + leakageScore + eventsScore + comfortScore) / 4);
  };

  const score = calculateScore();
  const treatmentDays = userData?.patientData?.treatment_start_date
    ? Math.floor((new Date().getTime() - new Date(userData.patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const consecutiveDays = 5; // Example
  const improvement = 12; // Example: +12% vs last week

  // Demo badges
  const badges: Badge[] = [
    {
      id: '1',
      name: 'Première semaine',
      description: '7 nuits consécutives',
      icon: '🌟',
      unlocked: true,
      unlockedAt: '2024-01-22',
    },
    {
      id: '2',
      name: 'Champion 30 jours',
      description: '30 nuits > 4h',
      icon: '🏆',
      unlocked: true,
      unlockedAt: '2024-02-14',
    },
    {
      id: '3',
      name: 'Score parfait',
      description: 'Score > 90 pendant 5 jours',
      icon: '⭐',
      unlocked: false,
      progress: 60,
      requirement: '3/5 jours complétés',
    },
    {
      id: '4',
      name: 'IAH stabilisé',
      description: 'IAH < 5 pendant 15 jours',
      icon: '💚',
      unlocked: false,
      progress: 73,
      requirement: '11/15 jours complétés',
    },
    {
      id: '5',
      name: 'Expert sommeil',
      description: '90 jours d\'observance',
      icon: '🎓',
      unlocked: false,
      progress: 35,
      requirement: `${treatmentDays}/90 jours`,
    },
    {
      id: '6',
      name: 'Sans interruption',
      description: '60 jours consécutifs',
      icon: '🔥',
      unlocked: false,
      progress: 8,
      requirement: '5/60 jours',
    },
  ];

  // Night timeline events
  const nightEvents = [
    { time: '22:30', type: 'sleep' as const },
    { time: '02:15', type: 'leak' as const, severity: 'low' as const },
    { time: '06:45', type: 'wake' as const },
  ];

  // Build motivational metrics
  const motivationalMetrics = buildMetricsFromDashboard({
    score,
    avgHours,
    compliance,
    consecutiveDays,
    lastNight: { leakage: lastNight.leakage, events: lastNight.events },
  });

  // Show onboarding overlay on first visit
  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  // Show quiz in full page mode
  if (showQuiz) {
    return (
      <div className="min-h-screen bg-[#f8fafc] py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowQuiz(false)}
            className="mb-6 flex items-center gap-2 text-[#007AFF] hover:text-[#0051D5] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au tableau de bord
          </button>
          <HealthQuiz onComplete={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Daily Rating Popup */}
      <DailyRating />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
                MedConnect
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-400">Espace Patient</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl text-[#1a2b3c] mb-2">
                Bonjour {userData?.user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-xl text-gray-500">
                Voici votre tableau de bord personnel
              </p>
            </div>
            
            {/* Bouton Mes Données IoT */}
            <Link
              to="/my-data"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium hover:shadow-lg transition-all"
            >
              <Upload className="w-5 h-5" />
              Mes Données IoT
            </Link>
          </div>
        </motion.div>

        {/* Score and Motivational Message */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Score Circle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-8 shadow-sm flex items-center justify-center"
          >
            <ScoreCircle score={score} maxScore={100} size="lg" />
          </motion.div>

          {/* Motivational Message */}
          <div className="lg:col-span-2">
            <MotivationalMessage
              score={score}
              streak={consecutiveDays}
              improvement={improvement}
            />
          </div>
        </div>

        {/* Motivational Engine + Growth Visualization */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <MotivationalEngine metrics={motivationalMetrics} maxMessages={3} />
          </div>
          <div>
            <GrowthVisualization consecutiveDays={consecutiveDays} compact />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              icon: <TrendingUp className="w-6 h-6" />,
              label: 'Moyenne 7 jours',
              value: `${avgHours.toFixed(1)}h`,
              color: 'from-[#007AFF] to-[#5AC8FA]',
            },
            {
              icon: <Target className="w-6 h-6" />,
              label: 'Observance',
              value: `${compliance.toFixed(0)}%`,
              color: 'from-[#34C759] to-[#30D158]',
            },
            {
              icon: <Zap className="w-6 h-6" />,
              label: 'Série en cours',
              value: `${consecutiveDays} jours`,
              color: 'from-[#FFD60A] to-[#FF9500]',
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              label: 'Traitement',
              value: `${treatmentDays} jours`,
              color: 'from-[#AF52DE] to-[#FF2D55]',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                {stat.icon}
              </div>
              <div className="text-2xl text-[#1a2b3c] mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Achievements Banner - NEW */}
        <div className="mb-8">
          <AchievementsBanner userId={userData?.user?.id || 'demo-user-id'} />
        </div>

        {/* Device Status - NEW */}
        <div className="mb-8">
          <DeviceStatus userId={userData?.user?.id || 'demo-user-id'} />
        </div>

        {/* Alerts Center - NEW */}
        <div className="mb-8">
          <AlertsCenter userId={userData?.user?.id || 'demo-user-id'} />
        </div>

        {/* PHASE 3: Business Widgets - Conformité CPAM & Équipements */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ComplianceWidget patientId={userId} />
          <EquipmentTracker patientId={userId} showActions={false} />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Night Timeline */}
          <div className="lg:col-span-2">
            <NightTimeline
              totalHours={lastNight.hours_used}
              events={nightEvents}
            />
          </div>

          {/* Assistance Card */}
          <div>
            <AssistanceCard />
          </div>
        </div>

        {/* Observance Chart */}
        <div className="mb-8">
          <ObservanceChart data={observanceStats} title="Mon suivi d'utilisation" />
        </div>

        {/* Activity Rings */}
        <div className="mb-8">
          <ActivityRings
            rings={[
              {
                value: avgHours,
                max: 8,
                label: 'Heures/nuit',
                color: '#007AFF',
              },
              {
                value: compliance,
                max: 100,
                label: 'Observance',
                color: '#34C759',
              },
              {
                value: consecutiveDays,
                max: 30,
                label: 'Série',
                color: '#FF9500',
              },
            ]}
          />
        </div>

        {/* Growth Visualization - Full */}
        <div className="mb-8">
          <GrowthVisualization consecutiveDays={consecutiveDays} />
        </div>

        {/* Badge System - Full Page */}
        <div className="mb-8">
          <BadgeSystem />
        </div>

        {/* Quiz Access Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-[#5856D6] to-[#AF52DE] rounded-3xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setShowQuiz(true)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Quiz Santé</h3>
              <p className="text-white/80 text-sm">Testez vos connaissances sur l'apnée et le traitement PPC</p>
            </div>
            <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </motion.div>

        {/* Legacy Badges (kept for compatibility) */}
        <BadgeList badges={badges} />

        {/* Doctor Info Card */}
        {userData?.doctor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-white rounded-3xl p-6 shadow-sm"
          >
            <h3 className="text-xl text-[#1a2b3c] mb-4">Votre équipe médicale</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-full flex items-center justify-center text-white text-2xl">
                {userData.doctor.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-lg text-[#1a2b3c]">{userData.doctor.name}</div>
                <div className="text-sm text-gray-500">{userData.doctor.specialty}</div>
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white rounded-full hover:shadow-lg transition-all">
                Contacter
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}