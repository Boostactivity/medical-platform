/**
 * TUTORIELS VIDEO
 * Liste de tutoriels PPC avec placeholders video
 * Marquage vu/non vu
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  CheckCircle2,
  Clock,
  Video,
  X,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Tutorial {
  id: string;
  title: string;
  duration: string;
  description: string;
  thumbnail_emoji: string;
  category: 'masque' | 'machine' | 'sommeil' | 'comprendre';
  youtube_embed_url: string;
}

// ============================================
// DONNEES
// ============================================

const TUTORIALS: Tutorial[] = [
  {
    id: 'tuto-1',
    title: 'Bien positionner son masque',
    duration: '2:30',
    description:
      'Apprenez les gestes essentiels pour ajuster votre masque nasal ou facial. Evitez les fuites et les marques en suivant ces etapes simples.',
    thumbnail_emoji: '🎭',
    category: 'masque',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'tuto-2',
    title: 'Nettoyer sa machine PPC',
    duration: '3:15',
    description:
      'Guide complet pour l\'entretien quotidien et hebdomadaire de votre equipement. Nettoyage du masque, du tuyau et du bac a eau.',
    thumbnail_emoji: '🧼',
    category: 'machine',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'tuto-3',
    title: 'Dormir avec un masque : astuces',
    duration: '4:20',
    description:
      'Conseils pratiques pour vous endormir plus facilement avec votre masque PPC. Positions de sommeil, relaxation et habituation progressive.',
    thumbnail_emoji: '💤',
    category: 'sommeil',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'tuto-4',
    title: 'Comprendre votre score',
    duration: '3:00',
    description:
      'Decouvrez comment lire et interpreter votre score d\'observance, votre IAH et les indicateurs de qualite de votre traitement.',
    thumbnail_emoji: '📊',
    category: 'comprendre',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'tuto-5',
    title: 'Que faire si le masque gene',
    duration: '2:45',
    description:
      'Solutions aux problemes courants : irritations, marques rouges, sensation de claustrophobie. Quand contacter votre technicien.',
    thumbnail_emoji: '😣',
    category: 'masque',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  masque: { label: 'Masque', color: 'bg-orange-100 text-orange-700' },
  machine: { label: 'Machine', color: 'bg-blue-100 text-blue-700' },
  sommeil: { label: 'Sommeil', color: 'bg-purple-100 text-purple-700' },
  comprendre: { label: 'Comprendre', color: 'bg-green-100 text-green-700' },
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function VideoTutorials() {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [playingTutorial, setPlayingTutorial] = useState<Tutorial | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const markAsWatched = (id: string) => {
    setWatchedIds((prev) => new Set([...prev, id]));
  };

  const handlePlay = (tutorial: Tutorial) => {
    setPlayingTutorial(tutorial);
    markAsWatched(tutorial.id);
  };

  const filteredTutorials = filterCategory
    ? TUTORIALS.filter((t) => t.category === filterCategory)
    : TUTORIALS;

  const watchedCount = watchedIds.size;
  const totalCount = TUTORIALS.length;
  const progress = Math.round((watchedCount / totalCount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/30 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] rounded-xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-[21px] font-semibold text-[#1a2b3c]">
            Tutoriels video
          </h3>
          <p className="text-[13px] text-[#64748b]">
            Guides pratiques pour votre traitement PPC
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#86868B]">
            {watchedCount}/{totalCount} visionnes
          </span>
          <span className="text-xs font-medium text-[#8b5cf6]">
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] rounded-full"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterCategory(null)}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            !filterCategory
              ? 'bg-[#8b5cf6] text-white'
              : 'bg-[#f5f5f7] text-[#86868B] hover:bg-[#e5e5ea]'
          }`}
        >
          Tous
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterCategory === key
                ? 'bg-[#8b5cf6] text-white'
                : 'bg-[#f5f5f7] text-[#86868B] hover:bg-[#e5e5ea]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tutorial list */}
      <div className="space-y-4">
        {filteredTutorials.map((tutorial, index) => {
          const isWatched = watchedIds.has(tutorial.id);
          const catInfo = CATEGORY_LABELS[tutorial.category];

          return (
            <motion.button
              key={tutorial.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => handlePlay(tutorial)}
              className={`w-full bg-white border rounded-2xl p-4 hover:shadow-lg transition-all text-left group ${
                isWatched
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-[#e2e8f0] hover:border-[#8b5cf6]'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div
                  className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 relative ${
                    isWatched
                      ? 'bg-green-100'
                      : 'bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]'
                  }`}
                >
                  {isWatched ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <>
                      <span className="text-2xl">{tutorial.thumbnail_emoji}</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4
                      className={`text-sm font-semibold transition-colors ${
                        isWatched
                          ? 'text-green-700'
                          : 'text-[#1a2b3c] group-hover:text-[#8b5cf6]'
                      }`}
                    >
                      {tutorial.title}
                    </h4>
                    {isWatched && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-shrink-0 ml-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Vu
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#86868B] mb-2 line-clamp-2 leading-relaxed">
                    {tutorial.description}
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-[#86868B]">
                      <Clock className="w-3.5 h-3.5" />
                      {tutorial.duration}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${catInfo.color}`}
                    >
                      {catInfo.label}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-[#86868B] flex-shrink-0 mt-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Video Modal */}
      {playingTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPlayingTutorial(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h4 className="text-sm font-semibold text-[#1a2b3c]">
                {playingTutorial.title}
              </h4>
              <button
                onClick={() => setPlayingTutorial(null)}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#86868B]" />
              </button>
            </div>

            {/* Video placeholder */}
            <div className="relative bg-gradient-to-br from-[#1a2b3c] to-[#334155] aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Video className="w-10 h-10 text-white" />
                </div>
                <p className="text-white text-lg font-medium mb-1">
                  {playingTutorial.title}
                </p>
                <p className="text-white/60 text-sm">
                  Duree : {playingTutorial.duration}
                </p>
                <p className="text-white/40 text-xs mt-3">
                  Placeholder video - YouTube embed a integrer
                </p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm text-[#64748b] leading-relaxed">
                {playingTutorial.description}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default VideoTutorials;
