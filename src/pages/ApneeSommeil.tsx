/**
 * Page Apnée du sommeil — refondue sur le template PathologyLayout.
 * Contenu médical existant conservé, réorganisé en sections
 * Comprendre / Symptômes / Risques / Traitement + FAQ courte.
 */

import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Moon, Heart, Brain, Activity, CheckCircle } from 'lucide-react';
import { PathologyLayout, fadeInUp } from '../components/vitrine/PathologyLayout';

const symptoms = [
  'Fatigue intense dès le réveil',
  'Somnolence excessive dans la journée',
  'Ronflements bruyants',
  'Pauses respiratoires observées par votre entourage',
  'Maux de tête le matin',
  'Difficultés de concentration',
  "Irritabilité et troubles de l'humeur",
  'Réveils fréquents la nuit',
  "Sensation d'étouffement la nuit",
  'Endormissements involontaires',
];

const risks = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Risques pour le cœur',
    description:
      "Tension artérielle élevée, troubles du rythme cardiaque, insuffisance cardiaque, AVC (accident vasculaire cérébral).",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Troubles de la mémoire et de la concentration',
    description:
      "Baisse de concentration, troubles de la mémoire, difficultés d'apprentissage.",
  },
  {
    icon: <Activity className="w-6 h-6" />,
    title: 'Risques métaboliques',
    description: 'Diabète de type 2, prise de poids, syndrome métabolique.',
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Accidents',
    description:
      "Risque plus élevé d'accidents de la route et du travail, à cause de la somnolence.",
  },
];

