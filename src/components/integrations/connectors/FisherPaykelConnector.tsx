/**
 * CONNECTEUR FISHER & PAYKEL - InfoSmart / SleepStyle API
 *
 * Auth : API Key
 * Machines : SleepStyle, ICON+, F&P 600
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface FisherPaykelConfig {
  apiKey: string;
  providerId: string;
}

export interface FisherPaykelTherapyData {
  date: string;
  usage: number;
  ahi: number;
  leak: number;
  humidity: number;
  pressure: number;
}

export const FISHER_PAYKEL_MACHINES = [
  'SleepStyle Auto',
  'SleepStyle Fixed',
  'ICON+ Auto',
  'ICON+ Premo',
  'ICON+ Novo',
  'F&P 600',
] as const;

export const FISHER_PAYKEL_DATA_FIELDS = [
  { key: 'usage', label: 'Heures d\'utilisation', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'humidity', label: 'Humidite', unit: '%' },
  { key: 'pressure', label: 'Pression', unit: 'cmH2O' },
] as const;

// ---- API Client (stub) ----

const INFOSMART_URL = 'https://api.infosmartweb.com/v1';

export async function testFisherPaykelConnection(config: FisherPaykelConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiKey || !config.providerId) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${INFOSMART_URL}/providers/${config.providerId}/status`, {
      headers: { 'X-API-Key': config.apiKey },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion InfoSmart reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchFisherPaykelData(
  config: FisherPaykelConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<FisherPaykelTherapyData[]> {
  const response = await fetch(
    `${INFOSMART_URL}/providers/${config.providerId}/patients/${patientId}/data?from=${dateFrom}&to=${dateTo}`,
    { headers: { 'X-API-Key': config.apiKey } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface FisherPaykelConnectorFormProps {
  config: FisherPaykelConfig;
  onChange: (config: FisherPaykelConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function FisherPaykelConnectorForm({ config, onChange, onTest, testStatus, testing }: FisherPaykelConnectorFormProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
          <span className="text-cyan-700 font-bold text-sm">FP</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Fisher & Paykel</h3>
          <p className="text-xs text-muted-foreground">InfoSmart / SleepStyle API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={e => onChange({ ...config, apiKey: e.target.value })}
            placeholder="Votre API Key InfoSmart"
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Provider ID</label>
        <input
          type="text"
          value={config.providerId}
          onChange={e => onChange({ ...config, providerId: e.target.value })}
          placeholder="Identifiant du prestataire"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiKey || !config.providerId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {FISHER_PAYKEL_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {FISHER_PAYKEL_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FisherPaykelConnectorForm;
