import { motion } from 'motion/react';
import { MessageCircle, Video, Phone, BookOpen, AlertCircle } from 'lucide-react';

interface AssistanceCardProps {
  onContact?: () => void;
}

export function AssistanceCard({ onContact }: AssistanceCardProps) {
  const issues = [
    { icon: '😷', label: 'Gêne masque', color: '#FF9500' },
    { icon: '😮‍💨', label: "Sensation d'étouffement", color: '#FF3B30' },
    { icon: '🔊', label: 'Bruit machine', color: '#007AFF' },
    { icon: '⚠️', label: 'Panne technique', color: '#86868B' },
  ];

  const resources = [
    {
      icon: <Video className="w-5 h-5" />,
      title: 'Tutoriels vidéo',
      description: 'Bien positionner son masque',
      color: '#007AFF',
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Guides pratiques',
      description: 'Entretien et nettoyage',
      color: '#34C759',
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: 'Assistance 24/7',
      description: 'Urgence technique',
      color: '#FF9500',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-[#007AFF]" />
        </div>
        <div>
          <h3 className="text-xl text-[#1D1D1F]">Besoin d'aide ?</h3>
          <p className="text-sm text-[#86868B]">Nous sommes là pour vous</p>
        </div>
      </div>

      {/* Quick issue buttons */}
      <div className="mb-6">
        <p className="text-sm text-[#86868B] mb-3">J'ai un problème avec :</p>
        <div className="grid grid-cols-2 gap-2">
          {issues.map((issue, index) => (
            <motion.button
              key={issue.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={onContact}
              className="flex items-center gap-2 px-4 py-3 bg-[#F5F5F7] rounded-xl hover:bg-[#EBEBED] transition-all text-left"
            >
              <span className="text-xl">{issue.icon}</span>
              <span className="text-sm text-[#1D1D1F]">{issue.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#E5E5EA] my-6"></div>

      {/* Resources */}
      <div className="space-y-3">
        {resources.map((resource, index) => (
          <motion.button
            key={resource.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="w-full flex items-center gap-4 p-4 bg-[#F5F5F7] rounded-xl hover:bg-[#EBEBED] transition-all group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110"
              style={{ backgroundColor: resource.color }}
            >
              {resource.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm text-[#1D1D1F] mb-1">{resource.title}</div>
              <div className="text-xs text-[#86868B]">{resource.description}</div>
            </div>
            <div className="text-[#86868B] group-hover:translate-x-1 transition-transform">→</div>
          </motion.button>
        ))}
      </div>

      {/* Emergency contact */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gradient-to-r from-[#FF9500]/10 to-[#FF3B30]/10 rounded-xl border border-[#FF9500]/20"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FF9500] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#1D1D1F] mb-2">
              <strong>Urgence ?</strong> Contactez-nous immédiatement
            </p>
            <a
              href="tel:0800123456"
              className="text-sm text-[#007AFF] hover:underline"
            >
              📞 0800 123 456 (gratuit)
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
