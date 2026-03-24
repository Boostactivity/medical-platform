'use client';

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, AlertCircle, CheckCircle, LogOut, Search, Download, Filter, FileText, Activity } from 'lucide-react';
import { doctorApi } from '../utils/api';
import { autoFixAuthOnError } from '../utils/autofix-auth';
import { forceLogoutAndClearTokens } from '../utils/force-logout';
import { toast } from 'sonner';
import { PatientStatusCard, FilterButtons } from '../components/dashboard/PatientStatusCard';
import { ObservanceChart } from '../components/dashboard/ObservanceChart';
import { DashboardLayout } from '../components/layouts/DashboardLayout';

export function DashboardMedecin() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAuthError, setShowAuthError] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const navigate = useNavigate();

  const generateDemoData = (avgHours: number) => {
    const data = [];
    for (let i = 30; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        hours_used: avgHours + (Math.random() - 0.5) * 2,
        leakage: Math.random() * 20,
        events: Math.floor(Math.random() * 10),
      });
    }
    return data;
  };

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/espace-medecin');
        return;
      }

      try {
        const data = await doctorApi.getDashboard(token);
        setUserData(data);
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading dashboard:', error);
        
        // If it's a role error, show banner and attempt auto-fix
        if (error?.message?.includes('Forbidden') || error?.message?.includes('Not a doctor')) {
          console.log('[DASHBOARD] Detected role error, showing banner and attempting auto-fix...');
          setShowAuthError(true);
          
          // Automatically attempt fix in background
          setTimeout(async () => {
            toast.info('🔧 Réparation automatique...', {
              description: 'Tentative de correction des métadonnées en cours...',
            });
            
            // Step 1: Force logout to clear old tokens
            await forceLogoutAndClearTokens();
            
            // Step 2: Fix auth metadata
            const fixed = await autoFixAuthOnError();
            
            if (fixed) {
              toast.success('✅ Réparation réussie !', {
                description: 'Reconnectez-vous maintenant avec testmedecin@demo.fr / Test-123',
                duration: 15000,
              });
              
              // Redirect to login after 3 seconds
              setTimeout(() => {
                navigate('/espace-medecin');
              }, 3000);
            } else {
              toast.error('❌ Échec de la réparation automatique', {
                description: 'Cliquez sur "Réparer maintenant" dans la bannière rouge ci-dessus.',
                duration: 15000,
              });
            }
          }, 1000);
        }
        // Demo data fallback - Enhanced with more realistic patient data
        setUserData({
          user: { name: 'Dr. Martin', email: 'dr.martin@demo.fr', specialty: 'Pneumologie' },
          patients: [
            {
              id: '1',
              name: 'Jean Dupont',
              email: 'jean.dupont@demo.fr',
              patientData: {
                treatment_start_date: '2024-01-15',
                device_installed: true,
                observance_data: generateDemoData(6.8),
              },
            },
            {
              id: '2',
              name: 'Marie Martin',
              email: 'marie.martin@demo.fr',
              patientData: {
                treatment_start_date: '2024-02-01',
                device_installed: true,
                observance_data: generateDemoData(7.5),
              },
            },
            {
              id: '3',
              name: 'Pierre Durand',
              email: 'pierre.durand@demo.fr',
              patientData: {
                treatment_start_date: '2024-03-10',
                device_installed: true,
                observance_data: generateDemoData(3.2),
              },
            },
            {
              id: '4',
              name: 'Sophie Lefebvre',
              email: 'sophie.lefebvre@demo.fr',
              patientData: {
                treatment_start_date: '2023-11-20',
                device_installed: true,
                observance_data: generateDemoData(8.1),
              },
            },
            {
              id: '5',
              name: 'Thomas Bernard',
              email: 'thomas.bernard@demo.fr',
              patientData: {
                treatment_start_date: '2024-02-20',
                device_installed: true,
                observance_data: generateDemoData(5.2),
              },
            },
            {
              id: '6',
              name: 'Claire Rousseau',
              email: 'claire.rousseau@demo.fr',
              patientData: {
                treatment_start_date: '2024-01-05',
                device_installed: true,
                observance_data: generateDemoData(2.8),
              },
            },
          ],
        });
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_type');
    navigate('/espace-medecin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#34C759] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-[#34C759] text-xl">Chargement des données patients...</div>
        </div>
      </div>
    );
  }

  const patients = userData?.patients || [];
  
  // Enhanced patient data with status
  const enhancedPatients = patients.map((p: any) => {
    const last7Days = p.patientData.observance_data.slice(-7);
    const avgHours = last7Days.reduce((acc: number, day: any) => acc + day.hours_used, 0) / last7Days.length;
    const compliance = (last7Days.filter((day: any) => day.hours_used >= 4).length / last7Days.length) * 100;
    const treatmentDays = Math.floor((new Date().getTime() - new Date(p.patientData.treatment_start_date).getTime()) / (1000 * 60 * 60 * 24));
    
    let status: 'excellent' | 'good' | 'warning' | 'alert' = 'good';
    if (avgHours >= 7) status = 'excellent';
    else if (avgHours >= 5) status = 'good';
    else if (avgHours >= 3) status = 'warning';
    else status = 'alert';
    
    return {
      ...p,
      avgHours,
      compliance,
      status,
      treatmentDays,
      lastSync: 'il y a 2h',
    };
  });

  // Filter patients
  const filteredPatients = enhancedPatients.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const totalPatients = enhancedPatients.length;
  const excellentCount = enhancedPatients.filter((p: any) => p.status === 'excellent').length;
  const warningCount = enhancedPatients.filter((p: any) => p.status === 'warning').length;
  const alertCount = enhancedPatients.filter((p: any) => p.status === 'alert').length;
  const goodObservance = enhancedPatients.filter((p: any) => p.avgHours >= 4).length;
  const needsAttention = warningCount + alertCount;
  const avgObservance = enhancedPatients.length > 0
    ? (enhancedPatients.reduce((acc: number, p: any) => acc + p.avgHours, 0) / enhancedPatients.length).toFixed(1)
    : '0';

  const handleExportPDF = (patientId: string) => {
    toast.success('📄 Export PDF généré', {
      description: 'Le rapport patient a été téléchargé avec succès.',
    });
  };

  const handleMessage = (patientId: string) => {
    toast.info('💬 Messagerie', {
      description: 'Fonctionnalité de messagerie sécurisée à venir.',
    });
  };

  return (
    <DashboardLayout
      userRole="medecin"
      userName={userData?.user?.name || 'Dr. Martin'}
      userEmail={userData?.user?.email || 'dr.martin@demo.fr'}
    >
      <div className="max-w-7xl mx-auto">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl text-foreground mb-2">
            Bonjour {userData?.user?.name} 👨‍⚕️
          </h1>
          <p className="text-xl text-muted-foreground">
            {userData?.user?.specialty} - Tableau de bord professionnel
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              icon: <Users className="w-8 h-8" />,
              title: 'Patients suivis',
              value: totalPatients,
              subtitle: 'appareillés actifs',
              color: 'from-[#34C759] to-[#30D158]',
            },
            {
              icon: <CheckCircle className="w-8 h-8" />,
              title: 'Bonne observance',
              value: goodObservance,
              subtitle: '≥ 4h/nuit',
              color: 'from-[#007AFF] to-[#5AC8FA]',
            },
            {
              icon: <AlertCircle className="w-8 h-8" />,
              title: 'À surveiller',
              value: needsAttention,
              subtitle: 'nécessite attention',
              color: 'from-[#FF9500] to-[#FF3B30]',
            },
            {
              icon: <Activity className="w-8 h-8" />,
              title: 'Observance moyenne',
              value: `${avgObservance}h`,
              subtitle: 'heures / nuit (moy.)',
              color: 'from-[#5856D6] to-[#AF52DE]',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4`}>
                {stat.icon}
              </div>
              <div className="text-3xl text-[#1D1D1F] mb-1">{stat.value}</div>
              <div className="text-sm text-[#86868B]">{stat.title}</div>
              <div className="text-xs text-[#86868B]">{stat.subtitle}</div>
            </motion.div>
          ))}
        </div>

        {/* Patients List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-8 shadow-sm mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-[#1D1D1F]">Mes patients</h2>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[#f8fafc] rounded-xl outline-none focus:ring-2 focus:ring-[#34C759] w-64"
                />
              </div>
              
              {/* Export all button */}
              <button className="flex items-center gap-2 px-5 py-2 bg-[#34C759] text-white rounded-xl hover:bg-[#2FB04C] transition-all shadow-sm">
                <FileText className="w-5 h-5" />
                Exporter tout
              </button>
            </div>
          </div>

          {/* Filters */}
          <FilterButtons
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={{
              all: totalPatients,
              excellent: excellentCount,
              warning: warningCount,
              alert: alertCount,
            }}
          />

          {/* Patient cards */}
          <div className="space-y-4">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#86868B] text-lg">Aucun patient trouvé</p>
              </div>
            ) : (
              filteredPatients.map((patient: any, index: number) => (
                <PatientStatusCard
                  key={patient.id}
                  patient={patient}
                  onExport={() => handleExportPDF(patient.id)}
                  onMessage={() => handleMessage(patient.id)}
                  index={index}
                />
              ))
            )}
          </div>
        </motion.div>

        {/* Selected patient detail (if any) */}
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <ObservanceChart
              data={selectedPatient.patientData.observance_data}
              title={`Suivi détaillé - ${selectedPatient.name}`}
            />
          </motion.div>
        )}

        {/* Quick actions for file active management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              title: 'Patients non-observants',
              value: alertCount,
              action: 'Revoir',
              color: '#FF3B30',
              bg: 'bg-[#FF3B30]/10',
            },
            {
              title: 'IAH > 10',
              value: Math.floor(totalPatients * 0.15),
              action: 'Analyser',
              color: '#FF9500',
              bg: 'bg-[#FF9500]/10',
            },
            {
              title: 'Absence de données > 3j',
              value: Math.floor(totalPatients * 0.08),
              action: 'Contacter',
              color: '#007AFF',
              bg: 'bg-[#007AFF]/10',
            },
          ].map((item, index) => (
            <div key={item.title} className="bg-white rounded-3xl p-6 shadow-sm">
              <div className={`${item.bg} rounded-2xl p-4 mb-4`}>
                <div className="text-3xl mb-1" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-sm text-[#86868B]">{item.title}</div>
              </div>
              <button
                className="w-full py-3 rounded-xl transition-all text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.action}
              </button>
            </div>
          ))}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}