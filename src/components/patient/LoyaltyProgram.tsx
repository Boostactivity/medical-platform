/**
 * PROGRAMME FIDELITE
 *
 * Points gagnes : 1 point/nuit observante, bonus badges, bonus streak
 * Catalogue de recompenses, historique des points, barre de progression
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gift, Star, Trophy, Zap, ShoppingBag, Clock, ChevronRight,
  Award, Target, Heart, Crown, Shield, TrendingUp, CheckCircle
} from 'lucide-react';
import { supabase } from '../../supabase/client';

// ---- Types ----

interface LoyaltyBadge {
  id: string;
  name: string;
  description: string;
  icon: typeof Star;
  color: string;
  bg: string;
  earned: boolean;
  earnedDate?: string;
  pointsBonus: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'masque' | 'accessoire' | 'consultation' | 'bien_etre';
  icon: typeof Gift;
  available: boolean;
}

interface PointHistory {
  id: string;
  date: string;
  description: string;
  points: number;
  type: 'earned' | 'spent';
}

// ---- Mock Data ----

const BADGES: LoyaltyBadge[] = [
  { id: 'b1', name: 'Premiere nuit', description: 'Premiere nuit avec la PPC', icon: Moon, color: 'text-blue-600', bg: 'bg-blue-100', earned: true, earnedDate: '2025-12-02', pointsBonus: 10 },
  { id: 'b2', name: 'Semaine complete', description: '7 nuits consecutives observantes', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100', earned: true, earnedDate: '2025-12-09', pointsBonus: 25 },
  { id: 'b3', name: 'Premier mois', description: '30 jours de traitement completes', icon: Award, color: 'text-green-600', bg: 'bg-green-100', earned: true, earnedDate: '2026-01-01', pointsBonus: 50 },
  { id: 'b4', name: 'Regulier', description: '80% d\'observance sur un mois', icon: Target, color: 'text-purple-600', bg: 'bg-purple-100', earned: true, earnedDate: '2026-01-15', pointsBonus: 30 },
  { id: 'b5', name: 'Streaker Bronze', description: '14 nuits consecutives', icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-100', earned: true, earnedDate: '2026-01-20', pointsBonus: 40 },
  { id: 'b6', name: 'Streaker Argent', description: '30 nuits consecutives', icon: Trophy, color: 'text-gray-600', bg: 'bg-gray-200', earned: true, earnedDate: '2026-02-10', pointsBonus: 75 },
  { id: 'b7', name: 'Streaker Or', description: '60 nuits consecutives', icon: Crown, color: 'text-yellow-700', bg: 'bg-yellow-200', earned: false, pointsBonus: 150 },
  { id: 'b8', name: 'Trimestre parfait', description: '90% observance sur 3 mois', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-100', earned: false, pointsBonus: 100 },
  { id: 'b9', name: 'Expert PPC', description: '6 mois de traitement', icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-100', earned: false, pointsBonus: 100 },
  { id: 'b10', name: 'Champion annuel', description: '1 an de traitement avec >70% observance', icon: Heart, color: 'text-red-600', bg: 'bg-red-100', earned: false, pointsBonus: 250 },
];

function Moon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

const REWARDS: Reward[] = [
  { id: 'rw1', name: 'Reduction 10% masque', description: '10% sur votre prochain masque PPC', pointsCost: 200, category: 'masque', icon: ShoppingBag, available: true },
  { id: 'rw2', name: 'Coussinets offerts', description: 'Un jeu de coussinets de remplacement gratuit', pointsCost: 150, category: 'accessoire', icon: Gift, available: true },
  { id: 'rw3', name: 'Oreiller PPC', description: 'Oreiller specialise PPC a prix reduit (-30%)', pointsCost: 300, category: 'accessoire', icon: Gift, available: true },
  { id: 'rw4', name: 'Consultation sommeil offerte', description: 'Teleconsultation gratuite avec un specialiste', pointsCost: 500, category: 'consultation', icon: Heart, available: true },
  { id: 'rw5', name: 'Kit voyage PPC', description: 'Housse de transport + adaptateur voyage', pointsCost: 400, category: 'accessoire', icon: ShoppingBag, available: true },
  { id: 'rw6', name: 'Filtre hypoallergenique', description: 'Pack de 6 filtres premium', pointsCost: 100, category: 'accessoire', icon: Gift, available: true },
  { id: 'rw7', name: 'Seance sophrologie', description: 'Seance de sophrologie du sommeil', pointsCost: 250, category: 'bien_etre', icon: Heart, available: true },
  { id: 'rw8', name: 'Reduction 20% masque', description: '20% sur votre prochain masque PPC', pointsCost: 400, category: 'masque', icon: ShoppingBag, available: true },
];

const MOCK_HISTORY: PointHistory[] = [
  { id: 'h1', date: '2026-03-23', description: 'Nuit observante', points: 1, type: 'earned' },
  { id: 'h2', date: '2026-03-22', description: 'Nuit observante', points: 1, type: 'earned' },
  { id: 'h3', date: '2026-03-21', description: 'Nuit observante + Bonus streak 7j', points: 6, type: 'earned' },
  { id: 'h4', date: '2026-03-20', description: 'Nuit observante', points: 1, type: 'earned' },
  { id: 'h5', date: '2026-03-15', description: 'Coussinets offerts', points: -150, type: 'spent' },
  { id: 'h6', date: '2026-03-14', description: 'Badge "Streaker Argent"', points: 75, type: 'earned' },
  { id: 'h7', date: '2026-03-01', description: 'Nuits observantes x28', points: 28, type: 'earned' },
  { id: 'h8', date: '2026-02-15', description: 'Badge "Regulier"', points: 30, type: 'earned' },
  { id: 'h9', date: '2026-02-01', description: 'Nuits observantes x25', points: 25, type: 'earned' },
  { id: 'h10', date: '2026-01-01', description: 'Badge "Premier mois"', points: 50, type: 'earned' },
];

// ---- Composant Principal ----

export function LoyaltyProgram() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'badges' | 'history'>('overview');
  const [history, setHistory] = useState<PointHistory[]>(MOCK_HISTORY);
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadge[]>(BADGES);

  useEffect(() => {
    const fetchLoyalty = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: transactions, error } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('patient_id', user.id)
          .order('date', { ascending: false });
        if (!error && transactions?.length) {
          const mapped: PointHistory[] = transactions.map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            points: t.points,
            type: t.points >= 0 ? 'earned' as const : 'spent' as const,
          }));
          setHistory(mapped);
        }
      } catch (e) {
        console.warn('LoyaltyProgram: Using mock data', e);
      }
    };
    fetchLoyalty();
  }, []);

  const totalPoints = useMemo(() => {
    return history.reduce((sum, h) => sum + h.points, 0);
  }, [history]);

  const earnedBadges = loyaltyBadges.filter(b => b.earned);
  const nextBadge = loyaltyBadges.find(b => !b.earned);
  const currentStreak = 7; // mock
  const totalObservantNights = 85; // mock

  // Next reward the user can afford
  const nextAffordableReward = REWARDS
    .filter(r => r.available)
    .sort((a, b) => a.pointsCost - b.pointsCost)
    .find(r => r.pointsCost > totalPoints);

  const progressToNextReward = nextAffordableReward
    ? Math.min(100, Math.round((totalPoints / nextAffordableReward.pointsCost) * 100))
    : 100;

  const categoryLabels: Record<Reward['category'], string> = {
    masque: 'Masques',
    accessoire: 'Accessoires',
    consultation: 'Consultations',
    bien_etre: 'Bien-etre',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-6 h-6 text-purple-600" />
          Programme Fidelite
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Gagnez des points chaque nuit et debloquez des recompenses
        </p>
      </div>

      {/* Points overview card */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-purple-200 text-sm">Vos points</p>
            <p className="text-4xl font-bold">{totalPoints}</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Star className="w-8 h-8 text-yellow-300" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Streak actuel</p>
            <p className="text-xl font-bold flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-300" /> {currentStreak}j
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Nuits observantes</p>
            <p className="text-xl font-bold">{totalObservantNights}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Badges</p>
            <p className="text-xl font-bold">{earnedBadges.length}/{loyaltyBadges.length}</p>
          </div>
        </div>

        {/* Progress to next reward */}
        {nextAffordableReward && (
          <div>
            <div className="flex items-center justify-between text-xs text-purple-200 mb-1">
              <span>Prochaine recompense : {nextAffordableReward.name}</span>
              <span>{totalPoints}/{nextAffordableReward.pointsCost} pts</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5">
              <div
                className="bg-yellow-400 rounded-full h-2.5 transition-all"
                style={{ width: `${progressToNextReward}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'overview', label: 'Vue d\'ensemble' },
          { key: 'rewards', label: 'Recompenses' },
          { key: 'badges', label: 'Badges' },
          { key: 'history', label: 'Historique' },
        ] as { key: typeof activeTab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Comment gagner des points */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Comment gagner des points</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <Moon className="w-4 h-4 text-blue-700" />
                  </div>
                  <span className="font-bold text-blue-700">+1 pt</span>
                </div>
                <p className="text-sm text-gray-600">{'Par nuit observante (\u2265 4h)'}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-700" />
                  </div>
                  <span className="font-bold text-yellow-700">+5 pts</span>
                </div>
                <p className="text-sm text-gray-600">Bonus streak 7 nuits consecutives</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-purple-700" />
                  </div>
                  <span className="font-bold text-purple-700">+10-250 pts</span>
                </div>
                <p className="text-sm text-gray-600">Bonus badges debloques</p>
              </div>
            </div>
          </div>

          {/* Recent badges */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Derniers badges</h3>
              <button onClick={() => setActiveTab('badges')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                Voir tous <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {earnedBadges.slice(-4).reverse().map(badge => {
                const Icon = badge.icon;
                return (
                  <div key={badge.id} className={`flex-shrink-0 w-20 text-center`}>
                    <div className={`w-14 h-14 mx-auto rounded-full ${badge.bg} flex items-center justify-center mb-1`}>
                      <Icon className={`w-6 h-6 ${badge.color}`} />
                    </div>
                    <p className="text-xs font-medium text-gray-700 leading-tight">{badge.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next badge progress */}
          {nextBadge && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Prochain badge a debloquer</h3>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center opacity-50`}>
                  {(() => { const Icon = nextBadge.icon; return <Icon className="w-6 h-6 text-gray-400" />; })()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{nextBadge.name}</p>
                  <p className="text-sm text-gray-500">{nextBadge.description}</p>
                  <p className="text-xs text-purple-600 mt-1">+{nextBadge.pointsBonus} points bonus</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== REWARDS ===== */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Echangez vos points contre des recompenses. Vous avez <strong className="text-purple-700">{totalPoints} points</strong>.
          </p>

          {(Object.entries(categoryLabels) as [Reward['category'], string][]).map(([cat, label]) => {
            const catRewards = REWARDS.filter(r => r.category === cat);
            if (catRewards.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="font-semibold text-gray-900 mb-2">{label}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {catRewards.map(reward => {
                    const canAfford = totalPoints >= reward.pointsCost;
                    const Icon = reward.icon;
                    return (
                      <div
                        key={reward.id}
                        className={`border rounded-xl p-4 transition-all ${
                          canAfford ? 'bg-white border-green-200 hover:shadow-md' : 'bg-gray-50 border-gray-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            canAfford ? 'bg-purple-100' : 'bg-gray-200'
                          }`}>
                            <Icon className={`w-5 h-5 ${canAfford ? 'text-purple-600' : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{reward.name}</p>
                            <p className="text-sm text-gray-500">{reward.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-bold text-purple-700">{reward.pointsCost} pts</span>
                              <button
                                disabled={!canAfford}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  canAfford
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {canAfford ? 'Echanger' : `${reward.pointsCost - totalPoints} pts manquants`}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== BADGES ===== */}
      {activeTab === 'badges' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {loyaltyBadges.map(badge => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl p-4 ${
                  badge.earned ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    badge.earned ? badge.bg : 'bg-gray-200'
                  }`}>
                    <Icon className={`w-6 h-6 ${badge.earned ? badge.color : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{badge.name}</p>
                      {badge.earned && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">{badge.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-purple-600 font-medium">+{badge.pointsBonus} pts</span>
                      {badge.earnedDate && (
                        <span className="text-xs text-gray-400">
                          Obtenu le {new Date(badge.earnedDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {history.map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  entry.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {entry.type === 'earned'
                    ? <TrendingUp className="w-4 h-4 text-green-600" />
                    : <ShoppingBag className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.description}</p>
                  <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${
                entry.type === 'earned' ? 'text-green-600' : 'text-red-600'
              }`}>
                {entry.points > 0 ? '+' : ''}{entry.points} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
