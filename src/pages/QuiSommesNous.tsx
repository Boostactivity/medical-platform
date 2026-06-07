/**
 * Page Qui sommes-nous — nettoyage cohérence vitrine.
 * Cartes unifiées (blanc, bordure #E8E5DE, pastille bleue),
 * animations limitées au pattern fade-up, copy resserrée.
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, Target, Users, Award, TrendingUp, Shield } from 'lucide-react';

const fadeInUp = {
  initial: false as const,
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const values = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Empathie',
    description: "Nous plaçons l'humain au cœur de notre action.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Transparence',
    description: 'Information claire et complète à chaque étape.',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Exigence',
    description: 'Qualité de service et rigueur médicale.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Innovation',
    description: 'Des outils numériques au service de votre santé.',
  },
];

const team = [
  {
    role: 'Techniciens respiratoires',
    description: "Formés spécifiquement à l'apnée du sommeil et aux appareils PPC.",
  },
  {
    role: 'Coordinateurs de parcours',
    description: 'Votre point de contact dédié tout au long du traitement.',
  },
  {
    role: 'Support technique',
    description: 'Disponible pour toute question ou problème technique.',
  },
  {
    role: 'Équipe médicale',
    description: 'Collaboration étroite avec les médecins prescripteurs.',
  },
];

const certifications = [
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Prestataire agréé',
    desc: "Agréé par l'ARS (Agence Régionale de Santé) comme prestataire de santé à domicile.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Référentiels HAS',
    desc: 'Respect des référentiels de la Haute Autorité de Santé.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Hébergement HDS',
    desc: 'Vos données de santé sont hébergées sur des serveurs certifiés.',
  },
];

export function QuiSommesNous() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-[#FAFAF7] border-b border-[#E8E5DE] pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] mb-5 leading-tight">
              Qui sommes-nous ?
            </h1>
            <p className="text-lg text-[#5C5C5C] leading-relaxed">
              Medical est une entreprise française spécialisée dans l'appareillage
              respiratoire à domicile pour le traitement de l'apnée du sommeil.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
            <motion.div {...fadeInUp}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-6">
                Notre mission
              </h2>
              <p className="text-lg text-[#5C5C5C] mb-4 leading-relaxed">
                Medical est né d'un constat simple : le système actuel de
                l'appareillage médical en France est souvent difficile à comprendre
                et trop peu centré sur le patient.
              </p>
              <p className="text-lg text-[#5C5C5C] mb-6 leading-relaxed">
                Notre mission est de le rendre lisible, humain et moderne. Nous
                voulons remettre le choix et l'information dans les mains du
                patient, avec un accompagnement de qualité à chaque étape.
              </p>
              <div className="bg-[#FAFAF7] border border-[#E8E5DE] rounded-2xl p-6">
                <p className="text-[#1A1A1A] leading-relaxed">
                  <strong>Notre ambition :</strong> faire de chaque traitement une
                  réussite, en alliant écoute, pédagogie et suivi régulier.
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E5DE] shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1562673462-877b3612cbea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwcHJvZmVzc2lvbmFsJTIwY2FyZXxlbnwxfHx8fDE3NjQ2OTIxNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Professionnels de santé Medical"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Nos valeurs
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Les principes qui guident chacune de nos actions au quotidien.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto mb-5">
                  {value.icon}
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{value.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Équipe */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Notre équipe
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Des professionnels de santé experts et dédiés à votre réussite.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.role}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{member.role}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Agréments */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A]">
              Agréments et certifications
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {certifications.map((cert, index) => (
              <motion.div
                key={cert.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 text-center"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto mb-5">
                  {cert.icon}
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{cert.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{cert.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-white border-t border-[#E8E5DE]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-5">
              Rejoignez Medical
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8 leading-relaxed">
              Patients ou médecins, découvrez une nouvelle façon de vivre le
              traitement de l'apnée du sommeil.
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
