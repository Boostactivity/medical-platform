/**
 * IMPORT DONNEES CARTE SD
 *
 * Upload fichier .edf ou .csv depuis carte SD PPC
 * Parsing, mapping patient, preview, historique imports
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDrive, Upload, FileText, CheckCircle, AlertTriangle, X,
  Search, User, Calendar, Clock, ChevronDown, ChevronRight,
  Database, Eye, Trash2, RefreshCw, ArrowRight, Download
} from 'lucide-react';

// ---- Types ----

type ImportStatus = 'pending' | 'preview' | 'imported' | 'error';

interface ParsedRecord {
  date: string;
  usageHours: number;
  iah: number;
  leakRate: number;
  pressureMin: number;
  pressureMax: number;
  pressureAvg: number;
}

interface ImportSession {
  id: string;
  filename: string;
  fileType: 'edf' | 'csv';
  fileSize: number;
  uploadedAt: string;
  status: ImportStatus;
  patientId?: string;
  patientName?: string;
  deviceSerial?: string;
  recordCount: number;
  dateRange?: { from: string; to: string };
  records: ParsedRecord[];
  errorMessage?: string;
}

interface PatientOption {
  id: string;
  name: string;
  deviceSerial: string;
}

// ---- Mock Data ----

const MOCK_PATIENTS: PatientOption[] = [
  { id: 'p1', name: 'Jean Dupont', deviceSerial: 'RS11-2023-00142' },
  { id: 'p2', name: 'Marie Martin', deviceSerial: 'PDS2-2021-00089' },
  { id: 'p3', name: 'Pierre Bernard', deviceSerial: 'RS11-2024-00201' },
  { id: 'p4', name: 'Paul Durand', deviceSerial: 'RS10-2020-00331' },
  { id: 'p5', name: 'Sophie Leroy', deviceSerial: 'LPS-2024-00015' },
  { id: 'p6', name: 'Claire Petit', deviceSerial: 'PDS2-2023-00145' },
];

function generateMockRecords(days: number): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    records.push({
      date: date.toISOString().split('T')[0],
      usageHours: Math.round((4 + Math.random() * 5) * 10) / 10,
      iah: Math.round((1 + Math.random() * 8) * 10) / 10,
      leakRate: Math.round((5 + Math.random() * 25) * 10) / 10,
      pressureMin: Math.round((5 + Math.random() * 3) * 10) / 10,
      pressureMax: Math.round((10 + Math.random() * 6) * 10) / 10,
      pressureAvg: Math.round((7 + Math.random() * 4) * 10) / 10,
    });
  }
  return records;
}

const MOCK_HISTORY: ImportSession[] = [
  {
    id: 'imp1', filename: 'DATALOG_20260315.csv', fileType: 'csv', fileSize: 45000,
    uploadedAt: '2026-03-15T10:30:00', status: 'imported',
    patientId: 'p1', patientName: 'Jean Dupont', deviceSerial: 'RS11-2023-00142',
    recordCount: 30, dateRange: { from: '2026-02-14', to: '2026-03-15' },
    records: generateMockRecords(30),
  },
  {
    id: 'imp2', filename: 'STR.edf', fileType: 'edf', fileSize: 128000,
    uploadedAt: '2026-03-10T14:15:00', status: 'imported',
    patientId: 'p2', patientName: 'Marie Martin', deviceSerial: 'PDS2-2021-00089',
    recordCount: 14, dateRange: { from: '2026-02-25', to: '2026-03-10' },
    records: generateMockRecords(14),
  },
  {
    id: 'imp3', filename: 'export_data.csv', fileType: 'csv', fileSize: 22000,
    uploadedAt: '2026-03-05T09:00:00', status: 'error',
    recordCount: 0, records: [],
    errorMessage: 'Format de colonnes non reconnu - verifier le format du fichier',
  },
];

// ---- Composant Principal ----

export default function SDCardImport() {
  const [importHistory, setImportHistory] = useState<ImportSession[]>(MOCK_HISTORY);
  const [currentImport, setCurrentImport] = useState<ImportSession | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => ({
    total: importHistory.length,
    imported: importHistory.filter(i => i.status === 'imported').length,
    errors: importHistory.filter(i => i.status === 'error').length,
    totalRecords: importHistory.filter(i => i.status === 'imported').reduce((s, i) => s + i.recordCount, 0),
  }), [importHistory]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'edf') {
      alert('Format non supporte. Utilisez .csv ou .edf');
      return;
    }

    // Simulate parsing
    const records = generateMockRecords(21);
    const newImport: ImportSession = {
      id: `imp-${Date.now()}`,
      filename: file.name,
      fileType: ext as 'csv' | 'edf',
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'preview',
      recordCount: records.length,
      dateRange: {
        from: records[0].date,
        to: records[records.length - 1].date,
      },
      records,
    };

    setCurrentImport(newImport);
    setShowPreview(true);
    setSelectedPatientId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const confirmImport = () => {
    if (!currentImport || !selectedPatientId) return;
    const patient = MOCK_PATIENTS.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const imported: ImportSession = {
      ...currentImport,
      status: 'imported',
      patientId: patient.id,
      patientName: patient.name,
      deviceSerial: patient.deviceSerial,
    };

    setImportHistory([imported, ...importHistory]);
    setCurrentImport(null);
    setShowPreview(false);
  };

  const cancelImport = () => {
    setCurrentImport(null);
    setShowPreview(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-primary" />
            Import carte SD
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload et parsing des fichiers .edf / .csv depuis les cartes SD PPC
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Imports total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700">Importes</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.imported}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">Erreurs</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.errors}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">Enregistrements</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{stats.totalRecords}</p>
        </div>
      </div>

      {/* Zone upload */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-semibold text-foreground">Cliquez ou deposez un fichier carte SD</p>
        <p className="text-sm text-muted-foreground mt-1">Formats supportes : .edf (European Data Format), .csv</p>
        <p className="text-xs text-muted-foreground mt-1">
          Les donnees seront parsees : heures utilisation, IAH, fuites, pression
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".edf,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {showPreview && currentImport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border-2 border-primary/30 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Preview - {currentImport.filename}
              </h3>
              <button onClick={cancelImport} className="p-1 rounded hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info fichier */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="font-medium uppercase">{currentImport.fileType}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Taille</p>
                <p className="font-medium">{formatFileSize(currentImport.fileSize)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Enregistrements</p>
                <p className="font-medium">{currentImport.recordCount} jours</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Periode</p>
                <p className="font-medium">
                  {currentImport.dateRange ? `${new Date(currentImport.dateRange.from).toLocaleDateString('fr-FR')} - ${new Date(currentImport.dateRange.to).toLocaleDateString('fr-FR')}` : '-'}
                </p>
              </div>
            </div>

            {/* Mapping patient */}
            <div>
              <label className="block text-sm font-medium mb-2">Associer a un patient</label>
              <select
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-card text-foreground"
              >
                <option value="">-- Selectionner un patient --</option>
                {MOCK_PATIENTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.deviceSerial})</option>
                ))}
              </select>
            </div>

            {/* Preview tableau */}
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Heures</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">IAH</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Fuites (L/min)</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">P. min</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">P. max</th>
                    <th className="text-right p-2 text-xs font-semibold text-muted-foreground">P. moy</th>
                  </tr>
                </thead>
                <tbody>
                  {currentImport.records.map(r => (
                    <tr key={r.date} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-2">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                      <td className={`p-2 text-right font-medium ${r.usageHours >= 4 ? 'text-green-700' : 'text-red-700'}`}>
                        {r.usageHours}h
                      </td>
                      <td className={`p-2 text-right ${r.iah <= 5 ? 'text-green-700' : 'text-orange-700'}`}>{r.iah}</td>
                      <td className={`p-2 text-right ${r.leakRate <= 24 ? 'text-green-700' : 'text-red-700'}`}>{r.leakRate}</td>
                      <td className="p-2 text-right">{r.pressureMin}</td>
                      <td className="p-2 text-right">{r.pressureMax}</td>
                      <td className="p-2 text-right">{r.pressureAvg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelImport}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmImport}
                disabled={!selectedPatientId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4" />
                Confirmer l'import
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique imports */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          Historique des imports
        </h3>
        <div className="space-y-2">
          {importHistory.map(imp => (
            <div key={imp.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                onClick={() => setShowHistory(showHistory === imp.id ? null : imp.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {showHistory === imp.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <FileText className={`w-5 h-5 ${imp.status === 'imported' ? 'text-green-600' : imp.status === 'error' ? 'text-red-600' : 'text-orange-600'}`} />
                  <div>
                    <p className="font-medium text-sm">{imp.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(imp.uploadedAt).toLocaleDateString('fr-FR')} - {formatFileSize(imp.fileSize)}
                      {imp.patientName && ` - ${imp.patientName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {imp.recordCount > 0 && (
                    <span className="text-xs text-muted-foreground">{imp.recordCount} enregistrements</span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    imp.status === 'imported' ? 'bg-green-100 text-green-800' :
                    imp.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {imp.status === 'imported' && <CheckCircle className="w-3 h-3" />}
                    {imp.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                    {imp.status === 'imported' ? 'Importe' : imp.status === 'error' ? 'Erreur' : 'En attente'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {showHistory === imp.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border p-4"
                  >
                    {imp.status === 'error' ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                        <p className="font-semibold">Erreur d'import</p>
                        <p>{imp.errorMessage}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Patient</p>
                            <p className="font-medium">{imp.patientName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Appareil</p>
                            <p className="font-medium font-mono text-xs">{imp.deviceSerial || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Periode</p>
                            <p className="font-medium">
                              {imp.dateRange ? `${new Date(imp.dateRange.from).toLocaleDateString('fr-FR')} - ${new Date(imp.dateRange.to).toLocaleDateString('fr-FR')}` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Enregistrements</p>
                            <p className="font-medium">{imp.recordCount} jours</p>
                          </div>
                        </div>

                        {imp.records.length > 0 && (
                          <div className="overflow-x-auto max-h-48 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-card">
                                <tr className="border-b border-border">
                                  <th className="text-left p-1.5 font-semibold text-muted-foreground">Date</th>
                                  <th className="text-right p-1.5 font-semibold text-muted-foreground">Heures</th>
                                  <th className="text-right p-1.5 font-semibold text-muted-foreground">IAH</th>
                                  <th className="text-right p-1.5 font-semibold text-muted-foreground">Fuites</th>
                                  <th className="text-right p-1.5 font-semibold text-muted-foreground">P. moy</th>
                                </tr>
                              </thead>
                              <tbody>
                                {imp.records.slice(0, 10).map(r => (
                                  <tr key={r.date} className="border-b border-border/30">
                                    <td className="p-1.5">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="p-1.5 text-right">{r.usageHours}h</td>
                                    <td className="p-1.5 text-right">{r.iah}</td>
                                    <td className="p-1.5 text-right">{r.leakRate}</td>
                                    <td className="p-1.5 text-right">{r.pressureAvg}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {imp.records.length > 10 && (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                ... et {imp.records.length - 10} enregistrements de plus
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
