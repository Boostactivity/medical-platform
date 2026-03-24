/**
 * PAGE DASHBOARD GÉNÉRIQUE - Dashboard principal selon le rôle
 * 
 * Affiche un dashboard adapté au rôle de l'utilisateur :
 * - Patient : Score, observance, prochains RDV
 * - Médecin : Vue d'ensemble impressionnante avec KPIs, graphiques IAH, alertes
 * - Admin : Métriques business, finance, conformité
 * - Prestataire : Interventions, stocks, télémétrie
 * 
 * Cette page sert de point d'entrée après connexion
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/layouts/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Users, Activity, DollarSign, Package, ArrowRight, TrendingUp, AlertCircle, Wifi, Target } from 'lucide-react'
import { Badge } from '../components/ui/badge'

// NOUVEAU : Composants Dashboard Médecin
import { StatCard } from '../components/dashboard/StatCard'
import { ProgressRing } from '../components/dashboard/ProgressRing'
import { IAHChart } from '../components/dashboard/IAHChart'
import { AlertsList } from '../components/dashboard/AlertsList'

// NOUVEAU : Données mockées
import { mockKPIs, mockIAHHistory, mockAlerts } from '../mocks/patientData'

export function DashboardPage() {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()

  // Utiliser le role résolu par AuthContext (pas user_metadata qui peut être obsolète)
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Utilisateur'
  const userEmail = user?.email || ''

  // Date du jour formatée
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <DashboardLayout userRole={userRole} userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        {/* Contenu selon le rôle */}
        {userRole === 'medecin' && (
          <>
            {/* Header avec date */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
                Bonjour, Dr. {userName} 👋
              </h1>
              <p className="text-gray-600 capitalize">
                {today}
              </p>
            </div>

            {/* KPIs - 4 cartes en ligne */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Patients Actifs"
                value={mockKPIs.patientsActifs}
                icon={Users}
                trend={{ value: 3, isPositive: true }}
                color="blue"
                delay={0}
              />
              <StatCard
                title="Alertes Critiques"
                value={mockKPIs.alertesCritiques}
                icon={AlertCircle}
                color="red"
                delay={0.1}
              />
              <StatCard
                title="Observance Moyenne"
                value={`${mockKPIs.observanceMoyenne}%`}
                icon={Target}
                color="green"
                delay={0.2}
              />
              <StatCard
                title="Appareils Connectés"
                value={`${mockKPIs.appareilsConnectes}%`}
                icon={Wifi}
                trend={{ value: 2, isPositive: true }}
                color="purple"
                delay={0.3}
              />
            </div>

            {/* Grille principale - Style Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne Gauche - Score Ring */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Score Global du Parc</h3>
                  <ProgressRing
                    value={mockKPIs.scoreGlobal}
                    max={100}
                    label="Score Moyen"
                    color="#34C759"
                    size="lg"
                  />
                  <p className="text-sm text-gray-500 mt-6 text-center max-w-xs">
                    Basé sur l'observance, l'IAH et la qualité du sommeil de {mockKPIs.patientsActifs} patients
                  </p>
                </div>
              </div>

              {/* Colonne Centre - Graphique IAH Large */}
              <div className="lg:col-span-2">
                <IAHChart data={mockIAHHistory} title="Évolution IAH Moyen du Parc" />
              </div>
            </div>

            {/* Section Alertes et Accès Rapides */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertes */}
              <AlertsList alerts={mockAlerts} maxItems={5} />

              {/* Accès rapides */}
              <div className="space-y-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 hover:border-blue-400" onClick={() => navigate('/patients')}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Mes Patients
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Voir la liste complète et les détails de chaque patient
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-3xl font-semibold text-blue-600">{mockKPIs.patientsActifs}</div>
                        <div className="text-sm text-gray-500">Patients suivis</div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Accéder
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 hover:border-purple-400" onClick={() => navigate('/monitoring-dashboard')}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        Télémétrie
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Consulter les données de télémétrie en temps réel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-3xl font-semibold text-purple-600">{mockKPIs.appareilsConnectes}%</div>
                        <div className="text-sm text-gray-500">Appareils connectés</div>
                      </div>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Voir données
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200 hover:border-orange-400" onClick={() => navigate('/dashboard-finance')}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-orange-600" />
                        Dashboard Finance
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Accéder aux métriques financières et conformité CPAM
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      Accéder
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {userRole === 'patient' && (
          <>
            {/* Dashboard patient simplifié */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mon Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold text-green-600">87</div>
                  <p className="text-sm text-muted-foreground mt-2">Excellent résultat !</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Observance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold text-green-600">92%</div>
                  <p className="text-sm text-muted-foreground mt-2">Continuez comme ça</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nuits utilisées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold">27/30</div>
                  <p className="text-sm text-muted-foreground mt-2">Ce mois-ci</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Accès rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={() => navigate('/dashboard-patient')}>
                    <Activity className="w-4 h-4 mr-2" />
                    Mon Suivi
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/my-data')}>
                    Mes Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {userRole === 'admin' && (
          <>
            {/* Dashboard admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Revenus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">127 450 €</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Patients actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">456</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stock critique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-orange-600">8</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conformité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-green-600">98%</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {userRole === 'prestataire' && (
          <>
            {/* Dashboard prestataire */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interventions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">12</div>
                  <p className="text-sm text-muted-foreground mt-2">En attente</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Patients suivis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">78</div>
                  <p className="text-sm text-muted-foreground mt-2">Actifs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alertes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-orange-600">5</div>
                  <p className="text-sm text-muted-foreground mt-2">À traiter</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage