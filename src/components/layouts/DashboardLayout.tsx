/**
 * DASHBOARD LAYOUT - Structure globale de l'application
 * 
 * Layout principal avec :
 * - Sidebar fixe à gauche (navigation)
 * - TopBar en haut (profil, langue, notifications)
 * - Zone de contenu principale
 * 
 * Design : Style médical professionnel Apple Health-inspired
 */

import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard,
  Users,
  Activity,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  HelpCircle,
  Package,
  DollarSign,
  ShieldCheck,
  Stethoscope,
  Building2,
  HeartPulse
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Props du Layout
 */
interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: 'patient' | 'medecin' | 'admin' | 'prestataire'
  userName?: string
  userEmail?: string
}

/**
 * Structure d'un élément de menu
 */
interface MenuItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
  roles: ('patient' | 'medecin' | 'admin' | 'prestataire')[]
}

/**
 * Configuration du menu selon les rôles
 */
const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['patient', 'medecin', 'admin', 'prestataire']
  },
  {
    label: 'Mes Patients',
    path: '/pro/patients',
    icon: <Users className="w-5 h-5" />,
    roles: ['medecin', 'prestataire']
  },
  {
    label: 'Mon Suivi',
    path: '/patient/dashboard',
    icon: <HeartPulse className="w-5 h-5" />,
    roles: ['patient']
  },
  {
    label: 'Interventions',
    path: '/pro/interventions',
    icon: <Stethoscope className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Planning',
    path: '/pro/planning',
    icon: <Activity className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Demandes RDV',
    path: '/pro/demandes-rdv',
    icon: <Bell className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Commandes',
    path: '/pro/commandes',
    icon: <Package className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Stock',
    path: '/pro/stock',
    icon: <Package className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Parc machines',
    path: '/pro/parc',
    icon: <Building2 className="w-5 h-5" />,
    roles: ['prestataire', 'admin']
  },
  {
    label: 'Finance',
    path: '/pro/finance',
    icon: <DollarSign className="w-5 h-5" />,
    roles: ['admin']
  },
  {
    label: 'Conformité',
    path: '/pro/conformite',
    icon: <ShieldCheck className="w-5 h-5" />,
    roles: ['admin', 'prestataire']
  },
  {
    label: 'Connecteurs',
    path: '/pro/connecteurs',
    icon: <Activity className="w-5 h-5" />,
    roles: ['admin', 'prestataire']
  },
  {
    label: 'Réglages',
    path: '/pro/parametres',
    icon: <Settings className="w-5 h-5" />,
    roles: ['patient', 'medecin', 'admin', 'prestataire']
  }
]

/**
 * Composant DashboardLayout
 */
export function DashboardLayout({ 
  children, 
  userRole = 'patient',
  userName = 'Utilisateur',
  userEmail = 'user@example.com'
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  // Filtrer les items du menu selon le rôle
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  )

  // Gérer la déconnexion
  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  // Obtenir les initiales pour l'avatar
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Obtenir le label du rôle en français
  const getRoleLabel = (role: string) => {
    const labels = {
      patient: 'Patient',
      medecin: 'Médecin',
      admin: 'Administrateur',
      prestataire: 'Prestataire'
    }
    return labels[role as keyof typeof labels] || role
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo & Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-medium text-sidebar-foreground">Medical</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path || 
                           location.pathname.startsWith(item.path + '/')
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                {item.icon}
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Sidebar */}
        {sidebarOpen && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="text-xs text-muted-foreground">
              <p>Version 3.0</p>
              <p className="mt-1">Phase 4 - Monorepo</p>
            </div>
          </div>
        )}
      </aside>

      {/* ===== SIDEBAR MOBILE ===== */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-64 h-full bg-sidebar border-r border-sidebar-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Mobile */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-medium">Medical</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation Mobile */}
            <nav className="py-4 px-2">
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive">{item.badge}</Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300',
          'lg:ml-64',
          !sidebarOpen && 'lg:ml-20'
        )}
      >
        {/* ===== TOP BAR ===== */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          {/* Burger Menu Mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Titre de page (optionnel) */}
          <div className="flex-1 hidden lg:block">
            <h1 className="text-xl font-medium text-foreground">
              {/* Le titre sera injecté par les pages enfants via Context ou Props */}
            </h1>
          </div>

          {/* Actions TopBar */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                3
              </span>
            </Button>

            {/* Aide */}
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* Menu Profil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(userRole)}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{userName}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {userEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Mon Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/pro/parametres" className="flex items-center cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ===== ZONE DE CONTENU ===== */}
        <main className="flex-1 p-4 lg:p-6 bg-background overflow-auto">
          {children}
        </main>

        {/* ===== FOOTER (Optionnel) ===== */}
        <footer className="h-12 border-t border-border flex items-center justify-center px-6 bg-card">
          <p className="text-xs text-muted-foreground">
            © 2024 Medical - Tous droits réservés - Données Santé sécurisées (HDS)
          </p>
        </footer>
      </div>
    </div>
  )
}