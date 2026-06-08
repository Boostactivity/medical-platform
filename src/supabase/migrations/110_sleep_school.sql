-- ============================================================
-- 110 — SLEEP SCHOOL (éducation thérapeutique structurée)
--
-- Parcours pédagogique pour les patients appareillés PPC :
--   1. education_modules : modules de cours. tenant_id NULLABLE —
--      NULL = contenu plateforme partagé par TOUS les tenants,
--      sinon contenu custom du PSAD (tenant).
--   2. education_lessons : leçons d'un module. body_md = markdown
--      simple (titres ##, listes -, paragraphes). video_url existe
--      mais reste NULL tant que les vidéos n'existent pas.
--   3. education_quiz_questions : 1-2 questions par leçon,
--      options JSONB ["a","b","c"], correct_index, explanation
--      bienveillante (jamais culpabilisante).
--   4. patient_education_progress : progression du patient,
--      UNIQUE(patient_id, lesson_id), quiz_score = % de bonnes
--      réponses (0-100), NULL si la leçon n'a pas de quiz.
--
-- RÈGLE CONTENU (seed) : factuel et générique uniquement —
-- hygiène du masque, habitudes de sommeil, rôle de la PPC,
-- entretien, voyage. AUCUNE allégation thérapeutique chiffrée,
-- AUCUN conseil médical individualisé ("parlez-en à votre médecin").
--
-- Défensive : IF NOT EXISTS partout, FK logique (UUID sans
-- contrainte) vers patients(id) comme 104/108 — rejouable.
-- Multi-tenant : pattern 100/101/108. Les Edge Functions écrivent
-- en service_role (bypass RLS) et scopent tenant explicitement ;
-- les policies protègent l'accès direct PostgREST côté client.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Pré-requis (présents via 100/108 — défensif)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. MODULES — education_modules
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.education_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = contenu plateforme partagé ; sinon contenu custom du PSAD
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS education_modules_tenant_order_idx
  ON public.education_modules (tenant_id, display_order);

DROP TRIGGER IF EXISTS education_modules_touch ON public.education_modules;
CREATE TRIGGER education_modules_touch
  BEFORE UPDATE ON public.education_modules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. LEÇONS — education_lessons
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.education_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.education_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body_md TEXT NOT NULL,                  -- markdown simple (##, -, paragraphes)
  video_url TEXT,                         -- prévu, reste NULL (pas encore de vidéos)
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS education_lessons_module_order_idx
  ON public.education_lessons (module_id, display_order);

DROP TRIGGER IF EXISTS education_lessons_touch ON public.education_lessons;
CREATE TRIGGER education_lessons_touch
  BEFORE UPDATE ON public.education_lessons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. QUESTIONS DE QUIZ — education_quiz_questions
--    options : JSONB, tableau de libellés ["a","b","c"]
--    correct_index : index (base 0) de la bonne réponse
--    explanation : explication bienveillante, affichée après réponse
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.education_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0),
  explanation TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS education_quiz_questions_lesson_idx
  ON public.education_quiz_questions (lesson_id, display_order);

-- ------------------------------------------------------------
-- 4. PROGRESSION PATIENT — patient_education_progress
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patient_id UUID NOT NULL,               -- FK logique vers patients(id)
  lesson_id UUID NOT NULL REFERENCES public.education_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quiz_score INTEGER CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  UNIQUE (patient_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS patient_education_progress_tenant_idx
  ON public.patient_education_progress (tenant_id, lesson_id);
CREATE INDEX IF NOT EXISTS patient_education_progress_patient_idx
  ON public.patient_education_progress (patient_id);

-- ------------------------------------------------------------
-- 5. RLS
--    - modules / leçons / questions PUBLIÉS : lisibles par tout
--      utilisateur authentifié si contenu plateforme (tenant_id NULL)
--      OU contenu de SON tenant (current_tenant_id()).
--    - contenu custom : géré par le staff (admin/prestataire) de
--      son tenant uniquement (le contenu plateforme NULL n'est pas
--      modifiable côté client).
--    - progress : tenant RESTRICTIVE + patient own + staff tenant.
-- ------------------------------------------------------------

ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_education_progress ENABLE ROW LEVEL SECURITY;

-- Modules publiés : plateforme (NULL) ou tenant courant
DROP POLICY IF EXISTS published_readable ON public.education_modules;
CREATE POLICY published_readable ON public.education_modules
  FOR SELECT TO authenticated
  USING (
    published = true
    AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id())
  );

-- Leçons publiées d'un module publié visible
DROP POLICY IF EXISTS published_readable ON public.education_lessons;
CREATE POLICY published_readable ON public.education_lessons
  FOR SELECT TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.education_modules m
      WHERE m.id = education_lessons.module_id
        AND m.published = true
        AND (m.tenant_id IS NULL OR m.tenant_id = public.current_tenant_id())
    )
  );

