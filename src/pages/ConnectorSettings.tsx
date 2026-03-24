/**
 * PAGE CONFIGURATION CONNECTEURS PPC/CPAP
 *
 * Route : /settings/connectors (protegee admin/prestataire)
 * Liste tous les connecteurs, activation, credentials, test de connexion
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plug, Settings, Shield, HardDrive, ArrowLeft, Info,
  Globe, Server, Lock, CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MachineConnectors, CONNECTOR_REGISTRY } from '../components/integrations/MachineConnectors';

export function ConnectorSettings() {
  const [activeTab, setActiveTab] = useState<'connectors' | 'sdcard' | 'info'>('connectors');

  const totalMachines = CONNECTOR_REGISTRY.reduce((s, d) => s + d.machineCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/settings" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Parametres
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Connecteurs PPC/CPAP</span>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Plug className="w-6 h-6 text-white" />
          </div>
          Configuration des Connecteurs
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Connectez vos plateformes fabricants pour synchroniser automatiquement les donnees de therapie PPC/CPAP.
          {' '}{CONNECTOR_REGISTRY.length} fabricants et {totalMachines} modeles de machines supportes.
        </p>
      </div>

      {/* Security info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Securite des credentials</p>
          <p className="text-xs text-blue-700 mt-1">
            Toutes les cles API et tokens sont chiffres (AES-256) avant stockage.
            Les connexions utilisent TLS 1.3. Aucun credential n'est transmis en clair.
            Les donnees patient sont conformes RGPD et HDS.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('connectors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'connectors'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="w-4 h-4" />
          Connecteurs API ({CONNECTOR_REGISTRY.length})
        </button>
        <button
          onClick={() => setActiveTab('sdcard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sdcard'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Import SD / Fichier
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'info'
              ? 'bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="w-4 h-4" />
          Guide
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'connectors' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <MachineConnectors />
        </motion.div>
      )}

      {activeTab === 'sdcard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Import de fichiers carte SD
              </h2>
              <p className="text-sm text-muted-foreground">
                Pour les appareils sans connectivite cloud, importez directement les fichiers depuis la carte SD.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">EDF (European Data Format)</h3>
                <p className="text-xs text-muted-foreground">
                  Format standard pour les signaux physiologiques. Utilise par la plupart des machines PPC pour les donnees detaillees.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Supporte
                </span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">CSV (Comma Separated Values)</h3>
                <p className="text-xs text-muted-foreground">
                  Export tabulaire des donnees journalieres. Compatible avec les exports fabricants et les logiciels tiers.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Supporte
                </span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">OSCAR Export</h3>
                <p className="text-xs text-muted-foreground">
                  Exports depuis le logiciel open-source OSCAR. Donnees detaillees avec statistiques par nuit.
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Supporte
                </span>
              </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Auto-detection du fabricant</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Lors de l'import, le systeme detecte automatiquement le fabricant et le modele de machine
                a partir des metadonnees du fichier et du format des colonnes.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CONNECTOR_REGISTRY.map(def => (
                  <div key={def.id} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="text-muted-foreground">{def.manufacturer}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center py-4">
              <Link
                to="/dashboard-admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <HardDrive className="w-4 h-4" />
                Aller a l'import SD
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'info' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Guide de configuration</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Obtenir les credentials API
                </h3>
                <p className="text-sm text-muted-foreground">
                  Contactez votre representant fabricant pour obtenir les identifiants API.
                  Chaque fabricant a son propre portail developpeur :
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">ResMed :</span>
                    Portail AirView Partner &rarr; OAuth2 Client Credentials
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Philips :</span>
                    Care Orchestrator Developer Portal &rarr; API Key + Secret
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Lowenstein :</span>
                    prisma CLOUD Admin &rarr; Bearer Token
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Fisher & Paykel :</span>
                    InfoSmart Web Portal &rarr; API Key
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">DeVilbiss :</span>
                    SmartLink Portal &rarr; Compte + API Key
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-foreground">BMC, Yuwell, Hypnus, Somnetics :</span>
                    Support technique fabricant
                  </li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Activer et configurer le connecteur
                </h3>
                <p className="text-sm text-muted-foreground">
                  Dans l'onglet "Connecteurs API", activez le toggle du fabricant souhaite,
                  deployez le formulaire et entrez vos credentials. Cliquez sur "Tester la connexion"
                  pour verifier que tout fonctionne.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Synchronisation automatique
                </h3>
                <p className="text-sm text-muted-foreground">
                  Une fois connecte, les donnees de therapie sont synchronisees automatiquement
                  toutes les 4 heures. Les nouveaux patients sont detectes et proposes pour association.
                  Les alertes sont generees en temps reel (observance, fuites, IAH eleve).
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  Import SD en complement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pour les machines sans telemetrie cloud ou en cas de probleme de connexion,
                  utilisez l'import carte SD (EDF, CSV, OSCAR) comme solution de secours.
                  Le fabricant est auto-detecte et les colonnes mappees automatiquement.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Conformite & Consentement</p>
                <p className="text-xs text-amber-700 mt-1">
                  Assurez-vous d'avoir obtenu le consentement patient (RGPD Art. 9) avant d'activer
                  la synchronisation des donnees de sante. Les credentials sont stockes de maniere chiffree
                  et ne sont jamais partages avec des tiers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default ConnectorSettings;
