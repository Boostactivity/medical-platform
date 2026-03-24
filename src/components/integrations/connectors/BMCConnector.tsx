/**
 * CONNECTEUR BMC MEDICAL (Chine) - RESmart / iCode API
 *
 * Auth : API Token
 * Machines : RESmart Auto, RESmart BPAP, G3
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface BMCConfig {
  apiToken: string;
  deviceSerial: string;
}

export interface BMCTherapyData {
  date: string;
  usageHours: number;
  ahi: number;
  leak: number;
  pressure: number;
}

export const BMC_MACHINES = [
  'RESmart Auto CPAP',
  'RESmart Auto BiPAP',
  'RESmart BPAP 25',
  'RESmart BPAP 25T',
  'G3 Auto CPAP',
  'G3 BPAP 25A',
  'G3 BPAP S/T 25',
  'G3 BPAP 30VT',
] as const;

export const BMC_DATA_FIELDS = [
  { key: 'usageHours', label: 'Heures d\'utilisation', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'pressure', label: 'Pression', unit: 'cmH2O' },
] as const;

// ---- API Client (stub) ----

const RESMART_URL = 'https://api.resmart.bmc-medical.com/v1';

export async function testBMCConnection(config: BMCConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiToken || !config.deviceSerial) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${RESMART_URL}/devices/${config.deviceSerial}/status`, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion RESmart reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchBMCData(
  config: BMCConfig,
  dateFrom: string,
  dateTo: string
): Promise<BMCTherapyData[]> {
  const response = await fetch(
    `${RESMART_URL}/devices/${config.deviceSerial}/therapy?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${config.apiToken}` } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface BMCConnectorFormProps {
  config: BMCConfig;
  onChange: (config: BMCConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function BMCConnectorForm({ config, onChange, onTest, testStatus, testing }: BMCConnectorFormProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <span className="text-red-700 font-bold text-sm">BMC</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">BMC Medical (RESmart)</h3>
          <p className="text-xs text-muted-foreground">RESmart / iCode API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={config.apiToken}
            onChange={e => onChange({ ...config, apiToken: e.target.value })}
            placeholder="Votre token RESmart"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Device Serial</label>
        <input
          type="text"
          value={config.deviceSerial}
          onChange={e => onChange({ ...config, deviceSerial: e.target.value })}
          placeholder="Numero de serie de l'appareil"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiToken || !config.deviceSerial}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {BMC_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {BMC_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BMCConnectorForm;
