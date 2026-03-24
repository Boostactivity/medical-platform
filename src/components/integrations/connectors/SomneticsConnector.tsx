/**
 * CONNECTEUR SOMNETICS (Transcend) - Transcend Cloud API
 *
 * Auth : API Key
 * Machines : Transcend 3, Transcend Micro
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface SomneticsConfig {
  apiKey: string;
}

export interface SomneticsTherapyData {
  date: string;
  usage: number;
  ahi: number;
  leak: number;
  batteryStatus: number;
}

export const SOMNETICS_MACHINES = [
  'Transcend 3 Auto miniCPAP',
  'Transcend 3 Fixed miniCPAP',
  'Transcend Micro Auto',
  'Transcend 365 Auto miniCPAP',
] as const;

export const SOMNETICS_DATA_FIELDS = [
  { key: 'usage', label: 'Utilisation', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'batteryStatus', label: 'Niveau batterie', unit: '%' },
] as const;

// ---- API Client (stub) ----

const TRANSCEND_CLOUD_URL = 'https://api.transcend.somnetics.com/v1';

export async function testSomneticsConnection(config: SomneticsConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiKey) {
      return { ok: false, message: 'L\'API Key est requise' };
    }
    const response = await fetch(`${TRANSCEND_CLOUD_URL}/status`, {
      headers: { 'X-API-Key': config.apiKey },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion Transcend Cloud reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchSomneticsData(
  config: SomneticsConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<SomneticsTherapyData[]> {
  const response = await fetch(
    `${TRANSCEND_CLOUD_URL}/patients/${patientId}/data?from=${dateFrom}&to=${dateTo}`,
    { headers: { 'X-API-Key': config.apiKey } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface SomneticsConnectorFormProps {
  config: SomneticsConfig;
  onChange: (config: SomneticsConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function SomneticsConnectorForm({ config, onChange, onTest, testStatus, testing }: SomneticsConnectorFormProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <span className="text-amber-700 font-bold text-sm">TR</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Somnetics (Transcend)</h3>
          <p className="text-xs text-muted-foreground">Transcend Cloud API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={e => onChange({ ...config, apiKey: e.target.value })}
            placeholder="Votre API Key Transcend"
            className="w-full p-2.5 pr-10 border border-border rounded-lg bg-card text-foreground text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiKey}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {SOMNETICS_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {SOMNETICS_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SomneticsConnectorForm;
