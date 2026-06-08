import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner@2.0.3';
import { createClient } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

// PILIER 1 - RÉACTIVITÉ & FLUIDITÉ
import { QueryProvider } from './providers/QueryProvider';

// NOUVEAU : Init Sentry
import { initSentry, SentryErrorBoundary } from './utils/sentry';

// NOUVEAU : PWA
import { initPWA } from './utils/pwa';
import { PWABanner, NetworkStatus } from './components/pwa/PWABanner';

// NOUVEAU : Auth Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Import des composants globaux
import { ScrollToTop } from './components/ScrollToTop';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';

// Initialiser Sentry au démarrage de l'app
initSentry();

// NOUVEAU : Initialiser PWA au démarrage (désactivé dans Figma Make)
if (typeof window !== 'undefined') {
  // Vérifier si on est dans Figma
  const isFigma = window.location.hostname.includes('figma.site') || 
                  window.location.hostname.includes('figmaiframepreview') ||
                  window.location.hostname.includes('figma.com');
  
  if (isFigma) {
    console.log('%c🎨 FIGMA MAKE PREVIEW MODE', 'background: #00D4D4; color: #00173D; font-size: 14px; padding: 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c⚠️ PWA features are disabled in preview', 'color: #B34000; font-size: 12px;');
    console.log('%c✅ Deploy to production to test PWA (Service Worker, Offline mode, Installation)', 'color: #18753C; font-size: 12px;');
  } else {
    initPWA();
  }
}

// Utiliser le singleton Supabase client pour éviter multiple instances
const supabase = createClient();

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ApneeSommeil = lazy(() => import('./pages/ApneeSommeil').then(m => ({ default: m.ApneeSommeil })));
const ParcoursDiagnostic = lazy(() => import('./pages/ParcoursDiagnostic').then(m => ({ default: m.ParcoursDiagnostic })));
const TraitementPPC = lazy(() => import('./pages/TraitementPPC').then(m => ({ default: m.TraitementPPC })));
const PourquoiMedical = lazy(() => import('./pages/PourquoiMedical').then(m => ({ default: m.PourquoiMedical })));
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
const MyData = lazy(() => import('./pages/MyData').then(m => ({ default: m.MyData })));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const PscCallback = lazy(() => import('./pages/PscCallback').then(m => ({ default: m.PscCallback })));
const DashboardFinance = lazy(() => import('./pages/DashboardFinance').then(m => ({ default: m.DashboardFinance })));

// NOUVEAU : Pages Auth & Routing
const LoginPage = lazy(() => import('./pages/auth/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword'));
// NOTE : pages/Dashboard.tsx conservé (recyclage prévu) mais décâblé —
// /dashboard est désormais un redirecteur role-based (DashboardRedirect).
const PatientsListPage = lazy(() => import('./pages/patients/PatientsList'));
const PatientDetailPage = lazy(() => import('./pages/patients/PatientDetail'));

