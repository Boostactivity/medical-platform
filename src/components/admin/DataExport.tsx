/**
 * IMPORT/EXPORT DONNEES CSV
 *
 * Export patients, alertes, interventions CSV
 * Import patients CSV en masse avec previsualisation
 */

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Upload, FileText, Users, AlertTriangle, Wrench,
  CheckCircle, XCircle, Eye, ChevronDown, Loader2, Table, ArrowRight
} from 'lucide-react';

// ---- Types ----

type ExportType = 'patients' | 'alertes' | 'interventions';

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
  bg: string;
  columns: string[];
}

interface ImportRow {
  [key: string]: string;
}

interface ImportValidation {
  row: number;
  errors: string[];
  warnings: string[];
}

// ---- Config ----

const EXPORT_CONFIGS: ExportConfig[] = [
  {
    type: 'patients',
    label: 'Patients',
    description: 'Nom, observance, IAH, derniere visite, dispositif',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    columns: ['Nom', 'Prenom', 'Date naissance', 'Observance %', 'IAH moyen', 'Derniere visite', 'Dispositif', 'Medecin', 'Statut'],
  },
  {
    type: 'alertes',
    label: 'Alertes',
    description: 'Patient, type alerte, severite, date, statut',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    columns: ['Patient', 'Type alerte', 'Severite', 'Date', 'Description', 'Statut', 'Assignee a'],
  },
  {
    type: 'interventions',
    label: 'Interventions',
    description: 'Patient, technicien, type, date, duree, compte-rendu',
    icon: Wrench,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    columns: ['Patient', 'Technicien', 'Type intervention', 'Date', 'Duree (min)', 'Compte-rendu', 'Statut'],
  },
];

// ---- Mock Data Generators ----

function generatePatientsCSV(): string[][] {
  const patients = [
    ['Dupont', 'Jean', '1965-03-15', '82', '3.2', '2026-03-20', 'ResMed AirSense 11', 'Dr. Moreau', 'Actif'],
    ['Martin', 'Marie', '1972-08-22', '91', '2.1', '2026-03-18', 'Philips DreamStation 2', 'Dr. Laurent', 'Actif'],
    ['Bernard', 'Pierre', '1958-01-10', '65', '4.8', '2026-03-15', 'ResMed AirSense 11', 'Dr. Laurent', 'Actif'],
    ['Durand', 'Paul', '1980-11-30', '75', '3.9', '2026-03-10', 'ResMed AirSense 10', 'Dr. Moreau', 'Actif'],
    ['Leroy', 'Sophie', '1990-05-14', '88', '2.5', '2026-03-22', 'Lowenstein Prisma', 'Dr. Bernard', 'Actif'],
    ['Petit', 'Claire', '1968-09-03', '70', '5.1', '2026-03-12', 'Philips DreamStation 2', 'Dr. Moreau', 'Actif'],
    ['Moreau', 'Luc', '1975-12-25', '95', '1.8', '2026-03-19', 'ResMed AirSense 11', 'Dr. Laurent', 'Actif'],
    ['Girard', 'Emma', '1985-07-08', '78', '3.5', '2026-03-21', 'ResMed AirSense 11', 'Dr. Bernard', 'Actif'],
  ];
  return patients;
}

function generateAlertesCSV(): string[][] {
  return [
    ['Jean Dupont', 'Fuites elevees', 'Moderee', '2026-03-22', 'Fuites >40L/min 3 nuits consecutives', 'Ouverte', 'Marc Lefevre'],
    ['Pierre Bernard', 'Observance faible', 'Haute', '2026-03-20', 'Usage <4h 5 nuits sur 7', 'En cours', 'Sophie Durand'],
    ['Claire Petit', 'IAH eleve', 'Haute', '2026-03-18', 'IAH residuel >10 evenements/h', 'Ouverte', 'Dr. Moreau'],
    ['Paul Durand', 'Non utilisation', 'Critique', '2026-03-15', 'Pas d\'utilisation depuis 3 jours', 'Resolue', 'Marc Lefevre'],
    ['Sophie Leroy', 'Masque inadapte', 'Faible', '2026-03-12', 'Fuites frequentes, masque a changer', 'Resolue', 'Sophie Durand'],
    ['Luc Moreau', 'Pression inadaptee', 'Moderee', '2026-03-10', 'Aerophagie signalee, verifier pression', 'En cours', 'Dr. Laurent'],
  ];
}

