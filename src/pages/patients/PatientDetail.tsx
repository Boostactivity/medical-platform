/**
 * PAGE DETAIL PATIENT - Dashboard individuel d'un patient
 * 
 * Route dynamique : /patients/[id]
 * 
 * Affiche :
 * - Score la plateforme et observance
 * - Graphiques de télémétrie
 * - Historique des nuits
 * - Alertes et interventions
 * 
 * Design : Medical Dashboard avec graphiques Recharts
 */

import React, { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Activity, Moon, AlertCircle, TrendingUp, Download, FileText, Upload, Trash2, Brain, Users, Video, StickyNote } from 'lucide-react'
import { DashboardLayout } from '../../components/layouts/DashboardLayout'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '../../components/ui/utils'
import { PDFReportGenerator } from '../../components/reports/PDFReportGenerator'
import { PrivateNotes } from '../../components/doctor/PrivateNotes'
import { Teleconsultation } from '../../components/doctor/Teleconsultation'
import { CohortComparison } from '../../components/doctor/CohortComparison'
import { PredictiveAlerts } from '../../components/doctor/PredictiveAlerts'
import { toast } from 'sonner'

// Données mockées (seront remplacées par API avec l'ID)
const mockPatientData = {
  '1': {
    id: '1',
    name: 'Marie Dupont',
    age: 54,
    score: 87,
    observance: 92,
    status: 'success' as const,
    email: 'marie.dupont@email.fr',
    phone: '06 12 34 56 78',
    device: 'ResMed AirSense 11',
    startDate: '2024-01-15',
    panelCode: 'DR-001'
  },
  '2': {
    id: '2',
    name: 'Jean Martin',
    age: 62,
    score: 64,
    observance: 78,
    status: 'warning' as const,
    email: 'jean.martin@email.fr',
    phone: '06 98 76 54 32',
    device: 'Philips DreamStation 2',
    startDate: '2023-11-20',
    panelCode: 'DR-001'
  }
}