export function ApneeSommeil() {
  return (
    <PathologyLayout
      badgeIcon={Moon}
      badgeLabel="Comprendre l'apnée du sommeil"
      title="Qu'est-ce que l'apnée du sommeil ?"
      intro="L'apnée du sommeil (les médecins parlent de SAHOS, syndrome d'apnées-hypopnées obstructives du sommeil) est un trouble fréquent et souvent non diagnostiqué : la respiration s'arrête plusieurs fois par nuit, sans que vous vous en rendiez compte."
      sections={[
        {
          id: 'comprendre',
          label: 'Comprendre',
          title: 'Un trouble respiratoire de la nuit',
          content: (
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
              <motion.div {...fadeInUp}>
                <p className="text-lg text-[#5C5C5C] mb-4 leading-relaxed">
                  Pendant le sommeil, les muscles de la gorge se relâchent. Chez
                  certaines personnes, ce relâchement bloque le passage de l'air :
                  c'est une apnée (une pause de la respiration).
                </p>
                <p className="text-lg text-[#5C5C5C] mb-4 leading-relaxed">
                  Quand l'air ne passe plus, le cerveau détecte le manque d'oxygène
                  et provoque un micro-réveil pour relancer la respiration. Vous ne
                  vous en souvenez pas, mais cela peut se répéter des dizaines de
                  fois par heure.
                </p>
                <p className="text-lg text-[#5C5C5C] leading-relaxed">
                  Ces micro-réveils coupent le sommeil en morceaux. Résultat : votre
                  corps ne se repose pas vraiment, même après une longue nuit.
                </p>
              </motion.div>
              <motion.div {...fadeInUp}>
                <div className="bg-white border border-[#E8E5DE] rounded-2xl p-7">
                  <h3 className="text-lg text-[#1A1A1A] font-medium mb-4">
                    Les niveaux de sévérité
                  </h3>
                  <div className="space-y-3 text-[#5C5C5C]">
                    <div className="flex justify-between gap-4 pb-3 border-b border-[#E8E5DE]">
                      <span className="text-[#1A1A1A] font-medium">Légère</span>
                      <span>5 à 15 apnées par heure</span>
                    </div>
                    <div className="flex justify-between gap-4 pb-3 border-b border-[#E8E5DE]">
                      <span className="text-[#1A1A1A] font-medium">Modérée</span>
                      <span>15 à 30 apnées par heure</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[#1A1A1A] font-medium">Sévère</span>
                      <span>Plus de 30 apnées par heure</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ),
        },
        {
          id: 'symptomes',
          label: 'Symptômes',
          title: 'Quels sont les symptômes ?',
          intro:
            "Reconnaître les signes de l'apnée du sommeil est la première étape vers un diagnostic et un traitement.",
          content: (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10">
                {symptoms.map((symptom, index) => (
                  <motion.div
                    key={symptom}
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="flex items-center gap-3 bg-white border border-[#E8E5DE] rounded-2xl p-4"
                  >
                    <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0" />
                    <span className="text-[#1A1A1A]">{symptom}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
                <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 text-center">
                  <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl text-[#1A1A1A] font-medium mb-3">
                    Vous vous reconnaissez ?
                  </h3>
                  <p className="text-[#5C5C5C] mb-6 leading-relaxed">
                    Si vous avez plusieurs de ces symptômes, parlez-en à un médecin.
                    Plus le diagnostic est fait tôt, plus vite vous retrouverez des
                    nuits reposantes.
                  </p>
                  <Link
                    to="/contact"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#C45D40] text-white rounded-full hover:bg-[#A34A32] transition-colors"
                  >
                    Faire le point sur mes symptômes
                  </Link>
                </div>
              </motion.div>
            </>
          ),
        },
        {
          id: 'risques',
          label: 'Risques',
          title: 'Pourquoi se faire traiter ?',
          intro:
            "Sans traitement, l'apnée du sommeil peut entraîner des complications sérieuses pour votre santé et votre sécurité.",
          content: (
            <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {risks.map((risk, index) => (
                <motion.div
                  key={risk.title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                    {risk.icon}
                  </div>
                  <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{risk.title}</h3>
                  <p className="text-[#5C5C5C] leading-relaxed">{risk.description}</p>
                </motion.div>
              ))}
            </div>
          ),
        },
        {
          id: 'traitement',
          label: 'Traitement',
          title: 'La bonne nouvelle : ça se traite',
          content: (
            <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
              <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10 text-center">
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-lg text-[#5C5C5C] mb-4 leading-relaxed">
                  L'apnée du sommeil se traite efficacement. Le traitement de
                  référence est la PPC (un appareil qui envoie de l'air en douceur
                  pendant votre sommeil) : il réduit fortement les apnées et améliore
                  la qualité du sommeil.
                </p>
                <p className="text-lg text-[#5C5C5C] mb-8 leading-relaxed">
                  Beaucoup de patients se sentent mieux dès les premières nuits :
                  réveil plus facile, plus d'énergie, meilleure humeur et meilleure
                  concentration.
                </p>
                <Link
                  to="/traitement-ppc"
                  className="inline-flex items-center text-[#007AFF] hover:text-[#0051D5] transition-colors"
                >
                  En savoir plus sur le traitement par PPC
                </Link>
              </div>
            </motion.div>
          ),
        },
      ]}
      faq={[
        {
          question: "L'apnée du sommeil est-elle fréquente ?",
          answer:
            "Oui. C'est un trouble fréquent, surtout après 50 ans, et beaucoup de personnes ne savent pas qu'elles en souffrent. Souvent, c'est le conjoint qui remarque les ronflements ou les pauses respiratoires.",
        },
        {
          question: 'Le test du sommeil est-il remboursé ?',
          answer:
            "Oui. Quand il est prescrit par un médecin, le test du sommeil est un examen médical remboursé par la Sécurité sociale, avec un complément possible de votre mutuelle.",
        },
        {
          question: 'Est-ce que je devrai être appareillé toute ma vie ?',
          answer:
            "L'apnée du sommeil est une maladie chronique : le traitement est efficace tant qu'il est utilisé. Votre médecin réévalue régulièrement votre situation et adapte le traitement si besoin.",
        },
        {
          question: 'Par quoi dois-je commencer ?',
          answer:
            "Parlez de vos symptômes à votre médecin traitant. Vous pouvez aussi nous contacter : nous vous expliquons la démarche et nous pouvons vous orienter, gratuitement et sans engagement.",
        },
      ]}
      cta={{
        title: 'Prochaine étape : le diagnostic',
        text: "Découvrez comment se déroule le parcours diagnostic en France et comment nous pouvons vous accompagner dès le début.",
        primary: { label: 'Comprendre le diagnostic', to: '/parcours-diagnostic' },
        secondary: { label: 'Être accompagné', to: '/contact' },
      }}
    />
  );
}
