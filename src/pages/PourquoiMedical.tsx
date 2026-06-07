/**
 * Page Pourquoi Medical — nettoyage cohérence vitrine.
 * Cartes unifiées (blanc, bordure #E8E5DE, pastille bleue),
 * animations limitées au pattern fade-up, copy resserrée.
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Users,
  Shield,
  Smartphone,
  Clock,
  TrendingUp,
  Award,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

const fadeInUp = {
  initial: false as const,
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const values = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Centré sur le patient',
    description:
      'Vous êtes au centre de tout ce que nous faisons. Nous respectons votre intelligence, votre temps et vos choix.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Transparence',
    description:
      'Nous expliquons clairement votre parcours, vos droits, le remboursement et le fonctionnement du traitement.',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Outils modernes',
    description:
      'Espace patient simple, télésuivi (vos données de traitement transmises automatiquement), communication facile.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Accompagnement humain',
    description:
      "Derrière la technologie, une équipe dédiée, disponible et à l'écoute pour vous accompagner au quotidien.",
  },
];

const differentiators = [
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Disponibilité',
    description:
      "Une équipe joignable par téléphone, email ou messagerie, qui répond vite. Pas de file d'attente interminable.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Suivi proactif',
    description:
      'Nous suivons votre utilisation de l\'appareil et nous vous contactons en cas de difficulté, avant que cela devienne un problème.',
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'Pédagogie',
    description:
      "Nous prenons le temps d'expliquer, de former et de répondre à toutes vos questions.",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Qualité du matériel',
    description:
      'Appareils de dernière génération, accessoires de qualité, entretien rigoureux.',
  },
];

const problems = [
  "Les médecins orientent souvent vers leurs prestataires habituels",
  'Les patients ignorent qu\'ils ont le libre choix de leur prestataire',
  "Le suivi est parfois minimal : « on pose l'appareil et on part »",
  'Difficile de joindre quelqu\'un en cas de problème',
  "Peu de pédagogie et d'explications claires",
];

const engagements = [
  {
    title: 'Respect de vos droits',
    items: ['Information claire', 'Liberté de choix', 'Consentement éclairé', 'Confidentialité'],
  },
  {
    title: 'Qualité de service',
    items: ['Installation rapide', 'Matériel de qualité', 'Entretien régulier', 'Support réactif'],
  },
  {
    title: 'Réussite du traitement',
    items: ['Formation complète', 'Suivi personnalisé', 'Aide en cas de difficulté', 'Écoute continue'],
  },
];

export function PourquoiMedical() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-[#FAFAF7] border-b border-[#E8E5DE] pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] mb-5 leading-tight">
              Pourquoi choisir Medical ?
            </h1>
            <p className="text-lg text-[#5C5C5C] leading-relaxed">
              Nous voulons changer l'appareillage médical traditionnel pour
              remettre le patient au cœur du parcours de soin.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Le problème du modèle actuel */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-8 text-center">
              Le problème du modèle actuel
            </h2>
            <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10">
              <p className="text-lg text-[#5C5C5C] mb-6 leading-relaxed">
                En France, le marché de l'appareillage pour l'apnée du sommeil
                manque souvent de clarté pour le patient :
              </p>
              <ul className="space-y-4">
                {problems.map((problem) => (
                  <li key={problem} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2.5 flex-shrink-0"></div>
                    <span className="text-[#1A1A1A] leading-relaxed">{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Nos valeurs */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Nos valeurs
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Ce qui guide chacune de nos décisions et actions au quotidien.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                  {value.icon}
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{value.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ce qui nous différencie */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Ce qui nous différencie
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Concrètement, au quotidien, voici ce que nous faisons autrement.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {differentiators.map((item, index) => (
              <motion.div
                key={item.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{item.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Libre choix */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-5 text-center">
              Votre droit au libre choix
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8 text-center leading-relaxed">
              En France, la loi vous garantit le libre choix de votre prestataire
              de santé à domicile. Même si votre médecin vous recommande un
              prestataire, vous pouvez choisir Medical.
            </p>
            <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 mb-8">
              <h3 className="text-xl text-[#1A1A1A] font-medium mb-5">
                Comment faire valoir votre choix ?
              </h3>
              <ol className="space-y-4">
                {[
                  'Informez votre médecin que vous souhaitez être suivi par Medical',
                  'Nous vous fournissons un document explicatif pour votre médecin',
                  'Nous gérons toutes les démarches administratives',
                ].map((step, index) => (
                  <li key={step} className="flex gap-4 items-start">
                    <span className="w-8 h-8 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0 font-medium">
                      {index + 1}
                    </span>
                    <span className="text-[#1A1A1A] leading-relaxed pt-1">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="text-center">
              <Link
                to="/contact"
                className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors inline-flex items-center justify-center"
              >
                Demander à être accompagné
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Nos engagements */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A]">
              Nos engagements
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {engagements.map((engagement, index) => (
              <motion.div
                key={engagement.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7"
              >
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-5">{engagement.title}</h3>
                <ul className="space-y-3">
                  {engagement.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                      <span className="text-[#5C5C5C]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7] border-t border-[#E8E5DE]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-5">
              Prêt à découvrir la différence ?
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8 leading-relaxed">
              Rejoignez les patients qui ont choisi une approche moderne et
              humaine de leur traitement.
            </p>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors inline-flex items-center justify-center"
            >
              Nous contacter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
