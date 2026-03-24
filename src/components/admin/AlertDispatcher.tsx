import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Mail, MessageSquare, Phone, Smartphone, Send, Settings,
  CheckCircle, Clock, AlertTriangle, Eye, Edit2, X, Plus, BarChart3
} from 'lucide-react';

// Types
type AlertType = 'non_observance' | 'panne' | 'masque_use' | 'rdv_rappel' | 'consommable';
type Channel = 'sms' | 'email' | 'notification' | 'appel_technicien';
type AlertSentStatus = 'envoye' | 'lu' | 'repondu' | 'echoue';

interface AlertConfig {
  id: string;
  type: AlertType;
  label: string;
  description: string;
  channels: Channel[];
  enabled: boolean;
  delayMinutes: number;
  template: Record<Channel, string>;
}

interface AlertSent {
  id: string;
  type: AlertType;
  channel: Channel;
  patientName: string;
  sentAt: string;
  status: AlertSentStatus;
  content: string;
}

// Config
const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  non_observance: { label: 'Non-observance', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  panne: { label: 'Panne machine', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  masque_use: { label: 'Masque use', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  rdv_rappel: { label: 'Rappel RDV', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
  consommable: { label: 'Consommable a envoyer', icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: typeof Mail }> = {
  sms: { label: 'SMS', icon: MessageSquare },
  email: { label: 'Email', icon: Mail },
  notification: { label: 'Notification app', icon: Smartphone },
  appel_technicien: { label: 'Appel technicien', icon: Phone },
};

const STATUS_CONFIG: Record<AlertSentStatus, { label: string; color: string }> = {
  envoye: { label: 'Envoye', color: 'text-blue-700 bg-blue-50' },
  lu: { label: 'Lu', color: 'text-green-700 bg-green-50' },
  repondu: { label: 'Repondu', color: 'text-emerald-700 bg-emerald-50' },
  echoue: { label: 'Echoue', color: 'text-red-700 bg-red-50' },
};

// Mock data
const MOCK_CONFIGS: AlertConfig[] = [
  {
    id: 'ac1', type: 'non_observance', label: 'Non-observance detectee',
    description: 'Alerte envoyee quand le patient utilise sa PPC < 4h/nuit pendant 3 jours consecutifs',
    channels: ['sms', 'email', 'notification'], enabled: true, delayMinutes: 0,
    template: {
      sms: 'Bonjour {patient}, nous avons remarque une baisse de votre utilisation PPC. Contactez-nous au {tel_prestataire}.',
      email: 'Cher(e) {patient},\n\nNous constatons que votre utilisation de la PPC est inferieure a 4h ces derniers jours. N\'hesitez pas a nous contacter.',
      notification: 'Votre utilisation PPC est en baisse. Besoin d\'aide?',
      appel_technicien: 'Patient {patient} en non-observance depuis 3 jours. Appeler pour suivi.',
    }
  },
  {
    id: 'ac2', type: 'panne', label: 'Panne machine detectee',
    description: 'Alerte immediate quand la machine ne transmet plus de donnees depuis 24h',
    channels: ['sms', 'email', 'appel_technicien'], enabled: true, delayMinutes: 0,
    template: {
      sms: '{patient}, votre machine PPC semble en panne. Un technicien vous contactera rapidement.',
      email: 'Cher(e) {patient},\n\nNous avons detecte un probleme avec votre machine PPC. Un technicien va vous contacter dans les plus brefs delais.',
      notification: 'Probleme detecte sur votre machine PPC.',
      appel_technicien: 'URGENT: Machine {serial} du patient {patient} en panne. Intervention prioritaire.',
    }
  },
  {
    id: 'ac3', type: 'masque_use', label: 'Masque a remplacer',
    description: 'Notification 10 jours avant la date de remplacement du masque',
    channels: ['email', 'notification'], enabled: true, delayMinutes: 1440,
    template: {
      sms: '{patient}, votre masque PPC arrive en fin de vie. Un nouveau sera envoye prochainement.',
      email: 'Cher(e) {patient},\n\nVotre masque PPC doit etre remplace prochainement. Nous preparons l\'envoi.',
      notification: 'Votre masque PPC sera bientot a remplacer.',
      appel_technicien: 'Preparer remplacement masque pour {patient}.',
    }
  },
  {
    id: 'ac4', type: 'rdv_rappel', label: 'Rappel de rendez-vous',
    description: 'Rappel 24h et 1h avant chaque rendez-vous technicien',
    channels: ['sms', 'notification'], enabled: true, delayMinutes: 60,
    template: {
      sms: 'Rappel: votre technicien {technicien} passera demain a {heure}. Confirmez votre disponibilite.',
      email: 'Cher(e) {patient},\n\nRappel de votre rendez-vous avec le technicien {technicien} le {date} a {heure}.',
      notification: 'Rappel: RDV technicien demain a {heure}.',
      appel_technicien: '',
    }
  },
  {
    id: 'ac5', type: 'consommable', label: 'Consommable a envoyer',
    description: 'Alerte interne quand un envoi de consommable est en retard',
    channels: ['email', 'appel_technicien'], enabled: false, delayMinutes: 0,
    template: {
      sms: '',
      email: 'Alerte: le consommable {type_consommable} du patient {patient} est en retard d\'envoi.',
      notification: '',
      appel_technicien: 'Envoi consommable {type_consommable} en retard pour {patient}. Traiter en priorite.',
    }
  },
];

const MOCK_SENT: AlertSent[] = [
  { id: 'as1', type: 'non_observance', channel: 'sms', patientName: 'Jean Dupont', sentAt: '2024-03-20T08:30:00', status: 'repondu', content: 'Bonjour Jean Dupont, nous avons remarque une baisse de votre utilisation PPC...' },
  { id: 'as2', type: 'non_observance', channel: 'email', patientName: 'Jean Dupont', sentAt: '2024-03-20T08:30:00', status: 'lu', content: 'Cher Jean Dupont, nous constatons que votre utilisation...' },
  { id: 'as3', type: 'panne', channel: 'appel_technicien', patientName: 'Marie Martin', sentAt: '2024-03-19T14:15:00', status: 'repondu', content: 'URGENT: Machine PDS2-2021-00089 du patient Marie Martin en panne.' },
  { id: 'as4', type: 'masque_use', channel: 'notification', patientName: 'Paul Durand', sentAt: '2024-03-19T09:00:00', status: 'envoye', content: 'Votre masque PPC sera bientot a remplacer.' },
  { id: 'as5', type: 'rdv_rappel', channel: 'sms', patientName: 'Claire Petit', sentAt: '2024-03-18T17:00:00', status: 'lu', content: 'Rappel: votre technicien Sophie Morel passera demain a 14h30.' },
  { id: 'as6', type: 'panne', channel: 'sms', patientName: 'Marie Martin', sentAt: '2024-03-19T14:15:00', status: 'echoue', content: 'Marie Martin, votre machine PPC semble en panne...' },
  { id: 'as7', type: 'non_observance', channel: 'sms', patientName: 'Anne Moreau', sentAt: '2024-03-17T10:00:00', status: 'envoye', content: 'Bonjour Anne Moreau, nous avons remarque une baisse...' },
  { id: 'as8', type: 'rdv_rappel', channel: 'notification', patientName: 'Luc Bernard', sentAt: '2024-03-17T18:00:00', status: 'lu', content: 'Rappel: RDV technicien demain a 15h30.' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AlertDispatcher() {
  const [configs, setConfigs] = useState<AlertConfig[]>(MOCK_CONFIGS);
  const [sentAlerts] = useState<AlertSent[]>(MOCK_SENT);
  const [tab, setTab] = useState<'config' | 'historique' | 'stats'>('config');
  const [editingTemplate, setEditingTemplate] = useState<{ configId: string; channel: Channel } | null>(null);
  const [tempTemplate, setTempTemplate] = useState('');

  const stats = useMemo(() => {
    const total = sentAlerts.length;
    const responded = sentAlerts.filter(a => a.status === 'repondu').length;
    const read = sentAlerts.filter(a => a.status === 'lu' || a.status === 'repondu').length;
    const failed = sentAlerts.filter(a => a.status === 'echoue').length;
    return {
      total,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      readRate: total > 0 ? Math.round((read / total) * 100) : 0,
      failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    };
  }, [sentAlerts]);

  const toggleConfig = (configId: string) => {
    setConfigs(prev => prev.map(c => c.id === configId ? { ...c, enabled: !c.enabled } : c));
  };

  const toggleChannel = (configId: string, channel: Channel) => {
    setConfigs(prev => prev.map(c => {
      if (c.id !== configId) return c;
      const channels = c.channels.includes(channel)
        ? c.channels.filter(ch => ch !== channel)
        : [...c.channels, channel];
      return { ...c, channels };
    }));
  };

  const startEditTemplate = (configId: string, channel: Channel) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;
    setEditingTemplate({ configId, channel });
    setTempTemplate(config.template[channel]);
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    setConfigs(prev => prev.map(c => {
      if (c.id !== editingTemplate.configId) return c;
      return { ...c, template: { ...c.template, [editingTemplate.channel]: tempTemplate } };
    }));
    setEditingTemplate(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Alertes SMS / Email</h1>
        <p className="text-[#86868B] mt-1">Configuration et suivi des alertes automatiques</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
          <div className="text-3xl font-bold text-[#1D1D1F]">{stats.total}</div>
          <div className="text-sm text-[#86868B]">Alertes envoyees</div>
        </div>
        <div className="p-5 rounded-2xl bg-green-50 border border-green-200">
          <div className="text-3xl font-bold text-green-700">{stats.readRate}%</div>
          <div className="text-sm text-[#86868B]">Taux de lecture</div>
        </div>
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{stats.responseRate}%</div>
          <div className="text-sm text-[#86868B]">Taux de reponse</div>
        </div>
        <div className={`p-5 rounded-2xl ${stats.failRate > 5 ? 'bg-red-50 border border-red-200' : 'bg-[#F5F5F7] border border-[#E5E5EA]'}`}>
          <div className={`text-3xl font-bold ${stats.failRate > 5 ? 'text-red-700' : 'text-[#1D1D1F]'}`}>{stats.failRate}%</div>
          <div className="text-sm text-[#86868B]">Taux d'echec</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E5E5EA] pb-0">
        {([['config', 'Configuration'], ['historique', 'Historique'], ['stats', 'Efficacite']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === key ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Configuration */}
      {tab === 'config' && (
        <div className="space-y-4">
          {configs.map(config => {
            const typeCfg = ALERT_TYPE_CONFIG[config.type];
            const TypeIcon = typeCfg.icon;
            return (
              <div key={config.id} className={`bg-white rounded-2xl border overflow-hidden ${config.enabled ? 'border-[#E5E5EA]' : 'border-[#E5E5EA] opacity-60'}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeCfg.bg}`}>
                      <TypeIcon className={`w-6 h-6 ${typeCfg.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[#1D1D1F]">{config.label}</h3>
                        <button
                          onClick={() => toggleConfig(config.id)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}
                        >
                          <motion.div
                            animate={{ x: config.enabled ? 24 : 2 }}
                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                          />
                        </button>
                      </div>
                      <p className="text-sm text-[#86868B] mt-1">{config.description}</p>

                      {/* Channels */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG[Channel]][]).map(([channel, chCfg]) => {
                          const isActive = config.channels.includes(channel);
                          const ChIcon = chCfg.icon;
                          return (
                            <button
                              key={channel}
                              onClick={() => toggleChannel(config.id, channel)}
                              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
                                isActive ? 'bg-[#3b82f6] text-white border-[#3b82f6]' : 'bg-[#F5F5F7] text-[#86868B] border-[#E5E5EA] hover:border-[#D1D1D6]'
                              }`}
                            >
                              <ChIcon className="w-3.5 h-3.5" />{chCfg.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Templates */}
                      <div className="mt-4 space-y-2">
                        {config.channels.map(channel => {
                          const chCfg = CHANNEL_CONFIG[channel];
                          const ChIcon = chCfg.icon;
                          return (
                            <div key={channel} className="bg-[#F5F5F7] rounded-xl p-3 flex items-start gap-3">
                              <ChIcon className="w-4 h-4 text-[#86868B] mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-[#86868B] mb-1">Template {chCfg.label}</div>
                                <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap break-words">{config.template[channel] || '(vide)'}</p>
                              </div>
                              <button
                                onClick={() => startEditTemplate(config.id, channel)}
                                className="p-1.5 rounded-lg hover:bg-white transition-colors shrink-0"
                              >
                                <Edit2 className="w-4 h-4 text-[#86868B]" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Historique */}
      {tab === 'historique' && (
        <div className="space-y-3">
          {sentAlerts.map(alert => {
            const typeCfg = ALERT_TYPE_CONFIG[alert.type];
            const chCfg = CHANNEL_CONFIG[alert.channel];
            const ChIcon = chCfg.icon;
            const statusCfg = STATUS_CONFIG[alert.status];
            return (
              <div key={alert.id} className="bg-white rounded-2xl border border-[#E5E5EA] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeCfg.bg}`}>
                  <ChIcon className={`w-5 h-5 ${typeCfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1D1D1F]">{alert.patientName}</span>
                    <span className="text-xs text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-full">{typeCfg.label}</span>
                    <span className="text-xs text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-full">{chCfg.label}</span>
                  </div>
                  <p className="text-sm text-[#86868B] truncate mt-0.5">{alert.content}</p>
                  <div className="text-xs text-[#86868B] mt-0.5">{formatDate(alert.sentAt)}</div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusCfg.color} shrink-0`}>
                  {statusCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Efficacite */}
      {tab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* By type */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Efficacite par type d'alerte</h3>
              <div className="space-y-3">
                {(Object.entries(ALERT_TYPE_CONFIG) as [AlertType, typeof ALERT_TYPE_CONFIG[AlertType]][]).map(([type, cfg]) => {
                  const typeAlerts = sentAlerts.filter(a => a.type === type);
                  const responded = typeAlerts.filter(a => a.status === 'repondu').length;
                  const rate = typeAlerts.length > 0 ? Math.round((responded / typeAlerts.length) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-[#86868B] w-36">{cfg.label}</span>
                      <div className="flex-1 bg-[#F5F5F7] rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-sm font-medium text-[#1D1D1F] w-12 text-right">{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* By channel */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6">
              <h3 className="font-semibold text-[#1D1D1F] mb-4">Efficacite par canal</h3>
              <div className="space-y-3">
                {(Object.entries(CHANNEL_CONFIG) as [Channel, typeof CHANNEL_CONFIG[Channel]][]).map(([channel, cfg]) => {
                  const chAlerts = sentAlerts.filter(a => a.channel === channel);
                  const responded = chAlerts.filter(a => a.status === 'repondu' || a.status === 'lu').length;
                  const rate = chAlerts.length > 0 ? Math.round((responded / chAlerts.length) * 100) : 0;
                  const ChIcon = cfg.icon;
                  return (
                    <div key={channel} className="flex items-center gap-3">
                      <ChIcon className="w-4 h-4 text-[#86868B]" />
                      <span className="text-sm text-[#86868B] w-28">{cfg.label}</span>
                      <div className="flex-1 bg-[#F5F5F7] rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#34C759] to-[#30D158] rounded-full transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-sm font-medium text-[#1D1D1F] w-12 text-right">{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-sm text-blue-900">
            <strong>Conseil:</strong> Le canal SMS a le meilleur taux de reponse pour les alertes urgentes. Privilegiez les notifications in-app pour les rappels non critiques et reservez les appels technicien pour les pannes.
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      <AnimatePresence>
        {editingTemplate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTemplate(null)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#1D1D1F]">Modifier le template</h2>
                  <button onClick={() => setEditingTemplate(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F7]"><X className="w-6 h-6 text-[#86868B]" /></button>
                </div>
                <div className="p-8 space-y-4">
                  <div className="bg-[#F5F5F7] rounded-xl p-3 text-xs text-[#86868B]">
                    Variables disponibles: {'{patient}'}, {'{technicien}'}, {'{tel_prestataire}'}, {'{heure}'}, {'{date}'}, {'{serial}'}, {'{type_consommable}'}
                  </div>
                  <textarea
                    value={tempTemplate}
                    onChange={e => setTempTemplate(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl focus:ring-2 focus:ring-[#3b82f6] outline-none resize-none"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setEditingTemplate(null)} className="flex-1 px-6 py-3 bg-[#F5F5F7] rounded-full hover:bg-[#E5E5EA] transition-all">Annuler</button>
                    <button onClick={saveTemplate} className="flex-1 px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white rounded-full hover:shadow-lg transition-all">Enregistrer</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
