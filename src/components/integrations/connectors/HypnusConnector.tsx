/**
 * CONNECTEUR HYPNUS (Chine) - Hypnus Cloud API
 *
 * Auth : Token
 * Machines : Hypnus ST25, MA25
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface HypnusConfig {
  apiToken: string;
  clinicCode: string;
}

export interface HypnusTherapyData {
  date: string;
  usage: number;
  ahi: number;
  leak: number;
}

export const HYPNUS_MACHINES = [
  'Hypnus ST25',
  'Hypnus ST25E',
  'Hypnus MA25',
  'Hypnus MA20',
  'Hypnus 7 Series Auto',
  'Hypnus 7 Series BiLevel',
] as const;

export const HYPNUS_DATA_FIELDS = [
  { key: 'usage', label: 'Utilisation', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
] as const;

// ---- API Client (stub) ----

const HYPNUS_CLOUD_URL = 'https://api.hypnuscloud.com/v1';

export async function testHypnusConnection(config: HypnusConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiToken || !config.clinicCode) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${HYPNUS_CLOUD_URL}/clinics/${config.clinicCode}/status`, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion Hypnus Cloud reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchHypnusData(
  config: HypnusConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<HypnusTherapyData[]> {
  const response = await fetch(
    `${HYPNUS_CLOUD_URL}/clinics/${config.clinicCode}/patients/${patientId}/data?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${config.apiToken}` } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface HypnusConnectorFormProps {
  config: HypnusConfig;
  onChange: (config: HypnusConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function HypnusConnectorForm({ config, onChange, onTest, testStatus, testing }: HypnusConnectorFormProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
          <span className="text-violet-700 font-bold text-sm">HY</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Hypnus</h3>
          <p className="text-xs text-muted-foreground">Hypnus Cloud API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={config.apiToken}
            onChange={e => onChange({ ...config, apiToken: e.target.value })}
            placeholder="Votre token Hypnus Cloud"
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
        <label className="block text-sm font-medium text-foreground mb-1">Clinic Code</label>
        <input
          type="text"
          value={config.clinicCode}
          onChange={e => onChange({ ...config, clinicCode: e.target.value })}
          placeholder="Code de la clinique"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiToken || !config.clinicCode}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {HYPNUS_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {HYPNUS_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HypnusConnectorForm;
