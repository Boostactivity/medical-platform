/**
 * CONNECTEUR PHILIPS RESPIRONICS - Care Orchestrator / EncoreAnywhere
 *
 * Auth : API Key + Secret
 * Machines : DreamStation 2, System One, REMstar, BiPAP
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface PhilipsConfig {
  apiKey: string;
  apiSecret: string;
  organizationId: string;
}

export interface PhilipsTherapyData {
  date: string;
  complianceHours: number;
  ahi: number;
  oai: number;
  cai: number;
  hi: number;
  leak: number;
  pressure: number;
  humidifierUsage: boolean;
}

export const PHILIPS_MACHINES = [
  'DreamStation 2 Auto CPAP',
  'DreamStation 2 CPAP',
  'DreamStation Auto BiPAP',
  'DreamStation Go Auto',
  'System One REMstar Auto',
  'System One REMstar Pro',
  'System One BiPAP Auto',
  'System One BiPAP S/T',
  'REMstar Plus',
  'BiPAP A40',
  'BiPAP A30',
] as const;

export const PHILIPS_DATA_FIELDS = [
  { key: 'complianceHours', label: 'Heures d\'observance', unit: 'h' },
  { key: 'ahi', label: 'IAH total', unit: 'evt/h' },
  { key: 'oai', label: 'OAI (Obstructif)', unit: 'evt/h' },
  { key: 'cai', label: 'CAI (Central)', unit: 'evt/h' },
  { key: 'hi', label: 'HI (Hypopnees)', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'pressure', label: 'Pression', unit: 'cmH2O' },
  { key: 'humidifierUsage', label: 'Utilisation humidificateur', unit: '' },
] as const;

// ---- API Client (stub) ----

const CARE_ORCHESTRATOR_URL = 'https://api.careorchestrator.philips.com/api/v2';

export async function testPhilipsConnection(config: PhilipsConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiKey || !config.apiSecret || !config.organizationId) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${CARE_ORCHESTRATOR_URL}/organizations/${config.organizationId}/status`, {
      headers: {
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion Care Orchestrator reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchPhilipsData(
  config: PhilipsConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<PhilipsTherapyData[]> {
  const response = await fetch(
    `${CARE_ORCHESTRATOR_URL}/organizations/${config.organizationId}/patients/${patientId}/therapy?from=${dateFrom}&to=${dateTo}`,
    {
      headers: {
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
      },
    }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface PhilipsConnectorFormProps {
  config: PhilipsConfig;
  onChange: (config: PhilipsConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function PhilipsConnectorForm({ config, onChange, onTest, testStatus, testing }: PhilipsConnectorFormProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <span className="text-indigo-700 font-bold text-sm">PH</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Philips Respironics</h3>
          <p className="text-xs text-muted-foreground">Care Orchestrator / EncoreAnywhere</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
        <input
          type="text"
          value={config.apiKey}
          onChange={e => onChange({ ...config, apiKey: e.target.value })}
          placeholder="Votre API Key"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Secret</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={config.apiSecret}
            onChange={e => onChange({ ...config, apiSecret: e.target.value })}
            placeholder="Votre API Secret"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Organization ID</label>
        <input
          type="text"
          value={config.organizationId}
          onChange={e => onChange({ ...config, organizationId: e.target.value })}
          placeholder="Identifiant de l'organisation"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiKey || !config.apiSecret || !config.organizationId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Tester la connexion
        </button>
        {testStatus && (
          <span className={`flex items-center gap-1 text-sm ${testStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
            {testStatus.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {testStatus.message}
          </span>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Machines supportees</p>
        <div className="flex flex-wrap gap-1">
          {PHILIPS_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {PHILIPS_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhilipsConnectorForm;
