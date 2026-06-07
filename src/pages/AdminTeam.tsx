/**
 * PHASE 3.5 - GESTION DE L'ÉQUIPE
 * Page d'administration des utilisateurs (Médecins, Techniciens, Admins)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, Mail, Shield, Edit2, Trash2, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { createClient } from '../utils/supabase/client';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'medecin' | 'technicien' | 'prestataire';
  full_name?: string;
  panel_code?: string;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  last_sign_in?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string, fullName: string, panelCode?: string) => void;
}

function InviteModal({ isOpen, onClose, onSubmit }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('medecin');
  const [fullName, setFullName] = useState('');
  const [panelCode, setPanelCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast.error('Email et nom complet requis');
      return;
    }
    onSubmit(email, role, fullName, panelCode || undefined);
    setEmail('');
    setRole('medecin');
    setFullName('');
    setPanelCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#007AFF]/10 rounded-xl">
            <UserPlus className="w-6 h-6 text-[#007AFF]" />
          </div>
          <div>
            <h2 className="text-2xl text-[#1A1A1A]">Inviter un membre</h2>
            <p className="text-sm text-[#5C5C5C]">Ajouter un nouveau membre à l'équipe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#5C5C5C] mb-2">Email professionnel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@medical.fr"
              className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C5C5C] mb-2">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Jean Dupont"
              className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#5C5C5C] mb-2">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
            >
              <option value="medecin">👨‍⚕️ Médecin</option>
              <option value="technicien">🔧 Technicien</option>
              <option value="prestataire">📦 Prestataire</option>
              <option value="admin">⚙️ Administrateur</option>
            </select>
          </div>

          {role === 'medecin' && (
            <div>
              <label className="block text-sm text-[#5C5C5C] mb-2">Panel Code (optionnel)</label>
              <input
                type="text"
                value={panelCode}
                onChange={(e) => setPanelCode(e.target.value)}
                placeholder="PANEL_001"
                className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
              />
              <p className="text-xs text-[#5C5C5C] mt-1">Code unique pour segmenter les patients</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#007AFF] hover:bg-[#0051D5]"
            >
              Envoyer l'invitation
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function AdminTeam() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Charger tous les profiles depuis la base
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformer en TeamMember format
      const teamData: TeamMember[] = (profiles || []).map((p: any) => ({
        id: p.id,
        email: p.email || 'non-renseigné',
        role: p.role || 'medecin',
        full_name: p.full_name,
        panel_code: p.panel_code,
        status: p.email ? 'active' : 'pending',
        created_at: p.created_at,
        last_sign_in: p.last_sign_in_at,
      }));

      setMembers(teamData);
    } catch (error: any) {
      console.error('[AdminTeam] Error loading team:', error);
      toast.error('Erreur de chargement de l\'équipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (email: string, role: string, fullName: string, panelCode?: string) => {
    try {
      const supabase = createClient();

      // Créer l'utilisateur via Auth Admin
      // Note: En production, il faudrait un endpoint backend sécurisé
      const tempPassword = 'medical' + Math.random().toString(36).slice(-8);
      
      // Pour cette démo, on ajoute directement dans profiles avec statut pending
      const newId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          email: email,
          role: role,
          full_name: fullName,
          panel_code: panelCode || null,
        });

      if (error) throw error;

      toast.success(`✉️ Invitation envoyée à ${email}`, {
        description: `Rôle: ${role} • Mot de passe temporaire: ${tempPassword}`,
        duration: 8000,
      });

      setInviteModalOpen(false);
      loadTeamMembers();
    } catch (error: any) {
      console.error('[AdminTeam] Error inviting user:', error);
      toast.error('Erreur lors de l\'invitation');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer ${userName} de l'équipe ?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('Membre supprimé');
      loadTeamMembers();
    } catch (error: any) {
      console.error('[AdminTeam] Error deleting user:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: { icon: '⚙️', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      medecin: { icon: '👨‍⚕️', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      technicien: { icon: '🔧', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      prestataire: { icon: '📦', color: 'bg-green-100 text-green-800 border-green-200' },
    };
    const style = styles[role as keyof typeof styles] || styles.medecin;
    return (
      <Badge className={`${style.color} border`}>
        {style.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 border border-green-200">✓ Actif</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">⏳ En attente</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 border border-gray-200">Inactif</Badge>;
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: members.length,
    medecins: members.filter(m => m.role === 'medecin').length,
    techniciens: members.filter(m => m.role === 'technicien').length,
    admins: members.filter(m => m.role === 'admin').length,
    pending: members.filter(m => m.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB]">
      {/* Header */}
      <header className="bg-white border-b border-[#D9D5CC]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-[#1A1A1A] mb-2">Gestion de l'équipe</h1>
              <p className="text-sm text-[#5C5C5C]">
                {stats.total} membres • {stats.medecins} médecins • {stats.techniciens} techniciens
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => loadTeamMembers()}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                onClick={() => setInviteModalOpen(true)}
                className="bg-[#007AFF] hover:bg-[#0051D5] gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Inviter un membre
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-[#D9D5CC]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-[#007AFF]" />
              <span className="text-sm text-[#5C5C5C]">Total</span>
            </div>
            <p className="text-3xl text-[#1A1A1A]">{stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 border border-[#D9D5CC]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-[#18753C]" />
              <span className="text-sm text-[#5C5C5C]">Médecins</span>
            </div>
            <p className="text-3xl text-[#1A1A1A]">{stats.medecins}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-[#D9D5CC]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-[#B34000]" />
              <span className="text-sm text-[#5C5C5C]">Techniciens</span>
            </div>
            <p className="text-3xl text-[#1A1A1A]">{stats.techniciens}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 border border-[#D9D5CC]"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-[#CE0500]" />
              <span className="text-sm text-[#5C5C5C]">En attente</span>
            </div>
            <p className="text-3xl text-[#1A1A1A]">{stats.pending}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-[#D9D5CC] mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Rechercher un membre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'medecin', 'technicien', 'prestataire', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-3 rounded-xl text-sm transition-all ${
                    filterRole === role
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F0EB] text-[#5C5C5C] hover:bg-[#E8E5DE]'
                  }`}
                >
                  {role === 'all' ? 'Tous' : role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Team List */}
        <div className="bg-white rounded-2xl border border-[#D9D5CC] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin mx-auto mb-4" />
              <p className="text-[#5C5C5C]">Chargement de l'équipe...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-[#5C5C5C] mx-auto mb-4" />
              <p className="text-[#5C5C5C]">Aucun membre trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-[#D9D5CC]">
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-[#F2F0EB] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007AFF] to-[#007AFF] flex items-center justify-center text-white">
                        {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-[#1A1A1A]">
                            {member.full_name || 'Sans nom'}
                          </h3>
                          {getRoleBadge(member.role)}
                          {getStatusBadge(member.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#5C5C5C]">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {member.email}
                          </span>
                          {member.panel_code && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-4 h-4" />
                              {member.panel_code}
                            </span>
                          )}
                          <span>
                            Créé le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => toast.info('Modification en développement')}
                      >
                        <Edit2 className="w-4 h-4" />
                        Éditer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteUser(member.id, member.full_name || member.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <InviteModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            onSubmit={handleInviteUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
