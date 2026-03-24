/**
 * GESTION PRESCRIPTIONS / ORDONNANCES
 *
 * Fiche prescription par patient, upload scan ordonnance,
 * alertes renouvellement, historique, statuts
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, AlertTriangle, CheckCircle, Clock, Calendar,
  Search, Filter, ChevronDown, ChevronRight, User, Plus, Eye,
  Download, X, Bell, Stethoscope, RefreshCw, Paperclip, Trash2
} from 'lucide-react';

// ---- Types ----

type PrescriptionStatus = 'active' | 'expiree' | 'en_attente_renouvellement';

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  medecinPrescripteur: {
    id: string;
    name: string;
    rpps: string;
    specialty: string;
    phone?: string;
    email?: string;
  };
  dateCreation: string;
  dateDebut: string;
  dateFin: string;
  dureeInitialeMois: number;
  renouvellementAuto: boolean;
  status: PrescriptionStatus;
  scanUrl?: string;
  scanFilename?: string;
  notes?: string;
  deviceType?: string;
  pressureMin?: number;
  pressureMax?: number;
}

interface RenewalAlert {
  id: string;
  prescriptionId: string;
  patientName: string;
  medecinName: string;
  dateFin: string;
  joursRestants: number;
  severity: '30j' | '15j' | '7j' | 'expiree';
}

// ---- Mock Data ----

const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx1', patientId: 'p1', patientName: 'Jean Dupont',
    medecinPrescripteur: { id: 'd1', name: 'Dr. Moreau', rpps: '10003456789', specialty: 'Pneumologue', phone: '01 42 33 44 55', email: 'moreau@cabinet.fr' },
    dateCreation: '2025-10-01', dateDebut: '2025-10-15', dateFin: '2026-04-15',
    dureeInitialeMois: 6, renouvellementAuto: false, status: 'active',
    scanUrl: '/uploads/rx1.pdf', scanFilename: 'ordonnance_dupont_20251001.pdf',
    deviceType: 'PPC auto-pilotee', pressureMin: 6, pressureMax: 14,
  },
  {
    id: 'rx2', patientId: 'p2', patientName: 'Marie Martin',
    medecinPrescripteur: { id: 'd2', name: 'Dr. Laurent', rpps: '10007891234', specialty: 'Pneumologue', email: 'laurent@hopital.fr' },
    dateCreation: '2025-06-15', dateDebut: '2025-07-01', dateFin: '2026-01-01',
    dureeInitialeMois: 6, renouvellementAuto: false, status: 'expiree',
    scanUrl: '/uploads/rx2.pdf', scanFilename: 'ordonnance_martin_20250615.pdf',
    deviceType: 'PPC fixe', pressureMin: 8, pressureMax: 8,
  },
  {
    id: 'rx3', patientId: 'p3', patientName: 'Pierre Bernard',
    medecinPrescripteur: { id: 'd2', name: 'Dr. Laurent', rpps: '10007891234', specialty: 'Pneumologue', email: 'laurent@hopital.fr' },
    dateCreation: '2026-01-10', dateDebut: '2026-01-15', dateFin: '2026-04-15',
    dureeInitialeMois: 3, renouvellementAuto: true, status: 'en_attente_renouvellement',
    notes: 'Renouvellement a prevoir avant J90',
    deviceType: 'PPC auto-pilotee', pressureMin: 5, pressureMax: 12,
  },
  {
    id: 'rx4', patientId: 'p4', patientName: 'Paul Durand',
    medecinPrescripteur: { id: 'd1', name: 'Dr. Moreau', rpps: '10003456789', specialty: 'Pneumologue', phone: '01 42 33 44 55' },
    dateCreation: '2025-12-01', dateDebut: '2025-12-15', dateFin: '2026-06-15',
    dureeInitialeMois: 6, renouvellementAuto: false, status: 'active',
    deviceType: 'BiPAP', pressureMin: 10, pressureMax: 18,
  },
  {
    id: 'rx5', patientId: 'p5', patientName: 'Sophie Leroy',
    medecinPrescripteur: { id: 'd3', name: 'Dr. Bernard', rpps: '10005556789', specialty: 'Medecin generaliste', phone: '04 78 99 11 22' },
    dateCreation: '2026-02-20', dateDebut: '2026-03-01', dateFin: '2026-09-01',
    dureeInitialeMois: 6, renouvellementAuto: false, status: 'active',
    scanUrl: '/uploads/rx5.pdf', scanFilename: 'ordonnance_leroy_20260220.pdf',
    deviceType: 'PPC auto-pilotee', pressureMin: 5, pressureMax: 15,
  },
  {
    id: 'rx6', patientId: 'p6', patientName: 'Claire Petit',
    medecinPrescripteur: { id: 'd1', name: 'Dr. Moreau', rpps: '10003456789', specialty: 'Pneumologue' },
    dateCreation: '2025-09-01', dateDebut: '2025-09-15', dateFin: '2026-03-15',
    dureeInitialeMois: 6, renouvellementAuto: false, status: 'expiree',
    deviceType: 'PPC auto-pilotee', pressureMin: 7, pressureMax: 13,
  },
];

function computeRenewalAlerts(prescriptions: Prescription[]): RenewalAlert[] {
  const today = new Date();
  const alerts: RenewalAlert[] = [];

  prescriptions.forEach(rx => {
    const fin = new Date(rx.dateFin);
    const diff = Math.ceil((fin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 30) {
      let severity: RenewalAlert['severity'] = '30j';
      if (diff <= 0) severity = 'expiree';
      else if (diff <= 7) severity = '7j';
      else if (diff <= 15) severity = '15j';

      alerts.push({
        id: `alert-${rx.id}`,
        prescriptionId: rx.id,
        patientName: rx.patientName,
        medecinName: rx.medecinPrescripteur.name,
        dateFin: rx.dateFin,
        joursRestants: Math.max(0, diff),
        severity,
      });
    }
  });

  return alerts.sort((a, b) => a.joursRestants - b.joursRestants);
}

// ---- Composant Principal ----

export default function PrescriptionManager() {
  const [prescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | 'all'>('all');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renewalAlerts = useMemo(() => computeRenewalAlerts(prescriptions), [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(rx => {
      const matchSearch =
        rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.medecinPrescripteur.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || rx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prescriptions, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: prescriptions.length,
    active: prescriptions.filter(r => r.status === 'active').length,
    expiree: prescriptions.filter(r => r.status === 'expiree').length,
    enAttente: prescriptions.filter(r => r.status === 'en_attente_renouvellement').length,
    alertes: renewalAlerts.length,
  }), [prescriptions, renewalAlerts]);

  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Active', icon: CheckCircle },
    expiree: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Expiree', icon: X },
    en_attente_renouvellement: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'En attente', icon: RefreshCw },
  };

  const StatusBadge = ({ status }: { status: PrescriptionStatus }) => {
    const c = statusConfig[status];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  const AlertSeverityBadge = ({ severity }: { severity: RenewalAlert['severity'] }) => {
    const config = {
      '30j': 'bg-yellow-100 text-yellow-800',
      '15j': 'bg-orange-100 text-orange-800',
      '7j': 'bg-red-100 text-red-800',
      'expiree': 'bg-red-200 text-red-900',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config[severity]}`}>{severity === 'expiree' ? 'Expiree' : severity}</span>;
  };

  const handleUpload = (rxId: string) => {
    setUploadTarget(rxId);
    setShowUploadModal(true);
  };

  const handleFileChange = () => {
    // In real app: upload to Supabase Storage
    setShowUploadModal(false);
    setUploadTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Gestion des prescriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ordonnances, renouvellements et suivi prescripteurs
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nouvelle prescription
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700">Actives</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.active}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">Expirees</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.expiree}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm text-orange-700">En attente</p>
          <p className="text-2xl font-bold text-orange-800 mt-1">{stats.enAttente}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-1 text-sm text-yellow-700">
            <Bell className="w-3.5 h-3.5" /> Alertes
          </div>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{stats.alertes}</p>
        </div>
      </div>

      {/* Alertes renouvellement */}
      {renewalAlerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            Alertes renouvellement ({renewalAlerts.length})
          </h3>
          <div className="space-y-2">
            {renewalAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100">
                <div className="flex items-center gap-3">
                  <AlertSeverityBadge severity={alert.severity} />
                  <div>
                    <p className="font-medium text-sm">{alert.patientName}</p>
                    <p className="text-xs text-muted-foreground">Prescripteur : {alert.medecinName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {alert.joursRestants === 0 ? 'Expiree' : `${alert.joursRestants}j restants`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fin : {new Date(alert.dateFin).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher patient ou medecin..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'active', 'expiree', 'en_attente_renouvellement'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Toutes' : s === 'en_attente_renouvellement' ? 'En attente' : s === 'active' ? 'Actives' : 'Expirees'}
            </button>
          ))}
        </div>
      </div>

      {/* Liste prescriptions */}
      <div className="space-y-3">
        {filteredPrescriptions.map(rx => (
          <motion.div
            key={rx.id}
            layout
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Header row */}
            <div
              onClick={() => setSelectedRx(selectedRx?.id === rx.id ? null : rx)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {selectedRx?.id === rx.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <p className="font-semibold text-sm">{rx.patientName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> {rx.medecinPrescripteur.name} - {rx.medecinPrescripteur.specialty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(rx.dateDebut).toLocaleDateString('fr-FR')} - {new Date(rx.dateFin).toLocaleDateString('fr-FR')}</p>
                  <p>{rx.dureeInitialeMois} mois</p>
                </div>
                <StatusBadge status={rx.status} />
                {rx.scanUrl && <Paperclip className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Detail */}
            <AnimatePresence>
              {selectedRx?.id === rx.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fiche prescription */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase">Fiche prescription</h4>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Date creation</p>
                          <p className="font-medium">{new Date(rx.dateCreation).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duree</p>
                          <p className="font-medium">{rx.dureeInitialeMois} mois</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Debut</p>
                          <p className="font-medium">{new Date(rx.dateDebut).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fin</p>
                          <p className="font-medium">{new Date(rx.dateFin).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {rx.deviceType && (
                          <div>
                            <p className="text-xs text-muted-foreground">Type appareil</p>
                            <p className="font-medium">{rx.deviceType}</p>
                          </div>
                        )}
                        {rx.pressureMin != null && (
                          <div>
                            <p className="text-xs text-muted-foreground">Pression</p>
                            <p className="font-medium">{rx.pressureMin} - {rx.pressureMax} cmH2O</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Renouvellement auto</p>
                          <p className="font-medium">{rx.renouvellementAuto ? 'Oui' : 'Non'}</p>
                        </div>
                      </div>

                      {rx.notes && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p>{rx.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Medecin prescripteur + ordonnance */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase">Medecin prescripteur</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                        <p className="font-semibold text-blue-900">{rx.medecinPrescripteur.name}</p>
                        <p className="text-sm text-blue-700">{rx.medecinPrescripteur.specialty}</p>
                        <p className="text-xs text-blue-600">RPPS : {rx.medecinPrescripteur.rpps}</p>
                        {rx.medecinPrescripteur.phone && (
                          <p className="text-xs text-blue-600">Tel : {rx.medecinPrescripteur.phone}</p>
                        )}
                        {rx.medecinPrescripteur.email && (
                          <p className="text-xs text-blue-600">Email : {rx.medecinPrescripteur.email}</p>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm text-muted-foreground uppercase">Ordonnance scannee</h4>
                      {rx.scanUrl ? (
                        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm">{rx.scanFilename}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Voir">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Telecharger">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpload(rx.id)}
                          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Upload className="w-5 h-5" />
                          Uploader le scan de l'ordonnance
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Historique prescriptions patient */}
                  <div className="px-4 pb-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Historique prescriptions</h4>
                    <div className="space-y-1">
                      {prescriptions
                        .filter(p => p.patientId === rx.patientId)
                        .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
                        .map(h => (
                          <div key={h.id} className={`flex items-center justify-between p-2 rounded text-sm ${h.id === rx.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'}`}>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{new Date(h.dateCreation).toLocaleDateString('fr-FR')}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{h.medecinPrescripteur.name}</span>
                            </div>
                            <StatusBadge status={h.status} />
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Upload ordonnance</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 rounded hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Scannez l'ordonnance et uploadez le fichier (PDF, JPG, PNG). Stockage securise Supabase Storage.
              </p>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Cliquez ou deposez le fichier ici</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG - Max 10 Mo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleFileChange}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Uploader
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
