import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { createClient } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

// White-label theme
import { applyThemeToDOM } from './config/theme';
import { branding } from './config/branding';

// PILIER 1 - REACTIVITE & FLUIDITE
import { QueryProvider } from './providers/QueryProvider';

// NOUVEAU : Init Sentry
import { initSentry, SentryErrorBoundary } from './utils/sentry';

// NOUVEAU : PWA
import { initPWA } from './utils/pwa';
import { PWABanner, NetworkStatus } from './components/pwa/PWABanner';

// NOUVEAU : Auth Context
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Import des composants globaux
import { ScrollToTop } from './components/ScrollToTop';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { QuickHelpButton } from './components/QuickHelpButton';

// NOUVEAU: Configurer la police (via CDN)
if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

// Initialiser Sentry au demarrage de l'app
initSentry();

// Appliquer le theme white-label
applyThemeToDOM();

// NOUVEAU : Initialiser PWA au demarrage (desactive dans Figma Make)
if (typeof window !== 'undefined') {
  const isFigma = window.location.hostname.includes('figma.site') ||
                  window.location.hostname.includes('figmaiframepreview') ||
                  window.location.hostname.includes('figma.com');

  if (!isFigma) {
    initPWA();
  }
}

// Utiliser le singleton Supabase client
const supabase = createClient();

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ApneeSommeil = lazy(() => import('./pages/ApneeSommeil').then(m => ({ default: m.ApneeSommeil })));
const ParcoursDiagnostic = lazy(() => import('./pages/ParcoursDiagnostic').then(m => ({ default: m.ParcoursDiagnostic })));
const TraitementPPC = lazy(() => import('./pages/TraitementPPC').then(m => ({ default: m.TraitementPPC })));
const PourquoiExpAir = lazy(() => import('./pages/PourquoiExpAir').then(m => ({ default: m.PourquoiExpAir })));
const EspacePatient = lazy(() => import('./pages/EspacePatient').then(m => ({ default: m.EspacePatient })));
const EspaceMedecin = lazy(() => import('./pages/EspaceMedecin').then(m => ({ default: m.EspaceMedecin })));
const EspaceAdmin = lazy(() => import('./pages/EspaceAdmin').then(m => ({ default: m.EspaceAdmin })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const QuiSommesNous = lazy(() => import('./pages/QuiSommesNous').then(m => ({ default: m.QuiSommesNous })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales').then(m => ({ default: m.MentionsLegales })));
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin').then(m => ({ default: m.DashboardAdmin })));
const DashboardPatient = lazy(() => import('./pages/DashboardPatient').then(m => ({ default: m.DashboardPatient })));
const DashboardMedecin = lazy(() => import('./pages/DashboardMedecin').then(m => ({ default: m.DashboardMedecin })));
const SetupPrestataire = lazy(() => import('./pages/SetupPrestataire').then(m => ({ default: m.SetupPrestataire })));
const MyData = lazy(() => import('./pages/MyData').then(m => ({ default: m.MyData })));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const PscCallback = lazy(() => import('./pages/PscCallback').then(m => ({ default: m.PscCallback })));
const DashboardFinance = lazy(() => import('./pages/DashboardFinance').then(m => ({ default: m.DashboardFinance })));

// NOUVEAU : Pages Auth & Routing
const LoginPage = lazy(() => import('./pages/auth/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const PatientsListPage = lazy(() => import('./pages/patients/PatientsList'));
const PatientDetailPage = lazy(() => import('./pages/patients/PatientDetail'));

// PHASE 3.5 : Pages Administration & Support
const AdminTeam = lazy(() => import('./pages/AdminTeam').then(m => ({ default: m.AdminTeam })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// PHASE 3.8 : Admission & Documents
const NewPatient = lazy(() => import('./pages/patients/NewPatient').then(m => ({ default: m.NewPatient })));

// Monitoring Dashboard des Alertes
const MonitoringDashboard = lazy(() => import('./components/dashboard/MonitoringDashboard').then(m => ({ default: m.MonitoringDashboard })));

// Page Interventions
const Interventions = lazy(() => import('./pages/Interventions').then(m => ({ default: m.Interventions })));

// PHASE 4 : Features avancees differenciantes
const SleepSimulator = lazy(() => import('./components/patient/SleepSimulator').then(m => ({ default: m.SleepSimulator })));
const WearableSync = lazy(() => import('./components/integrations/WearableSync').then(m => ({ default: m.WearableSync })));
const PatientForum = lazy(() => import('./components/community/PatientForum').then(m => ({ default: m.PatientForum })));
const DropoutPredictor = lazy(() => import('./components/ai/DropoutPredictor').then(m => ({ default: m.DropoutPredictor })));
const ConsumablesShop = lazy(() => import('./components/marketplace/ConsumablesShop').then(m => ({ default: m.ConsumablesShop })));
const APIDocumentation = lazy(() => import('./pages/APIDocumentation').then(m => ({ default: m.APIDocumentation })));

// PHASE 5 : Blog, Simulateur public, Jalons patient, Satisfaction, Bilan mensuel, Fidelite, Facturation, Data Export
const Blog = lazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const BlogArticleView = lazy(() => import('./pages/Blog').then(m => ({ default: m.BlogArticleView })));
const SleepScoreSimulator = lazy(() => import('./components/public/SleepScoreSimulator').then(m => ({ default: m.SleepScoreSimulator })));
const PatientMilestonesPage = lazy(() => import('./components/patient/PatientMilestones').then(m => ({ default: m.PatientMilestones })));
const SatisfactionSurvey = lazy(() => import('./components/patient/SatisfactionSurvey').then(m => ({ default: m.SatisfactionDashboard })));
const MonthlyReport = lazy(() => import('./components/patient/MonthlyReport').then(m => ({ default: m.MonthlyReport })));
const LoyaltyProgram = lazy(() => import('./components/patient/LoyaltyProgram').then(m => ({ default: m.LoyaltyProgram })));
const BillingManager = lazy(() => import('./components/admin/BillingManager').then(m => ({ default: m.BillingManager })));
const DataExport = lazy(() => import('./components/admin/DataExport').then(m => ({ default: m.DataExport })));

// PHASE 6 : Connecteurs PPC/CPAP
const ConnectorSettings = lazy(() => import('./pages/ConnectorSettings').then(m => ({ default: m.ConnectorSettings })));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <span className="text-white font-semibold text-2xl">M</span>
        </div>
        <p className="text-[#86868B]">Chargement...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-red-700 mb-4">
              {error?.message || 'Erreur inconnue'}
            </p>
            <button
              onClick={resetError}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reessayer
            </button>
          </div>
        </div>
      )}
      showDialog={false}
    >
      <QueryProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <PWABanner />
            <NetworkStatus />
            <div className="min-h-screen flex flex-col bg-white">
              <Header />
              <main className="flex-1 pt-16 lg:pt-20">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Routes publiques */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/apnee-sommeil" element={<ApneeSommeil />} />
                    <Route path="/parcours-diagnostic" element={<ParcoursDiagnostic />} />
                    <Route path="/traitement-ppc" element={<TraitementPPC />} />
                    <Route path="/pourquoi-expair" element={<PourquoiExpAir />} />
                    <Route path="/pourquoi-nous" element={<PourquoiExpAir />} />
                    <Route path="/espace-patient" element={<EspacePatient />} />
                    <Route path="/espace-medecin" element={<EspaceMedecin />} />
                    <Route path="/espace-admin" element={<EspaceAdmin />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/mentions-legales" element={<MentionsLegales />} />

                    {/* Routes d'authentification */}
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/login" element={<Login />} />

                    {/* Routes protegees - Dashboard principal */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Routes protegees - Patients (Medecin/Prestataire/Admin) */}
                    <Route
                      path="/patients"
                      element={
                        <ProtectedRoute allowedRoles={['medecin', 'prestataire', 'admin']}>
                          <PatientsListPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patients/:id"
                      element={
                        <ProtectedRoute allowedRoles={['medecin', 'prestataire', 'admin']}>
                          <PatientDetailPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Dashboards par role */}
                    <Route
                      path="/dashboard-patient"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <DashboardPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard-medecin"
                      element={
                        <ProtectedRoute requiredRole="medecin">
                          <DashboardMedecin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard-admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <DashboardAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard-finance"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'prestataire']}>
                          <DashboardFinance />
                        </ProtectedRoute>
                      }
                    />

                    {/* Routes Setup et Admin */}
                    <Route
                      path="/setup-prestataire"
                      element={
                        <ProtectedRoute requiredRole="prestataire">
                          <SetupPrestataire />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-data"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <MyData />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/psc-callback" element={<PscCallback />} />

                    {/* PHASE 3.5 : Routes Administration & Support */}
                    <Route
                      path="/admin-team"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminTeam />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/support"
                      element={
                        <ProtectedRoute>
                          <Support />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    {/* PHASE 3.8 : Routes Admission & Documents */}
                    <Route
                      path="/patients/new"
                      element={
                        <ProtectedRoute allowedRoles={['medecin', 'prestataire', 'admin']}>
                          <NewPatient />
                        </ProtectedRoute>
                      }
                    />

                    {/* Monitoring Dashboard des Alertes */}
                    <Route
                      path="/monitoring-dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['medecin', 'prestataire', 'admin']}>
                          <MonitoringDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Page Interventions */}
                    <Route
                      path="/interventions"
                      element={
                        <ProtectedRoute allowedRoles={['prestataire', 'admin']}>
                          <Interventions />
                        </ProtectedRoute>
                      }
                    />

                    {/* PHASE 4 : Features avancees differenciantes */}
                    <Route
                      path="/simulateur-sommeil"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <SleepSimulator />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/wearables"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <WearableSync />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/communaute"
                      element={
                        <ProtectedRoute>
                          <PatientForum />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/risque-decrochage"
                      element={
                        <ProtectedRoute allowedRoles={['prestataire', 'admin', 'medecin']}>
                          <DropoutPredictor />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/consommables"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <ConsumablesShop />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/api-docs" element={<APIDocumentation />} />

                    {/* PHASE 5 : Blog, Simulateur public, Patient features, Admin features */}
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogArticleView />} />
                    <Route path="/simulateur" element={<SleepScoreSimulator />} />
                    <Route
                      path="/mes-jalons"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <PatientMilestonesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/satisfaction"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'prestataire']}>
                          <SatisfactionSurvey />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bilan-mensuel"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <MonthlyReport />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/fidelite"
                      element={
                        <ProtectedRoute requiredRole="patient">
                          <LoyaltyProgram />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/facturation"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'prestataire']}>
                          <BillingManager />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/data-export"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <DataExport />
                        </ProtectedRoute>
                      }
                    />

                    {/* PHASE 6 : Configuration Connecteurs PPC/CPAP */}
                    <Route
                      path="/settings/connectors"
                      element={
                        <ProtectedRoute allowedRoles={['admin', 'prestataire']}>
                          <ConnectorSettings />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <BackToTop />
              <QuickHelpButton />
              <Toaster position="top-right" richColors />
            </div>
          </Router>
        </AuthProvider>
      </QueryProvider>
    </SentryErrorBoundary>
  );
}