// Données de télémétrie sur 30 jours
const mockTelemetryData = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}/11`,
  score: Math.floor(Math.random() * 30) + 70,
  observance: Math.floor(Math.random() * 20) + 75,
  ahi: Math.random() * 5 + 2,
  leaks: Math.random() * 15 + 5,
  pressure: Math.random() * 2 + 8,
  hours: Math.random() * 2 + 6
}))

// Historique des 7 dernières nuits
const mockNightsHistory = Array.from({ length: 7 }, (_, i) => ({
  date: `${30 - i}/11`,
  duration: Math.floor(Math.random() * 2 * 60) + 6 * 60, // en minutes
  ahi: Math.random() * 5 + 2,
  score: Math.floor(Math.random() * 30) + 70,
  leaks: Math.random() * 15 + 5
})).reverse()

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Récupérer les données du patient
  const patient = useMemo(() => {
    return mockPatientData[id as keyof typeof mockPatientData]
  }, [id])

  // Si patient non trouvé
  if (!patient) {
    return (
      <DashboardLayout userRole="medecin" userName="Dr. Martin" userEmail="dr.martin@expair.fr">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Patient non trouvé</h2>
          <p className="text-muted-foreground mb-6">
            Le patient avec l'ID {id} n'existe pas.
          </p>
          <Button onClick={() => navigate('/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // Obtenir le badge de statut
  const getStatusBadge = (status: 'success' | 'warning' | 'critical') => {
    const config = {
      success: { label: 'Excellent', className: 'bg-green-500' },
      warning: { label: 'À surveiller', className: 'bg-orange-500' },
      critical: { label: 'Critique', className: 'bg-red-500' }
    }
    return config[status]
  }

  const statusBadge = getStatusBadge(patient.status)

  // Formater la durée en heures:minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h${mins.toString().padStart(2, '0')}`
  }

  return (
    <DashboardLayout userRole="medecin" userName="Dr. Martin" userEmail="dr.martin@expair.fr">
      <div className="space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/patients')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-semibold">
                  {patient.name}
                </h1>
                <Badge className={statusBadge.className}>
                  {statusBadge.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {patient.age} ans • {patient.device} • Suivi depuis {new Date(patient.startDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Exporter les données
          </Button>
        </div>

        {/* Cartes de métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Score la plateforme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-semibold",
                  patient.score >= 80 ? "text-green-600" :
                  patient.score >= 60 ? "text-orange-600" :
                  "text-red-600"
                )}>
                  {patient.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Progress value={patient.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Observance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-semibold",
                  patient.observance >= 80 ? "text-green-600" :
                  patient.observance >= 60 ? "text-orange-600" :
                  "text-red-600"
                )}>
                  {patient.observance}%
                </span>
              </div>
              <Progress value={patient.observance} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nuits utilisées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold">27</span>
                <span className="text-sm text-muted-foreground">/30</span>
              </div>
              <Progress value={90} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-3xl font-semibold text-green-600">+5%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">vs. mois dernier</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets de données */}
        <Tabs defaultValue="telemetry" className="w-full">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="telemetry">
              <Activity className="w-4 h-4 mr-2" />
              Telemetrie
            </TabsTrigger>
            <TabsTrigger value="nights">
              <Moon className="w-4 h-4 mr-2" />
              Nuits
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="predictive">
              <Brain className="w-4 h-4 mr-2" />
              IA Predictive
            </TabsTrigger>
            <TabsTrigger value="cohort">
              <Users className="w-4 h-4 mr-2" />
              Cohorte
            </TabsTrigger>
            <TabsTrigger value="teleconsult">
              <Video className="w-4 h-4 mr-2" />
              Teleconsultation
            </TabsTrigger>
            <TabsTrigger value="notes">
              <StickyNote className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="info">
              <Calendar className="w-4 h-4 mr-2" />
              Informations
            </TabsTrigger>
          </TabsList>

          {/* Onglet Télémétrie */}
          <TabsContent value="telemetry" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Évolution du Score la plateforme (30 jours)</CardTitle>
                <CardDescription>
                  Score global basé sur l'observance, l'AHI et la qualité du traitement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockTelemetryData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#007AFF" 
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>AHI (Index Apnée-Hypopnée)</CardTitle>
                  <CardDescription>Nombre d'événements par heure</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={mockTelemetryData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="ahi" stroke="#34C759" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fuites (L/min)</CardTitle>
                  <CardDescription>Fuites non intentionnelles du masque</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={mockTelemetryData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="leaks" stroke="#FF9500" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet Nuits */}
          <TabsContent value="nights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des 7 dernières nuits</CardTitle>
                <CardDescription>
                  Détails de chaque nuit d'utilisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockNightsHistory.map((night, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Moon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{night.date}/2024</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDuration(night.duration)} • AHI: {night.ahi.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xl font-semibold",
                          night.score >= 80 ? "text-green-600" :
                          night.score >= 60 ? "text-orange-600" :
                          "text-red-600"
                        )}>
                          {night.score}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Documents - GED */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documents Patient</CardTitle>
                    <CardDescription>
                      Ordonnances, rapports et documents administratifs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <PDFReportGenerator
                      patientId={patient.id}
                      patientName={patient.name}
                      patientAge={patient.age}
                      patientDevice={patient.device}
                      observanceData={{
                        averageUsage: 7.2,
                        averageAHI: 3.4,
                        averageLeak: 8.5,
                        complianceRate: patient.observance,
                        daysTracked: 27,
                        expAirScore: patient.score,
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png';
                        input.onchange = (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            toast.success(`Document "${file.name}" téléchargé`);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Téléverser
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Mock documents */}
                  {[
                    {
                      id: 1,
                      name: 'Ordonnance initiale',
                      type: 'ordonnance',
                      date: '15/01/2024',
                      size: '245 KB',
                      icon: FileText,
                      color: 'text-blue-600 bg-blue-50',
                    },
                    {
                      id: 2,
                      name: 'Rapport d\'installation',
                      type: 'rapport',
                      date: '16/01/2024',
                      size: '189 KB',
                      icon: FileText,
                      color: 'text-green-600 bg-green-50',
                    },
                    {
                      id: 3,
                      name: 'Courrier médecin traitant',
                      type: 'courrier',
                      date: '20/01/2024',
                      size: '98 KB',
                      icon: FileText,
                      color: 'text-purple-600 bg-purple-50',
                    },
                    {
                      id: 4,
                      name: 'Compte-rendu mensuel Oct 2024',
                      type: 'rapport',
                      date: '01/11/2024',
                      size: '412 KB',
                      icon: FileText,
                      color: 'text-orange-600 bg-orange-50',
                    },
                  ].map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${doc.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.date} • {doc.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info('Téléchargement du document...')}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Télécharger
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Supprimer ce document ?')) {
                                toast.success('Document supprimé');
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Zone de drag & drop */}
                <div className="mt-6 border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Glissez-déposez vos fichiers ici ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, PNG jusqu'à 10 MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet IA Predictive */}
          <TabsContent value="predictive" className="space-y-4">
            <PredictiveAlerts
              patientId={patient.id}
              patientName={patient.name}
            />
          </TabsContent>

          {/* Onglet Cohorte */}
          <TabsContent value="cohort" className="space-y-4">
            <CohortComparison
              patientId={patient.id}
              patientName={patient.name}
              patientAge={patient.age}
              patientBMI={28}
              patientIAHSeverity="modere"
              patientMetrics={{
                observance: patient.observance,
                ahiResiduel: 3.4,
                fuites: 8.5,
                confort: 75,
                usageMoyen: 7.2,
              }}
            />
          </TabsContent>

          {/* Onglet Teleconsultation */}
          <TabsContent value="teleconsult" className="space-y-4">
            <Teleconsultation
              patientId={patient.id}
              patientName={patient.name}
            />
          </TabsContent>

          {/* Onglet Notes privees */}
          <TabsContent value="notes" className="space-y-4">
            <PrivateNotes
              patientId={patient.id}
              patientName={patient.name}
            />
          </TabsContent>

          {/* Onglet Informations */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informations Patient</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{patient.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Panel Code</p>
                    <p className="font-medium">{patient.panelCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">
                      {new Date(patient.startDate).toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Équipement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Appareil</p>
                    <p className="font-medium">{patient.device}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro de série</p>
                    <p className="font-medium">SN-{patient.id}-2024-001</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Masque</p>
                    <p className="font-medium">ResMed AirFit N20</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prochaine maintenance</p>
                    <p className="font-medium text-orange-600">15/01/2025</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default PatientDetailPage