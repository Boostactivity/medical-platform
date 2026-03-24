/**
 * BLOG SANTE / FICHES PRATIQUES
 *
 * Liste d'articles avec categories, page de lecture, sidebar articles populaires
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Calendar, User, ArrowLeft, Clock, Tag, TrendingUp,
  Search, ChevronRight, Heart, Share2, Eye
} from 'lucide-react';

// ---- Types ----

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: BlogCategory;
  date: string;
  author: string;
  readTime: number;
  views: number;
  imageColor: string;
}

type BlogCategory = 'comprendre' | 'vivre-ppc' | 'astuces-masque' | 'nutrition-sommeil';

const CATEGORY_CONFIG: Record<BlogCategory, { label: string; color: string; bg: string }> = {
  'comprendre': { label: 'Comprendre l\'apnee', color: 'text-blue-700', bg: 'bg-blue-100' },
  'vivre-ppc': { label: 'Vivre avec la PPC', color: 'text-purple-700', bg: 'bg-purple-100' },
  'astuces-masque': { label: 'Astuces masque', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'nutrition-sommeil': { label: 'Nutrition & sommeil', color: 'text-orange-700', bg: 'bg-orange-100' },
};

// ---- 10 articles pre-ecrits ----

const ARTICLES: BlogArticle[] = [
  {
    id: '1',
    slug: 'quest-ce-que-lapnee-du-sommeil',
    title: 'Qu\'est-ce que l\'apnee du sommeil ?',
    summary: 'Decouvrez les mecanismes de l\'apnee obstructive du sommeil, ses causes et pourquoi elle touche pres de 5% de la population adulte.',
    content: `L'apnee obstructive du sommeil (SAOS) est un trouble respiratoire qui se caracterise par des arrets repetitifs de la respiration pendant le sommeil. Ces pauses, appelees apnees, durent au moins 10 secondes et peuvent survenir des dizaines, voire des centaines de fois par nuit.

## Les mecanismes

Pendant le sommeil, les muscles de la gorge se relachent naturellement. Chez les personnes souffrant d'apnee, ce relachement est trop important et entraine un effondrement des voies aeriennes superieures. L'air ne peut plus passer, la respiration s'arrete.

Le cerveau detecte cette situation et provoque un micro-reveil pour retablir la respiration. Ces micro-reveils fragmentent le sommeil sans que le patient en ait conscience.

## Les facteurs de risque

- **Surpoids et obesite** : le tissu adipeux autour du cou comprime les voies aeriennes
- **Age** : le risque augmente apres 50 ans
- **Sexe masculin** : les hommes sont 2 a 3 fois plus touches
- **Tour de cou superieur a 43 cm** chez l'homme et 40 cm chez la femme
- **Alcool et sedatifs** : ils accentuent le relachement musculaire
- **Tabagisme** : inflammation et oedeme des voies aeriennes

## Les consequences

Sans traitement, l'apnee du sommeil augmente considerablement le risque de :
- Hypertension arterielle
- Maladies cardiovasculaires (AVC, infarctus)
- Diabete de type 2
- Accidents de la route par somnolence
- Depression et troubles cognitifs

Le diagnostic precoce et la prise en charge par PPC permettent de reduire significativement ces risques.`,
    category: 'comprendre',
    date: '2026-03-15',
    author: 'Dr. Sophie Laurent',
    readTime: 6,
    views: 1245,
    imageColor: 'from-blue-400 to-blue-600',
  },
  {
    id: '2',
    slug: 'diagnostic-polysomnographie',
    title: 'Le diagnostic : de la consultation a la polysomnographie',
    summary: 'Parcours complet du diagnostic de l\'apnee du sommeil : questionnaires, oximetrie, polygraphie et polysomnographie expliquees simplement.',
    content: `Le diagnostic de l'apnee du sommeil suit un parcours structure en plusieurs etapes. Comprendre ce parcours aide a mieux s'y preparer.

## Etape 1 : La consultation initiale

Votre medecin traitant ou un specialiste du sommeil vous posera des questions sur :
- Vos habitudes de sommeil et la qualite de vos nuits
- Les ronflements signales par votre entourage
- La somnolence dans la journee (echelle d'Epworth)
- Vos antecedents medicaux et votre hygiene de vie

## Etape 2 : La polygraphie ventilatoire

C'est l'examen le plus courant en premiere intention. Il se realise a domicile avec un petit appareil qui enregistre :
- Le flux nasal (canule nasale)
- Les mouvements thoraciques et abdominaux
- La saturation en oxygene (oxymetre au doigt)
- La position corporelle

## Etape 3 : La polysomnographie

Si la polygraphie n'est pas concluante, une polysomnographie en laboratoire du sommeil peut etre prescrite. Elle ajoute l'electroencephalogramme (EEG) pour analyser les stades du sommeil.

## L'index d'apnees-hypopnees (IAH)

Le resultat principal est l'IAH, qui comptabilise le nombre d'evenements respiratoires par heure :
- **IAH < 5** : normal
- **IAH 5-15** : apnee legere
- **IAH 15-30** : apnee moderee
- **IAH > 30** : apnee severe

Un IAH superieur a 30 ou un IAH entre 15 et 30 avec symptomes justifie la mise sous PPC.`,
    category: 'comprendre',
    date: '2026-03-10',
    author: 'Dr. Marc Benoit',
    readTime: 7,
    views: 980,
    imageColor: 'from-cyan-400 to-blue-500',
  },
  {
    id: '3',
    slug: 'premiers-jours-ppc',
    title: 'Vos premiers jours avec la PPC : guide de survie',
    summary: 'Conseils pratiques pour bien demarrer votre traitement par PPC. Les 7 premiers jours sont cruciaux pour l\'adherence a long terme.',
    content: `Les premiers jours avec votre appareil de PPC sont determinants. Voici un guide jour par jour pour bien demarrer.

## Jour 1 : L'installation

Votre technicien vous a installe l'appareil et ajuste votre masque. Quelques reflexes :
- Placez l'appareil sur une surface stable, a hauteur de votre tete
- Branchez le tuyau sans le plier
- Gardez le mode rampe active (montee progressive de la pression)

## Jours 2-3 : L'adaptation

Il est normal de ressentir :
- Une gene nasale ou de la secheresse
- Une difficulte a trouver le sommeil avec le masque
- Des fuites d'air au niveau du masque

**Astuce** : portez votre masque 30 minutes en journee devant la tele pour vous habituer.

## Jours 4-5 : Les ajustements

Si les fuites persistent, ajustez les sangles. Le masque doit etre serre juste assez pour eviter les fuites, mais pas trop pour ne pas laisser de marques.

## Jours 6-7 : Le premier bilan

Votre prestataire peut deja lire vos donnees a distance :
- Nombre d'heures d'utilisation par nuit
- Taux de fuites
- IAH residuel sous traitement
- Evenements residuels

**Objectif J7** : minimum 4 heures par nuit pour valider le remboursement Securite sociale.

## Les erreurs a eviter

1. Ne pas abandonner apres une mauvaise nuit
2. Ne pas modifier soi-meme la pression
3. Ne pas dormir sans le masque "juste une nuit"
4. Ne pas hesiter a appeler votre prestataire en cas de probleme`,
    category: 'vivre-ppc',
    date: '2026-03-08',
    author: 'Marie Dupuis, IDE',
    readTime: 5,
    views: 2340,
    imageColor: 'from-purple-400 to-purple-600',
  },
  {
    id: '4',
    slug: 'voyager-avec-sa-ppc',
    title: 'Voyager avec sa PPC : avion, hotel, camping',
    summary: 'Tous les conseils pour ne jamais interrompre votre traitement en voyage. Avion, sejour a l\'etranger, camping : on vous dit tout.',
    content: `Voyager avec une PPC est tout a fait possible et ne doit pas vous empecher de partir. Voici tout ce qu'il faut savoir.

## En avion

- La PPC est consideree comme un **dispositif medical** et ne compte pas dans vos bagages cabine
- Gardez-la toujours en cabine (jamais en soute : risque de casse et de temperature)
- Demandez une attestation a votre prestataire pour la compagnie aerienne
- La plupart des appareils modernes sont bivoltage (110-240V) : pas besoin de transformateur

## A l'hotel

- Prevoyez une rallonge electrique au cas ou la prise serait loin du lit
- Demandez de l'eau distillee pour l'humidificateur
- Si vous n'en trouvez pas, une nuit sans humidificateur ne pose pas de probleme

## En camping

Plusieurs solutions existent :
- **Batterie externe** dediee PPC (autonomie 1-2 nuits selon la pression)
- **Adaptateur allume-cigare** 12V pour camping-car
- Certaines PPC de voyage pesent moins de 1 kg

## Check-list voyage

- [ ] Appareil PPC + alimentation
- [ ] Masque + sangles de rechange
- [ ] Tuyau de rechange
- [ ] Adaptateur prise internationale
- [ ] Attestation medicale
- [ ] Carte SD de sauvegarde
- [ ] Lingettes nettoyantes

## Fuseaux horaires

L'appareil s'adapte automatiquement. Essayez de maintenir des horaires de coucher reguliers malgre le decalage.`,
    category: 'vivre-ppc',
    date: '2026-02-28',
    author: 'Thomas Renard, technicien',
    readTime: 6,
    views: 1890,
    imageColor: 'from-indigo-400 to-purple-500',
  },
  {
    id: '5',
    slug: 'choisir-son-masque-ppc',
    title: 'Comment choisir le bon masque PPC ?',
    summary: 'Nasal, facial, narinaire : comparatif complet des types de masques PPC pour trouver celui qui vous convient le mieux.',
    content: `Le choix du masque est crucial pour le confort et l'observance du traitement. Voici un comparatif detaille.

## Les 3 types de masques

### Masque nasal
- Couvre uniquement le nez
- **Avantages** : leger, peu encombrant, bonne vision
- **Inconvenients** : inefficace si vous respirez par la bouche
- **Ideal pour** : les patients qui respirent par le nez, les claustrophobes

### Masque facial (naso-buccal)
- Couvre le nez et la bouche
- **Avantages** : efficace meme si vous ouvrez la bouche
- **Inconvenients** : plus encombrant, risque de fuites plus eleve
- **Ideal pour** : les respirateurs buccaux, les patients avec obstruction nasale

### Masque narinaire (coussinets)
- S'insere dans les narines
- **Avantages** : tres leger, champ de vision total, peu de marques
- **Inconvenients** : peut irriter les narines, efficacite limitee a haute pression
- **Ideal pour** : les patients actifs, ceux qui lisent au lit

## Comment savoir si votre masque est adapte ?

Un masque bien ajuste :
- Ne laisse pas de marques rouges au reveil
- Ne siffle pas (pas de fuites audibles)
- Ne provoque pas de secheresse excessive
- Permet de changer de position sans se deplacer

## Quand changer de masque ?

- Coussinets silicone : tous les 3-6 mois
- Harnais : tous les 6-12 mois
- Structure masque : tous les 12-18 mois

N'hesitez pas a demander un essai d'un autre type si votre masque actuel ne vous convient pas.`,
    category: 'astuces-masque',
    date: '2026-02-20',
    author: 'Dr. Sophie Laurent',
    readTime: 5,
    views: 3120,
    imageColor: 'from-emerald-400 to-emerald-600',
  },
  {
    id: '6',
    slug: 'eviter-fuites-masque',
    title: '5 astuces pour eviter les fuites de masque',
    summary: 'Les fuites sont la premiere cause d\'inconfort avec la PPC. Voici 5 techniques testees pour les eliminer definitivement.',
    content: `Les fuites d'air au niveau du masque perturbent l'efficacite du traitement et votre confort. Voici 5 solutions eprouvees.

## 1. Ajustez les sangles en position allongee

Ne serrez jamais votre masque debout devant le miroir ! La gravite modifie la position du masque une fois allonge. Ajustez toujours vos sangles en position de sommeil.

## 2. Verifiez la taille de votre coussin

Un coussin trop grand ou trop petit provoque inevitablement des fuites. La plupart des fabricants proposent des gabarits de mesure. Demandez a votre technicien de verifier la taille.

## 3. Utilisez une mentonniere

Si votre bouche s'ouvre pendant le sommeil (surtout avec un masque nasal), une mentonniere maintient la machoire fermee et evite les fuites buccales.

## 4. Hydratez votre peau

Une peau seche ou grasse empeche le silicone du masque d'adherer correctement. Nettoyez votre visage a l'eau claire avant le coucher, sans creme hydratante sur la zone de contact.

## 5. Remplacez les pieces usees

Le silicone se deteriore avec le temps et perd son elasticite. Un coussin use de plus de 6 mois ne peut plus assurer une bonne etancheite. Le remplacement regulier est rembourse.

## Bonus : la methode de l'oreiller PPC

Les oreillers speciaux PPC ont des decoups laterales qui evitent au masque d'etre pousse quand vous dormez sur le cote. Un investissement souvent negligee mais tres efficace.`,
    category: 'astuces-masque',
    date: '2026-02-15',
    author: 'Thomas Renard, technicien',
    readTime: 4,
    views: 2750,
    imageColor: 'from-teal-400 to-emerald-500',
  },
  {
    id: '7',
    slug: 'alimentation-sommeil-reparateur',
    title: 'Alimentation et sommeil reparateur : les cles',
    summary: 'Ce que vous mangez influence directement votre sommeil. Decouvrez les aliments allies et les ennemis d\'une bonne nuit.',
    content: `L'alimentation joue un role majeur dans la qualite du sommeil. Pour les patients sous PPC, optimiser son alimentation peut ameliorer significativement l'efficacite du traitement.

## Les aliments allies du sommeil

### Le tryptophane
Cet acide amine est le precurseur de la melatonine (hormone du sommeil). On le trouve dans :
- Les noix et amandes
- La banane
- Le lait tiede
- Le riz complet
- Les graines de courge

### Le magnesium
Il favorise la relaxation musculaire et nerveuse :
- Chocolat noir (70%+)
- Legumineuses
- Epinards et legumes verts
- Eau minerale riche en magnesium

### Les glucides complexes
Consommes au diner, ils facilitent l'endormissement :
- Pates completes
- Patate douce
- Quinoa

## Les ennemis du sommeil

- **Cafeine** : evitez apres 14h (cafe, the, coca, chocolat)
- **Alcool** : malgre l'effet sedatif initial, il fragmente le sommeil et aggrave l'apnee
- **Repas copieux** : finissez de manger 2-3h avant le coucher
- **Aliments epices** : peuvent provoquer des reflux gastriques

## Le lien poids-apnee

Perdre 10% de son poids peut reduire l'IAH de 26% en moyenne. Une alimentation equilibree, associee au traitement PPC, cree un cercle vertueux : meilleur sommeil = moins de fatigue = plus d'energie pour l'activite physique = perte de poids.`,
    category: 'nutrition-sommeil',
    date: '2026-02-10',
    author: 'Camille Moreau, dieteticienne',
    readTime: 6,
    views: 1670,
    imageColor: 'from-orange-400 to-orange-600',
  },
  {
    id: '8',
    slug: 'routine-sommeil-ideale',
    title: 'La routine du soir ideale pour les patients PPC',
    summary: 'Creez une routine du coucher qui optimise votre sommeil et facilite l\'utilisation de la PPC. Programme complet heure par heure.',
    content: `Une routine du soir structuree ameliore l'endormissement et facilite l'acceptation du masque PPC. Voici un programme optimise.

## H-3 : Fin du diner

- Diner leger mais suffisant
- Evitez l'alcool
- Derniere boisson cafeinee avant 14h

## H-2 : Preparation

- Baissez la luminosite de votre logement
- Activez le mode nuit sur vos ecrans
- Activite calme : lecture, musique douce, etirements

## H-1 : Deconnexion

- Arretez tous les ecrans (TV, telephone, tablette)
- Prenez une douche tiede (la baisse de temperature corporelle favorise l'endormissement)
- Preparez vos affaires du lendemain

## H-30min : Preparation PPC

- Nettoyez votre visage a l'eau claire
- Verifiez le niveau d'eau de l'humidificateur
- Branchez votre appareil
- Mettez votre masque et ajustez-le

## H-15min : Relaxation

- Exercices de respiration (coherence cardiaque : 5 secondes inspiration, 5 secondes expiration)
- Allongez-vous et activez le mode rampe de votre PPC
- Laissez-vous porter par la pression progressive

## Conseils complementaires

- **Horaires reguliers** : couchez-vous et levez-vous a la meme heure, meme le week-end
- **Chambre fraiche** : temperature ideale entre 18 et 20 degres
- **Obscurite totale** : investissez dans des rideaux occultants
- **Pas de sieste apres 15h** : cela retarderait votre endormissement

## Suivi

Utilisez votre application patient pour noter la qualite de chaque nuit. En croisant avec vos donnees PPC, vous identifierez rapidement ce qui fonctionne le mieux pour vous.`,
    category: 'nutrition-sommeil',
    date: '2026-02-05',
    author: 'Dr. Marc Benoit',
    readTime: 5,
    views: 1430,
    imageColor: 'from-amber-400 to-orange-500',
  },
  {
    id: '9',
    slug: 'entretien-appareil-ppc',
    title: 'Entretien de votre appareil PPC : le guide complet',
    summary: 'Un appareil bien entretenu dure plus longtemps et fonctionne mieux. Nettoyage quotidien, hebdomadaire et mensuel detailles.',
    content: `Un entretien regulier de votre equipement PPC est essentiel pour l'hygiene et la duree de vie du materiel.

## Nettoyage quotidien

### Le masque
- Demontez le coussin du masque chaque matin
- Lavez-le a l'eau tiede savonneuse (savon doux, pas de produit agressif)
- Rincez abondamment et laissez secher a l'air libre
- Ne jamais exposer le silicone au soleil direct

### L'humidificateur
- Videz l'eau residuelle chaque matin
- Rincez le bac
- Remplissez avec de l'eau distillee le soir

## Nettoyage hebdomadaire

### Le tuyau
- Faites couler de l'eau tiede savonneuse dans le tuyau
- Agitez delicatement
- Rincez abondamment
- Suspendez-le pour le faire secher completement

### Le harnais
- Lavez a la main a l'eau tiede
- Ne pas passer en machine a laver
- Laissez secher a l'air libre

## Nettoyage mensuel

- Verifiez le filtre de l'appareil (remplacez s'il est gris/encrasse)
- Inspectez le tuyau pour detecter des fissures
- Verifiez l'etat du coussin du masque

## Remplacement des consommables

| Piece | Frequence |
|-------|-----------|
| Filtre | 1-3 mois |
| Coussin masque | 3-6 mois |
| Tuyau | 6-12 mois |
| Harnais | 6-12 mois |
| Bac humidificateur | 12 mois |

## Ce qu'il ne faut jamais faire

- Utiliser de l'eau de Javel ou du vinaigre concentre
- Passer les pieces au lave-vaisselle
- Utiliser de l'eau du robinet dans l'humidificateur (calcaire)
- Secher au seche-cheveux (deformation du silicone)`,
    category: 'vivre-ppc',
    date: '2026-01-25',
    author: 'Thomas Renard, technicien',
    readTime: 5,
    views: 2100,
    imageColor: 'from-violet-400 to-purple-500',
  },
  {
    id: '10',
    slug: 'sport-et-apnee-du-sommeil',
    title: 'Sport et apnee du sommeil : quels benefices ?',
    summary: 'L\'activite physique ameliore l\'apnee du sommeil meme sans perte de poids. Decouvrez les sports recommandes et ceux a eviter.',
    content: `L'activite physique est un complement indispensable au traitement par PPC. Les etudes montrent qu'elle reduit l'IAH de 25% en moyenne, independamment de la perte de poids.

## Pourquoi le sport aide

- **Renforce les muscles des voies aeriennes** : les exercices cardio tonifient les muscles du pharynx
- **Ameliore la saturation en oxygene** : meilleure capacite pulmonaire
- **Reduit l'inflammation** : facteur aggravant de l'apnee
- **Favorise un sommeil profond** : plus de phases de sommeil lent profond

## Les sports recommandes

### Endurance (3-5 fois/semaine, 30 min)
- Marche rapide
- Natation
- Velo
- Jogging leger

### Renforcement musculaire (2 fois/semaine)
- Exercices au poids du corps
- Yoga
- Pilates

### Exercices oro-pharynges
Des exercices specifiques de la langue et du palais peuvent reduire l'IAH de 50% dans les cas legers :
- Appuyez la langue contre le palais et faites-la glisser vers l'arriere (20 fois)
- Aspirez la langue contre le palais (20 fois)
- Forcez l'arriere de la langue vers le bas (20 fois)
- Prononcez la voyelle "A" de facon forcee (20 fois)

## Les precautions

- **Evitez le sport intense apres 19h** : il retarde l'endormissement
- **Hydratez-vous** : la deshydratation aggrave les ronflements
- **Commencez progressivement** : surtout si vous etes fatigue par l'apnee non traitee
- **Consultez votre medecin** si vous avez des problemes cardiaques associes

## Resultats attendus

Apres 3 mois de sport regulier + PPC :
- IAH diminue de 25% en moyenne
- Somnolence diurne reduite de 40%
- Qualite de vie amelioree significativement
- Tour de cou potentiellement reduit`,
    category: 'nutrition-sommeil',
    date: '2026-01-20',
    author: 'Dr. Sophie Laurent',
    readTime: 6,
    views: 1550,
    imageColor: 'from-rose-400 to-red-500',
  },
];

// ---- Composant Liste Blog ----

function BlogList() {
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = ARTICLES.filter(a => {
    const matchCategory = selectedCategory === 'all' || a.category === selectedCategory;
    const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const popularArticles = [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-4">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">Blog sante</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground mb-3">
          Fiches pratiques & conseils
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Tout ce que vous devez savoir sur l'apnee du sommeil, le traitement PPC et les bonnes pratiques pour mieux dormir.
        </p>
      </motion.div>

      {/* Search + Categories */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 dark:text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {(Object.entries(CATEGORY_CONFIG) as [BlogCategory, typeof CATEGORY_CONFIG[BlogCategory]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === key ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Articles grid */}
        <div className="lg:col-span-3">
          <div className="grid md:grid-cols-2 gap-6">
            {filteredArticles.map((article, idx) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/blog/${article.slug}`}
                  className="group block bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Image placeholder */}
                  <div className={`h-40 bg-gradient-to-br ${article.imageColor} flex items-center justify-center`}>
                    <BookOpen className="w-12 h-12 text-white/60" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_CONFIG[article.category].bg} ${CATEGORY_CONFIG[article.category].color}`}>
                        {CATEGORY_CONFIG[article.category].label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {article.readTime} min
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{article.summary}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {article.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(article.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun article ne correspond a votre recherche.</p>
            </div>
          )}
        </div>

        {/* Sidebar - Articles populaires */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-secondary border border-gray-200 dark:border-border rounded-xl p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 dark:text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Articles populaires
            </h3>
            <div className="space-y-3">
              {popularArticles.map((article, idx) => (
                <Link
                  key={article.id}
                  to={`/blog/${article.slug}`}
                  className="flex items-start gap-3 group"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors leading-tight">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {article.views.toLocaleString()} vues
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Composant Article ----

function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const article = ARTICLES.find(a => a.slug === slug);
  const popularArticles = [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-4">Article introuvable</h2>
        <p className="text-gray-500 mb-6">Cet article n'existe pas ou a ete supprime.</p>
        <button
          onClick={() => navigate('/blog')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retour au blog
        </button>
      </div>
    );
  }

  const relatedArticles = ARTICLES.filter(a => a.category === article.category && a.id !== article.id).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back */}
            <button
              onClick={() => navigate('/blog')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au blog
            </button>

            {/* Header */}
            <div className={`h-48 md:h-64 bg-gradient-to-br ${article.imageColor} rounded-2xl flex items-center justify-center mb-8`}>
              <BookOpen className="w-16 h-16 text-white/50" />
            </div>

            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_CONFIG[article.category].bg} ${CATEGORY_CONFIG[article.category].color} mb-4`}>
              {CATEGORY_CONFIG[article.category].label}
            </span>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground mb-4">{article.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-200">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.readTime} min de lecture</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {article.views.toLocaleString()} vues</span>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">
              {article.content.split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('## ')) {
                  return <h2 key={idx} className="text-xl font-bold text-gray-900 dark:text-foreground mt-8 mb-3">{paragraph.replace('## ', '')}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={idx} className="text-lg font-semibold text-gray-800 mt-6 mb-2">{paragraph.replace('### ', '')}</h3>;
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('| ')) {
                  return (
                    <div key={idx} className="my-3">
                      {paragraph.split('\n').map((line, lIdx) => {
                        if (line.startsWith('- [ ] ')) {
                          return <div key={lIdx} className="flex items-center gap-2 py-0.5 text-gray-600"><input type="checkbox" disabled className="rounded" /> {line.replace('- [ ] ', '')}</div>;
                        }
                        if (line.startsWith('- ')) {
                          const content = line.replace('- ', '');
                          const boldMatch = content.match(/^\*\*(.*?)\*\*\s*:\s*(.*)/);
                          if (boldMatch) {
                            return <div key={lIdx} className="flex items-start gap-2 py-0.5"><span className="text-blue-500 mt-1.5">&#8226;</span><span className="text-gray-600"><strong className="text-gray-900 dark:text-foreground">{boldMatch[1]}</strong> : {boldMatch[2]}</span></div>;
                          }
                          return <div key={lIdx} className="flex items-start gap-2 py-0.5"><span className="text-blue-500 mt-1.5">&#8226;</span><span className="text-gray-600">{content}</span></div>;
                        }
                        return null;
                      })}
                    </div>
                  );
                }
                // Regular paragraph, handle bold
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={idx} className="text-gray-600 leading-relaxed my-3">
                    {parts.map((part, pIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pIdx} className="text-gray-900 dark:text-foreground">{part.replace(/\*\*/g, '')}</strong>;
                      }
                      return <span key={pIdx}>{part}</span>;
                    })}
                  </p>
                );
              })}
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 dark:text-foreground mb-4">Articles similaires</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {relatedArticles.map(a => (
                    <Link key={a.id} to={`/blog/${a.slug}`} className="group bg-gray-50 dark:bg-secondary border border-gray-200 dark:border-border rounded-xl p-4 hover:shadow-md transition-all">
                      <p className="font-medium text-sm text-gray-900 dark:text-foreground group-hover:text-blue-600 transition-colors mb-1">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.readTime} min - {new Date(a.date).toLocaleDateString('fr-FR')}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-secondary border border-gray-200 dark:border-border rounded-xl p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 dark:text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Articles populaires
            </h3>
            <div className="space-y-3">
              {popularArticles.map((a, idx) => (
                <Link
                  key={a.id}
                  to={`/blog/${a.slug}`}
                  className={`flex items-start gap-3 group ${a.id === article.id ? 'opacity-50' : ''}`}
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors leading-tight">
                    {a.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Exports ----

export function Blog() {
  return <BlogList />;
}

export function BlogArticleView() {
  return <BlogArticlePage />;
}
