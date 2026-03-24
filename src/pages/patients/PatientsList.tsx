/**
 * PAGE LISTE DES PATIENTS - Vue d'ensemble des patients
 * 
 * Affiche la liste de tous les patients avec :
 * - Informations de base (nom, score, observance)
 * - Statut (actif, à risque, critique)
 * - Lien vers le dashboard individuel
 * 
 * Design : Medical Clean avec cards cliquables
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ArrowRight, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { DashboardLayout } from '../../components/layouts/DashboardLayout'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { cn } from '../../components/ui/utils'

// Données mockées (seront remplacées par API)
const mockPatients = [
  {
    id: '1',
    name: 'Marie Dupont',
    age: 54,
    score: 87,
    observance: 92,
    status: 'success' as const,
    trend: 'up' as const,
    lastSync: '2024-12-04T08:30:00',
    panelCode: 'DR-001'
  },
  {
    id: '2',
    name: 'Jean Martin',
    age: 62,
    score: 64,
    observance: 78,
    status: 'warning' as const,
    trend: 'down' as const,
    lastSync: '2024-12-04T07:15:00',
    panelCode: 'DR-001'
  },
  {
    id: '3',
    name: 'Sophie Bernard',
    age: 48,
    score: 42,
    observance: 45,
    status: 'critical' as const,
    trend: 'down' as const,
    lastSync: '2024-12-03T22:00:00',
    panelCode: 'DR-001'
  },
  {
    id: '4',
    name: 'Pierre Leroy',
    age: 58,
    score: 91,
    observance: 95,
    status: 'success' as const,
    trend: 'up' as const,
    lastSync: '2024-12-04T09:00:00',
    panelCode: 'DR-001'
  },
  {
    id: '5',
    name: 'Claire Dubois',
    age: 51,
    score: 76,
    observance: 82,
    status: 'success' as const,
    trend: 'up' as const,
    lastSync: '2024-12-04T06:45:00',
    panelCode: 'DR-001'
  }
]

export function PatientsListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'warning' | 'critical'>('all')

  // Filtrer les patients
  const filteredPatients = mockPatients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Obtenir le badge de statut
  const getStatusBadge = (status: 'success' | 'warning' | 'critical') => {
    const config = {
      success: { label: 'Excellent', variant: 'default' as const, className: 'bg-green-500' },
      warning: { label: 'À surveiller', variant: 'secondary' as const, className: 'bg-orange-500' },
      critical: { label: 'Critique', variant: 'destructive' as const, className: 'bg-red-500' }
    }
    return config[status]
  }

  // Formater la date de dernière synchro
  const formatLastSync = (date: string) => {
    const now = new Date()
    const syncDate = new Date(date)
    const diffMs = now.getTime() - syncDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    return `Il y a ${Math.floor(diffHours / 24)} jour(s)`
  }

  return (
    <DashboardLayout userRole="medecin" userName="Dr. Martin" userEmail="dr.martin@expair.fr">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Mes Patients
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos {mockPatients.length} patients suivis
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtres par statut */}
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Tous
            </Button>
            <Button
              variant={statusFilter === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('success')}
              className={statusFilter === 'success' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              Excellent
            </Button>
            <Button
              variant={statusFilter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('warning')}
              className={statusFilter === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              À surveiller
            </Button>
            <Button
              variant={statusFilter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('critical')}
              className={statusFilter === 'critical' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              Critique
            </Button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">3</p>
                  <p className="text-sm text-muted-foreground">Patients en excellente observance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">1</p>
                  <p className="text-sm text-muted-foreground">Patient à surveiller</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">1</p>
                  <p className="text-sm text-muted-foreground">Patient en situation critique</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des patients */}
        <div className="space-y-3">
          {filteredPatients.map((patient) => {
            const statusBadge = getStatusBadge(patient.status)
            
            return (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="block group"
              >
                <Card className="hover:shadow-lg hover:border-primary/50 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      {/* Infos patient */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium group-hover:text-primary transition-colors">
                            {patient.name}
                          </h3>
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {patient.age} ans • Panel {patient.panelCode} • {formatLastSync(patient.lastSync)}
                        </p>
                      </div>

                      {/* Scores */}
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="text-center">
                          <p className={cn(
                            "text-2xl font-semibold",
                            patient.score >= 80 ? "text-green-600" :
                            patient.score >= 60 ? "text-orange-600" :
                            "text-red-600"
                          )}>
                            {patient.score}
                          </p>
                          <p className="text-xs text-muted-foreground">Score la plateforme</p>
                        </div>
                        <div className="text-center">
                          <p className={cn(
                            "text-2xl font-semibold",
                            patient.observance >= 80 ? "text-green-600" :
                            patient.observance >= 60 ? "text-orange-600" :
                            "text-red-600"
                          )}>
                            {patient.observance}%
                          </p>
                          <p className="text-xs text-muted-foreground">Observance</p>
                        </div>
                        {patient.trend === 'up' ? (
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-600" />
                        )}
                      </div>

                      {/* Flèche */}
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Message si aucun résultat */}
        {filteredPatients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Aucun patient ne correspond à vos critères de recherche
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default PatientsListPage
