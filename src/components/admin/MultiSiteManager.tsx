/**
 * GESTION MULTI-SITES / MULTI-AGENCES
 *
 * - Plusieurs sites/agences par prestataire
 * - Configuration par site : nom, adresse, techniciens, zone geo
 * - Dashboard par site : patients, observance, alertes
 * - Vue consolidee tous sites
 * - Transfert patient d'un site a l'autre
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, MapPin, Users, Plus, Edit2, Trash2, Search,
  ArrowRightLeft, BarChart3, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Settings, Eye, UserPlus, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ---- Types ----

interface Technician {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  phone: string;
}

interface SiteStats {
  totalPatients: number;
  observanceMoyenne: number;
  alertesActives: number;
  interventionsMois: number;
  tauxConformite: number;
}

interface Site {
  id: string;
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  responsable: string;
  zoneGeographique: string;
  techniciens: Technician[];
  stats: SiteStats;
  actif: boolean;
}

interface PatientSite {
  id: string;
  nom: string;
  prenom: string;
  siteId: string;
  siteName: string;
  observance: number;
  status: 'conforme' | 'attention' | 'non_conforme';
}

interface TransferRequest {
  patientId: string;
  patientName: string;
  fromSiteId: string;
  fromSiteName: string;
  toSiteId: string;
  toSiteName: string;
}

// ---- Mock Data ----

const MOCK_SITES: Site[] = [
  {
    id: 'site-1',
    nom: 'Agence Paris Centre',
    adresse: '15 rue de Rivoli',
    codePostal: '75001',
    ville: 'Paris',
    telephone: '01 42 00 00 01',
    email: 'paris-centre@plateforme.fr',
    responsable: 'Marie Dupont',
    zoneGeographique: 'Paris 1-4, 5-8',
    techniciens: [
      { id: 't1', nom: 'Martin', prenom: 'Lucas', email: 'l.martin@plateforme.fr', phone: '06 00 00 01' },
      { id: 't2', nom: 'Bernard', prenom: 'Sophie', email: 's.bernard@plateforme.fr', phone: '06 00 00 02' },
      { id: 't3', nom: 'Petit', prenom: 'Thomas', email: 't.petit@plateforme.fr', phone: '06 00 00 03' },
    ],
    stats: { totalPatients: 142, observanceMoyenne: 78, alertesActives: 8, interventionsMois: 23, tauxConformite: 82 },
    actif: true,
  },
  {
    id: 'site-2',
    nom: 'Agence Lyon',
    adresse: '8 place Bellecour',
    codePostal: '69002',
    ville: 'Lyon',
    telephone: '04 72 00 00 01',
    email: 'lyon@plateforme.fr',
    responsable: 'Pierre Roux',
    zoneGeographique: 'Lyon metropole, Villeurbanne',
    techniciens: [
      { id: 't4', nom: 'Durand', prenom: 'Julie', email: 'j.durand@plateforme.fr', phone: '06 00 00 04' },
      { id: 't5', nom: 'Moreau', prenom: 'Antoine', email: 'a.moreau@plateforme.fr', phone: '06 00 00 05' },
    ],
    stats: { totalPatients: 98, observanceMoyenne: 81, alertesActives: 5, interventionsMois: 16, tauxConformite: 85 },
    actif: true,
  },
  {
    id: 'site-3',
    nom: 'Agence Marseille',
    adresse: '22 La Canebiere',
    codePostal: '13001',
    ville: 'Marseille',
    telephone: '04 91 00 00 01',
    email: 'marseille@plateforme.fr',
    responsable: 'Isabelle Garcia',
    zoneGeographique: 'Marseille, Aix-en-Provence',
    techniciens: [
      { id: 't6', nom: 'Simon', prenom: 'Claire', email: 'c.simon@plateforme.fr', phone: '06 00 00 06' },
    ],
    stats: { totalPatients: 67, observanceMoyenne: 74, alertesActives: 12, interventionsMois: 11, tauxConformite: 73 },
    actif: true,
  },
  {
    id: 'site-4',
    nom: 'Agence Bordeaux',
    adresse: '5 cours de l\'Intendance',
    codePostal: '33000',
    ville: 'Bordeaux',
    telephone: '05 56 00 00 01',
    email: 'bordeaux@plateforme.fr',
    responsable: 'Jean Lefebvre',
    zoneGeographique: 'Bordeaux Metropole',
    techniciens: [
      { id: 't7', nom: 'Laurent', prenom: 'Marc', email: 'm.laurent@plateforme.fr', phone: '06 00 00 07' },
      { id: 't8', nom: 'Leroy', prenom: 'Emma', email: 'e.leroy@plateforme.fr', phone: '06 00 00 08' },
    ],
    stats: { totalPatients: 55, observanceMoyenne: 76, alertesActives: 4, interventionsMois: 9, tauxConformite: 78 },
    actif: true,
  },
];

const MOCK_PATIENTS: PatientSite[] = [
  { id: 'p1', nom: 'Duval', prenom: 'Jean', siteId: 'site-1', siteName: 'Paris Centre', observance: 85, status: 'conforme' },
  { id: 'p2', nom: 'Mercier', prenom: 'Marie', siteId: 'site-1', siteName: 'Paris Centre', observance: 62, status: 'attention' },
  { id: 'p3', nom: 'Bonnet', prenom: 'Paul', siteId: 'site-2', siteName: 'Lyon', observance: 45, status: 'non_conforme' },
  { id: 'p4', nom: 'Girard', prenom: 'Sophie', siteId: 'site-2', siteName: 'Lyon', observance: 91, status: 'conforme' },
  { id: 'p5', nom: 'Blanc', prenom: 'Pierre', siteId: 'site-3', siteName: 'Marseille', observance: 78, status: 'conforme' },
  { id: 'p6', nom: 'Garnier', prenom: 'Luc', siteId: 'site-3', siteName: 'Marseille', observance: 55, status: 'non_conforme' },
  { id: 'p7', nom: 'Faure', prenom: 'Anne', siteId: 'site-4', siteName: 'Bordeaux', observance: 72, status: 'attention' },
  { id: 'p8', nom: 'Rousseau', prenom: 'Marc', siteId: 'site-1', siteName: 'Paris Centre', observance: 88, status: 'conforme' },
];

// ---- Composant Principal ----

export function MultiSiteManager() {
  const [sites, setSites] = useState<Site[]>(MOCK_SITES);
  const [patients, setPatients] = useState<PatientSite[]>(MOCK_PATIENTS);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'consolidated' | 'site' | 'transfer'>('consolidated');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [transferPatient, setTransferPatient] = useState<TransferRequest | null>(null);
  const [newSite, setNewSite] = useState({ nom: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', responsable: '', zoneGeographique: '' });

  // Stats consolidees
  const consolidatedStats = useMemo(() => {
    const totalPatients = sites.reduce((sum, s) => sum + s.stats.totalPatients, 0);
    const avgObservance = sites.reduce((sum, s) => sum + s.stats.observanceMoyenne * s.stats.totalPatients, 0) / totalPatients;
    const totalAlertes = sites.reduce((sum, s) => sum + s.stats.alertesActives, 0);
    const totalInterventions = sites.reduce((sum, s) => sum + s.stats.interventionsMois, 0);
    return { totalPatients, avgObservance, totalAlertes, totalInterventions };
  }, [sites]);

  const barChartData = sites.map((s) => ({
    name: s.ville,
    patients: s.stats.totalPatients,
    observance: s.stats.observanceMoyenne,
    conformite: s.stats.tauxConformite,
  }));

  const pieData = sites.map((s) => ({
    name: s.ville,
    value: s.stats.totalPatients,
  }));
  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#22C55E', '#EF4444'];

  const currentSite = selectedSite ? sites.find((s) => s.id === selectedSite) : null;
  const sitePatients = selectedSite ? patients.filter((p) => p.siteId === selectedSite) : patients;

  const filteredPatients = useMemo(() => {
    return sitePatients.filter((p) =>
      `${p.nom} ${p.prenom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sitePatients, searchTerm]);

  const handleAddSite = () => {
    const site: Site = {
      id: `site-${Date.now()}`,
      ...newSite,
      techniciens: [],
      stats: { totalPatients: 0, observanceMoyenne: 0, alertesActives: 0, interventionsMois: 0, tauxConformite: 0 },
      actif: true,
    };
    setSites((prev) => [...prev, site]);
    setShowAddSite(false);
    setNewSite({ nom: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', responsable: '', zoneGeographique: '' });
    toast.success('Site ajoute', { description: `${site.nom} a ete cree.` });
  };

  const handleTransfer = () => {
    if (!transferPatient) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === transferPatient.patientId
          ? { ...p, siteId: transferPatient.toSiteId, siteName: transferPatient.toSiteName }
          : p
      )
    );
    toast.success('Patient transfere', {
      description: `${transferPatient.patientName} transfere vers ${transferPatient.toSiteName}`,
    });
    setTransferPatient(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#007AFF]" />
            Gestion multi-sites
          </h2>
          <p className="text-slate-500 mt-1">
            {sites.length} sites actifs - {consolidatedStats.totalPatients} patients au total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSelectedSite(null); setActiveView('consolidated'); }}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue consolidee
          </Button>
          <Button onClick={() => setShowAddSite(true)} className="bg-[#007AFF] hover:bg-[#0051D5] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un site
          </Button>
        </div>
      </div>

      {/* Stats consolidees */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{consolidatedStats.totalPatients}</div>
            <div className="text-xs text-slate-500">Patients tous sites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{consolidatedStats.avgObservance.toFixed(0)}%</div>
            <div className="text-xs text-slate-500">Observance moyenne</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <div className="text-2xl font-bold text-amber-600">{consolidatedStats.totalAlertes}</div>
            <div className="text-xs text-slate-500">Alertes actives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold text-purple-600">{sites.length}</div>
            <div className="text-xs text-slate-500">Sites actifs</div>
          </CardContent>
        </Card>
      </div>

      {/* Vue consolidee : graphiques */}
      {activeView === 'consolidated' && !selectedSite && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Patients par site</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observance et conformite par site</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="observance" name="Observance %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conformite" name="Conformite %" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cartes des sites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sites.map((site) => (
          <motion.div key={site.id} layout>
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedSite === site.id ? 'ring-2 ring-[#007AFF] shadow-lg' : ''
              }`}
              onClick={() => {
                setSelectedSite(site.id);
                setActiveView('site');
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{site.nom}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {site.adresse}, {site.codePostal} {site.ville}
                    </div>
                  </div>
                  <Badge variant={site.actif ? 'default' : 'secondary'}>
                    {site.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <div className="text-lg font-bold">{site.stats.totalPatients}</div>
                    <div className="text-[10px] text-slate-500">Patients</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{site.stats.observanceMoyenne}%</div>
                    <div className="text-[10px] text-slate-500">Observance</div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <div className="text-lg font-bold text-amber-600">{site.stats.alertesActives}</div>
                    <div className="text-[10px] text-slate-500">Alertes</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{site.techniciens.length}</div>
                    <div className="text-[10px] text-slate-500">Techs</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Responsable : {site.responsable} | Zone : {site.zoneGeographique}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Vue detaillee d'un site */}
      {selectedSite && currentSite && activeView === 'site' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentSite.nom}</CardTitle>
                <CardDescription>{currentSite.adresse}, {currentSite.codePostal} {currentSite.ville}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => { setSelectedSite(null); setActiveView('consolidated'); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Techniciens */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Techniciens assignes ({currentSite.techniciens.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {currentSite.techniciens.map((tech) => (
                  <div key={tech.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-sm">{tech.prenom} {tech.nom}</div>
                    <div className="text-xs text-slate-400">{tech.email}</div>
                    <div className="text-xs text-slate-400">{tech.phone}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patients du site */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Patients du site
                </h4>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-[#007AFF] outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{patient.nom} {patient.prenom}</div>
                      <div className="text-xs text-slate-400">Observance : {patient.observance}%</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={patient.status === 'conforme' ? 'default' : patient.status === 'attention' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {patient.status === 'conforme' ? 'Conforme' : patient.status === 'attention' ? 'Attention' : 'Non conforme'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferPatient({
                            patientId: patient.id,
                            patientName: `${patient.nom} ${patient.prenom}`,
                            fromSiteId: selectedSite!,
                            fromSiteName: currentSite.nom,
                            toSiteId: '',
                            toSiteName: '',
                          });
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal transfert patient */}
      <AnimatePresence>
        {transferPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setTransferPatient(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <ArrowRightLeft className="w-5 h-5 text-[#007AFF]" />
                Transfert patient
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Transferer <strong>{transferPatient.patientName}</strong> depuis <strong>{transferPatient.fromSiteName}</strong> vers :
              </p>
              <div className="space-y-2 mb-6">
                {sites
                  .filter((s) => s.id !== transferPatient.fromSiteId)
                  .map((site) => (
                    <button
                      key={site.id}
                      onClick={() =>
                        setTransferPatient((prev) => prev ? { ...prev, toSiteId: site.id, toSiteName: site.nom } : null)
                      }
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        transferPatient.toSiteId === site.id
                          ? 'border-[#007AFF] bg-[#007AFF]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{site.nom}</div>
                      <div className="text-xs text-slate-400">{site.ville} - {site.stats.totalPatients} patients</div>
                    </button>
                  ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setTransferPatient(null)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-[#007AFF] hover:bg-[#0051D5] text-white"
                  disabled={!transferPatient.toSiteId}
                  onClick={handleTransfer}
                >
                  Confirmer le transfert
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal ajout site */}
      <AnimatePresence>
        {showAddSite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddSite(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-[#007AFF]" />
                Ajouter un site
              </h3>
              <div className="space-y-3">
                {([
                  { key: 'nom', label: 'Nom du site', placeholder: 'Agence Nice' },
                  { key: 'adresse', label: 'Adresse', placeholder: '10 promenade des Anglais' },
                  { key: 'codePostal', label: 'Code postal', placeholder: '06000' },
                  { key: 'ville', label: 'Ville', placeholder: 'Nice' },
                  { key: 'telephone', label: 'Telephone', placeholder: '04 93 00 00 01' },
                  { key: 'email', label: 'Email', placeholder: 'nice@plateforme.fr' },
                  { key: 'responsable', label: 'Responsable', placeholder: 'Jean Dupont' },
                  { key: 'zoneGeographique', label: 'Zone geographique', placeholder: 'Nice, Cannes, Antibes' },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={newSite[key]}
                      onChange={(e) => setNewSite((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddSite(false)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-[#007AFF] hover:bg-[#0051D5] text-white"
                  disabled={!newSite.nom || !newSite.ville}
                  onClick={handleAddSite}
                >
                  Creer le site
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
