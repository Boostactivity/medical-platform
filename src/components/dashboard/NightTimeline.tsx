import { motion } from 'motion/react';
import { Moon, AlertTriangle, Wind, Clock } from 'lucide-react';

interface TimelineEvent {
  time: string;
  type: 'sleep' | 'wake' | 'leak' | 'alarm';
  severity?: 'low' | 'medium' | 'high';
}

interface NightTimelineProps {
  startTime?: string;
  endTime?: string;
  totalHours: number;
  events: TimelineEvent[];
}

export function NightTimeline({ 
  startTime = '21:00', 
  endTime = '09:00',
  totalHours,
  events 
}: NightTimelineProps) {
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sleep': return <Moon className="w-4 h-4" />;
      case 'wake': return <Clock className="w-4 h-4" />;
      case 'leak': return <Wind className="w-4 h-4" />;
      case 'alarm': return <AlertTriangle className="w-4 h-4" />;
      default: return <Moon className="w-4 h-4" />;
    }
  };
  
  const getEventColor = (type: string, severity?: string) => {
    if (type === 'leak' || type === 'alarm') {
      if (severity === 'high') return '#FF3B30';
      if (severity === 'medium') return '#FF9500';
      return '#FFD60A';
    }
    if (type === 'wake') return '#86868B';
    return '#5AC8FA';
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl text-[#1D1D1F] mb-1">Ma Nuit</h3>
          <p className="text-sm text-[#86868B]">
            {startTime} - {endTime} · {totalHours.toFixed(1)}h de traitement
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#34C759]/10 rounded-full">
          <div className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse"></div>
          <span className="text-sm text-[#34C759]">Données synchronisées</span>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-12 bg-gradient-to-r from-[#1A1D2E]/10 via-[#5AC8FA]/20 to-[#1A1D2E]/10 rounded-full relative overflow-hidden">
          {/* Treatment period */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalHours / 12) * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute h-full bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] rounded-full"
          />
        </div>

        {/* Time markers */}
        <div className="flex justify-between mt-3 px-2">
          <span className="text-xs text-[#86868B]">{startTime}</span>
          <span className="text-xs text-[#86868B]">00:00</span>
          <span className="text-xs text-[#86868B]">06:00</span>
          <span className="text-xs text-[#86868B]">{endTime}</span>
        </div>

        {/* Events */}
        <div className="flex gap-2 mt-6">
          {events.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] rounded-xl"
            >
              <div style={{ color: getEventColor(event.type, event.severity) }}>
                {getEventIcon(event.type)}
              </div>
              <div>
                <div className="text-xs text-[#1D1D1F]">{event.time}</div>
                <div className="text-xs text-[#86868B] capitalize">{event.type}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Temps de port', value: `${totalHours.toFixed(1)}h`, color: '#007AFF' },
          { label: 'Fuites', value: 'Faibles', color: '#34C759' },
          { label: 'Événements', value: events.filter(e => e.type === 'alarm').length, color: '#FF9500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            className="text-center p-3 bg-[#F5F5F7] rounded-2xl"
          >
            <div className="text-2xl text-[#1D1D1F] mb-1">{stat.value}</div>
            <div className="text-xs text-[#86868B]">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