function generateInterventionsCSV(): string[][] {
  return [
    ['Jean Dupont', 'Marc Lefevre', 'Visite domicile', '2026-03-20', '45', 'Ajustement masque nasal, verification fuites', 'Terminee'],
    ['Marie Martin', 'Sophie Durand', 'Teleconsultation', '2026-03-18', '20', 'Bilan J90, observance excellente', 'Terminee'],
    ['Pierre Bernard', 'Marc Lefevre', 'Visite domicile', '2026-03-15', '60', 'Changement masque facial, reeducation', 'Terminee'],
    ['Paul Durand', 'Marc Lefevre', 'Appel telephonique', '2026-03-10', '15', 'Relance observance, rappel benefices', 'Terminee'],
    ['Sophie Leroy', 'Sophie Durand', 'Visite domicile', '2026-03-22', '40', 'Installation nouveau masque narinaire', 'Planifiee'],
    ['Claire Petit', 'Sophie Durand', 'Teleconsultation', '2026-03-12', '25', 'Ajustement pression, conseils confort', 'Terminee'],
    ['Luc Moreau', 'Marc Lefevre', 'Visite domicile', '2026-03-19', '50', 'Bilan semestriel, remplacement tuyau', 'Terminee'],
    ['Emma Girard', 'Sophie Durand', 'Appel telephonique', '2026-03-21', '10', 'Rappel J7, premier bilan positif', 'Terminee'],
  ];
}

// ---- CSV Helper ----

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line =>
    line.split(separator).map(cell => cell.trim().replace(/^"|"$/g, ''))
  );

  return { headers, rows };
}

// ---- Composant Principal ----

