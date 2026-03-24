/**
 * JALONS PATIENT - Vue cote patient
 *
 * Le patient voit SES jalons (J7, J30, J90, J180, J365)
 * Notifications quand un jalon approche
 * Bilan automatique PDF a chaque jalon
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, CheckCircle, Clock, AlertTriangle, Download, Bell,
  ChevronDown, ChevronUp, Trophy, ArrowRight, FileText, Star
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../../supabase/client';

// ---- Types ----

type MilestoneType = 'J7' | 'J30' | 'J90' | 'J180' | 'J365';
type MilestoneStatus = 'realise' | 'en_cours' | 'a_venir';

interface PatientMilestone {
  id: string;
  type: MilestoneType;
  label: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  bilanData?: MilestoneBilan;
  notificationSent: boolean;
}

interface MilestoneBilan {
  observanceRate: number;
  avgIAH: number;
  avgUsageHours: number;
  leakRate: number;
  comfort: number; // 1-5
  notes: string;
}

interface Notification {
  id: string;
  milestoneType: MilestoneType;
  message: string;
  date: string;
  read: boolean;
}

// ---- Mock data patient ----

const PATIENT_START_DATE = '2025-12-01';
const PATIENT_NAME = 'Jean Dupont';

function buildPatientMilestones(): PatientMilestone[] {
  const start = new Date(PATIENT_START_DATE);
  const config: { type: MilestoneType; days: number; label: string; desc: string }[] = [
    { type: 'J7', days: 7, label: 'J7 - Premier controle', desc: 'Verification adaptation masque, fuites, confort initial. Premier bilan de vos nuits.' },
    { type: 'J30', days: 30, label: 'J30 - Bilan 1 mois', desc: 'Bilan d\'observance du premier mois. Ajustements des parametres si necessaire.' },
    { type: 'J90', days: 90, label: 'J90 - Renouvellement prescription', desc: 'Bilan d\'observance pour renouvellement. Rapport CPAM pour la prise en charge.' },
    { type: 'J180', days: 180, label: 'J180 - Bilan semestriel', desc: 'Bilan complet semestriel. Verification materiel et remplacement consommables.' },
    { type: 'J365', days: 365, label: 'J365 - Renouvellement annuel', desc: 'Renouvellement annuel obligatoire. Visite chez le medecin prescripteur requise.' },
  ];

  const today = new Date();

  return config.map(cfg => {
    const due = new Date(start);
    due.setDate(due.getDate() + cfg.days);
    const dueStr = due.toISOString().split('T')[0];
    const isPast = due < today;

    let status: MilestoneStatus;
    let completedDate: string | undefined;
    let bilanData: MilestoneBilan | undefined;

    if (isPast) {
      status = 'realise';
      completedDate = new Date(due.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      bilanData = {
        observanceRate: 70 + Math.floor(Math.random() * 25),
        avgIAH: +(1.5 + Math.random() * 4).toFixed(1),
        avgUsageHours: +(5 + Math.random() * 2.5).toFixed(1),
        leakRate: +(5 + Math.random() * 15).toFixed(1),
        comfort: Math.floor(3 + Math.random() * 3),
        notes: 'Bonne adaptation au traitement. Parametres stables.',
      };
    } else {
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      status = diffDays <= 14 ? 'en_cours' : 'a_venir';
    }

    return {
      id: `m-${cfg.type}`,
      type: cfg.type,
      label: cfg.label,
      description: cfg.desc,
      dueDate: dueStr,
      completedDate,
      status,
      bilanData,
      notificationSent: status === 'en_cours',
    };
  });
}

function buildNotifications(milestones: PatientMilestone[]): Notification[] {
  const notifs: Notification[] = [];
  const today = new Date();

  milestones.forEach(m => {
    if (m.status === 'realise' && m.bilanData) {
      notifs.push({
        id: `n-done-${m.type}`,
        milestoneType: m.type,
        message: `Votre bilan ${m.type} est disponible. Consultez votre recapitulatif.`,
        date: m.completedDate || m.dueDate,
        read: true,
      });
    }
    if (m.status === 'en_cours') {
      const due = new Date(m.dueDate);
      const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      notifs.push({
        id: `n-upcoming-${m.type}`,
        milestoneType: m.type,
        message: `Votre jalon ${m.type} approche dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}. Preparez votre visite.`,
        date: today.toISOString().split('T')[0],
        read: false,
      });
    }
  });

  return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ---- PDF generation ----

function generateBilanPDF(milestone: PatientMilestone) {
  const doc = new jsPDF();
  const bilan = milestone.bilanData;
  if (!bilan) return;

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(`Bilan ${milestone.type}`, 20, 25);
  doc.setFontSize(11);
  doc.text(`Patient : ${PATIENT_NAME} | Date : ${milestone.completedDate || milestone.dueDate}`, 20, 35);

  // Body
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.text('Recapitulatif du traitement PPC', 20, 55);

  doc.setFontSize(11);
  const lines = [
    `Taux d'observance : ${bilan.observanceRate}%`,
    `IAH moyen residuel : ${bilan.avgIAH} evenements/h`,
    `Utilisation moyenne : ${bilan.avgUsageHours} h/nuit`,
    `Taux de fuites moyen : ${bilan.leakRate} L/min`,
    `Confort ressenti : ${bilan.comfort}/5`,
    '',
    `Notes : ${bilan.notes}`,
  ];

  let y = 70;
  lines.forEach(line => {
    doc.text(line, 20, y);
    y += 8;
  });

  // Observance bar
  y += 10;
  doc.setFontSize(12);
  doc.text('Observance', 20, y);
  y += 5;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(20, y, 150, 8, 2, 2, 'F');
  const obsColor = bilan.observanceRate >= 70 ? [34, 197, 94] : bilan.observanceRate >= 50 ? [251, 146, 60] : [239, 68, 68];
  doc.setFillColor(obsColor[0], obsColor[1], obsColor[2]);
  doc.roundedRect(20, y, 150 * bilan.observanceRate / 100, 8, 2, 2, 'F');
  doc.setFontSize(10);
  doc.text(`${bilan.observanceRate}%`, 175, y + 6);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Document genere automatiquement - Ne remplace pas un avis medical', 20, 280);
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 150, 280);

  doc.save(`Bilan_${milestone.type}_${PATIENT_NAME.replace(/\s/g, '_')}.pdf`);
}

// ---- Composant Principal ----

export function PatientMilestones() {
  const [milestones, setMilestones] = useState<PatientMilestone[]>(buildPatientMilestones);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .eq('patient_id', user.id)
          .order('due_date', { ascending: true });
        if (!error && data?.length) {
          const mapped: PatientMilestone[] = data.map((m: any) => ({
            id: m.id,
            type: m.type,
            label: m.label || `${m.type}`,
            description: m.description || '',
            dueDate: m.due_date,
            completedDate: m.completed_date,
            status: m.status || (m.completed_date ? 'realise' : 'a_venir'),
            bilanData: m.bilan_data,
            notificationSent: m.notification_sent ?? false,
          }));
          setMilestones(mapped);
        }
      } catch (e) {
        console.warn('PatientMilestones: Using mock data', e);
      }
    };
    fetchMilestones();
  }, []);

  const notifications = useMemo(() => buildNotifications(milestones), [milestones]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const nextMilestone = milestones.find(m => m.status === 'en_cours' || m.status === 'a_venir');
  const completedCount = milestones.filter(m => m.status === 'realise').length;
  const progress = Math.round((completedCount / milestones.length) * 100);

  const statusConfig: Record<MilestoneStatus, { color: string; bg: string; border: string; icon: typeof CheckCircle; label: string }> = {
    realise: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, label: 'Realise' },
    en_cours: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Clock, label: 'A venir bientot' },
    a_venir: { color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: CalendarDays, label: 'A venir' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Mes jalons de traitement
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivi de votre parcours PPC depuis le {new Date(PATIENT_START_DATE).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Notification bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4" /> Notifications
              </h3>
              {notifications.length === 0 ? (
                <p className="text-sm text-blue-700">Aucune notification pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read ? 'bg-white/50' : 'bg-white'}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                      <div>
                        <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(n.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" /> Progression
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCount}/{milestones.length}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {nextMilestone && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
              <ArrowRight className="w-4 h-4" /> Prochain jalon
            </div>
            <p className="text-lg font-bold text-blue-900">{nextMilestone.type}</p>
            <p className="text-sm text-blue-700">
              {new Date(nextMilestone.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
            <Star className="w-4 h-4" /> Debut traitement
          </div>
          <p className="text-lg font-bold text-green-900">
            {new Date(PATIENT_START_DATE).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-green-700">
            {Math.floor((new Date().getTime() - new Date(PATIENT_START_DATE).getTime()) / (1000 * 60 * 60 * 24))} jours de traitement
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Parcours complet</h3>

        <div className="relative">
          {milestones.map((milestone, idx) => {
            const cfg = statusConfig[milestone.status];
            const Icon = cfg.icon;
            const isExpanded = expandedMilestone === milestone.id;
            const daysUntil = milestone.status !== 'realise'
              ? Math.ceil((new Date(milestone.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            return (
              <div key={milestone.id} className="flex gap-4 mb-2 last:mb-0">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.status === 'realise' ? 'bg-green-500 text-white' :
                    milestone.status === 'en_cours' ? 'bg-blue-500 text-white animate-pulse' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {idx < milestones.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[16px] ${
                      milestone.status === 'realise' ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${idx < milestones.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div
                    onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{milestone.label}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{milestone.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.status === 'en_cours' && (
                          <span className="text-sm font-medium text-blue-600">
                            Dans {daysUntil}j
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      {milestone.completedDate
                        ? `Realise le ${new Date(milestone.completedDate).toLocaleDateString('fr-FR')}`
                        : `Prevu le ${new Date(milestone.dueDate).toLocaleDateString('fr-FR')}`
                      }
                    </p>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {milestone.bilanData ? (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-green-50 rounded-lg p-3">
                                  <p className="text-xs text-green-600">Observance</p>
                                  <p className="text-lg font-bold text-green-800">{milestone.bilanData.observanceRate}%</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <p className="text-xs text-blue-600">IAH moyen</p>
                                  <p className="text-lg font-bold text-blue-800">{milestone.bilanData.avgIAH}/h</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600">Usage moyen</p>
                                  <p className="text-lg font-bold text-purple-800">{milestone.bilanData.avgUsageHours}h</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3">
                                  <p className="text-xs text-orange-600">Fuites</p>
                                  <p className="text-lg font-bold text-orange-800">{milestone.bilanData.leakRate} L/min</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-gray-600">Confort ressenti :</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star
                                      key={s}
                                      className={`w-4 h-4 ${s <= milestone.bilanData!.comfort ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                              </div>

                              <p className="text-sm text-gray-600 mb-3">
                                <strong>Notes :</strong> {milestone.bilanData.notes}
                              </p>

                              <button
                                onClick={(e) => { e.stopPropagation(); generateBilanPDF(milestone); }}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                Telecharger le bilan PDF
                              </button>
                            </>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">
                                Le bilan sera disponible une fois ce jalon realise.
                              </p>
                              {milestone.status === 'en_cours' && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Votre technicien vous contactera bientot pour planifier cette etape.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
