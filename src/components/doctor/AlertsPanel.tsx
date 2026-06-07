/**
 * PORTAIL MÉDECIN — alertes prioritaires de la cohorte.
 * Liste dense, sévérité décroissante (déjà triée côté serveur).
 * Clic sur une ligne → ouverture de la fiche patient.
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  type DoctorAlert,
  SEVERITY_META,
  alertTypeLabel,
  formatDateFr,
} from './types';

const COLLAPSED_COUNT = 5;

interface AlertsPanelProps {
  alerts: DoctorAlert[];
  onSelectPatient: (patientId: string) => void;
}

export function AlertsPanel({ alerts, onSelectPatient }: AlertsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const visible = expanded ? alerts : alerts.slice(0, COLLAPSED_COUNT);

  return (
    <section className="bg-card border border-border rounded-lg mb-6">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <h2 className="text-sm font-medium text-foreground">
          Alertes prioritaires
        </h2>
        <span className="text-sm text-muted-foreground">({alerts.length})</span>
      </div>

      <ul className="divide-y divide-border">
        {visible.map((alert) => {
          const sev = SEVERITY_META[alert.severity] ?? SEVERITY_META.low;
          return (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => onSelectPatient(alert.patient_id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <Badge variant="outline" className={`shrink-0 ${sev.className}`}>
                  {sev.label}
                </Badge>
                <span className="text-sm font-medium text-foreground shrink-0 min-w-[140px]">
                  {alert.patient_name ?? '—'}
                </span>
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {alert.title ?? alert.message ?? alertTypeLabel(alert)}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {formatDateFr(alert.created_at)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {alerts.length > COLLAPSED_COUNT && (
        <div className="px-4 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground h-7"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Afficher les {alerts.length - COLLAPSED_COUNT} autres alertes
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