-- Questions d'une leçon visible
DROP POLICY IF EXISTS published_readable ON public.education_quiz_questions;
CREATE POLICY published_readable ON public.education_quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.education_lessons l
      JOIN public.education_modules m ON m.id = l.module_id
      WHERE l.id = education_quiz_questions.lesson_id
        AND l.published = true
        AND m.published = true
        AND (m.tenant_id IS NULL OR m.tenant_id = public.current_tenant_id())
    )
  );

-- Staff : gestion du contenu custom de SON tenant (jamais le contenu NULL)
DROP POLICY IF EXISTS staff_manage ON public.education_modules;
CREATE POLICY staff_manage ON public.education_modules
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

DROP POLICY IF EXISTS staff_manage ON public.education_lessons;
CREATE POLICY staff_manage ON public.education_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.education_modules m
      WHERE m.id = education_lessons.module_id
        AND m.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.education_modules m
      WHERE m.id = education_lessons.module_id
        AND m.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

DROP POLICY IF EXISTS staff_manage ON public.education_quiz_questions;
CREATE POLICY staff_manage ON public.education_quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.education_lessons l
      JOIN public.education_modules m ON m.id = l.module_id
      WHERE l.id = education_quiz_questions.lesson_id
        AND m.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.education_lessons l
      JOIN public.education_modules m ON m.id = l.module_id
      WHERE l.id = education_quiz_questions.lesson_id
        AND m.tenant_id = public.current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

-- Progress : étanchéité tenant (RESTRICTIVE, pattern 101/108)
DROP POLICY IF EXISTS tenant_isolation ON public.patient_education_progress;
CREATE POLICY tenant_isolation ON public.patient_education_progress
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Le patient lit/écrit uniquement SA progression (via patients.user_id)
DROP POLICY IF EXISTS patient_own_progress ON public.patient_education_progress;
CREATE POLICY patient_own_progress ON public.patient_education_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_education_progress.patient_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_education_progress.patient_id AND p.user_id = auth.uid()
    )
  );

-- Staff : lecture de la progression des patients du tenant
DROP POLICY IF EXISTS staff_manage ON public.patient_education_progress;
CREATE POLICY staff_manage ON public.patient_education_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'prestataire')
    )
  );

-- ============================================================
-- 6. SEED — CONTENU PLATEFORME (tenant_id NULL, partagé)
--    UUID fixes → rejouable via ON CONFLICT (id) DO NOTHING.
--    Contenu factuel et générique uniquement (règle en tête de
--    fichier). video_url volontairement NULL partout.
-- ============================================================

-- ---- Modules ------------------------------------------------

INSERT INTO public.education_modules (id, tenant_id, title, description, display_order, published)
VALUES
  (
    'a1100000-0000-4000-a000-000000000001', NULL,
    'Bien démarrer avec votre PPC',
    'Comprendre votre appareil, traverser les premières nuits sereinement et trouver des réponses aux questions que tout le monde se pose.',
    1, true
  ),
  (
    'a1100000-0000-4000-a000-000000000002', NULL,
    'Votre masque au quotidien',
    'Bien ajuster votre masque, le garder propre et savoir quand demander son remplacement.',
    2, true
  ),
  (
    'a1100000-0000-4000-a000-000000000003', NULL,
    'Mieux dormir',
    'Des habitudes simples pour de meilleures nuits, et tout ce qu''il faut savoir pour voyager avec votre appareil.',
    3, true
  )
ON CONFLICT (id) DO NOTHING;

-- ---- Module 1 : Bien démarrer avec votre PPC -----------------

