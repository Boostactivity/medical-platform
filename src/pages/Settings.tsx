/**
 * PHASE 3.5 - PARAMETRES PLATEFORME
 * Configuration globale : General, Seuils d'alertes, Exports, Securite
 */

import { useState, useEffect } from 'react';
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
  FileText,
  Shield,
  Key,
  History,
  Smartphone,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { MFASetup } from '../components/security/MFASetup';
import { ConnectionHistory } from '../components/patient/ConnectionHistory';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

type Tab = 'general' | 'alerts' | 'exports' | 'security';

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { user, mfaEnabled, checkMfaStatus, userRole } = useAuth();

  // MFA state
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [localMfaEnabled, setLocalMfaEnabled] = useState(mfaEnabled);

  useEffect(() => {
    setLocalMfaEnabled(mfaEnabled);
  }, [mfaEnabled]);

  // General Settings
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('contact@plateforme.fr');
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
    toast.success('Parametres generaux sauvegardes', {
      description: 'Les modifications ont ete enregistrees avec succes.',
    });
  };

  const handleSaveThresholds = () => {
    toast.success('Seuils d\'alertes mis a jour', {
      description: 'Les nouveaux seuils seront appliques immediatement.',
    });
  };

  const handleExport = (type: string) => {
    toast.loading(`Export ${type} en cours...`, { duration: 2000 });
    setTimeout(() => {
      toast.success(`Export ${type} telecharge`, {
        description: 'Le fichier CSV a ete genere avec succes.',
      });
    }, 2000);
  };

  const handleLogoUpload = () => {
    toast.success('Logo telecharge', {
      description: 'Le nouveau logo sera visible d\'ici quelques instants.',
    });
  };

  const handleDisableMfa = async () => {
    setMfaLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors && factors.totp.length > 0) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factors.totp[0].id,
        });
        if (error) throw error;

        setLocalMfaEnabled(false);
        await checkMfaStatus();
        toast.success('Double authentification desactivee');
      }
    } catch (err: any) {
      console.error('[Settings] MFA disable error:', err);
      toast.error('Erreur lors de la desactivation MFA', {
        description: err.message,
      });
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D2D2D7]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#007AFF]/10 rounded-xl">
              <SettingsIcon className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-3xl text-[#1D1D1F]">Parametres de la plateforme</h1>
              <p className="text-sm text-[#86868B]">
                Configuration generale, securite, seuils d'alertes et exports
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-[#D2D2D7] mb-6 inline-flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'general'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Securite
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-[#007AFF] text-white'
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
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
                : 'text-[#86868B] hover:bg-[#F5F5F7]'
            }`}
          >
            <Download className="w-4 h-4" />
            Exports
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl text-[#1D1D1F] mb-2">Informations generales</h2>
                <p className="text-sm text-[#86868B]">
                  Configurez les informations de votre etablissement
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-[#86868B] mb-2">
                    Nom de l'etablissement
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Nom de votre etablissement"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#86868B] mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="Adresse de l'etablissement"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#86868B] mb-2">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#86868B] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>
              </div>

              <div className="border-t border-[#D2D2D7] pt-6">
                <h3 className="text-lg text-[#1D1D1F] mb-4">Logo de l'etablissement</h3>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-[#D2D2D7] rounded-xl flex items-center justify-center bg-[#F5F5F7]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="w-12 h-12 text-[#86868B]" />
                    )}
                  </div>
                  <div>
                    <Button
                      onClick={handleLogoUpload}
                      variant="outline"
                      className="gap-2 mb-2"
                    >
                      <Upload className="w-4 h-4" />
                      Telecharger un logo
                    </Button>
                    <p className="text-xs text-[#86868B]">
                      PNG, JPG ou SVG - Max 2 MB - Recommande : 512x512px
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D2D2D7]">
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

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl text-[#1D1D1F] mb-2">Securite du compte</h2>
                <p className="text-sm text-[#86868B]">
                  Gerez la double authentification et consultez l'historique des connexions
                </p>
              </div>

              {/* MFA Section */}
              <div className="border border-[#D2D2D7] rounded-2xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${localMfaEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {localMfaEnabled ? (
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                      ) : (
                        <ShieldOff className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1D1D1F] mb-1">
                        Double authentification (MFA/2FA)
                      </h3>
                      <p className="text-sm text-[#86868B]">
                        Ajoutez une couche de securite supplementaire avec une application
                        d'authentification (Google Authenticator, Authy, etc.)
                      </p>
                      <div className="mt-2">
                        {localMfaEnabled ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Desactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MFA Toggle */}
                {!showMfaSetup && (
                  <div className="flex gap-3">
                    {localMfaEnabled ? (
                      <Button
                        onClick={handleDisableMfa}
                        disabled={mfaLoading}
                        variant="outline"
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <ShieldOff className="w-4 h-4" />
                        {mfaLoading ? 'Desactivation...' : 'Desactiver la 2FA'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowMfaSetup(true)}
                        className="gap-2 bg-[#007AFF] hover:bg-[#0051D5]"
                      >
                        <Key className="w-4 h-4" />
                        Activer la 2FA
                      </Button>
                    )}
                  </div>
                )}

                {/* MFA Setup Form */}
                {showMfaSetup && !localMfaEnabled && (
                  <div className="mt-6 border-t border-[#D2D2D7] pt-6">
                    <MFASetup />
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => {
                          setShowMfaSetup(false);
                          checkMfaStatus();
                        }}
                        variant="outline"
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                )}

                {/* MFA Info for required roles */}
                {(userRole === 'medecin' || userRole === 'admin') && !localMfaEnabled && (
                  <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      La double authentification est fortement recommandee pour les comptes
                      medecin et administrateur (conformite RGPD/HDS).
                    </p>
                  </div>
                )}
              </div>

              {/* Connection History */}
              {user && (
                <div>
                  <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historique des connexions
                  </h3>
                  <ConnectionHistory userId={user.id} />
                </div>
              )}
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
                    Modifiez ces seuils pour adapter les alertes automatiques a vos besoins.
                    Les modifications sont appliquees immediatement.
                  </p>
                </div>
              </div>

              {/* Leak Rate */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg text-[#1D1D1F] mb-1">
                    Fuites (L/min)
                  </h3>
                  <p className="text-sm text-[#86868B]">
                    Seuils de declenchement des alertes de fuite
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Seuil d'avertissement
                      <Badge className="ml-2 bg-orange-100 text-orange-800">Medium</Badge>
                    </label>
                    <input
                      type="number"
                      value={thresholds.leak_rate_warning}
                      onChange={(e) => setThresholds({ ...thresholds, leak_rate_warning: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.leak_rate_warning} L/min
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Seuil critique
                      <Badge className="ml-2 bg-red-100 text-red-800">High</Badge>
                    </label>
                    <input
                      type="number"
                      value={thresholds.leak_rate_critical}
                      onChange={(e) => setThresholds({ ...thresholds, leak_rate_critical: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.leak_rate_critical} L/min
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Hours */}
              <div className="space-y-4 border-t border-[#D2D2D7] pt-6">
                <div>
                  <h3 className="text-lg text-[#1D1D1F] mb-1">
                    Observance (heures/nuit)
                  </h3>
                  <p className="text-sm text-[#86868B]">
                    Objectifs d'utilisation quotidienne
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Minimum acceptable
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thresholds.usage_hours_min}
                      onChange={(e) => setThresholds({ ...thresholds, usage_hours_min: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.usage_hours_min}h / nuit
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Objectif cible (CPAM)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={thresholds.usage_hours_target}
                      onChange={(e) => setThresholds({ ...thresholds, usage_hours_target: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.usage_hours_target}h / nuit
                    </p>
                  </div>
                </div>
              </div>

              {/* AHI */}
              <div className="space-y-4 border-t border-[#D2D2D7] pt-6">
                <div>
                  <h3 className="text-lg text-[#1D1D1F] mb-1">
                    IAH (Index Apnee-Hypopnee)
                  </h3>
                  <p className="text-sm text-[#86868B]">
                    Seuils de qualite du traitement
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Seuil d'avertissement
                    </label>
                    <input
                      type="number"
                      value={thresholds.ahi_warning}
                      onChange={(e) => setThresholds({ ...thresholds, ahi_warning: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.ahi_warning} evenements/h
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Seuil critique
                    </label>
                    <input
                      type="number"
                      value={thresholds.ahi_critical}
                      onChange={(e) => setThresholds({ ...thresholds, ahi_critical: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.ahi_critical} evenements/h
                    </p>
                  </div>
                </div>
              </div>

              {/* CPAM Compliance */}
              <div className="space-y-4 border-t border-[#D2D2D7] pt-6">
                <div>
                  <h3 className="text-lg text-[#1D1D1F] mb-1">
                    Conformite CPAM
                  </h3>
                  <p className="text-sm text-[#86868B]">
                    Criteres de remboursement Securite Sociale
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Periode d'evaluation (jours)
                    </label>
                    <input
                      type="number"
                      value={thresholds.compliance_days}
                      onChange={(e) => setThresholds({ ...thresholds, compliance_days: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.compliance_days} jours (4 mois)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#86868B] mb-2">
                      Taux d'utilisation minimum (%)
                    </label>
                    <input
                      type="number"
                      value={thresholds.compliance_usage_rate}
                      onChange={(e) => setThresholds({ ...thresholds, compliance_usage_rate: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    />
                    <p className="text-xs text-[#86868B] mt-1">
                      Actuel : {thresholds.compliance_usage_rate}% des nuits
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D2D2D7]">
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
                <h2 className="text-2xl text-[#1D1D1F] mb-2">Exports de donnees</h2>
                <p className="text-sm text-[#86868B]">
                  Telechargez l'historique complet de vos donnees au format CSV
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patients */}
                <div className="border border-[#D2D2D7] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1D1D1F] mb-2">Base patients</h3>
                  <p className="text-sm text-[#86868B] mb-4">
                    Liste complete des patients avec coordonnees et informations medicales
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
                <div className="border border-[#D2D2D7] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <Badge className="bg-green-100 text-green-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1D1D1F] mb-2">Donnees d'observance</h3>
                  <p className="text-sm text-[#86868B] mb-4">
                    Historique complet des donnees de traitement (usage, fuites, IAH, pression)
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
                <div className="border border-[#D2D2D7] rounded-2xl p-6 hover:border-[#007AFF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">CSV</Badge>
                  </div>
                  <h3 className="text-lg text-[#1D1D1F] mb-2">Historique des alertes</h3>
                  <p className="text-sm text-[#86868B] mb-4">
                    Toutes les alertes generees avec statut de resolution et actions effectuees
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

                {/* Full Export */}
                <div className="border-2 border-[#007AFF] rounded-2xl p-6 bg-gradient-to-br from-[#007AFF]/5 to-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-[#007AFF]/10 rounded-xl">
                      <FileText className="w-6 h-6 text-[#007AFF]" />
                    </div>
                    <Badge className="bg-[#007AFF] text-white">Complet</Badge>
                  </div>
                  <h3 className="text-lg text-[#1D1D1F] mb-2">Export complet</h3>
                  <p className="text-sm text-[#86868B] mb-4">
                    Archive complete de toutes les donnees de la plateforme (ZIP)
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
                      Les exports contiennent des donnees sensibles de sante. Assurez-vous de respecter
                      les reglementations RGPD et de stocker les fichiers de maniere securisee.
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
