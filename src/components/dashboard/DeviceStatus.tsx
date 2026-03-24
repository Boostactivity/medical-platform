import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Cpu, Wifi, AlertCircle, CheckCircle, Settings, Calendar, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface Device {
  id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  connectivity_type: string;
  firmware_version: string;
  status: string;
}

interface DeviceAssignment {
  id: string;
  device_id: string;
  assigned_at: string;
  installation_notes: string;
  pressure_settings: any;
  device: Device;
}

export function DeviceStatus({ userId }: { userId: string }) {
  const [assignment, setAssignment] = useState<DeviceAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDevice() {
      try {
        const { data, error } = await supabase
          .from('device_assignments')
          .select(`
            *,
            device:devices(*)
          `)
          .eq('patient_id', userId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.log('No device assigned or error:', error);
          setAssignment(null);
        } else {
          setAssignment(data as any);
          // Simuler le dernier sync (à remplacer par vraie donnée plus tard)
          setLastSync(new Date());
        }
      } catch (err) {
        console.error('Error fetching device:', err);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDevice();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#007AFF]/10 to-[#5AC8FA]/10 rounded-3xl p-8 border-2 border-[#007AFF]/30 animate-pulse">
        <div className="h-32 bg-white/50 rounded-xl"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-[#FF9500]/10 to-[#FF3B30]/10 rounded-3xl p-8 border-2 border-[#FF9500]/30"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF9500] to-[#FF3B30] rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl text-[#1D1D1F] mb-2">Aucun appareil connecté</h3>
            <p className="text-[#86868B]">
              Liez votre machine PPC pour commencer le suivi automatique de vos nuits.
            </p>
          </div>
        </div>
        
        <Link
          to="/setup-device"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg"
        >
          <Settings className="w-5 h-5" />
          Connecter ma machine
        </Link>
      </motion.div>
    );
  }

  const device = assignment.device;
  const syncStatus = lastSync && (Date.now() - lastSync.getTime()) < 24 * 60 * 60 * 1000;
  const daysSinceInstall = Math.floor(
    (Date.now() - new Date(assignment.assigned_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-[#007AFF]/10 to-[#5AC8FA]/10 rounded-3xl p-8 border-2 border-[#007AFF]/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl text-[#1D1D1F]">{device.manufacturer}</h3>
            <p className="text-[#86868B]">{device.model}</p>
          </div>
        </div>
        
        {/* Sync Status */}
        {syncStatus ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#34C759]/10 rounded-full">
            <Wifi className="w-5 h-5 text-[#34C759]" />
            <span className="text-sm text-[#34C759]">Synchronisé</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#FF9500]/10 rounded-full">
            <WifiOff className="w-5 h-5 text-[#FF9500]" />
            <span className="text-sm text-[#FF9500]">Hors ligne</span>
          </div>
        )}
      </div>

      {/* Device Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-[#86868B] mb-1">Numéro de série</div>
          <div className="text-[#1D1D1F] font-mono text-sm">{device.serial_number}</div>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-[#86868B] mb-1">Firmware</div>
          <div className="text-[#1D1D1F]">{device.firmware_version || 'N/A'}</div>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-[#86868B] mb-1">En service depuis</div>
          <div className="text-[#1D1D1F] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {daysSinceInstall} jours
          </div>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4">
          <div className="text-sm text-[#86868B] mb-1">Connectivité</div>
          <div className="text-[#1D1D1F] capitalize">
            {device.connectivity_type === 'wifi' && '📡 Wi-Fi'}
            {device.connectivity_type === 'bluetooth' && '📱 Bluetooth'}
            {device.connectivity_type === 'sd_card' && '💾 Carte SD'}
            {device.connectivity_type === '4g' && '📶 4G'}
            {device.connectivity_type === 'none' && '❌ Manuelle'}
          </div>
        </div>
      </div>

      {/* Pressure Settings (if available) */}
      {assignment.pressure_settings && (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="text-sm text-[#86868B] mb-2">Réglages de pression</div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-[#86868B]">Min</span>
              <div className="text-[#1D1D1F] font-semibold">
                {assignment.pressure_settings.min_pressure} cmH₂O
              </div>
            </div>
            <div className="w-px h-8 bg-[#86868B]/30"></div>
            <div>
              <span className="text-xs text-[#86868B]">Max</span>
              <div className="text-[#1D1D1F] font-semibold">
                {assignment.pressure_settings.max_pressure} cmH₂O
              </div>
            </div>
            <div className="w-px h-8 bg-[#86868B]/30"></div>
            <div>
              <span className="text-xs text-[#86868B]">Mode</span>
              <div className="text-[#1D1D1F] font-semibold capitalize">
                {assignment.pressure_settings.mode}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installation Notes */}
      {assignment.installation_notes && (
        <div className="bg-[#007AFF]/5 rounded-xl p-4 border border-[#007AFF]/20">
          <div className="text-sm text-[#86868B] mb-1">Notes d'installation</div>
          <p className="text-[#1D1D1F] text-sm">{assignment.installation_notes}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6 flex gap-3">
        <button className="flex-1 px-4 py-3 bg-white border-2 border-[#007AFF] text-[#007AFF] rounded-xl hover:bg-[#007AFF]/5 transition-all">
          Voir l'historique
        </button>
        <button className="flex-1 px-4 py-3 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] transition-all">
          Signaler un problème
        </button>
      </div>
    </motion.div>
  );
}