INSERT INTO public.education_lessons (id, module_id, title, body_md, video_url, display_order, published)
VALUES
(
  'b1100000-0000-4000-a000-000000000101',
  'a1100000-0000-4000-a000-000000000001',
  'À quoi sert votre appareil',
  $md$## Pourquoi ce traitement

Pendant votre sommeil, votre gorge se relâche et peut se fermer par moments. La respiration s'arrête alors quelques instants, puis reprend. C'est ce qu'on appelle l'apnée du sommeil. Ces pauses fatiguent le corps, souvent sans que vous vous en rendiez compte.

## Ce que fait l'appareil

Votre appareil de PPC (pression positive continue) envoie de l'air dans votre masque, avec une légère pression. Cet air garde votre gorge ouverte pendant la nuit. Votre respiration reste alors régulière.

Quelques points simples à retenir :

- L'appareil utilise l'air de la pièce, qu'il filtre. Ce n'est pas de l'oxygène.
- La pression est réglée pour vous par votre prestataire, sur prescription de votre médecin. Vous n'avez rien à régler vous-même.
- L'appareil agit chaque nuit où vous l'utilisez. Il ne guérit pas l'apnée : si vous arrêtez, les pauses respiratoires reviennent.

## Et au quotidien

Beaucoup de personnes disent retrouver des nuits plus reposantes avec le temps. Chacun avance à son rythme : certains se sentent mieux rapidement, d'autres ont besoin de plusieurs semaines. Les deux situations sont normales.

Si vous avez des questions sur votre traitement ou si vous ne ressentez pas de changement, parlez-en à votre médecin ou à votre prestataire. Ils sont là pour ça.$md$,
  NULL, 1, true
),
(
  'b1100000-0000-4000-a000-000000000102',
  'a1100000-0000-4000-a000-000000000001',
  'Les premières nuits',
  $md$## S'habituer en douceur

Dormir avec un masque, c'est nouveau. Il est normal d'avoir besoin d'un temps d'adaptation. Personne ne réussit parfaitement dès la première nuit, et ce n'est pas grave.

Quelques idées qui aident souvent :

- Portez le masque quelques minutes en journée, appareil éteint, par exemple en lisant ou devant la télévision. Votre visage s'y habitue tranquillement.
- Mettez ensuite l'appareil en marche quelques minutes avant de dormir, pour vous habituer à la sensation de l'air.
- Installez l'appareil sur votre table de nuit, bien à plat, et laissez la tubulure libre pour pouvoir bouger.

## Si la nuit ne se passe pas comme prévu

Il arrive de retirer le masque pendant la nuit sans s'en rendre compte, surtout au début. C'est fréquent et ce n'est pas un échec. Si vous vous réveillez sans masque, remettez-le simplement si vous le pouvez.

Si une gêne revient souvent (air trop fort, masque inconfortable, nez sec), notez ce qui vous dérange et appelez votre prestataire. Il existe presque toujours une solution simple : un réglage, un autre masque, un humidificateur.

## L'essentiel

L'important n'est pas d'être parfait, c'est d'essayer chaque nuit. Et si vous traversez une période difficile, dites-le : votre prestataire et votre médecin peuvent vous aider.$md$,
  NULL, 2, true
),
(
  'b1100000-0000-4000-a000-000000000103',
  'a1100000-0000-4000-a000-000000000001',
  'Questions fréquentes',
  $md$## L'appareil fait-il du bruit ?

Les appareils récents sont discrets. Un léger souffle est normal. Si le bruit devient inhabituel (sifflement, claquement), vérifiez que la tubulure et le masque sont bien branchés, puis appelez votre prestataire si cela continue.

## Que se passe-t-il en cas de coupure de courant ?

L'appareil s'arrête, tout simplement. Vous continuez à respirer l'air de la pièce à travers le masque, qui est prévu pour cela. Si vous êtes gêné, retirez le masque et rendormez-vous. Remettez l'appareil en marche quand le courant revient.

## Puis-je bouger pendant la nuit ?

Oui. Vous pouvez dormir sur le dos ou sur le côté. Laissez assez de longueur à la tubulure pour bouger sans tirer dessus. Si la position sur le côté gêne votre masque, parlez-en à votre prestataire : certains modèles conviennent mieux.

## J'ai le nez sec ou bouché au réveil

C'est une gêne courante, surtout au début ou en hiver. Un humidificateur aide souvent : parlez-en à votre prestataire. Si la gêne persiste, parlez-en à votre médecin.

## Qui appeler en cas de problème ?

- Pour le matériel (masque, appareil, tubulure, bruit, fuite) : votre prestataire.
- Pour votre santé ou votre traitement (fatigue, doutes, effets gênants) : votre médecin.$md$,
  NULL, 3, true
),

-- ---- Module 2 : Votre masque au quotidien --------------------