export function DataExport() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidation[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (type: ExportType) => {
    const config = EXPORT_CONFIGS.find(c => c.type === type)!;
    let rows: string[][];

    switch (type) {
      case 'patients':
        rows = generatePatientsCSV();
        break;
      case 'alertes':
        rows = generateAlertesCSV();
        break;
      case 'interventions':
        rows = generateInterventionsCSV();
        break;
    }

    downloadCSV(config.columns, rows, `export_${type}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportDone(false);

    const text = await file.text();
    const parsed = parseCSV(text);
    setImportData(parsed);

    // Validate
    const requiredHeaders = ['Nom', 'Prenom'];
    const validations: ImportValidation[] = [];

    // Check headers
    const missingHeaders = requiredHeaders.filter(h =>
      !parsed.headers.some(ph => ph.toLowerCase() === h.toLowerCase())
    );

    if (missingHeaders.length > 0) {
      validations.push({
        row: 0,
        errors: [`Colonnes manquantes : ${missingHeaders.join(', ')}`],
        warnings: [],
      });
    }

    // Check rows
    parsed.rows.forEach((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (row.length < 2 || !row[0] || !row[1]) {
        errors.push('Nom et prenom requis');
      }

      if (row.length >= 3 && row[2]) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row[2])) {
          warnings.push('Format date naissance invalide (attendu: YYYY-MM-DD)');
        }
      }

      if (errors.length > 0 || warnings.length > 0) {
        validations.push({ row: idx + 1, errors, warnings });
      }
    });

    setImportValidation(validations);
  };

  const handleImport = async () => {
    if (!importData) return;

    setImporting(true);
    // Simulate import
    await new Promise(resolve => setTimeout(resolve, 1500));
    setImporting(false);
    setImportDone(true);
  };

  const hasErrors = importValidation.some(v => v.errors.length > 0);
  const hasWarnings = importValidation.some(v => v.warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Table className="w-6 h-6 text-blue-600" />
          Import / Export de donnees
        </h2>
        <p className="text-sm text-gray-500 mt-1">Exportez vos donnees en CSV ou importez des patients en masse</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 max-w-xs">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'export' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="w-4 h-4" /> Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'import' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="w-4 h-4" /> Import
        </button>
      </div>

      {/* ===== EXPORT ===== */}
      {activeTab === 'export' && (
        <div className="grid md:grid-cols-3 gap-4">
          {EXPORT_CONFIGS.map(config => {
            const Icon = config.icon;
            return (
              <motion.div
                key={config.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Export {config.label}</h3>
                <p className="text-sm text-gray-500 mb-4">{config.description}</p>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-1">Colonnes incluses :</p>
                  <div className="flex flex-wrap gap-1">
                    {config.columns.map(col => (
                      <span key={col} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleExport(config.type)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Telecharger CSV
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== IMPORT ===== */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700 mb-1">
              {importFile ? importFile.name : 'Cliquez pour selectionner un fichier CSV'}
            </p>
            <p className="text-sm text-gray-400">
              Format attendu : Nom;Prenom;Date naissance;... (separateur point-virgule ou virgule)
            </p>
          </div>

          {/* Template download */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900 text-sm">Besoin d'un modele ?</p>
              <p className="text-xs text-blue-600">Telechargez le template CSV pour l'import de patients</p>
            </div>
            <button
              onClick={() => downloadCSV(
                ['Nom', 'Prenom', 'Date naissance', 'Email', 'Telephone', 'Medecin referent', 'Dispositif'],
                [['Dupont', 'Jean', '1965-03-15', 'jean.dupont@email.fr', '0612345678', 'Dr. Moreau', 'ResMed AirSense 11']],
                'template_import_patients'
              )}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Template
            </button>
          </div>

          {/* Preview */}
          {importData && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Previsualisation</h3>
                  <span className="text-xs text-gray-400">({importData.rows.length} lignes)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasErrors && (
                    <span className="flex items-center gap-1 text-red-600 text-xs">
                      <XCircle className="w-3 h-3" /> Erreurs detectees
                    </span>
                  )}
                  {hasWarnings && !hasErrors && (
                    <span className="flex items-center gap-1 text-orange-600 text-xs">
                      <AlertTriangle className="w-3 h-3" /> Avertissements
                    </span>
                  )}
                  {!hasErrors && !hasWarnings && importData.rows.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3" /> Valide
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left text-xs font-semibold text-gray-500">#</th>
                      {importData.headers.map((h, i) => (
                        <th key={i} className="p-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                      <th className="p-2 text-left text-xs font-semibold text-gray-500">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importData.rows.slice(0, 20).map((row, idx) => {
                      const validation = importValidation.find(v => v.row === idx + 1);
                      const rowHasError = validation && validation.errors.length > 0;
                      const rowHasWarning = validation && validation.warnings.length > 0;

                      return (
                        <tr key={idx} className={rowHasError ? 'bg-red-50' : rowHasWarning ? 'bg-yellow-50' : ''}>
                          <td className="p-2 text-gray-400">{idx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 text-gray-700">{cell || <span className="text-gray-300">-</span>}</td>
                          ))}
                          <td className="p-2">
                            {rowHasError ? (
                              <span className="text-xs text-red-600">{validation!.errors[0]}</span>
                            ) : rowHasWarning ? (
                              <span className="text-xs text-orange-600">{validation!.warnings[0]}</span>
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importData.rows.length > 20 && (
                <p className="p-3 text-center text-xs text-gray-400">
                  ... et {importData.rows.length - 20} lignes supplementaires
                </p>
              )}

              {/* Validation summary */}
              {importValidation.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">Rapport de validation</h4>
                  <div className="space-y-1">
                    {importValidation.map((v, i) => (
                      <div key={i}>
                        {v.errors.map((err, eIdx) => (
                          <p key={eIdx} className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Ligne {v.row}: {err}
                          </p>
                        ))}
                        {v.warnings.map((warn, wIdx) => (
                          <p key={wIdx} className="text-xs text-orange-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Ligne {v.row}: {warn}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import button */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {importData.rows.length} patient{importData.rows.length > 1 ? 's' : ''} a importer
                </p>
                {!importDone ? (
                  <button
                    onClick={handleImport}
                    disabled={hasErrors || importing || importData.rows.length === 0}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Import en cours...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Importer</>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                    <CheckCircle className="w-5 h-5" /> Import termine avec succes !
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
