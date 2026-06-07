/**
 * TRANSMISSION FSE (SESAM-Vitale) — interface mockable.
 *
 * La télétransmission réelle exige un module agréé SESAM-Vitale
 * (ex. SDK Area Santé) + numéro prestataire + FINESS — dépendance
 * externe non codable (cf. CHANTIERS.md §dépendances).
 *
 * Architecture : le reste de la plateforme ne parle qu'à l'interface
 * FseTransmitter. Aujourd'hui : MockFseTransmitter (simule l'aller-retour,
 * références traçables MOCK-*). Demain : AreaSanteFseTransmitter branchée
 * sur le SDK agréé, sans toucher au reste du code.
 *
 * Le mock NE se fait JAMAIS passer pour une vraie télétransmission :
 * les références sont préfixées MOCK- et le mode est retourné à l'appelant.
 */

import { supabase } from './lib/supabase.ts';

export interface FseTransmissionResult {
  lineId: string;
  ok: boolean;
  reference?: string;
  error?: string;
}

export interface FseTransmitter {
  readonly mode: 'mock' | 'area-sante';
  transmitLines(
    lines: Array<{ id: string; patient_id: string; amount_ttc: number | null; code_lpp: string }>,
  ): Promise<FseTransmissionResult[]>;
}

/**
 * Implémentation MOCK — développement et démo uniquement.
 * Simule une acceptation si la ligne est complète (montant + code),
 * un rejet explicite sinon (mêmes contrôles qu'une vraie chaîne SV).
 */
export class MockFseTransmitter implements FseTransmitter {
  readonly mode = 'mock' as const;

  async transmitLines(
    lines: Array<{ id: string; patient_id: string; amount_ttc: number | null; code_lpp: string }>,
  ): Promise<FseTransmissionResult[]> {
    return lines.map((line) => {
      if (line.amount_ttc == null) {
        return {
          lineId: line.id,
          ok: false,
          error: 'Tarif manquant (référentiel LPP incomplet) — transmission refusée',
        };
      }
      if (!line.code_lpp) {
        return { lineId: line.id, ok: false, error: 'Code LPP manquant' };
      }
      return {
        lineId: line.id,
        ok: true,
        reference: `MOCK-FSE-${line.id.slice(0, 8).toUpperCase()}`,
      };
    });
  }
}

/**
 * Point d'extension SDK agréé (Area Santé).
 * À implémenter quand le SDK + numéro prestataire + FINESS seront disponibles.
 */
// export class AreaSanteFseTransmitter implements FseTransmitter { ... }

export function getFseTransmitter(): FseTransmitter {
  // Quand le SDK sera branché : switch sur Deno.env.get('FSE_MODE')
  return new MockFseTransmitter();
}

/**
 * Transmet toutes les lignes 'ready' d'un tenant.
 * Transitions : ready → transmitted (réf FSE) ou ready → rejected (raison).
 */
export async function transmitReadyLines(tenantId: string) {
  const transmitter = getFseTransmitter();

  const { data: lines, error } = await supabase
    .from('billing_lines')
    .select('id, patient_id, amount_ttc, lppr_codes(code_lpp)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ready')
    .limit(500);

  if (error) throw new Error(`billing_lines load failed: ${error.message}`);
  if (!lines || lines.length === 0) {
    return { mode: transmitter.mode, transmitted: 0, rejected: 0, results: [] };
  }

  const results = await transmitter.transmitLines(
    lines.map((l) => ({
      id: l.id,
      patient_id: l.patient_id,
      amount_ttc: l.amount_ttc,
      code_lpp: (l.lppr_codes as any)?.code_lpp ?? '',
    })),
  );

  let transmitted = 0;
  let rejected = 0;

  for (const r of results) {
    if (r.ok) {
      await supabase
        .from('billing_lines')
        .update({ status: 'transmitted', fse_reference: r.reference })
        .eq('id', r.lineId);
      transmitted++;
    } else {
      await supabase
        .from('billing_lines')
        .update({ status: 'rejected', rejection_reason: r.error })
        .eq('id', r.lineId);
      rejected++;
    }
  }

  return { mode: transmitter.mode, transmitted, rejected, results };
}
