/**
 * PRESCRIPTION WORKFLOW AVANCE
 *
 * Workflow complet : ordonnance recue -> verification -> appareillage -> suivi -> renouvellement
 * Statut par etape avec dates, alertes renouvellement, lien medecin prescripteur,
 * upload multi-documents (ordonnance, compte-rendu polysomnographie, lettre medecin)
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, CheckCircle, Clock, Calendar, AlertTriangle,
  Search, ChevronDown, ChevronRight, User, Plus, Eye, Download,
  X, Bell, Stethoscope, RefreshCw, Paperclip, MessageSquare,
  ArrowRight, Settings, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// ---- Types ----

type WorkflowStep = 'ordonnance_recue' | 'verification' | 'appareillage' | 'suivi' | 'renouvellement';

interface WorkflowStepInfo {
  step: WorkflowStep;
  label: string;
  date: string | null;
  completedBy: string | null;
  notes: string;
  status: 'completed' | 'current' | 'pending' | 'alert';
}

interface PrescriptionDocument {
  id: string;
  type: 'ordonnance' | 'polysomnographie' | 'lettre_medecin' | 'compte_rendu' | 'autre';
  nom: string;
  dateUpload: string;
  taille: string;
  url: string;
}

interface MedecinExchange {
  id: string;
  date: string;
  type: 'email' | 'telephone' | 'courrier' | 'teleconsultation';
  sujet: string;
  contenu: string;
  initiePar: string;
}

interface PrescriptionWorkflowItem {
  id: string;
  patientId: string;
  patientName: string;
  patientNIR: string;
  medecinPrescripteur: {
    id: string;
    nom: string;
    rpps: string;
    specialite: string;
    telephone: string;
    email: string;
  };
  dateCreation: string;
  dateRenouvellement: string;
  workflow: WorkflowStepInfo[];
  documents: PrescriptionDocument[];
  echangesMedecin: MedecinExchange[];
  deviceType: string;
  urgenceRenouvellement: boolean;
}

// ---- Mock Data ----

function generateMockPrescriptions(): PrescriptionWorkflowItem[] {
  const items: PrescriptionWorkflowItem[] = [
    {
      id: 'presc-1',
      patientId: 'p1',
      patientName: 'Martin Jean',
      patientNIR: '1 70 01 75 123 456 78',
      medecinPrescripteur: {
        id: 'med-1',
        nom: 'Dr Dupont',
        rpps: '12345678901',
        specialite: 'Pneumologue',
        telephone: '01 42 00 00 10',
        email: 'dupont@cabinet.fr',
      },
      dateCreation: '2024-01-15',
      dateRenouvellement: '2025-01-15',
      workflow: [
        { step: 'ordonnance_recue', label: 'Ordonnance recue', date: '2024-01-15', completedBy: 'Secretariat', notes: 'Recue par courrier', status: 'completed' },
        { step: 'verification', label: 'Verification', date: '2024-01-16', completedBy: 'Marie L.', notes: 'Ordonnance conforme', status: 'completed' },
        { step: 'appareillage', label: 'Appareillage', date: '2024-01-20', completedBy: 'Thomas P.', notes: 'ResMed AirSense 11', status: 'completed' },
        { step: 'suivi', label: 'Suivi en cours', date: '2024-02-20', completedBy: null, notes: 'J+30 OK, J+90 a programmer', status: 'current' },
        { step: 'renouvellement', label: 'Renouvellement', date: null, completedBy: null, notes: '', status: 'pending' },
      ],
      documents: [
        { id: 'd1', type: 'ordonnance', nom: 'Ordonnance_Martin_2024.pdf', dateUpload: '2024-01-15', taille: '245 Ko', url: '#' },
        { id: 'd2', type: 'polysomnographie', nom: 'PSG_Martin_2023.pdf', dateUpload: '2024-01-15', taille: '1.2 Mo', url: '#' },
      ],
      echangesMedecin: [
        { id: 'e1', date: '2024-01-16', type: 'telephone', sujet: 'Confirmation prescription', contenu: 'Confirme pression 8-12 cmH2O', initiePar: 'Secretariat' },
        { id: 'e2', date: '2024-03-01', type: 'email', sujet: 'Bilan J+30', contenu: 'Observance bonne, IAH=3.2', initiePar: 'Technicien' },
      ],
      deviceType: 'ResMed AirSense 11 AutoSet',
      urgenceRenouvellement: false,
    },
    {
      id: 'presc-2',
      patientId: 'p2',
      patientName: 'Bernard Sophie',
      patientNIR: '2 85 03 69 456 789 12',
      medecinPrescripteur: {
        id: 'med-2',
        nom: 'Dr Lefebvre',
        rpps: '98765432101',
        specialite: 'Pneumologue',
        telephone: '04 72 00 00 20',
        email: 'lefebvre@cabinet.fr',
      },
      dateCreation: '2023-06-01',
      dateRenouvellement: '2024-06-01',
      workflow: [
        { step: 'ordonnance_recue', label: 'Ordonnance recue', date: '2023-06-01', completedBy: 'Secretariat', notes: '', status: 'completed' },
        { step: 'verification', label: 'Verification', date: '2023-06-02', completedBy: 'Julie D.', notes: '', status: 'completed' },
        { step: 'appareillage', label: 'Appareillage', date: '2023-06-10', completedBy: 'Antoine M.', notes: 'Philips DreamStation 2', status: 'completed' },
        { step: 'suivi', label: 'Suivi', date: '2023-07-10', completedBy: 'Antoine M.', notes: 'Suivi OK', status: 'completed' },
        { step: 'renouvellement', label: 'Renouvellement', date: null, completedBy: null, notes: 'DEPASSE - Renouvellement urgent', status: 'alert' },
      ],
      documents: [
        { id: 'd3', type: 'ordonnance', nom: 'Ordonnance_Bernard_2023.pdf', dateUpload: '2023-06-01', taille: '198 Ko', url: '#' },
      ],
      echangesMedecin: [
        { id: 'e3', date: '2024-05-15', type: 'courrier', sujet: 'Demande renouvellement', contenu: 'Courrier envoye pour renouvellement annuel', initiePar: 'Secretariat' },
      ],
      deviceType: 'Philips DreamStation 2',
      urgenceRenouvellement: true,
    },
    {
      id: 'presc-3',
      patientId: 'p3',
      patientName: 'Dubois Paul',
      patientNIR: '1 60 12 13 789 012 34',
      medecinPrescripteur: {
        id: 'med-3',
        nom: 'Dr Garcia',
        rpps: '11223344556',
        specialite: 'ORL',
        telephone: '04 91 00 00 30',
        email: 'garcia@cabinet.fr',
      },
      dateCreation: '2024-03-01',
      dateRenouvellement: '2025-03-01',
      workflow: [
        { step: 'ordonnance_recue', label: 'Ordonnance recue', date: '2024-03-01', completedBy: 'Secretariat', notes: 'Teleconsultation', status: 'completed' },
        { step: 'verification', label: 'Verification en cours', date: null, completedBy: null, notes: 'En attente document complementaire', status: 'current' },
        { step: 'appareillage', label: 'Appareillage', date: null, completedBy: null, notes: '', status: 'pending' },
        { step: 'suivi', label: 'Suivi', date: null, completedBy: null, notes: '', status: 'pending' },
        { step: 'renouvellement', label: 'Renouvellement', date: null, completedBy: null, notes: '', status: 'pending' },
      ],
      documents: [
        { id: 'd4', type: 'ordonnance', nom: 'Ordonnance_Dubois_2024.pdf', dateUpload: '2024-03-01', taille: '210 Ko', url: '#' },
      ],
      echangesMedecin: [],
      deviceType: 'A definir',
      urgenceRenouvellement: false,
    },
  ];
  return items;
}

// ---- Helpers ----

const STEP_LABELS: Record<WorkflowStep, string> = {
  ordonnance_recue: 'Ordonnance',
  verification: 'Verification',
  appareillage: 'Appareillage',
  suivi: 'Suivi',
  renouvellement: 'Renouvellement',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  ordonnance: 'Ordonnance',
  polysomnographie: 'Polysomnographie',
  lettre_medecin: 'Lettre medecin',
  compte_rendu: 'Compte-rendu',
  autre: 'Autre',
};

function getStepColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'current': return 'bg-blue-500 animate-pulse';
    case 'alert': return 'bg-red-500 animate-pulse';
    default: return 'bg-slate-300';
  }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

// ---- Composant Principal ----

export function PrescriptionWorkflow() {
  const [prescriptions] = useState<PrescriptionWorkflowItem[]>(generateMockPrescriptions);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workflow' | 'documents' | 'medecin'>('workflow');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'alert' | 'current' | 'completed'>('all');
  const [showUpload, setShowUpload] = useState(false);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      const matchSearch = p.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterStatus === 'all') return matchSearch;
      if (filterStatus === 'alert') return matchSearch && p.urgenceRenouvellement;
      const currentStep = p.workflow.find((w) => w.status === 'current' || w.status === 'alert');
      if (filterStatus === 'current') return matchSearch && currentStep;
      if (filterStatus === 'completed') return matchSearch && p.workflow.every((w) => w.status === 'completed');
      return matchSearch;
    });
  }, [prescriptions, searchTerm, filterStatus]);

  const selected = selectedPrescription ? prescriptions.find((p) => p.id === selectedPrescription) : null;

  const alertCount = prescriptions.filter((p) => p.urgenceRenouvellement).length;

  const handleUploadDocument = (type: string) => {
    toast.success('Document uploade', { description: `Le document a ete ajoute au dossier.` });
    setShowUpload(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#007AFF]" />
            Workflow Prescriptions
          </h2>
          <p className="text-slate-500 mt-1">
            Suivi complet du cycle de vie des prescriptions
          </p>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700 font-medium">{alertCount} renouvellement(s) urgent(s)</span>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([
            { key: 'all', label: 'Toutes' },
            { key: 'alert', label: 'Urgentes' },
            { key: 'current', label: 'En cours' },
            { key: 'completed', label: 'Terminees' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des prescriptions */}
        <div className="space-y-3">
          {filteredPrescriptions.map((prescription) => {
            const currentStep = prescription.workflow.find((w) => w.status === 'current' || w.status === 'alert');
            const completedSteps = prescription.workflow.filter((w) => w.status === 'completed').length;

            return (
              <motion.div key={prescription.id} layout>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedPrescription === prescription.id ? 'ring-2 ring-[#007AFF]' : ''
                  } ${prescription.urgenceRenouvellement ? 'border-red-200' : ''}`}
                  onClick={() => setSelectedPrescription(prescription.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm">{prescription.patientName}</div>
                        <div className="text-xs text-slate-400">{prescription.medecinPrescripteur.nom}</div>
                      </div>
                      {prescription.urgenceRenouvellement && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                    </div>

                    {/* Mini progress */}
                    <div className="flex gap-1 mb-2">
                      {prescription.workflow.map((step, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${getStepColor(step.status)}`} />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{completedSteps}/5 etapes</span>
                      <span>{currentStep ? currentStep.label : 'Termine'}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Detail prescription */}
        {selected ? (
          <div className="lg:col-span-2 space-y-4">
            {/* En-tete patient */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selected.patientName}</h3>
                    <div className="text-sm text-slate-500">NIR : {selected.patientNIR}</div>
                    <div className="text-sm text-slate-500">Appareil : {selected.deviceType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Renouvellement</div>
                    <div className={`text-sm font-semibold ${
                      daysUntil(selected.dateRenouvellement) < 30 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {daysUntil(selected.dateRenouvellement) > 0
                        ? `Dans ${daysUntil(selected.dateRenouvellement)} jours`
                        : `Depasse de ${Math.abs(daysUntil(selected.dateRenouvellement))} jours`
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {([
                { key: 'workflow', label: 'Workflow', icon: Settings },
                { key: 'documents', label: `Documents (${selected.documents.length})`, icon: Paperclip },
                { key: 'medecin', label: `Echanges (${selected.echangesMedecin.length})`, icon: MessageSquare },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Workflow timeline */}
            {activeTab === 'workflow' && (
              <Card>
                <CardContent className="p-5">
                  <div className="space-y-0">
                    {selected.workflow.map((step, index) => (
                      <div key={step.step} className="flex gap-4">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepColor(step.status)}`}>
                            {step.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : step.status === 'alert' ? (
                              <AlertTriangle className="w-4 h-4 text-white" />
                            ) : step.status === 'current' ? (
                              <Clock className="w-4 h-4 text-white" />
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          {index < selected.workflow.length - 1 && (
                            <div className={`w-0.5 h-16 ${step.status === 'completed' ? 'bg-green-300' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{step.label}</h4>
                            {step.date && (
                              <span className="text-xs text-slate-400">{step.date}</span>
                            )}
                          </div>
                          {step.completedBy && (
                            <div className="text-xs text-slate-500 mt-0.5">Par : {step.completedBy}</div>
                          )}
                          {step.notes && (
                            <div className="text-xs text-slate-400 mt-1 p-2 bg-slate-50 rounded-lg">{step.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {activeTab === 'documents' && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Documents du dossier</h4>
                    <Button size="sm" onClick={() => setShowUpload(true)}>
                      <Upload className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                  {selected.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#007AFF]/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#007AFF]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{doc.nom}</div>
                          <div className="text-xs text-slate-400">
                            {DOC_TYPE_LABELS[doc.type]} - {doc.taille} - {doc.dateUpload}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}

                  {/* Upload modal */}
                  {showUpload && (
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl mt-4">
                      <div className="text-center mb-3">
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">Glisser un fichier ou cliquer pour selectionner</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['ordonnance', 'polysomnographie', 'lettre_medecin', 'compte_rendu'].map((type) => (
                          <button
                            key={type}
                            onClick={() => handleUploadDocument(type)}
                            className="p-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            {DOC_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowUpload(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Echanges medecin */}
            {activeTab === 'medecin' && (
              <div className="space-y-4">
                {/* Fiche medecin */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#007AFF]/10 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <div className="font-semibold">{selected.medecinPrescripteur.nom}</div>
                        <div className="text-sm text-slate-500">{selected.medecinPrescripteur.specialite}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-slate-500">RPPS : <span className="font-mono">{selected.medecinPrescripteur.rpps}</span></div>
                      <div className="text-slate-500">Tel : {selected.medecinPrescripteur.telephone}</div>
                      <div className="text-slate-500 col-span-2">Email : {selected.medecinPrescripteur.email}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historique echanges */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Historique des echanges</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.echangesMedecin.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Aucun echange enregistre</p>
                    ) : (
                      selected.echangesMedecin.map((echange) => (
                        <div key={echange.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{echange.type}</Badge>
                              <span className="text-sm font-medium">{echange.sujet}</span>
                            </div>
                            <span className="text-xs text-slate-400">{echange.date}</span>
                          </div>
                          <p className="text-xs text-slate-600">{echange.contenu}</p>
                          <p className="text-xs text-slate-400 mt-1">Initie par : {echange.initiePar}</p>
                        </div>
                      ))
                    )}
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter un echange
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Selectionnez une prescription pour voir le detail</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