(
  'b1100000-0000-4000-a000-000000000201',
  'a1100000-0000-4000-a000-000000000002',
  'Bien ajuster votre masque',
  $md$## Ni trop serré, ni trop lâche

Un masque bien ajusté tient en place sans appuyer fort sur le visage.

- Ajustez votre masque en position allongée, comme pour dormir : le visage change un peu de forme quand on est couché.
- Le masque doit tenir sans laisser de marques rouges profondes au réveil. Des marques marquées veulent dire qu'il est trop serré.
- Réglez les sangles de façon égale des deux côtés.

## En cas de fuite d'air

Si l'air s'échappe sur les côtés ou vers les yeux, le réflexe naturel est de serrer plus fort. Souvent, ce n'est pas la bonne solution.

- Écartez doucement le masque du visage puis reposez-le : la partie souple (la bulle) se replace souvent mieux.
- Vérifiez que rien ne passe sous la bulle, comme des cheveux ou une sangle.
- Si la fuite revient toutes les nuits, votre masque n'est peut-être plus à la bonne taille ou commence à s'user : contactez votre prestataire.

## Le bon masque pour vous

Il existe plusieurs formes (nasal, narinaire, facial) et plusieurs tailles. Si votre masque vous gêne malgré les réglages, demandez à votre prestataire d'essayer un autre modèle. Trouver le bon masque peut demander plusieurs essais : c'est tout à fait normal.$md$,
  NULL, 1, true
),
(
  'b1100000-0000-4000-a000-000000000202',
  'a1100000-0000-4000-a000-000000000002',
  'Nettoyer votre masque',
  $md$## Pourquoi nettoyer

La peau dépose chaque nuit un peu de gras sur le masque. Un masque propre tient mieux en place, fuit moins et reste agréable à porter.

## Les bons gestes

- Chaque matin, si possible : nettoyez la bulle (la partie souple en contact avec votre visage) avec de l'eau tiède et du savon doux. Rincez à l'eau claire et laissez sécher à l'air libre, à l'abri du soleil.
- Chaque semaine : lavez le masque complet et le harnais (les sangles) de la même façon.
- Pour la tubulure et le filtre de l'appareil, suivez la notice de votre matériel et les conseils de votre prestataire.

## À éviter

- L'alcool, l'eau de javel, les lingettes parfumées et les produits ménagers : ils abîment le silicone et peuvent irriter la peau.
- Le lave-vaisselle et l'eau très chaude.
- Le séchage sur un radiateur ou en plein soleil.

Si vous n'êtes pas sûr d'un produit, posez la question à votre prestataire.$md$,
  NULL, 2, true
),
(
  'b1100000-0000-4000-a000-000000000203',
  'a1100000-0000-4000-a000-000000000002',
  'Quand le remplacer',
  $md$## Le matériel s'use, c'est prévu

Votre masque et ses accessoires s'usent avec l'usage, même bien entretenus. Ce n'est la faute de personne : le silicone se ramollit et les sangles se détendent avec le temps.

## Les signes d'usure

- La bulle devient molle, collante ou jaunie.
- Les fuites deviennent plus fréquentes alors que rien n'a changé dans vos réglages.
- Vous devez serrer de plus en plus fort pour que le masque tienne.
- Le harnais est détendu et ne tient plus bien en place.

## Que faire

Le renouvellement de votre matériel fait partie de votre prise en charge : vous n'avez pas à payer, ni à attendre qu'il soit hors d'usage. Votre prestataire vous indique le rythme de remplacement prévu pour chaque élément.

Si vous remarquez un signe d'usure avant la date prévue, demandez simplement un remplacement : depuis la rubrique Mes commandes de votre espace, ou par téléphone. C'est une demande tout à fait normale.$md$,
  NULL, 3, true
),

-- ---- Module 3 : Mieux dormir ---------------------------------

