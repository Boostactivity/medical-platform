/**
 * COMMUNAUTÉ PATIENT — échanges entre patients du même prestataire,
 * sous pseudonyme, avec modération a priori par l'équipe.
 * Branchée sur /patient/community/* (routes/community.ts, chantier 111).
 *
 * Règles d'audience (50-70 ans) : texte >= 16px partout, ton bienveillant,
 * vouvoiement, aucun emoji, états vides honnêtes.
 * Règles santé : anonymat (pseudonyme), charte visible (pas de conseil
 * médical entre patients), pas de likes ni classements, signalement
 * discret, "publié après validation par votre prestataire".
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  Send,
  Flag,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { api } from '../../utils/api';

interface CommunityProfile {
  id: string;
  pseudonym: string;
  created_at: string;
}

interface PostSummary {
  id: string;
  title: string;
  pseudonym: string;
  reply_count: number;
  created_at: string;
}

interface MyPost {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  reject_reason: string | null;
  created_at: string;
}

interface ThreadPost {
  id: string;
  title: string;
  body: string;
  status: string;
  reject_reason: string | null;
  pseudonym: string;
  is_mine: boolean;
  created_at: string;
}

interface ThreadReply {
  id: string;
  body: string;
  status: string;
  pseudonym: string;
  is_mine: boolean;
  created_at: string;
}

interface Partner {
  id: string;
  name: string;
  url: string;
  description: string | null;
}

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const MY_STATUS_LABELS: Record<MyPost['status'], string> = {
  pending: 'En attente de validation',
  approved: 'Publiée',
  rejected: 'Non publiée',
  removed: 'Retirée',
};

export function Communaute() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  // Première visite : choix du pseudonyme
  const [pseudonymInput, setPseudonymInput] = useState('');
  const [savingPseudonym, setSavingPseudonym] = useState(false);

  // Vue : liste | nouveau post | fil
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ post: ThreadPost; replies: ThreadReply[] } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Signalement (discret) : id du contenu en cours de signalement
  const [reportTarget, setReportTarget] = useState<{ kind: 'post' | 'reply'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [profileRes, postsRes, partnersRes] = await Promise.allSettled([
        api.get('/patient/community/profil'),
        api.get('/patient/community/posts'),
        api.get('/patient/community/partners'),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.profile ?? null);
      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.posts ?? []);
        setMyPosts(postsRes.value.my_posts ?? []);
      } else {
        toast.error('Impossible de charger les discussions');
      }
      if (partnersRes.status === 'fulfilled') setPartners(partnersRes.value.partners ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openThread = async (id: string) => {
    setThreadId(id);
    setShowNewPost(false);
    setThread(null);
    setReplyText('');
    setReportTarget(null);
    setLoadingThread(true);
    try {
      const data = await api.get(`/patient/community/posts/${id}`);
      setThread({ post: data.post, replies: data.replies ?? [] });
    } catch {
      toast.error('Impossible de charger cette discussion');
      setThreadId(null);
    } finally {
      setLoadingThread(false);
    }
  };

  const savePseudonym = async (chosen: string) => {
    setSavingPseudonym(true);
    try {
      const data = await api.post('/patient/community/profil', {
        pseudonym: chosen.trim() || undefined,
      });
      setProfile(data.profile);
      toast.success(`Bienvenue dans la communauté, ${data.profile.pseudonym}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'enregistrer votre pseudonyme');
    } finally {
      setSavingPseudonym(false);
    }
  };

  const publishPost = async () => {
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body || publishing) return;
    setPublishing(true);
    try {
      await api.post('/patient/community/posts', { title, body });
      toast.success('Message envoyé — il sera publié après validation par votre prestataire');
      setNewTitle('');
      setNewBody('');
      setShowNewPost(false);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer votre message');
    } finally {
      setPublishing(false);
    }
  };

  const sendReply = async () => {
    const body = replyText.trim();
    if (!body || !threadId || sendingReply) return;
    setSendingReply(true);
    try {
      const data = await api.post(`/patient/community/posts/${threadId}/reponses`, { body });
      toast.success('Réponse envoyée — elle sera publiée après validation par votre prestataire');
      setReplyText('');
      setThread((prev) =>
        prev
          ? {
              ...prev,
              replies: [
                ...prev.replies,
                { ...data.reply, pseudonym: profile?.pseudonym ?? 'Vous', is_mine: true },
              ],
            }
          : prev,
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer votre réponse');
    } finally {
      setSendingReply(false);
    }
  };

  const sendReport = async () => {
    if (!reportTarget || sendingReport) return;
    const reason = reportReason.trim();
    if (!reason) {
      toast.error('Indiquez la raison de votre signalement');
      return;
    }
    setSendingReport(true);
    try {
      await api.post('/patient/community/signalements', {
        target_kind: reportTarget.kind,
        target_id: reportTarget.id,
        reason,
      });
      toast.success('Signalement transmis à votre prestataire');
      setReportTarget(null);
      setReportReason('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer votre signalement');
    } finally {
      setSendingReport(false);
    }
  };

  // ----------------------------------------------------------------
  // Blocs UI
  // ----------------------------------------------------------------

  const charte = (
    <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5 mb-6">
      <h2 className="text-base font-medium text-[#1A1A1A] mb-2">Notre charte, en trois points</h2>
      <ul className="space-y-1.5 text-base text-[#5C5C5C] leading-relaxed">
        <li>Respect et bienveillance : chacun avance à son rythme.</li>
        <li>Anonymat : vous participez sous pseudonyme, votre nom n'est jamais affiché.</li>
        <li>
          Pas de conseil médical entre patients : votre équipe médicale et votre médecin
          restent vos référents.
        </li>
      </ul>
    </div>
  );

  const reportForm = (kind: 'post' | 'reply', id: string) =>
    reportTarget?.kind === kind && reportTarget.id === id ? (
      <div className="mt-3 bg-[#FAFAF7] border border-[#E5E2DA] rounded-xl p-4">
        <label htmlFor={`report-${id}`} className="block text-base text-[#1A1A1A] mb-2">
          Pourquoi signalez-vous ce message ?
        </label>
        <textarea
          id={`report-${id}`}
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Décrivez en quelques mots ce qui vous semble inapproprié"
          className="w-full px-4 py-3 text-base border border-[#E5E2DA] rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            onClick={() => {
              setReportTarget(null);
              setReportReason('');
            }}
            className="text-base h-10 px-4 rounded-xl"
          >
            Annuler
          </Button>
          <Button
            onClick={sendReport}
            disabled={!reportReason.trim() || sendingReport}
            className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-10 px-4 rounded-xl"
          >
            {sendingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer le signalement'}
          </Button>
        </div>
      </div>
    ) : null;

  const reportButton = (kind: 'post' | 'reply', id: string) => (
    <button
      type="button"
      onClick={() => {
        setReportTarget({ kind, id });
        setReportReason('');
      }}
      className="inline-flex items-center gap-1.5 text-base text-[#5C5C5C] hover:text-[#1A1A1A] transition-colors"
    >
      <Flag className="w-4 h-4" />
      Signaler
    </button>
  );

  const partnersSection = partners.length > 0 && (
    <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5 mt-6">
      <h2 className="text-lg text-[#1A1A1A] mb-1">Associations de patients</h2>
      <p className="text-base text-[#5C5C5C] mb-4 leading-relaxed">
        Des associations reconnues accompagnent les personnes concernées par l'apnée du
        sommeil, en complément de votre équipe de soins.
      </p>
      <ul className="space-y-4">
        {partners.map((p) => (
          <li key={p.id}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base text-[#007AFF] hover:underline"
            >
              {p.name}
              <ExternalLink className="w-4 h-4" />
            </a>
            {p.description && (
              <p className="text-base text-[#5C5C5C] leading-relaxed mt-0.5">{p.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  // ----------------------------------------------------------------
  // Rendu
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5C5C5C]" />
      </div>
    );
  }

  // Première visite : choix du pseudonyme avant de participer
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] text-base">
        <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl sm:text-3xl text-[#1A1A1A] mb-1">La communauté</h1>
          <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
            Échangez avec d'autres patients suivis par votre prestataire, en toute
            discrétion.
          </p>

          {charte}

          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6">
            <h2 className="text-xl text-[#1A1A1A] mb-2">Choisissez votre pseudonyme</h2>
            <p className="text-base text-[#5C5C5C] mb-5 leading-relaxed">
              C'est ce nom que les autres membres verront — jamais votre vrai nom. Vous
              pourrez le modifier plus tard.
            </p>
            <label htmlFor="pseudonym" className="block text-base text-[#1A1A1A] mb-2">
              Votre pseudonyme
            </label>
            <input
              id="pseudonym"
              type="text"
              value={pseudonymInput}
              onChange={(e) => setPseudonymInput(e.target.value)}
              maxLength={30}
              placeholder="Par exemple : Dormeur du Sud"
              className="w-full px-4 py-3 text-base border border-[#E5E2DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Button
                onClick={() => savePseudonym(pseudonymInput)}
                disabled={savingPseudonym || pseudonymInput.trim().length < 3}
                className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-12 px-6 rounded-xl w-full sm:w-auto"
              >
                {savingPseudonym ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rejoindre la communauté'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => savePseudonym('')}
                disabled={savingPseudonym}
                className="text-base h-12 px-6 rounded-xl text-[#5C5C5C] w-full sm:w-auto"
              >
                Me proposer un pseudonyme
              </Button>
            </div>
          </div>

          {partnersSection}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-base">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl text-[#1A1A1A] mb-1">La communauté</h1>
            <p className="text-base text-[#5C5C5C]">
              Vous participez sous le pseudonyme <span className="text-[#1A1A1A]">{profile.pseudonym}</span>
            </p>
          </div>
          {!showNewPost && !threadId && (
            <Button
              onClick={() => {
                setShowNewPost(true);
                setThreadId(null);
                setThread(null);
              }}
              className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-11 px-4 rounded-xl gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nouvelle discussion</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          )}
        </div>

        {charte}

        {/* ---- Nouveau message ---- */}
        {showNewPost ? (
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6">
            <button
              type="button"
              onClick={() => setShowNewPost(false)}
              className="flex items-center gap-2 text-base text-[#007AFF] mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux discussions
            </button>
            <h2 className="text-xl text-[#1A1A1A] mb-2">Nouvelle discussion</h2>
            <p className="text-base text-[#5C5C5C] mb-6 leading-relaxed">
              Partagez une question ou une expérience avec les autres membres. Votre
              message sera publié après validation par votre prestataire.
            </p>
            <label htmlFor="post-title" className="block text-base text-[#1A1A1A] mb-2">
              Titre de votre discussion
            </label>
            <input
              id="post-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={150}
              placeholder="Par exemple : comment vous êtes-vous habitué au masque ?"
              className="w-full px-4 py-3 mb-4 text-base border border-[#E5E2DA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
            />
            <label htmlFor="post-body" className="block text-base text-[#1A1A1A] mb-2">
              Votre message
            </label>
            <textarea
              id="post-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              maxLength={3000}
              rows={6}
              placeholder="Écrivez votre message aux autres membres…"
              className="w-full px-4 py-3 text-base border border-[#E5E2DA] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
            />
            <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
              <p className="text-base text-[#5C5C5C]">
                Votre message sera publié après validation par votre prestataire.
              </p>
              <Button
                onClick={publishPost}
                disabled={!newTitle.trim() || !newBody.trim() || publishing}
                className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-11 px-6 rounded-xl gap-2"
              >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Envoyer
              </Button>
            </div>
          </div>
        ) : threadId ? (
          /* ---- Fil de discussion ---- */
          <div className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-[#E5E2DA]">
              <button
                type="button"
                onClick={() => {
                  setThreadId(null);
                  setThread(null);
                  setReportTarget(null);
                }}
                className="flex items-center gap-2 text-base text-[#007AFF] mb-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour aux discussions
              </button>
              {thread && (
                <>
                  <h2 className="text-xl text-[#1A1A1A]">{thread.post.title}</h2>
                  <p className="text-base text-[#5C5C5C] mt-1">
                    Par {thread.post.is_mine ? 'vous' : thread.post.pseudonym} ·{' '}
                    {formatDateFr(thread.post.created_at)}
                  </p>
                </>
              )}
            </div>

            {loadingThread || !thread ? (
              <div className="flex items-center justify-center py-12 text-[#5C5C5C]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="px-5 sm:px-6 py-5 border-b border-[#E5E2DA]">
                  {thread.post.status === 'pending' && (
                    <div className="inline-flex items-center gap-1.5 text-base text-[#8A6D1A] bg-[#FFF6DD] px-3 py-1 rounded-full mb-3">
                      <Clock className="w-4 h-4" />
                      En attente de validation
                    </div>
                  )}
                  {thread.post.status === 'rejected' && (
                    <div className="text-base text-[#8A3B2E] bg-[#FBEDEA] px-4 py-3 rounded-xl mb-3 leading-relaxed">
                      Ce message n'a pas été publié par votre prestataire
                      {thread.post.reject_reason ? ` : ${thread.post.reject_reason}` : '.'}
                    </div>
                  )}
                  <p className="text-base text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
                    {thread.post.body}
                  </p>
                  {!thread.post.is_mine && thread.post.status === 'approved' && (
                    <div className="mt-3">{reportButton('post', thread.post.id)}</div>
                  )}
                  {reportForm('post', thread.post.id)}
                </div>

                {/* Réponses */}
                <div className="px-5 sm:px-6 py-5 space-y-5">
                  {thread.replies.length === 0 ? (
                    <p className="text-base text-[#5C5C5C] leading-relaxed">
                      Pas encore de réponse. Soyez la première personne à répondre.
                    </p>
                  ) : (
                    thread.replies.map((reply) => (
                      <div key={reply.id} className="bg-[#FAFAF7] rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                          <p className="text-base font-medium text-[#1A1A1A]">
                            {reply.is_mine ? 'Vous' : reply.pseudonym}
                            <span className="font-normal text-[#5C5C5C]">
                              {' '}· {formatDateFr(reply.created_at)}
                            </span>
                          </p>
                          {reply.is_mine && reply.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-[#8A6D1A] bg-[#FFF6DD] px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5" />
                              En attente de validation
                            </span>
                          )}
                        </div>
                        <p className="text-base text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
                          {reply.body}
                        </p>
                        {!reply.is_mine && reply.status === 'approved' && (
                          <div className="mt-2">{reportButton('reply', reply.id)}</div>
                        )}
                        {reportForm('reply', reply.id)}
                      </div>
                    ))
                  )}
                </div>

                {/* Répondre (seulement sur discussion publiée) */}
                {thread.post.status === 'approved' && (
                  <div className="p-4 sm:p-5 border-t border-[#E5E2DA] bg-[#FAFAF7]">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={2000}
                        rows={2}
                        placeholder="Écrivez votre réponse aux autres membres…"
                        className="flex-1 px-4 py-3 text-base border border-[#E5E2DA] rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      />
                      <Button
                        onClick={sendReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-base h-12 px-5 rounded-xl gap-2 shrink-0"
                      >
                        {sendingReply ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                        <span className="hidden sm:inline">Répondre</span>
                      </Button>
                    </div>
                    <p className="text-base text-[#5C5C5C] mt-2">
                      Votre message sera publié après validation par votre prestataire.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ---- Liste des discussions ---- */
          <>
            {/* Mes messages en attente / non publiés */}
            {myPosts.some((p) => p.status !== 'approved') && (
              <div className="bg-white rounded-2xl border border-[#E5E2DA] p-5 mb-6">
                <h2 className="text-lg text-[#1A1A1A] mb-3">Vos messages</h2>
                <ul className="space-y-3">
                  {myPosts
                    .filter((p) => p.status !== 'approved')
                    .map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => openThread(p.id)}
                          className="w-full text-left flex items-start justify-between gap-3 flex-wrap hover:opacity-80 transition-opacity"
                        >
                          <span className="text-base text-[#1A1A1A]">{p.title}</span>
                          {p.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-[#8A6D1A] bg-[#FFF6DD] px-2.5 py-0.5 rounded-full shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              En attente de validation
                            </span>
                          ) : (
                            <span className="text-sm text-[#5C5C5C] bg-[#F2F0EB] px-2.5 py-0.5 rounded-full shrink-0">
                              {MY_STATUS_LABELS[p.status]}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Discussions publiées */}
            <div className="bg-white rounded-2xl border border-[#E5E2DA] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E2DA]">
                <h2 className="text-lg text-[#1A1A1A]">Discussions</h2>
              </div>
              {posts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Users className="w-12 h-12 text-[#5C5C5C] opacity-30 mx-auto mb-4" />
                  <p className="text-base text-[#5C5C5C] leading-relaxed max-w-md mx-auto">
                    Aucune discussion publiée pour le moment. Lancez la première : votre
                    message sera publié après validation par votre prestataire.
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openThread(post.id)}
                    className="w-full text-left px-5 py-4 border-b border-[#E5E2DA] last:border-b-0 hover:bg-[#FAFAF7] transition-colors"
                  >
                    <p className="text-base text-[#1A1A1A] mb-1">{post.title}</p>
                    <p className="text-base text-[#5C5C5C]">
                      Par {post.pseudonym} · {formatDateFr(post.created_at)} ·{' '}
                      {post.reply_count === 0
                        ? 'pas encore de réponse'
                        : post.reply_count === 1
                          ? '1 réponse'
                          : `${post.reply_count} réponses`}
                    </p>
                  </button>
                ))
              )}
            </div>

            {partnersSection}
          </>
        )}
      </div>
    </div>
  );
}
