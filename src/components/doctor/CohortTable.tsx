/**
 * PORTAIL MÉDECIN — tableau de cohorte dense (pattern Linear).
 *
 * Pastille statut par bande d'observance (vert ≥112h / orange 56-112h /
 * rouge <56h / gris sans relevé), heures/28j, IAH, phase (badge 9.INI),
 * alertes, dernière synchro. Tri cliquable, filtres par bande, recherche.
 */

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  BAND_META,
  BAND_ORDER,
  type CohortPatient,
  type ComplianceBand,
  formatDateFr,
  formatHours,
  formatIah,
} from './types';

type SortKey = 'priority' | 'name' | 'hours' | 'iah' | 'alerts' | 'last_sync';

const BAND_PRIORITY: Record<ComplianceBand, number> = { low: 0, none: 1, partial: 2, full: 3 };

interface CohortTableProps {
  patients: CohortPatient[];
  onSelect: (patientId: string) => void;
}

export function CohortTable({ patients, onSelect }: CohortTableProps) {
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState<ComplianceBand | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(true);

  const bandCounts = useMemo(() => {
    const counts: Record<ComplianceBand, number> = { full: 0, partial: 0, low: 0, none: 0 };
    for (const p of patients) counts[p.compliance_band]++;
    return counts;
  }, [patients]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = patients.filter((p) => {
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q);
      const matchesBand = bandFilter === 'all' || p.compliance_band === bandFilter;
      return matchesSearch && matchesBand;
    });

    const dir = sortAsc ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'priority': {
          const byBand = BAND_PRIORITY[a.compliance_band] - BAND_PRIORITY[b.compliance_band];
          if (byBand !== 0) return byBand * dir;
          return (b.active_alerts - a.active_alerts) * dir;
        }
        case 'name':
          return a.name.localeCompare(b.name, 'fr') * dir;
        case 'hours':
          return (
            ((a.last_window?.total_hours ?? -1) - (b.last_window?.total_hours ?? -1)) * dir
          );
        case 'iah':
          return ((a.last_iah ?? -1) - (b.last_iah ?? -1)) * dir;
        case 'alerts':
          return (a.active_alerts - b.active_alerts) * dir;
        case 'last_sync':
          return (
            (new Date(a.last_sync ?? 0).getTime() - new Date(b.last_sync ?? 0).getTime()) * dir
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [patients, search, bandFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline" />
    );
  };

  return (
    <section className="bg-card border border-border rounded-lg">
      {/* Barre filtres + recherche */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <Button
          variant={bandFilter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setBandFilter('all')}
        >
          Tous ({patients.length})
        </Button>
        {BAND_ORDER.map((band) => (
          <Button
            key={band}
            variant={bandFilter === band ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setBandFilter(bandFilter === band ? 'all' : band)}
          >
            <span className={`w-2 h-2 rounded-full mr-1.5 ${BAND_META[band].dot}`} />
            {BAND_META[band].label} ({bandCounts[band]})
          </Button>
        ))}

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un patient"
            className="pl-8 h-8 w-56 text-sm"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => toggleSort('priority')}
            >
              Statut
              <SortIcon column="priority" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort('name')}
            >
              Patient
              <SortIcon column="name" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right whitespace-nowrap"
              onClick={() => toggleSort('hours')}
            >
              Heures / 28 j
              <SortIcon column="hours" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right whitespace-nowrap"
              onClick={() => toggleSort('iah')}
            >
              IAH
              <SortIcon column="iah" />
            </TableHead>
            <TableHead className="whitespace-nowrap">Phase</TableHead>
            <TableHead
              className="cursor-pointer select-none text-right whitespace-nowrap"
              onClick={() => toggleSort('alerts')}
            >
              Alertes
              <SortIcon column="alerts" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right whitespace-nowrap"
              onClick={() => toggleSort('last_sync')}
            >
              Dernière synchro
              <SortIcon column="last_sync" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                Aucun patient ne correspond à ces critères.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((p) => {
              const band = BAND_META[p.compliance_band];
              return (
                <TableRow
                  key={p.patient_id}
                  className="cursor-pointer"
                  onClick={() => onSelect(p.patient_id)}
                >
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${band.dot}`} />
                      <span className={`text-xs ${band.text}`}>{band.label}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">{p.name}</div>
                    {p.email && (
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatHours(p.last_window?.total_hours ?? null)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatIah(p.last_iah)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {p.phase === 'initial' ? (
                      <Badge variant="outline" className="bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20">
                        9.INI
                      </Badge>
                    ) : p.lppr_code ? (
                      <span className="text-xs text-muted-foreground">{p.lppr_code.short_code}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {p.active_alerts > 0 ? (
                      <span className="text-red-600 font-medium">{p.active_alerts}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateFr(p.last_sync)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
