/**
 * JALONS AUTOMATIQUES (J7, J30, J90, J180, J365)
 *
 * Timeline jalons predefinies pour chaque patient PPC
 * Actions automatiques, notifications, vue calendrier, dashboard retards
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown,
  ChevronRight, Search, Filter, User, Bell, Mail, Wrench, Activity,
  CalendarDays, BarChart3, ArrowRight, Play, Eye
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// ---- Types ----

type MilestoneType = 'J7' | 'J30' | 'J90' | 'J180' | 'J365';
type MilestoneStatus = 'a_faire' | 'planifie' | 'realise' | 'en_retard';
type ViewMode = 'patients' | 'calendar' | 'dashboard';

interface MilestoneAction {
  type: 'notification_technicien' | 'email_patient' | 'alerte_medecin';
  label: string;
  done: boolean;
}

interface Milestone {
  id: string;
  type: MilestoneType;
  label: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  actions: MilestoneAction[];
}

interface PatientMilestones {
  patientId: string;
  patientName: string;
  startDate: string; // Date mise sous PPC
  deviceSerial: string;
  medecinName: string;
  milestones: Milestone[];
}

// ---- Config jalons ----

const MILESTONE_CONFIG: { type: MilestoneType; dayOffset: number; label: string; description: string }[] = [
  { type: 'J7', dayOffset: 7, label: 'J7 - Premier controle', description: 'Verifier adaptation masque, fuites, confort initial' },
  { type: 'J30', dayOffset: 30, label: 'J30 - Bilan 1 mois', description: 'Observance, confort, ajustements parametres si besoin' },
  { type: 'J90', dayOffset: 90, label: 'J90 - Renouvellement prescription', description: 'Renouvellement prescription si besoin, bilan observance CPAM' },
  { type: 'J180', dayOffset: 180, label: 'J180 - Bilan semestriel', description: 'Bilan complet semestriel, verification materiel, remplacement consommables' },
  { type: 'J365', dayOffset: 365, label: 'J365 - Renouvellement annuel', description: 'Renouvellement annuel obligatoire, visite medecin prescripteur' },
];

function generateMilestoneActions(type: MilestoneType): MilestoneAction[] {
  return [
    { type: 'notification_technicien', label: 'Notifier technicien', done: false },
    { type: 'email_patient', label: 'Envoyer email patient', done: false },
    { type: 'alerte_medecin', label: 'Alerter medecin prescripteur', done: false },
  ];
}

function computeStatus(dueDate: string, completedDate?: string): MilestoneStatus {
  if (completedDate) return 'realise';
  const today = new Date();
  const due = new Date(dueDate);
  if (due < today) return 'en_retard';
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'planifie';
  return 'a_faire';
}

// ---- Mock Data ----

function buildMockPatientMilestones(): PatientMilestones[] {
  const patients = [
    { id: 'p1', name: 'Jean Dupont', start: '2025-12-01', serial: 'RS11-2023-00142', medecin: 'Dr. Moreau' },
    { id: 'p2', name: 'Marie Martin', start: '2025-09-15', serial: 'PDS2-2021-00089', medecin: 'Dr. Laurent' },
    { id: 'p3', name: 'Pierre Bernard', start: '2026-01-10', serial: 'RS11-2024-00201', medecin: 'Dr. Laurent' },
    { id: 'p4', name: 'Paul Durand', start: '2025-06-01', serial: 'RS10-2020-00331', medecin: 'Dr. Moreau' },
    { id: 'p5', name: 'Sophie Leroy', start: '2026-03-01', serial: 'LPS-2024-00015', medecin: 'Dr. Bernard' },
    { id: 'p6', name: 'Claire Petit', start: '2025-10-20', serial: 'PDS2-2023-00145', medecin: 'Dr. Moreau' },
  ];

  return patients.map(p => {
    const start = new Date(p.start);
    const milestones: Milestone[] = MILESTONE_CONFIG.map(cfg => {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + cfg.dayOffset);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // Simulate some completed milestones
      const today = new Date();
      const isPast = dueDate < today;
      const completedDate = isPast && Math.random() > 0.3
        ? new Date(dueDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : undefined;

      const status = computeStatus(dueDateStr, completedDate);
      const actions = generateMilestoneActions(cfg.type);
      if (completedDate) actions.forEach(a => a.done = true);

      return {
        id: `${p.id}-${cfg.type}`,
        type: cfg.type,
        label: cfg.label,
        description: cfg.description,
        dueDate: dueDateStr,
        completedDate,
        status,
        actions,
      };
    });

    return {
      patientId: p.id,
      patientName: p.name,
      startDate: p.start,
      deviceSerial: p.serial,
      medecinName: p.medecin,
      milestones,
    };
  });
}

// ---- Composant Principal ----

export default function MilestoneTracker() {
  const [patientsData, setPatientsData] = useState<PatientMilestones[]>(buildMockPatientMilestones);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | 'all'>('all');

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .order('due_date', { ascending: true });
        if (!error && data?.length) {
          // Group milestones by patient
          const byPatient = new Map<string, any[]>();
          data.forEach((m: any) => {
            const pid = m.patient_id;
            const list = byPatient.get(pid) || [];
            list.push(m);
            byPatient.set(pid, list);
          });
          if (byPatient.size > 0) {
            const mapped: PatientMilestones[] = Array.from(byPatient.entries()).map(([pid, milestones]) => ({
              patientId: pid,
              patientName: milestones[0]?.patient_name || pid,
              startDate: milestones[0]?.start_date || '',
              deviceSerial: milestones[0]?.device_serial || '',
              medecinName: milestones[0]?.medecin_name || '',
              milestones: milestones.map((m: any) => ({
                id: m.id,
                type: m.type,
                label: m.label || `${m.type}`,
                description: m.description || '',
                dueDate: m.due_date,
                completedDate: m.completed_date,
                status: m.status || computeStatus(m.due_date, m.completed_date),
                actions: m.actions || generateMilestoneActions(m.type),
              })),
            }));
            setPatientsData(mapped);
          }
        }
      } catch (e) {
        console.warn('MilestoneTracker: Using mock data', e);
      }
    };
    fetchMilestones();
  }, []);

  // All milestones flat
  const allMilestones = useMemo(() => {
    return patientsData.flatMap(p =>
      p.milestones.map(m => ({ ...m, patientName: p.patientName, patientId: p.patientId, medecinName: p.medecinName }))
    );
  }, [patientsData]);

  // Dashboard stats
  const dashStats = useMemo(() => {
    const enRetard = allMilestones.filter(m => m.status === 'en_retard').length;
    const today = new Date().toISOString().split('T')[0];
    const aFaireAujourdhui = allMilestones.filter(m => m.dueDate === today && m.status !== 'realise').length;

    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const cetteSemaine = allMilestones.filter(m => {
      const d = new Date(m.dueDate);
      return d >= new Date() && d <= endOfWeek && m.status !== 'realise';
    }).length;

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    const ceMois = allMilestones.filter(m => {
      const d = new Date(m.dueDate);
      return d >= new Date() && d <= endOfMonth && m.status !== 'realise';
    }).length;

    const realises = allMilestones.filter(m => m.status === 'realise').length;
    const total = allMilestones.length;

    return { enRetard, aFaireAujourdhui, cetteSemaine, ceMois, realises, total };
  }, [allMilestones]);

  // Calendar data (next 30 days)
  const calendarMilestones = useMemo(() => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    return allMilestones
      .filter(m => {
        const d = new Date(m.dueDate);
        return d >= today && d <= endDate && m.status !== 'realise';
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allMilestones]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patientsData.filter(p =>
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patientsData, searchQuery]);

  const statusConfig: Record<MilestoneStatus, { color: string; icon: typeof CheckCircle; label: string }> = {
    realise: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Realise' },
    planifie: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar, label: 'Planifie' },
    a_faire: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: 'A faire' },
    en_retard: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, label: 'En retard' },
  };

  const StatusBadge = ({ status }: { status: MilestoneStatus }) => {
    const c = statusConfig[status];
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
        <Icon className="w-3 h-3" /> {c.label}
      </span>
    );
  };

  const ActionIcon = ({ type }: { type: MilestoneAction['type'] }) => {
    if (type === 'notification_technicien') return <Wrench className="w-3.5 h-3.5" />;
    if (type === 'email_patient') return <Mail className="w-3.5 h-3.5" />;
    return <Activity className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Jalons automatiques
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi J7, J30, J90, J180, J365 - Actions automatiques par patient
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          {(['dashboard', 'patients', 'calendar'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'dashboard' ? 'Dashboard' : v === 'patients' ? 'Par patient' : 'Calendrier'}
            </button>
          ))}
        </div>
      </div>

      {/* ===== DASHBOARD VIEW ===== */}
      {viewMode === 'dashboard' && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4" /> En retard
              </div>
              <p className="text-3xl font-bold text-red-800 mt-1">{dashStats.enRetard}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-700 text-sm">
                <Clock className="w-4 h-4" /> Aujourd'hui
              </div>
              <p className="text-3xl font-bold text-orange-800 mt-1">{dashStats.aFaireAujourdhui}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Calendar className="w-4 h-4" /> Cette semaine
              </div>
              <p className="text-3xl font-bold text-blue-800 mt-1">{dashStats.cetteSemaine}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-indigo-700 text-sm">
                <CalendarDays className="w-4 h-4" /> Ce mois
              </div>
              <p className="text-3xl font-bold text-indigo-800 mt-1">{dashStats.ceMois}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" /> Realises
              </div>
              <p className="text-3xl font-bold text-green-800 mt-1">{dashStats.realises}/{dashStats.total}</p>
            </div>
          </div>

          {/* Jalons en retard */}
          {allMilestones.filter(m => m.status === 'en_retard').length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                Jalons en retard ({allMilestones.filter(m => m.status === 'en_retard').length})
              </h3>
              <div className="space-y-2">
                {allMilestones.filter(m => m.status === 'en_retard').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-3">
                      <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded text-xs font-bold">{m.type}</span>
                      <div>
                        <p className="font-medium text-sm">{m.patientName}</p>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-700 font-medium">
                        {Math.ceil((new Date().getTime() - new Date(m.dueDate).getTime()) / (1000 * 60 * 60 * 24))}j de retard
                      </p>
                      <p className="text-xs text-muted-foreground">Prevu le {new Date(m.dueDate).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prochains jalons */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <ArrowRight className="w-5 h-5 text-primary" />
              Prochains jalons (7 jours)
            </h3>
            <div className="space-y-2">
              {allMilestones
                .filter(m => {
                  const d = new Date(m.dueDate);
                  const today = new Date();
                  const week = new Date();
                  week.setDate(week.getDate() + 7);
                  return d >= today && d <= week && m.status !== 'realise';
                })
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{m.type}</span>
                      <div>
                        <p className="font-medium text-sm">{m.patientName}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(m.dueDate).toLocaleDateString('fr-FR')}</p>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))}
              {allMilestones.filter(m => {
                const d = new Date(m.dueDate);
                const today = new Date();
                const week = new Date();
                week.setDate(week.getDate() + 7);
                return d >= today && d <= week && m.status !== 'realise';
              }).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun jalon prevu cette semaine</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== PATIENTS VIEW ===== */}
      {viewMode === 'patients' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground"
            />
          </div>

          <div className="space-y-3">
            {filteredPatients.map(patient => {
              const isOpen = selectedPatient === patient.patientId;
              const retards = patient.milestones.filter(m => m.status === 'en_retard').length;
              const realises = patient.milestones.filter(m => m.status === 'realise').length;
              const progress = Math.round((realises / patient.milestones.length) * 100);

              return (
                <div key={patient.patientId} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    onClick={() => setSelectedPatient(isOpen ? null : patient.patientId)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div>
                        <p className="font-semibold text-sm">{patient.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Debut PPC : {new Date(patient.startDate).toLocaleDateString('fr-FR')} - {patient.medecinName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {retards > 0 && (
                        <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-semibold">
                          {retards} en retard
                        </span>
                      )}
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="p-4">
                          {/* Timeline */}
                          <div className="relative">
                            {patient.milestones.map((m, idx) => (
                              <div key={m.id} className="flex gap-4 mb-4 last:mb-0">
                                {/* Timeline line & dot */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    m.status === 'realise' ? 'bg-green-500 text-white' :
                                    m.status === 'en_retard' ? 'bg-red-500 text-white' :
                                    m.status === 'planifie' ? 'bg-blue-500 text-white' :
                                    'bg-gray-200 text-gray-600'
                                  }`}>
                                    {m.type.replace('J', '')}
                                  </div>
                                  {idx < patient.milestones.length - 1 && (
                                    <div className={`w-0.5 flex-1 min-h-[20px] ${
                                      m.status === 'realise' ? 'bg-green-300' : 'bg-gray-200'
                                    }`} />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-sm">{m.label}</p>
                                      <p className="text-xs text-muted-foreground">{m.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-muted-foreground">
                                        {m.completedDate
                                          ? `Fait le ${new Date(m.completedDate).toLocaleDateString('fr-FR')}`
                                          : `Prevu le ${new Date(m.dueDate).toLocaleDateString('fr-FR')}`
                                        }
                                      </p>
                                      <StatusBadge status={m.status} />
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 mt-2">
                                    {m.actions.map((action, aIdx) => (
                                      <span
                                        key={aIdx}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                          action.done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                                        }`}
                                      >
                                        <ActionIcon type={action.type} />
                                        {action.label}
                                        {action.done && <CheckCircle className="w-3 h-3" />}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== CALENDAR VIEW ===== */}
      {viewMode === 'calendar' && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            Jalons a venir (30 prochains jours)
          </h3>

          {calendarMilestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun jalon prevu dans les 30 prochains jours</p>
          ) : (
            <div className="space-y-1">
              {(() => {
                let lastDate = '';
                return calendarMilestones.map(m => {
                  const dateLabel = new Date(m.dueDate).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  });
                  const showDate = m.dueDate !== lastDate;
                  lastDate = m.dueDate;

                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div className="pt-3 pb-1">
                          <p className="text-sm font-semibold text-foreground capitalize">{dateLabel}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 ml-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            m.status === 'en_retard' ? 'bg-red-200 text-red-800' : 'bg-primary/10 text-primary'
                          }`}>
                            {m.type}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{m.patientName}</p>
                            <p className="text-xs text-muted-foreground">{m.description}</p>
                          </div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
