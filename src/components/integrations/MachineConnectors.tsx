/**
 * MACHINE CONNECTORS - Composant central de gestion des connecteurs PPC/CPAP
 *
 * Registre de tous les connecteurs fabricants disponibles.
 * Gere l'etat d'activation, les configurations et les tests de connexion.
 * Le prestataire n'a qu'a entrer ses credentials.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plug, CheckCircle, AlertTriangle, XCircle, Settings, ChevronDown, ChevronRight,
  Wifi, WifiOff, RefreshCw, Trash2, Power, HardDrive,
} from 'lucide-react';

// Import de tous les connecteurs fabricants
import { ResMedConnectorForm, type ResMedConfig } from './connectors/ResMedConnector';
import { PhilipsConnectorForm, type PhilipsConfig } from './connectors/PhilipsConnector';
import { LowensteinConnectorForm, type LowensteinConfig } from './connectors/LowensteinConnector';
import { FisherPaykelConnectorForm, type FisherPaykelConfig } from './connectors/FisherPaykelConnector';
import { DeVilbissConnectorForm, type DeVilbissConfig } from './connectors/DeVilbissConnector';
import { BMCConnectorForm, type BMCConfig } from './connectors/BMCConnector';
import { YuwellConnectorForm, type YuwellConfig } from './connectors/YuwellConnector';
import { HypnusConnectorForm, type HypnusConfig } from './connectors/HypnusConnector';
import { SomneticsConnectorForm, type SomneticsConfig } from './connectors/SomneticsConnector';

// ---- Types ----

export type ConnectorId =
  | 'resmed'
  | 'philips'
  | 'lowenstein'
  | 'fisher-paykel'
  | 'devilbiss'
  | 'bmc'
  | 'yuwell'
  | 'hypnus'
  | 'somnetics';

export type ConnectorStatus = 'connected' | 'error' | 'not_configured' | 'disabled';

export type ConnectorConfig =
  | ResMedConfig
  | PhilipsConfig
  | LowensteinConfig
  | FisherPaykelConfig
  | DeVilbissConfig
  | BMCConfig
  | YuwellConfig
  | HypnusConfig
  | SomneticsConfig;

export interface ConnectorDefinition {
  id: ConnectorId;
  name: string;
  manufacturer: string;
  country: string;
  apiName: string;
  color: string;
  bgColor: string;
  iconLabel: string;
  description: string;
  machineCount: number;
}

export interface ConnectorState {
  id: ConnectorId;
  enabled: boolean;
  status: ConnectorStatus;
  config: Record<string, string>;
  lastSync?: string;
  errorMessage?: string;
}

// ---- Registre des connecteurs ----

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    id: 'resmed',
    name: 'ResMed AirView',
    manufacturer: 'ResMed',
    country: 'Australie/USA',
    apiName: 'AirView API v1',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    iconLabel: 'RM',
    description: 'Leader mondial - AirSense 10/11, AirCurve, Lumis, Stellar',
    machineCount: 14,
  },
  {
    id: 'philips',
    name: 'Philips Respironics',
    manufacturer: 'Philips',
    country: 'Pays-Bas/USA',
    apiName: 'Care Orchestrator API v2',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    iconLabel: 'PH',
    description: 'DreamStation 2, System One, REMstar, BiPAP',
    machineCount: 11,
  },
  {
    id: 'lowenstein',
    name: 'Lowenstein Medical',
    manufacturer: 'Lowenstein',
    country: 'Allemagne',
    apiName: 'prisma CLOUD API v1',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    iconLabel: 'LM',
    description: 'prisma SMART, prisma SOFT, prisma 25ST, prisma VENT',
    machineCount: 11,
  },
  {
    id: 'fisher-paykel',
    name: 'Fisher & Paykel',
    manufacturer: 'Fisher & Paykel',
    country: 'Nouvelle-Zelande',
    apiName: 'InfoSmart API v1',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    iconLabel: 'FP',
    description: 'SleepStyle, ICON+, F&P 600',
    machineCount: 6,
  },
  {
    id: 'devilbiss',
    name: 'DeVilbiss / Drive Medical',
    manufacturer: 'Drive DeVilbiss',
    country: 'USA',
    apiName: 'SmartLink API v1',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    iconLabel: 'DV',
    description: 'IntelliPAP, Blue series',
    machineCount: 7,
  },
  {
    id: 'bmc',
    name: 'BMC Medical (RESmart)',
    manufacturer: 'BMC Medical',
    country: 'Chine',
    apiName: 'RESmart / iCode API v1',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    iconLabel: 'BMC',
    description: 'RESmart Auto, RESmart BPAP, G3 series',
    machineCount: 8,
  },
  {
    id: 'yuwell',
    name: 'Yuwell / Yuyue',
    manufacturer: 'Yuwell',
    country: 'Chine',
    apiName: 'YuCloud API v1',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    iconLabel: 'YW',
    description: 'YH-450, YH-550, BreathCare',
    machineCount: 8,
  },
  {
    id: 'hypnus',
    name: 'Hypnus',
    manufacturer: 'Hypnus',
    country: 'Chine',
    apiName: 'Hypnus Cloud API v1',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100',
    iconLabel: 'HY',
    description: 'Hypnus ST25, MA25',
    machineCount: 6,
  },
  {
    id: 'somnetics',
    name: 'Somnetics (Transcend)',
    manufacturer: 'Somnetics',
    country: 'USA',
    apiName: 'Transcend Cloud API v1',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    iconLabel: 'TR',
    description: 'Transcend 3, Transcend Micro - PPC de voyage',
    machineCount: 4,
  },
];

// ---- Default configs ----

function getDefaultConfig(id: ConnectorId): Record<string, string> {
  switch (id) {
    case 'resmed': return { clientId: '', clientSecret: '', tenantId: '' };
    case 'philips': return { apiKey: '', apiSecret: '', organizationId: '' };
    case 'lowenstein': return { apiToken: '', clinicId: '' };
    case 'fisher-paykel': return { apiKey: '', providerId: '' };
    case 'devilbiss': return { username: '', password: '', apiKey: '' };
    case 'bmc': return { apiToken: '', deviceSerial: '' };
    case 'yuwell': return { appId: '', appSecret: '' };
    case 'hypnus': return { apiToken: '', clinicCode: '' };
    case 'somnetics': return { apiKey: '' };
  }
}

// ---- Composant Principal ----

export function MachineConnectors() {
  const [connectors, setConnectors] = useState<ConnectorState[]>(
    CONNECTOR_REGISTRY.map(def => ({
      id: def.id,
      enabled: false,
      status: 'disabled',
      config: getDefaultConfig(def.id),
    }))
  );
  const [expandedId, setExpandedId] = useState<ConnectorId | null>(null);
  const [testingId, setTestingId] = useState<ConnectorId | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const updateConnector = useCallback((id: ConnectorId, updates: Partial<ConnectorState>) => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const toggleConnector = useCallback((id: ConnectorId) => {
    setConnectors(prev => prev.map(c => {
      if (c.id !== id) return c;
      const enabled = !c.enabled;
      return {
        ...c,
        enabled,
        status: enabled ? 'not_configured' : 'disabled',
      };
    }));
  }, []);

  const handleTest = useCallback(async (id: ConnectorId) => {
    setTestingId(id);
    // Simulate a test delay
    await new Promise(r => setTimeout(r, 1500));
    const connector = connectors.find(c => c.id === id);
    if (!connector) return;

    const hasAllFields = Object.values(connector.config).every(v => v.trim() !== '');
    const result = hasAllFields
      ? { ok: true, message: 'Connexion reussie (simulation)' }
      : { ok: false, message: 'Veuillez remplir tous les champs' };

    setTestResults(prev => ({ ...prev, [id]: result }));
    updateConnector(id, { status: result.ok ? 'connected' : 'error', errorMessage: result.ok ? undefined : result.message });
    setTestingId(null);
  }, [connectors, updateConnector]);

  const handleConfigChange = useCallback((id: ConnectorId, config: Record<string, string>) => {
    updateConnector(id, { config, status: 'not_configured' });
    setTestResults(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [updateConnector]);

  const stats = {
    total: CONNECTOR_REGISTRY.length,
    enabled: connectors.filter(c => c.enabled).length,
    connected: connectors.filter(c => c.status === 'connected').length,
    errors: connectors.filter(c => c.status === 'error').length,
    totalMachines: CONNECTOR_REGISTRY.reduce((s, d) => s + d.machineCount, 0),
  };

  const renderConnectorForm = (id: ConnectorId, config: Record<string, string>) => {
    const onChange = (newConfig: any) => handleConfigChange(id, newConfig);
    const onTest = () => handleTest(id);
    const testStatus = testResults[id] || null;
    const testing = testingId === id;

    switch (id) {
      case 'resmed':
        return <ResMedConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'philips':
        return <PhilipsConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'lowenstein':
        return <LowensteinConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'fisher-paykel':
        return <FisherPaykelConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'devilbiss':
        return <DeVilbissConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'bmc':
        return <BMCConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'yuwell':
        return <YuwellConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'hypnus':
        return <HypnusConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
      case 'somnetics':
        return <SomneticsConnectorForm config={config as any} onChange={onChange} onTest={onTest} testStatus={testStatus} testing={testing} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="w-6 h-6 text-primary" />
            Connecteurs Machines PPC/CPAP
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez vos connecteurs fabricants pour synchroniser automatiquement les donnees patients
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Fabricants</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">Actives</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{stats.enabled}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700">Connectes</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{stats.connected}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">Erreurs</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.errors}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-700">Machines supportees</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{stats.totalMachines}</p>
        </div>
      </div>

      {/* Liste des connecteurs */}
      <div className="space-y-3">
        {CONNECTOR_REGISTRY.map(def => {
          const state = connectors.find(c => c.id === def.id)!;
          const isExpanded = expandedId === def.id;

          return (
            <div key={def.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header du connecteur */}
              <div className="flex items-center justify-between p-4">
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : def.id)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className={`w-10 h-10 ${def.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className={`${def.color} font-bold text-xs`}>{def.iconLabel}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{def.name}</h3>
                      <span className="text-xs text-muted-foreground">({def.country})</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{def.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Status badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    state.status === 'connected' ? 'bg-green-100 text-green-800' :
                    state.status === 'error' ? 'bg-red-100 text-red-800' :
                    state.status === 'not_configured' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {state.status === 'connected' && <><Wifi className="w-3 h-3" /> Connecte</>}
                    {state.status === 'error' && <><WifiOff className="w-3 h-3" /> Erreur</>}
                    {state.status === 'not_configured' && <><Settings className="w-3 h-3" /> A configurer</>}
                    {state.status === 'disabled' && <><XCircle className="w-3 h-3" /> Desactive</>}
                  </span>

                  {/* Toggle activation */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleConnector(def.id); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      state.enabled ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Formulaire de configuration (expandable) */}
              <AnimatePresence>
                {isExpanded && state.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4">
                      {renderConnectorForm(def.id, state.config)}
                      {state.lastSync && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Derniere synchronisation : {new Date(state.lastSync).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
                {isExpanded && !state.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-6 text-center text-muted-foreground">
                      <Power className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Activez ce connecteur pour configurer les credentials</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Import SD Card (lien) */}
      <div className="bg-card border border-dashed border-border rounded-xl p-4 flex items-center gap-3">
        <HardDrive className="w-6 h-6 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground text-sm">Import carte SD / fichier</p>
          <p className="text-xs text-muted-foreground">
            Pour les appareils sans connectivite cloud : importez les fichiers EDF, CSV ou exports OSCAR
          </p>
        </div>
      </div>
    </div>
  );
}

export default MachineConnectors;
