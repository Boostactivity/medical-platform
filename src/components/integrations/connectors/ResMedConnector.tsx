/**
 * CONNECTEUR RESMED - AirView API
 *
 * Leader mondial PPC/CPAP
 * API AirView : https://airview.resmed.com/api/v1/
 * Auth : OAuth2 Client Credentials
 * Machines : AirSense 10, AirSense 11, AirCurve 10/11, Lumis, Stellar
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface ResMedConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface ResMedTherapyData {
  date: string;
  usageHours: number;
  ahi: number;
  leakRate: number;
  pressureMin: number;
  pressureAvg: number;
  pressureMax: number;
  maskEvents: number;
  therapyMode: 'CPAP' | 'APAP' | 'BiLevel' | 'ASV' | 'iVAPS';
}

export const RESMED_MACHINES = [
  'AirSense 10 AutoSet',
  'AirSense 10 Elite',
  'AirSense 10 CPAP',
  'AirSense 11 AutoSet',
  'AirSense 11 Elite',
  'AirCurve 10 VAuto',
  'AirCurve 10 ASV',
  'AirCurve 10 ST',
  'AirCurve 11 VAuto',
  'AirCurve 11 ASV',
  'Lumis 100 VPAP ST',
  'Lumis 150 VPAP ST-A',
  'Stellar 100',
  'Stellar 150',
] as const;

export const RESMED_DATA_FIELDS = [
  { key: 'usageHours', label: 'Heures d\'utilisation', unit: 'h' },
  { key: 'ahi', label: 'IAH (Index Apnee-Hypopnee)', unit: 'evt/h' },
  { key: 'leakRate', label: 'Taux de fuite', unit: 'L/min' },
  { key: 'pressureMin', label: 'Pression min', unit: 'cmH2O' },
  { key: 'pressureAvg', label: 'Pression moyenne', unit: 'cmH2O' },
  { key: 'pressureMax', label: 'Pression max', unit: 'cmH2O' },
  { key: 'maskEvents', label: 'Evenements masque', unit: '' },
  { key: 'therapyMode', label: 'Mode therapie', unit: '' },
] as const;

// ---- API Client (stub) ----

const AIRVIEW_BASE_URL = 'https://airview.resmed.com/api/v1';

async function getOAuth2Token(config: ResMedConfig): Promise<string> {
  const response = await fetch(`${AIRVIEW_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'read:therapy read:devices',
    }),
  });
  if (!response.ok) throw new Error(`OAuth2 error: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

export async function testResMedConnection(config: ResMedConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.clientId || !config.clientSecret || !config.tenantId) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const token = await getOAuth2Token(config);
    const response = await fetch(`${AIRVIEW_BASE_URL}/tenants/${config.tenantId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion AirView reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchResMedData(
  config: ResMedConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<ResMedTherapyData[]> {
  const token = await getOAuth2Token(config);
  const response = await fetch(
    `${AIRVIEW_BASE_URL}/tenants/${config.tenantId}/patients/${patientId}/therapy-data?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form Component ----

interface ResMedConnectorFormProps {
  config: ResMedConfig;
  onChange: (config: ResMedConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function ResMedConnectorForm({ config, onChange, onTest, testStatus, testing }: ResMedConnectorFormProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-700 font-bold text-sm">RM</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">ResMed AirView</h3>
          <p className="text-xs text-muted-foreground">OAuth2 Client Credentials</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Client ID</label>
        <input
          type="text"
          value={config.clientId}
          onChange={e => onChange({ ...config, clientId: e.target.value })}
          placeholder="Votre Client ID AirView"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Client Secret</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={config.clientSecret}
            onChange={e => onChange({ ...config, clientSecret: e.target.value })}
            placeholder="Votre Client Secret"
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
        <label className="block text-sm font-medium text-foreground mb-1">Tenant ID</label>
        <input
          type="text"
          value={config.tenantId}
          onChange={e => onChange({ ...config, tenantId: e.target.value })}
          placeholder="Identifiant du tenant"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.clientId || !config.clientSecret || !config.tenantId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {RESMED_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {RESMED_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ResMedConnectorForm;