(
  'b1100000-0000-4000-a000-000000000301',
  'a1100000-0000-4000-a000-000000000003',
  'Des habitudes simples',
  $md$## De petites habitudes qui aident

Votre appareil fait son travail la nuit. Quelques habitudes simples peuvent l'aider, sans tout changer d'un coup. Choisissez ce qui vous semble facile, et allez-y à votre rythme.

- Couchez-vous et levez-vous à des heures régulières, même le week-end si possible.
- Gardez une chambre calme, sombre et pas trop chauffée.
- Le soir, évitez le café, le thé fort et l'alcool : ils peuvent gêner le sommeil.
- Évitez les écrans (téléphone, tablette) juste avant de dormir et dans le lit.
- Bougez un peu dans la journée, même une simple marche : cela aide souvent à mieux dormir.

## Soyez patient avec vous-même

Personne n'applique tout, tout le temps. Une habitude à la fois suffit. Et certaines nuits restent moins bonnes que d'autres : c'est normal, cela arrive à tout le monde.

Si vous dormez mal depuis plusieurs semaines malgré votre traitement, parlez-en à votre médecin : c'est lui qui peut chercher la cause avec vous.$md$,
  NULL, 1, true
),
(
  'b1100000-0000-4000-a000-000000000302',
  'a1100000-0000-4000-a000-000000000003',
  'Voyager avec votre PPC',
  $md$## Votre appareil voyage avec vous

Partir quelques jours ou plus longtemps, c'est tout à fait possible avec votre traitement. La règle d'or : l'appareil part avec vous, et vous l'utilisez chaque nuit, comme à la maison.

## Avant de partir

- Prévenez votre prestataire si vous partez longtemps : il peut vous conseiller et préparer ce qu'il faut.
- Emportez le câble d'alimentation, le masque et la tubulure. À l'étranger, un simple adaptateur de prise suffit dans la plupart des pays.
- Si votre appareil a un humidificateur, videz bien le réservoir d'eau avant de le ranger.

## En avion

- Gardez l'appareil avec vous en cabine, dans son sac. Ne le mettez pas en soute.
- Une attestation de voyage peut vous être demandée. Vous pouvez la générer dans la rubrique Mes documents de votre espace.
- Si vous souhaitez utiliser l'appareil pendant le vol, prévenez la compagnie aérienne avant le départ : les règles varient selon les compagnies.

## Sur place

Reprenez vos nuits comme à la maison. Si un problème de matériel survient pendant le voyage, appelez votre prestataire : il vous dira quoi faire.$md$,
  NULL, 2, true
)
ON CONFLICT (id) DO NOTHING;

-- ---- Questions de quiz ---------------------------------------

