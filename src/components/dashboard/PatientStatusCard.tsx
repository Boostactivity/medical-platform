import { motion } from 'motion/react';
import { User, Download, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  email: string;
  avgHours: number;
  compliance: number;
  lastSync: string;
  treatmentDays: number;
  status: 'excellent' | 'good' | 'warning' | 'alert';
}

interface PatientStatusCardProps {
  patient: PatientData;
  onExport?: () => void;
  onMessage?: () => void;
  index?: number;
}

export function PatientStatusCard({ patient, onExport, onMessage, index = 0 }: PatientStatusCardProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      excellent: {
        color: '#34C759',
        bg: 'bg-[#34C759]/10',
        label: 'Excellent',
        icon: <CheckCircle className="w-5 h-5" />,
      },
      good: {
        color: '#007AFF',
        bg: 'bg-[#007AFF]/10',
        label: 'Bon',
        icon: <CheckCircle className="w-5 h-5" />,
      },
      warning: {
        color: '#FF9500',
        bg: 'bg-[#FF9500]/10',
        label: 'À surveiller',
        icon: <AlertTriangle className="w-5 h-5" />,
      },
      alert: {
        color: '#FF3B30',
        bg: 'bg-[#FF3B30]/10',
        label: 'Attention',
        icon: <AlertTriangle className="w-5 h-5" />,
      },
    };
    return configs[status as keyof typeof configs];
  };

  const statusConfig = getStatusConfig(patient.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#F5F5F7] rounded-2xl p-6 hover:bg-[#EBEBED] transition-all group"
    >
      <div className="flex items-center justify-between">
        {/* Patient info */}
        <div className="flex items-center gap-4 flex-1">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${statusConfig.color}, ${statusConfig.color}dd)` }}
          >
            {patient.name.charAt(0)}
          </div>

          <div className="flex-1">
            <h4 className="text-lg text-[#1D1D1F] mb-1">{patient.name}</h4>
            <p className="text-sm text-[#86868B]">
              Traité depuis {patient.treatmentDays} jours · Dernière sync: {patient.lastSync}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mr-6">
          <div className="text-center">
            <div className="text-2xl text-[#1D1D1F] mb-1">{patient.avgHours.toFixed(1)}h</div>
            <div className="text-xs text-[#86868B]">Moy/nuit</div>
          </div>

          <div className="text-center">
            <div className="text-2xl text-[#1D1D1F] mb-1">{patient.compliance.toFixed(0)}%</div>
            <div className="text-xs text-[#86868B]">Observance</div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-2 px-4 py-2 ${statusConfig.bg} rounded-full min-w-[140px]`}>
            <span style={{ color: statusConfig.color }}>{statusConfig.icon}</span>
            <span style={{ color: statusConfig.color }} className="text-sm">
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMessage && (
            <button
              onClick={onMessage}
              className="p-3 bg-white hover:bg-[#007AFF] hover:text-white rounded-xl transition-all shadow-sm"
              title="Envoyer un message"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-3 bg-white hover:bg-[#34C759] hover:text-white rounded-xl transition-all shadow-sm"
              title="Exporter le rapport"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Filter buttons for doctor dashboard
interface FilterButtonsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    excellent: number;
    warning: number;
    alert: number;
  };
}

export function FilterButtons({ activeFilter, onFilterChange, counts }: FilterButtonsProps) {
  const filters = [
    { key: 'all', label: 'Tous les patients', count: counts.all, color: '#007AFF' },
    { key: 'excellent', label: 'Excellents', count: counts.excellent, color: '#34C759' },
    { key: 'warning', label: 'À surveiller', count: counts.warning, color: '#FF9500' },
    { key: 'alert', label: 'Alertes', count: counts.alert, color: '#FF3B30' },
  ];

  return (
    <div className="flex items-center gap-3 mb-6">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={`px-5 py-3 rounded-xl transition-all ${
            activeFilter === filter.key
              ? 'text-white shadow-lg'
              : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#EBEBED]'
          }`}
          style={
            activeFilter === filter.key
              ? { backgroundColor: filter.color }
              : {}
          }
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  );
}
