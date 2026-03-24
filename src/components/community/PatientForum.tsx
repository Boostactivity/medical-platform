import React, { useState, useMemo } from 'react';

// Types
interface ForumPost {
  id: string;
  category: ForumCategory;
  title: string;
  content: string;
  author: string; // pseudonyme anonyme
  createdAt: string;
  likes: number;
  repliesCount: number;
  isLiked: boolean;
  isPinned: boolean;
}

interface ForumReply {
  id: string;
  postId: string;
  content: string;
  author: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  isModerator: boolean;
}

type ForumCategory = 'premiers-jours' | 'astuces-masque' | 'motivation' | 'questions-techniques';

const CATEGORIES: { id: ForumCategory; label: string; icon: string; color: string }[] = [
  { id: 'premiers-jours', label: 'Premiers jours', icon: '\uD83C\uDF31', color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  { id: 'astuces-masque', label: 'Astuces masque', icon: '\uD83D\uDCA1', color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' },
  { id: 'motivation', label: 'Motivation', icon: '\uD83D\uDCAA', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  { id: 'questions-techniques', label: 'Questions techniques', icon: '\uD83D\uDD27', color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' },
];

// Donnees de demonstration
const MOCK_POSTS: ForumPost[] = [
  {
    id: '1', category: 'premiers-jours', title: 'Ma premiere semaine avec la PPC - courage !',
    content: "Bonjour a tous, je viens de commencer la PPC il y a 5 jours. Les 2 premieres nuits etaient difficiles mais ca s'ameliore. Quelqu'un a des conseils pour s'habituer plus vite ?",
    author: 'Dormeur42', createdAt: '2026-03-22T10:30:00', likes: 12, repliesCount: 8, isLiked: false, isPinned: true,
  },
  {
    id: '2', category: 'astuces-masque', title: 'Astuce anti-fuites avec masque nasal',
    content: "Apres 3 mois d'essais, j'ai enfin trouve la bonne position pour mon masque nasal. L'astuce : serrez d'abord les sangles du haut, puis ajustez le bas. Et un peu de creme hydratante sur l'arete du nez avant de dormir fait des miracles !",
    author: 'NuitPaisible', createdAt: '2026-03-21T22:15:00', likes: 25, repliesCount: 14, isLiked: true, isPinned: false,
  },
  {
    id: '3', category: 'motivation', title: '6 mois de PPC : mon bilan',
    content: "Ca fait 6 mois que je porte ma PPC chaque nuit (moyenne 6h30). Mon IAH est passe de 42 a 3. Je ne m'endors plus au volant, mon humeur est bien meilleure, et ma femme me dit que je ne ronfle plus du tout. Accrochez-vous, ca vaut vraiment le coup !",
    author: 'Phoenix_Sommeil', createdAt: '2026-03-20T18:00:00', likes: 47, repliesCount: 22, isLiked: false, isPinned: true,
  },
  {
    id: '4', category: 'questions-techniques', title: 'Pression auto vs fixe ?',
    content: "Mon medecin m'a mis en pression automatique (6-14 cmH2O). Est-ce mieux que la pression fixe ? Certains disent que l'auto les reveille quand la pression monte...",
    author: 'CurieuSommeil', createdAt: '2026-03-19T14:45:00', likes: 8, repliesCount: 11, isLiked: false, isPinned: false,
  },
  {
    id: '5', category: 'astuces-masque', title: 'Masque facial vs narinaire - mon experience',
    content: "J'ai teste les 3 types de masques en 2 mois. Le narinaire est le plus discret mais ne convient pas si vous respirez par la bouche. Le facial est le plus efficace pour moi car j'ai tendance a ouvrir la bouche la nuit.",
    author: 'TesteurPPC', createdAt: '2026-03-18T09:20:00', likes: 19, repliesCount: 16, isLiked: false, isPinned: false,
  },
];

const MOCK_REPLIES: ForumReply[] = [
  { id: 'r1', postId: '1', content: "Courage ! Les 10 premiers jours sont les plus durs. Apres, on ne peut plus s'en passer. Essayez de porter le masque 30 min avant de dormir en regardant la tele pour vous habituer.", author: 'VeteranPPC', createdAt: '2026-03-22T12:00:00', likes: 5, isLiked: false, isModerator: false },
  { id: 'r2', postId: '1', content: "Bienvenue ! N'hesitez pas a appeler votre prestataire si vous avez des fuites. Ils peuvent ajuster le masque gratuitement.", author: 'EquipeSoins', createdAt: '2026-03-22T14:30:00', likes: 8, isLiked: false, isModerator: true },
  { id: 'r3', postId: '1', content: "Pareil pour moi au debut. Maintenant apres 4 mois je dors comme un bebe. La difference d'energie est incroyable.", author: 'BienDormir33', createdAt: '2026-03-22T16:00:00', likes: 3, isLiked: false, isModerator: false },
];

export function PatientForum() {
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [replies] = useState(MOCK_REPLIES);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<ForumCategory>('premiers-jours');

  const filteredPosts = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? posts
      : posts.filter(p => p.category === selectedCategory);
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, selectedCategory]);

  const postReplies = useMemo(() =>
    selectedPost ? replies.filter(r => r.postId === selectedPost.id) : [],
    [selectedPost, replies]
  );

  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      category: newPostCategory,
      title: newPostTitle,
      content: newPostContent,
      author: 'MonPseudo',
      createdAt: new Date().toISOString(),
      likes: 0,
      repliesCount: 0,
      isLiked: false,
      isPinned: false,
    };
    setPosts(prev => [newPost, ...prev]);
    setNewPostTitle('');
    setNewPostContent('');
    setShowNewPost(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 1) return "A l'instant";
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Vue detail d'un post
  if (selectedPost) {
    const cat = CATEGORIES.find(c => c.id === selectedPost.category)!;
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour au forum
        </button>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
            {selectedPost.isPinned && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Epingle</span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{selectedPost.title}</h3>
          <p className="text-foreground/80 leading-relaxed">{selectedPost.content}</p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedPost.author}</span>
              <span>{formatDate(selectedPost.createdAt)}</span>
            </div>
            <button
              onClick={() => handleLikePost(selectedPost.id)}
              className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full transition-colors ${
                selectedPost.isLiked
                  ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <svg className="w-4 h-4" fill={selectedPost.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {selectedPost.likes}
            </button>
          </div>
        </div>

        {/* Reponses */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">{postReplies.length} reponse{postReplies.length !== 1 ? 's' : ''}</h4>
          {postReplies.map(reply => (
            <div key={reply.id} className={`bg-card rounded-xl border p-4 shadow-sm ${
              reply.isModerator ? 'border-primary/30 bg-primary/5' : 'border-border'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">{reply.author}</span>
                {reply.isModerator && (
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Moderateur</span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground/80">{reply.content}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <svg className="w-3 h-3" fill={reply.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {reply.likes}
              </div>
            </div>
          ))}
        </div>

        {/* Zone de reponse */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <textarea
            placeholder="Ecrire une reponse..."
            className="w-full bg-muted/50 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground
              border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">Votre reponse est anonyme</p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Repondre
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vue liste
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Communaute patients</h3>
              <p className="text-sm text-muted-foreground">Echangez anonymement avec d'autres patients PPC</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Nouveau post
          </button>
        </div>
      </div>

      {/* Nouveau post */}
      {showNewPost && (
        <div className="bg-card rounded-2xl border border-primary/30 p-6 shadow-sm space-y-4">
          <h4 className="font-semibold text-foreground">Creer un nouveau post</h4>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Categorie</label>
            <select
              value={newPostCategory}
              onChange={(e) => setNewPostCategory(e.target.value as ForumCategory)}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Titre</label>
            <input
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="Titre de votre post..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Message</label>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Partagez votre experience..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              rows={4}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Publication anonyme - aucune donnee medicale partagee</p>
            <div className="flex gap-2">
              <button onClick={() => setShowNewPost(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Annuler
              </button>
              <button onClick={handleCreatePost}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tous ({posts.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = posts.filter(p => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {filteredPosts.map(post => {
          const cat = CATEGORIES.find(c => c.id === post.category)!;
          return (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 shadow-sm
                hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}>
                  {cat.icon} {cat.label}
                </span>
                {post.isPinned && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Epingle</span>
                )}
              </div>
              <h4 className="font-medium text-foreground mb-1">{post.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{post.author}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill={post.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.repliesCount}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Ce forum est modere par votre prestataire. Aucune donnee medicale personnelle n'est partagee.
      </p>
    </div>
  );
}

export default PatientForum;