// PHASE 3.5 : Pages Administration & Support
const AdminTeam = lazy(() => import('./pages/AdminTeam').then(m => ({ default: m.AdminTeam })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// PHASE 3.8 : Admission & Documents
const NewPatient = lazy(() => import('./pages/patients/NewPatient').then(m => ({ default: m.NewPatient })));

// NOUVEAU : Monitoring Dashboard des Alertes
const MonitoringDashboard = lazy(() => import('./components/dashboard/MonitoringDashboard').then(m => ({ default: m.MonitoringDashboard })));

// NOUVEAU : Page Interventions (Historique alertes résolues)
const Interventions = lazy(() => import('./pages/Interventions').then(m => ({ default: m.Interventions })));

// CHANTIER 2 : Back-office PSAD — stock, parc machines, planning, conformité PSDM
const Stock = lazy(() => import('./pages/pro/Stock').then(m => ({ default: m.Stock })));
const Parc = lazy(() => import('./pages/pro/Parc').then(m => ({ default: m.Parc })));
const Planning = lazy(() => import('./pages/pro/Planning').then(m => ({ default: m.Planning })));
const Conformite = lazy(() => import('./pages/pro/Conformite').then(m => ({ default: m.Conformite })));

// VAGUE 6 : services patient + messagerie + connecteurs
const CommandesPatient = lazy(() => import('./pages/patient/Commandes').then(m => ({ default: m.Commandes })));
const RendezVousPatient = lazy(() => import('./pages/patient/RendezVous').then(m => ({ default: m.RendezVous })));
const DocumentsPatient = lazy(() => import('./pages/patient/Documents').then(m => ({ default: m.Documents })));
const MessagesPatient = lazy(() => import('./pages/patient/Messages').then(m => ({ default: m.MessagesPatient })));
const CommandesPro = lazy(() => import('./pages/pro/Commandes').then(m => ({ default: m.CommandesPro })));
const DemandesRdv = lazy(() => import('./pages/pro/DemandesRdv').then(m => ({ default: m.DemandesRdv })));
const Connecteurs = lazy(() => import('./pages/pro/Connecteurs').then(m => ({ default: m.Connecteurs })));

// VAGUE 7 : engagement — sleep school, communauté, check-in
const SleepSchool = lazy(() => import('./pages/patient/SleepSchool').then(m => ({ default: m.SleepSchool })));
const Communaute = lazy(() => import('./pages/patient/Communaute').then(m => ({ default: m.Communaute })));
const CheckIn = lazy(() => import('./pages/patient/CheckIn').then(m => ({ default: m.CheckIn })));
const Moderation = lazy(() => import('./pages/pro/Moderation').then(m => ({ default: m.Moderation })));
const SuiviPatients = lazy(() => import('./pages/pro/SuiviPatients').then(m => ({ default: m.SuiviPatients })));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <span className="text-primary-foreground font-semibold text-2xl">M</span>
        </div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

/**
 * Redirecteur role-based pour /dashboard :
 * envoie chaque utilisateur connecté vers le dashboard de SON audience.
 */
function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const role = user.user_metadata?.role || 'patient';

  switch (role) {
    case 'doctor':
      return <Navigate to="/medecin/dashboard" replace />;
    case 'admin':
    case 'prestataire':
      return <Navigate to="/pro/dashboard" replace />;
    case 'patient':
    default:
      return <Navigate to="/patient/dashboard" replace />;
  }
}

/**
 * Redirect de compatibilité avec paramètre dynamique
 * (React Router v6 ne supporte pas les params dans <Navigate to>).
 */
function RedirectWithId({ to }: { to: (id: string) => string }) {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={to(id ?? '')} replace />;
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
              Réessayer
            </button>
          </div>
        </div>
      )}
      showDialog={false}
    >
      {/* PILIER 1 - RÉACTIVITÉ & FLUIDITÉ : Wrapping avec QueryProvider */}
      <QueryProvider>
        <TenantProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            {/* NOUVEAU : Bannières PWA (Installation + Offline) */}
            <PWABanner />
            <NetworkStatus />
            <div className="min-h-screen flex flex-col bg-white">
              <Header />
              <main className="flex-1 pt-16 lg:pt-20">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* ============ PUBLIC VITRINE (racine) ============ */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/apnee-sommeil" element={<ApneeSommeil />} />
                    <Route path="/parcours-diagnostic" element={<ParcoursDiagnostic />} />
                    <Route path="/traitement-ppc" element={<TraitementPPC />} />
                    <Route path="/pourquoi-medical" element={<PourquoiMedical />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/mentions-legales" element={<MentionsLegales />} />
                    <Route path="/psc-callback" element={<PscCallback />} />

                    {/* ============ AUDIENCE PATIENT ============ */}
                    <Route path="/patient/connexion" element={<EspacePatient />} />
                    <Route
                      path="/patient/dashboard"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <DashboardPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/mes-donnees"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <MyData />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/commandes"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <CommandesPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/rendez-vous"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <RendezVousPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/documents"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <DocumentsPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/messages"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <MessagesPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/ecole-du-sommeil"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <SleepSchool />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/communaute"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <Communaute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patient/check-in"
                      element={
                        <ProtectedRoute roles={['patient']}>
                          <CheckIn />
                        </ProtectedRoute>
                      }
                    />

                    {/* ============ AUDIENCE MÉDECIN ============ */}
                    <Route path="/medecin/connexion" element={<EspaceMedecin />} />
                    <Route
                      path="/medecin/dashboard"
                      element={
                        <ProtectedRoute roles={['doctor']}>
                          <DashboardMedecin />
                        </ProtectedRoute>
                      }
                    />

                    {/* ============ AUDIENCE PRO (back-office PSAD) ============ */}
                    <Route path="/pro/connexion" element={<EspaceAdmin />} />
                    <Route
                      path="/pro/dashboard"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <DashboardAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/patients"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire', 'doctor']}>
                          <PatientsListPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/patients/nouveau"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <NewPatient />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/patients/:id"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire', 'doctor']}>
                          <PatientDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/interventions"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Interventions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/stock"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Stock />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/conformite"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Conformite />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/commandes"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <CommandesPro />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/demandes-rdv"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <DemandesRdv />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/connecteurs"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Connecteurs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/moderation"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Moderation />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/suivi-patients"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <SuiviPatients />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/parc"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Parc />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/planning"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <Planning />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/monitoring"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <MonitoringDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/finance"
                      element={
                        <ProtectedRoute roles={['admin', 'prestataire']}>
                          <DashboardFinance />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/equipe"
                      element={
                        <ProtectedRoute roles={['admin']}>
                          <AdminTeam />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/parametres"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pro/support"
                      element={
                        <ProtectedRoute>
                          <Support />
                        </ProtectedRoute>
                      }
                    />

                    {/* ============ AUDIENCE TECHNICIEN (réservé) ============ */}
                    {/* Pas encore de pages — préfixe /technicien/ réservé */}

                    {/* ============ ROUTES GÉNÉRIQUES ============ */}
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<DashboardRedirect />} />

                    {/* ============ REDIRECTS DE COMPATIBILITÉ (anciens chemins) ============ */}
                    <Route path="/espace-patient" element={<Navigate to="/patient/connexion" replace />} />
                    <Route path="/espace-medecin" element={<Navigate to="/medecin/connexion" replace />} />
                    <Route path="/espace-admin" element={<Navigate to="/pro/connexion" replace />} />
                    <Route path="/dashboard-patient" element={<Navigate to="/patient/dashboard" replace />} />
                    <Route path="/dashboard-medecin" element={<Navigate to="/medecin/dashboard" replace />} />
                    <Route path="/dashboard-admin" element={<Navigate to="/pro/dashboard" replace />} />
                    <Route path="/dashboard-finance" element={<Navigate to="/pro/finance" replace />} />
                    <Route path="/patients" element={<Navigate to="/pro/patients" replace />} />
                    <Route path="/patients/new" element={<Navigate to="/pro/patients/nouveau" replace />} />
                    <Route path="/patients/:id" element={<RedirectWithId to={(id) => `/pro/patients/${id}`} />} />
                    <Route path="/interventions" element={<Navigate to="/pro/interventions" replace />} />
                    <Route path="/monitoring-dashboard" element={<Navigate to="/pro/monitoring" replace />} />
                    <Route path="/admin-team" element={<Navigate to="/pro/equipe" replace />} />
                    <Route path="/settings" element={<Navigate to="/pro/parametres" replace />} />
                    <Route path="/support" element={<Navigate to="/pro/support" replace />} />
                    <Route path="/my-data" element={<Navigate to="/patient/mes-donnees" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <BackToTop />
              <Toaster position="top-right" richColors />
            </div>
          </Router>
        </AuthProvider>
        </TenantProvider>
      </QueryProvider>
    </SentryErrorBoundary>
  );
}