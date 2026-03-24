/**
 * CONNECTEUR LOWENSTEIN MEDICAL - prisma CLOUD API
 *
 * Auth : Bearer Token
 * Machines : prisma SMART, prisma SOFT, prisma 25ST, prisma VENT
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

// ---- Types ----

export interface LowensteinConfig {
  apiToken: string;
  clinicId: string;
}

export interface LowensteinTherapyData {
  date: string;
  therapyHours: number;
  ahi: number;
  leak: number;
  tidalVolume: number;
  respiratoryRate: number;
  spo2: number;
}

export const LOWENSTEIN_MACHINES = [
  'prisma SMART',
  'prisma SMART max',
  'prisma SOFT',
  'prisma SOFT max',
  'prisma 25ST',
  'prisma 25ST-C',
  'prisma 30ST',
  'prisma VENT 30',
  'prisma VENT 40',
  'prisma VENT 50',
  'prisma VENT 50-C',
] as const;

export const LOWENSTEIN_DATA_FIELDS = [
  { key: 'therapyHours', label: 'Heures de therapie', unit: 'h' },
  { key: 'ahi', label: 'IAH', unit: 'evt/h' },
  { key: 'leak', label: 'Fuite', unit: 'L/min' },
  { key: 'tidalVolume', label: 'Volume courant (Vt)', unit: 'mL' },
  { key: 'respiratoryRate', label: 'Frequence respiratoire', unit: '/min' },
  { key: 'spo2', label: 'SpO2', unit: '%' },
] as const;

// ---- API Client (stub) ----

const PRISMA_CLOUD_URL = 'https://api.prismacloud.lowenstein-medical.com/v1';

export async function testLowensteinConnection(config: LowensteinConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (!config.apiToken || !config.clinicId) {
      return { ok: false, message: 'Tous les champs sont requis' };
    }
    const response = await fetch(`${PRISMA_CLOUD_URL}/clinics/${config.clinicId}/status`, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return { ok: true, message: 'Connexion prisma CLOUD reussie' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Erreur de connexion' };
  }
}

export async function fetchLowensteinData(
  config: LowensteinConfig,
  patientId: string,
  dateFrom: string,
  dateTo: string
): Promise<LowensteinTherapyData[]> {
  const response = await fetch(
    `${PRISMA_CLOUD_URL}/clinics/${config.clinicId}/patients/${patientId}/therapy?from=${dateFrom}&to=${dateTo}`,
    { headers: { Authorization: `Bearer ${config.apiToken}` } }
  );
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
  return response.json();
}

// ---- Configuration Form ----

interface LowensteinConnectorFormProps {
  config: LowensteinConfig;
  onChange: (config: LowensteinConfig) => void;
  onTest: () => void;
  testStatus?: { ok: boolean; message: string } | null;
  testing?: boolean;
}

export function LowensteinConnectorForm({ config, onChange, onTest, testStatus, testing }: LowensteinConnectorFormProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
          <span className="text-teal-700 font-bold text-sm">LM</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Lowenstein Medical</h3>
          <p className="text-xs text-muted-foreground">prisma CLOUD API</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">API Token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={config.apiToken}
            onChange={e => onChange({ ...config, apiToken: e.target.value })}
            placeholder="Votre token prisma CLOUD"
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
        <label className="block text-sm font-medium text-foreground mb-1">Clinic ID</label>
        <input
          type="text"
          value={config.clinicId}
          onChange={e => onChange({ ...config, clinicId: e.target.value })}
          placeholder="Identifiant de la clinique"
          className="w-full p-2.5 border border-border rounded-lg bg-card text-foreground text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onTest}
          disabled={testing || !config.apiToken || !config.clinicId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {LOWENSTEIN_MACHINES.map(m => (
            <span key={m} className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs">{m}</span>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Donnees recuperables</p>
        <div className="grid grid-cols-2 gap-1">
          {LOWENSTEIN_DATA_FIELDS.map(f => (
            <span key={f.key} className="text-xs text-muted-foreground">
              {f.label} {f.unit && `(${f.unit})`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LowensteinConnectorForm;
