/**
 * PHASE 3.5 - PARAMÈTRES PLATEFORME
 * Configuration globale : Général, Seuils d'alertes, Exports
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Image, 
  Bell, 
  Download,
  Save,
  Upload,
  AlertTriangle,
  Check,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

type Tab = 'general' | 'alerts' | 'exports';

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General Settings
  const [clinicName, setClinicName] = useState('Exp\'Air Medical');
  const [clinicAddress, setClinicAddress] = useState('123 Avenue de la Santé, 75001 Paris');
  const [clinicPhone, setClinicPhone] = useState('+33 1 23 45 67 89');
  const [clinicEmail, setClinicEmail] = useState('contact@medical-sante.fr');
  const [logoUrl, setLogoUrl] = useState('');

  // Alert Thresholds
  const [thresholds, setThresholds] = useState({
    leak_rate_warning: 24,
    leak_rate_critical: 30,
    usage_hours_min: 4,
    usage_hours_target: 7,
    ahi_warning: 10,
    ahi_critical: 15,
    compliance_days: 120,
    compliance_usage_rate: 70,
  });

  const handleSaveGeneral = () => {
    // Sauvegarder les paramètres généraux
    toast.success('Paramètres généraux sauvegardés', {
      description: 'Les modifications ont été enregistrées avec succès.',
    });
  };

  const handleSaveThresholds = () => {
    // Sauvegarder les seuils d'alertes
    toast.success('Seuils d\'alertes mis à jour', {
      description: 'Les nouveaux seuils seront appliqués immédiatement.',
    });
  };

  const handleExport = (type: string) => {
    // Simuler l'export
    toast.loading(`Export ${type} en cours...`, { duration: 2000 });
    setTimeout(() => {
      toast.success(`Export ${type} téléchargé`, {
        description: 'Le fichier CSV a été généré avec succès.',
      });
    }, 2000);
  };

  const handleLogoUpload = () => {
    // Simuler l'upload du logo
    toast.success('Logo téléchargé', {
      description: 'Le nouveau logo sera visible d\'ici quelques instants.',
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB]">
      {/* Header */}
      <header className="bg-white border-b border-[#D9D5CC]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#007AFF]/10 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-3xl text-[#1A1A1A]">Paramètres de la plateforme</h1>
              <p className="text-sm text-[#5C5C5C]">
                Configuration générale, seuils d'alertes et exports
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-[#D9D5CC] mb-6 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#5C5C5C] hover:bg-[#F2F0EB]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Général
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#5C5C5C] hover:bg-[#F2F0EB]'
            }`}
          >
            <Bell className="w-4 h-4" />
            Seuils d'alertes
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'exports'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#5C5C5C] hover:bg-[#F2F0EB]'
            }`}
          >
            <Download className="w-4 h-4" />
            Exports
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-[#D9D5CC] p-8">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl text-[#1A1A1A] mb-2">Informations générales</h2>
                <p className="text-sm text-[#5C5C5C]">
                  Configurez les informations de votre établissement
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    Nom de l'établissement
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div className="border-t border-[#D9D5CC] pt-6">
                <h3 className="text-lg text-[#1A1A1A] mb-4">Logo de l'établissement</h3>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-[#D9D5CC] rounded-xl flex items-center justify-center bg-[#F2F0EB]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="w-12 h-12 text-[#5C5C5C]" />
                    )}
                  </div>
                  <div>
                    <Button
                      onClick={handleLogoUpload}
                      variant="outline"
                      className="gap-2 mb-2"
                    >
                      <Upload className="w-4 h-4" />
                      Télécharger un logo
                    </Button>
                    <p className="text-xs text-[#5C5C5C]">
                      PNG, JPG ou SVG • Max 2 MB • Recommandé : 512x512px
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D9D5CC]">
                <Button
                  onClick={handleSaveGeneral}
                  className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder les modifications
                </Button>
              </div>
            </motion.div>
          )}

          {/* ALERTS THRESHOLDS TAB */}
          {activeTab === 'alerts' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Seuils d'alertes configurables
                  </h3>
                  <p className="text-xs text-blue-700">
                    Modifiez ces seuils pour adapter les alertes automatiques à vos besoins.
                    Les modifications sont appliquées immédiatement.
                  </p>
                </div>
              </div>

              {/* Leak Rate */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg text-[#1A1A1A] mb-1 flex items-center gap-2">
                    💨 Fuites (L/min)
                  </h3>
                  <p className="text-sm text-[#5C5C5C]">
                    Seuils de déclenchement des alertes de fuite
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Seuil d'avertissement
                      <Badge className="ml-2 bg-orange-100 text-orange-800">Medium</Badge>
                    </label>
                    <input
                      type="number"
                      value={thresholds.leak_rate_warning}
                      onChange={(e) => setThresholds({ ...thresholds, leak_rate_warning: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.leak_rate_warning} L/min
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Seuil critique
                      <Badge className="ml-2 bg-red-100 text-red-800">High</Badge>
                    </label>
                    <input
                      type="number"
                      value={thresholds.leak_rate_critical}
                      onChange={(e) => setThresholds({ ...thresholds, leak_rate_critical: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.leak_rate_critical} L/min
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Hours */}
              <div className="space-y-4 border-t border-[#D9D5CC] pt-6">
                <div>
                  <h3 className="text-lg text-[#1A1A1A] mb-1 flex items-center gap-2">
                    ⏰ Observance (heures/nuit)
                  </h3>
                  <p className="text-sm text-[#5C5C5C]">
                    Objectifs d'utilisation quotidienne
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Minimum acceptable
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thresholds.usage_hours_min}
                      onChange={(e) => setThresholds({ ...thresholds, usage_hours_min: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.usage_hours_min}h / nuit
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Objectif cible (CPAM)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thresholds.usage_hours_target}
                      onChange={(e) => setThresholds({ ...thresholds, usage_hours_target: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.usage_hours_target}h / nuit
                    </p>
                  </div>
                </div>
              </div>

              {/* AHI */}
              <div className="space-y-4 border-t border-[#D9D5CC] pt-6">
                <div>
                  <h3 className="text-lg text-[#1A1A1A] mb-1 flex items-center gap-2">
                    📊 IAH (Index Apnée-Hypopnée)
                  </h3>
                  <p className="text-sm text-[#5C5C5C]">
                    Seuils de qualité du traitement
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Seuil d'avertissement
                    </label>
                    <input
                      type="number"
                      value={thresholds.ahi_warning}
                      onChange={(e) => setThresholds({ ...thresholds, ahi_warning: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.ahi_warning} événements/h
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Seuil critique
                    </label>
                    <input
                      type="number"
                      value={thresholds.ahi_critical}
                      onChange={(e) => setThresholds({ ...thresholds, ahi_critical: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.ahi_critical} événements/h
                    </p>
                  </div>
                </div>
              </div>

              {/* CPAM Compliance */}
              <div className="space-y-4 border-t border-[#D9D5CC] pt-6">
                <div>
                  <h3 className="text-lg text-[#1A1A1A] mb-1 flex items-center gap-2">
                    🏥 Conformité CPAM
                  </h3>
                  <p className="text-sm text-[#5C5C5C]">
                    Critères de remboursement Sécurité Sociale
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Période d'évaluation (jours)
                    </label>
                    <input
                      type="number"
                      value={thresholds.compliance_days}
                      onChange={(e) => setThresholds({ ...thresholds, compliance_days: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.compliance_days} jours (4 mois)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Taux d'utilisation minimum (%)
                    </label>
                    <input
                      type="number"
                      value={thresholds.compliance_usage_rate}
                      onChange={(e) => setThresholds({ ...thresholds, compliance_usage_rate: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Actuel : {thresholds.compliance_usage_rate}% des nuits
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D9D5CC]">
                <Button
                  onClick={handleSaveThresholds}
                  className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer les seuils
                </Button>
              </div>
            </motion.div>
          )}

          {/* EXPORTS TAB */}
          {activeTab === 'exports' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl text-[#1A1A1A] mb-2">Exports de données</h2>
                <p className="text-sm text-[#5C5C5C]">
                  Téléchargez l'historique complet de vos données au format CSV
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patients */}
                <div className="border border-[#D9D5CC] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Base patients</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Liste complète des patients avec coordonnées et informations médicales
                  </p>
                  <Button
                    onClick={() => handleExport('patients')}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter les patients
                  </Button>
                </div>

                {/* Observance Data */}
                <div className="border border-[#D9D5CC] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <Badge className="bg-green-100 text-green-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Données d'observance</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Historique complet des données de traitement (usage, fuites, IAH, pression)
                  </p>
                  <Button
                    onClick={() => handleExport('observance')}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter l'observance
                  </Button>
                </div>

                {/* Alerts */}
                <div className="border border-[#D9D5CC] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Historique des alertes</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Toutes les alertes générées avec statut de résolution et actions effectuées
                  </p>
                  <Button
                    onClick={() => handleExport('alertes')}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter les alertes
                  </Button>
                </div>

                {/* Interventions */}
                <div className="border border-[#D9D5CC] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Interventions techniques</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Registre des interventions avec dates, techniciens et matériel utilisé
                  </p>
                  <Button
                    onClick={() => handleExport('interventions')}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter les interventions
                  </Button>
                </div>

                {/* Equipment */}
                <div className="border border-[#D9D5CC] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Équipements</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Inventaire du matériel avec dates de pose et de renouvellement
                  </p>
                  <Button
                    onClick={() => handleExport('equipments')}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter les équipements
                  </Button>
                </div>

                {/* Full Export */}
                <div className="border-2 border-[#007AFF] rounded-2xl p-6 bg-gradient-to-br from-[#007AFF]/5 to-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-[#007AFF]/10 rounded-xl">
                      <FileText className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <Badge className="bg-[#007AFF] text-white">Complet</Badge>
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] mb-2">Export complet</h3>
                  <p className="text-sm text-[#5C5C5C] mb-4">
                    Archive complète de toutes les données de la plateforme (ZIP)
                  </p>
                  <Button
                    onClick={() => handleExport('complet')}
                    className="w-full gap-2 bg-[#007AFF] hover:bg-[#0051D5]"
                  >
                    <Download className="w-4 h-4" />
                    Export complet (ZIP)
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      Note sur les exports
                    </h4>
                    <p className="text-xs text-yellow-700">
                      Les exports contiennent des données sensibles de santé. Assurez-vous de respecter
                      les réglementations RGPD et de stocker les fichiers de manière sécurisée.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
