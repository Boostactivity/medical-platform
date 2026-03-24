/**
 * NPS / ENQUETE SATISFACTION
 *
 * Popup apres contact technicien (1-5 etoiles)
 * NPS trimestriel (0-10)
 * Commentaire libre
 * Dashboard admin : NPS global, evolution, verbatims
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, MessageSquare, X, ThumbsUp, ThumbsDown, Send, ChevronDown,
  TrendingUp, BarChart3, Users, Award, Filter, Calendar
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// ---- Types ----

interface SatisfactionRating {
  id: string;
  patientId: string;
  patientName: string;
  type: 'post_contact' | 'nps_trimestriel';
  rating: number; // 1-5 for post_contact, 0-10 for NPS
  comment?: string;
  date: string;
  technicianName?: string;
}

// ---- Mock Data ----

const MOCK_RATINGS: SatisfactionRating[] = [
  { id: 'r1', patientId: 'p1', patientName: 'Jean Dupont', type: 'post_contact', rating: 5, comment: 'Technicien tres professionnel et a l\'ecoute.', date: '2026-03-20', technicianName: 'Marc Lefevre' },
  { id: 'r2', patientId: 'p2', patientName: 'Marie Martin', type: 'post_contact', rating: 4, date: '2026-03-18', technicianName: 'Sophie Durand' },
  { id: 'r3', patientId: 'p3', patientName: 'Pierre Bernard', type: 'nps_trimestriel', rating: 9, comment: 'Excellent suivi global. Application tres pratique.', date: '2026-03-15' },
  { id: 'r4', patientId: 'p4', patientName: 'Paul Durand', type: 'nps_trimestriel', rating: 7, comment: 'Bon service, delai d\'intervention a ameliorer.', date: '2026-03-14' },
  { id: 'r5', patientId: 'p5', patientName: 'Sophie Leroy', type: 'post_contact', rating: 3, comment: 'Attente trop longue avant l\'intervention.', date: '2026-03-12', technicianName: 'Marc Lefevre' },
  { id: 'r6', patientId: 'p6', patientName: 'Claire Petit', type: 'nps_trimestriel', rating: 10, comment: 'Je recommande sans hesitation !', date: '2026-03-10' },
  { id: 'r7', patientId: 'p1', patientName: 'Jean Dupont', type: 'nps_trimestriel', rating: 8, date: '2026-03-08' },
  { id: 'r8', patientId: 'p2', patientName: 'Marie Martin', type: 'post_contact', rating: 5, comment: 'Tout etait parfait, merci !', date: '2026-03-05', technicianName: 'Sophie Durand' },
  { id: 'r9', patientId: 'p3', patientName: 'Pierre Bernard', type: 'post_contact', rating: 4, date: '2026-03-01', technicianName: 'Marc Lefevre' },
  { id: 'r10', patientId: 'p4', patientName: 'Paul Durand', type: 'nps_trimestriel', rating: 6, comment: 'Service correct mais manque de suivi proactif.', date: '2026-02-28' },
  { id: 'r11', patientId: 'p5', patientName: 'Sophie Leroy', type: 'nps_trimestriel', rating: 9, date: '2026-02-20' },
  { id: 'r12', patientId: 'p6', patientName: 'Claire Petit', type: 'post_contact', rating: 5, comment: 'Intervention rapide et efficace.', date: '2026-02-15', technicianName: 'Sophie Durand' },
  { id: 'r13', patientId: 'p1', patientName: 'Jean Dupont', type: 'post_contact', rating: 4, date: '2026-02-10', technicianName: 'Marc Lefevre' },
  { id: 'r14', patientId: 'p2', patientName: 'Marie Martin', type: 'nps_trimestriel', rating: 8, comment: 'Tres satisfaite du service.', date: '2026-02-05' },
  { id: 'r15', patientId: 'p3', patientName: 'Pierre Bernard', type: 'nps_trimestriel', rating: 5, comment: 'Peut mieux faire sur la communication.', date: '2026-01-30' },
];

// ---- Composant Popup Satisfaction Patient ----

export function SatisfactionPopup({
  onClose,
  technicianName,
  type = 'post_contact',
}: {
  onClose: () => void;
  technicianName?: string;
  type?: 'post_contact' | 'nps_trimestriel';
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isNPS = type === 'nps_trimestriel';
  const maxRating = isNPS ? 10 : 5;

  const handleSubmit = async () => {
    if (rating === null) return;
    // Save to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('satisfaction_surveys').insert({
          patient_id: user.id,
          type,
          rating,
          comment: comment || null,
          technician_name: technicianName || null,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('SatisfactionSurvey: Failed to save to Supabase', e);
    }
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          {!submitted ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {isNPS ? 'Votre avis compte' : 'Comment s\'est passe le contact ?'}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {!isNPS && technicianName && (
                <p className="text-sm text-gray-500 mb-4">
                  Intervention de <strong>{technicianName}</strong>
                </p>
              )}

              {isNPS ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Sur une echelle de 0 a 10, recommanderiez-vous notre service a un proche ?
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {Array.from({ length: 11 }, (_, i) => i).map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          rating === n
                            ? n <= 6 ? 'bg-red-500 text-white' : n <= 8 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>Pas du tout probable</span>
                    <span>Tres probable</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Etes-vous satisfait de cette intervention ?
                  </p>
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoveredRating(s)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            s <= (hoveredRating || rating || 0)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Un commentaire ? (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Partagez votre experience..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === null}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Envoyer mon avis
              </button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ThumbsUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Merci pour votre avis !</h3>
              <p className="text-sm text-gray-500">Votre retour nous aide a ameliorer nos services.</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---- Dashboard Admin NPS ----

export function SatisfactionDashboard() {
  const [ratings, setRatings] = useState<SatisfactionRating[]>(MOCK_RATINGS);
  const [typeFilter, setTypeFilter] = useState<'all' | 'post_contact' | 'nps_trimestriel'>('all');

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data, error } = await supabase
          .from('satisfaction_surveys')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data?.length) {
          const mapped: SatisfactionRating[] = data.map((r: any) => ({
            id: r.id,
            patientId: r.patient_id,
            patientName: r.patient_name || 'Patient',
            type: r.type,
            rating: r.rating,
            comment: r.comment,
            date: r.created_at?.split('T')[0] || r.created_at,
            technicianName: r.technician_name,
          }));
          setRatings(mapped);
        }
      } catch (e) {
        console.warn('SatisfactionDashboard: Using mock data', e);
      }
    };
    fetchRatings();
  }, []);

  const filteredRatings = useMemo(() => {
    return ratings.filter(r => typeFilter === 'all' || r.type === typeFilter);
  }, [ratings, typeFilter]);

  // NPS calculation (only NPS type)
  const npsStats = useMemo(() => {
    const npsRatings = ratings.filter(r => r.type === 'nps_trimestriel');
    if (npsRatings.length === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };

    const promoters = npsRatings.filter(r => r.rating >= 9).length;
    const detractors = npsRatings.filter(r => r.rating <= 6).length;
    const passives = npsRatings.length - promoters - detractors;
    const nps = Math.round(((promoters - detractors) / npsRatings.length) * 100);

    return { nps, promoters, passives, detractors, total: npsRatings.length };
  }, [ratings]);

  // Post-contact stats
  const contactStats = useMemo(() => {
    const contactRatings = ratings.filter(r => r.type === 'post_contact');
    if (contactRatings.length === 0) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] };

    const avg = contactRatings.reduce((s, r) => s + r.rating, 0) / contactRatings.length;
    const distribution = [1, 2, 3, 4, 5].map(v => contactRatings.filter(r => r.rating === v).length);

    return { avg: +avg.toFixed(1), total: contactRatings.length, distribution };
  }, [ratings]);

  // Verbatims
  const verbatims = ratings.filter(r => r.comment).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" />
          Satisfaction & NPS
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Suivi de la satisfaction patients et Net Promoter Score
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* NPS Score */}
        <div className={`border rounded-xl p-4 ${
          npsStats.nps >= 50 ? 'bg-green-50 border-green-200' :
          npsStats.nps >= 0 ? 'bg-orange-50 border-orange-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" /> NPS Global
          </div>
          <p className={`text-4xl font-bold ${
            npsStats.nps >= 50 ? 'text-green-700' :
            npsStats.nps >= 0 ? 'text-orange-700' : 'text-red-700'
          }`}>
            {npsStats.nps > 0 ? '+' : ''}{npsStats.nps}
          </p>
          <p className="text-xs text-gray-500 mt-1">sur {npsStats.total} repondants</p>
        </div>

        {/* Satisfaction moyenne */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Star className="w-4 h-4 text-yellow-500" /> Satisfaction post-contact
          </div>
          <div className="flex items-center gap-2">
            <p className="text-4xl font-bold text-yellow-700">{contactStats.avg}</p>
            <span className="text-yellow-600">/5</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{contactStats.total} evaluations</p>
        </div>

        {/* Promoteurs */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
            <ThumbsUp className="w-4 h-4" /> Promoteurs (9-10)
          </div>
          <p className="text-4xl font-bold text-green-700">{npsStats.promoters}</p>
          <p className="text-xs text-gray-500 mt-1">
            {npsStats.total > 0 ? Math.round((npsStats.promoters / npsStats.total) * 100) : 0}% des repondants
          </p>
        </div>

        {/* Detracteurs */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
            <ThumbsDown className="w-4 h-4" /> Detracteurs (0-6)
          </div>
          <p className="text-4xl font-bold text-red-700">{npsStats.detractors}</p>
          <p className="text-xs text-gray-500 mt-1">
            {npsStats.total > 0 ? Math.round((npsStats.detractors / npsStats.total) * 100) : 0}% des repondants
          </p>
        </div>
      </div>

      {/* NPS Distribution bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Repartition NPS</h3>
        <div className="flex h-4 rounded-full overflow-hidden">
          {npsStats.total > 0 ? (
            <>
              <div className="bg-red-400 transition-all" style={{ width: `${(npsStats.detractors / npsStats.total) * 100}%` }} />
              <div className="bg-orange-300 transition-all" style={{ width: `${(npsStats.passives / npsStats.total) * 100}%` }} />
              <div className="bg-green-400 transition-all" style={{ width: `${(npsStats.promoters / npsStats.total) * 100}%` }} />
            </>
          ) : (
            <div className="bg-gray-200 w-full" />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" /> Detracteurs ({npsStats.detractors})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-300 rounded-full" /> Passifs ({npsStats.passives})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> Promoteurs ({npsStats.promoters})</span>
        </div>
      </div>

      {/* Star distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Distribution satisfaction post-contact</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = contactStats.distribution[star - 1];
            const pct = contactStats.total > 0 ? (count / contactStats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium text-gray-600">{star}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-yellow-400 rounded-full h-2.5 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verbatims */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Verbatims recents
          </h3>
          <div className="flex gap-2">
            {(['all', 'post_contact', 'nps_trimestriel'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'all' ? 'Tous' : t === 'post_contact' ? 'Post-contact' : 'NPS'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredRatings.filter(r => r.comment).map(r => (
            <div key={r.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{r.patientName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    r.type === 'post_contact' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {r.type === 'post_contact' ? 'Contact' : 'NPS'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.type === 'post_contact' ? (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${
                      r.rating >= 9 ? 'text-green-600' : r.rating >= 7 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {r.rating}/10
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 italic">"{r.comment}"</p>
              {r.technicianName && (
                <p className="text-xs text-gray-400 mt-1">Technicien : {r.technicianName}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export for convenience
export { SatisfactionDashboard as SatisfactionSurvey };