INSERT INTO public.education_quiz_questions (id, lesson_id, question, options, correct_index, explanation, display_order)
VALUES
-- Leçon 1.1 : À quoi sert votre appareil
(
  'c1100000-0000-4000-a000-000000010101',
  'b1100000-0000-4000-a000-000000000101',
  'Que fait votre appareil de PPC pendant que vous dormez ?',
  $j$["Il envoie de l'oxygène pur", "Il envoie l'air de la pièce, légèrement sous pression, pour garder votre gorge ouverte", "Il réchauffe la chambre"]$j$::jsonb,
  1,
  $t$L'appareil filtre l'air de la pièce et l'envoie avec une légère pression. Ce n'est pas de l'oxygène : c'est cette pression douce qui garde votre gorge ouverte pendant la nuit.$t$,
  1
),
(
  'c1100000-0000-4000-a000-000000010102',
  'b1100000-0000-4000-a000-000000000101',
  'Si vous arrêtez d''utiliser l''appareil, que se passe-t-il ?',
  $j$["L'apnée est guérie, plus besoin de l'appareil", "Les pauses respiratoires reviennent : l'appareil agit seulement les nuits où vous l'utilisez", "Rien ne change"]$j$::jsonb,
  1,
  $t$La PPC est un traitement qui agit nuit après nuit : elle ne guérit pas l'apnée. Si vous envisagez d'arrêter ou de faire une pause, parlez-en d'abord à votre médecin.$t$,
  2
),
-- Leçon 1.2 : Les premières nuits
(
  'c1100000-0000-4000-a000-000000010201',
  'b1100000-0000-4000-a000-000000000102',
  'Vous vous réveillez sans votre masque : il a été retiré pendant la nuit. Que faire ?',
  $j$["C'est un échec, le traitement n'est pas fait pour vous", "Le remettre si possible, et en parler à votre prestataire si cela arrive souvent", "Arrêter le traitement"]$j$::jsonb,
  1,
  $t$Cela arrive à beaucoup de personnes, surtout au début, et ce n'est pas un échec. Remettez le masque si vous le pouvez. Si cela se répète, votre prestataire peut chercher la cause avec vous : un réglage ou un autre modèle de masque suffisent souvent.$t$,
  1
),
-- Leçon 1.3 : Questions fréquentes
(
  'c1100000-0000-4000-a000-000000010301',
  'b1100000-0000-4000-a000-000000000103',
  'Une coupure de courant arrive pendant la nuit. Que se passe-t-il ?',
  $j$["Il faut appeler les secours immédiatement", "L'appareil s'arrête, et vous continuez à respirer normalement l'air de la pièce", "L'appareil continue de fonctionner plusieurs jours sans électricité"]$j$::jsonb,
  1,
  $t$L'appareil s'arrête simplement, et votre masque laisse passer l'air de la pièce. Si vous êtes gêné, retirez le masque et rendormez-vous. Remettez l'appareil en marche quand le courant revient.$t$,
  1
),
-- Leçon 2.1 : Bien ajuster votre masque
(
  'c1100000-0000-4000-a000-000000020101',
  'b1100000-0000-4000-a000-000000000201',
  'Votre masque fuit. Quel est le bon premier réflexe ?',
  $j$["Serrer les sangles au maximum", "Écarter doucement le masque du visage puis le reposer, pour replacer la bulle", "Dormir sans le masque"]$j$::jsonb,
  1,
  $t$Serrer très fort marque le visage et ne règle pas toujours la fuite. Replacer la bulle suffit souvent. Si la fuite revient chaque nuit, contactez votre prestataire : la taille ou l'usure du masque peuvent être en cause.$t$,
  1
),
(
  'c1100000-0000-4000-a000-000000020102',
  'b1100000-0000-4000-a000-000000000201',
  'Au réveil, vous avez des marques rouges profondes sur le visage. Qu''est-ce que cela veut dire ?',
  $j$["Le masque est trop serré : desserrez un peu les sangles", "C'est normal et obligatoire", "Il faut serrer encore plus"]$j$::jsonb,
  0,
  $t$Un masque bien ajusté tient sans appuyer fort. Desserrez un peu les sangles, des deux côtés. Si vous ne trouvez pas le bon réglage, votre prestataire peut vous aider ou vous proposer une autre taille.$t$,
  2
),
-- Leçon 2.2 : Nettoyer votre masque
(
  'c1100000-0000-4000-a000-000000020201',
  'b1100000-0000-4000-a000-000000000202',
  'Avec quoi nettoyer la bulle de votre masque ?',
  $j$["De l'alcool ou des lingettes parfumées", "De l'eau tiède et du savon doux, puis un séchage à l'air libre", "De l'eau de javel"]$j$::jsonb,
  1,
  $t$L'eau tiède et le savon doux suffisent. L'alcool, la javel et les produits parfumés abîment le silicone et peuvent irriter votre peau.$t$,
  1
),
-- Leçon 2.3 : Quand le remplacer
(
  'c1100000-0000-4000-a000-000000020301',
  'b1100000-0000-4000-a000-000000000203',
  'La bulle de votre masque devient molle et il fuit plus souvent. Que faire ?',
  $j$["Rien, on ne remplace jamais un masque", "Demander un remplacement à votre prestataire : c'est prévu dans votre prise en charge", "Le réparer avec du ruban adhésif"]$j$::jsonb,
  1,
  $t$Le matériel s'use, c'est normal et c'est prévu : le renouvellement fait partie de votre prise en charge. Vous pouvez demander un remplacement depuis la rubrique Mes commandes de votre espace, ou par téléphone.$t$,
  1
),
-- Leçon 3.1 : Des habitudes simples
(
  'c1100000-0000-4000-a000-000000030101',
  'b1100000-0000-4000-a000-000000000301',
  'Qu''est-ce qui aide à bien dormir le soir ?',
  $j$["Un café après le dîner", "Des horaires réguliers et une chambre calme, sombre et pas trop chauffée", "Regarder son téléphone dans le lit"]$j$::jsonb,
  1,
  $t$Des horaires réguliers et une chambre apaisante aident le sommeil. Le café le soir et les écrans dans le lit le gênent souvent. Allez-y à votre rythme : une habitude à la fois suffit.$t$,
  1
),
-- Leçon 3.2 : Voyager avec votre PPC
(
  'c1100000-0000-4000-a000-000000030201',
  'b1100000-0000-4000-a000-000000000302',
  'En avion, où doit voyager votre appareil de PPC ?',
  $j$["En soute, avec les valises", "Avec vous, en cabine", "Il reste à la maison"]$j$::jsonb,
  1,
  $t$Gardez toujours l'appareil avec vous en cabine : il risque moins les chocs et la perte. Pensez à vider l'humidificateur avant de le ranger, et générez votre attestation de voyage dans la rubrique Mes documents.$t$,
  1
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIN MIGRATION 110
-- ============================================================
