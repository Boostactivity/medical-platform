import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, Target, Users, Award, TrendingUp, Shield } from 'lucide-react';

export function QuiSommesNous() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const values = [
    { icon: <Heart className="w-8 h-8" />, title: 'Empathie', description: 'Nous plaçons l\'humain au cœur de notre action' },
    { icon: <Shield className="w-8 h-8" />, title: 'Transparence', description: 'Information claire et complète à chaque étape' },
    { icon: <Target className="w-8 h-8" />, title: 'Excellence', description: 'Qualité de service et rigueur médicale' },
    { icon: <TrendingUp className="w-8 h-8" />, title: 'Innovation', description: 'Technologie et digital au service de la santé' },
  ];

  const team = [
    { role: 'Techniciens respiratoires', description: 'Formés spécifiquement à l\'apnée du sommeil et aux appareils PPC' },
    { role: 'Coordinateurs de parcours', description: 'Votre point de contact dédié tout au long du traitement' },
    { role: 'Support technique', description: 'Disponible pour toute question ou problème technique' },
    { role: 'Équipe médicale', description: 'Collaboration étroite avec les médecins prescripteurs' },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#3b82f6] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#3b82f6] to-[#5AC8FA] rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl">
              <span className="text-3xl">E</span>
            </div>
            <h1 className="text-5xl lg:text-6xl text-[#1a2b3c] mb-6">
              Qui sommes-nous ?
            </h1>
            <p className="text-xl text-[#6b7280]">
              la plateforme est une entreprise française spécialisée dans l'appareillage respiratoire 
              à domicile pour le traitement de l'apnée du sommeil.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <h2 className="text-4xl text-[#1a2b3c] mb-6">Notre mission</h2>
              <p className="text-xl text-[#6b7280] mb-6">
                la plateforme naît d'un constat simple : le système actuel de l'appareillage médical 
                en France est trop opaque, trop peu centré sur le patient, et basé sur des habitudes 
                de renvoi entre médecins et prestataires historiques.
              </p>
              <p className="text-xl text-[#6b7280] mb-6">
                Notre mission est de rendre le système lisible, humain et moderne. Nous voulons remettre 
                le choix et l'information dans les mains du patient, tout en garantissant un niveau 
                d'expertise médicale et d'accompagnement inégalé.
              </p>
              <div className="bg-[#3b82f6]/10 border-2 border-[#3b82f6]/30 rounded-2xl p-6">
                <p className="text-lg text-[#1a2b3c]">
                  <strong>Notre ambition :</strong> devenir LA référence moderne en France pour 
                  l'appareillage PPC et l'accompagnement des patients souffrant d'apnée du sommeil.
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1562673462-877b3612cbea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwcHJvZmVzc2lvbmFsJTIwY2FyZXxlbnwxfHx8fDE3NjQ2OTIxNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Professionnels de santé la plateforme"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">Nos valeurs</h2>
            <p className="text-xl text-[#6b7280] max-w-3xl mx-auto">
              Les principes qui guident chacune de nos actions au quotidien
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-xl text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#5AC8FA] rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                  {value.icon}
                </div>
                <h3 className="text-xl text-[#1a2b3c] mb-3">{value.title}</h3>
                <p className="text-[#6b7280]">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">Notre équipe</h2>
            <p className="text-xl text-[#6b7280] max-w-3xl mx-auto">
              Des professionnels de santé experts et dédiés à votre réussite
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.role}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#f8fafc] rounded-3xl p-8"
              >
                <Users className="w-12 h-12 text-[#3b82f6] mb-4" />
                <h3 className="text-2xl text-[#1a2b3c] mb-3">{member.role}</h3>
                <p className="text-lg text-[#6b7280]">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">Agréments et certifications</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: <Award className="w-12 h-12" />, title: 'Prestataire agréé', desc: 'Agréé par l\'ARS comme prestataire de santé à domicile' },
              { icon: <Shield className="w-12 h-12" />, title: 'Certifié HAS', desc: 'Respect des référentiels de la Haute Autorité de Santé' },
              { icon: <Shield className="w-12 h-12" />, title: 'Hébergement HDS', desc: 'Données de santé hébergées sur serveurs certifiés' },
            ].map((cert, index) => (
              <motion.div
                key={cert.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-lg text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-[#34C759] to-[#30D158] rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                  {cert.icon}
                </div>
                <h3 className="text-xl text-[#1a2b3c] mb-3">{cert.title}</h3>
                <p className="text-[#6b7280]">{cert.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] mb-6">
              Rejoignez la plateforme
            </h2>
            <p className="text-xl text-[#6b7280] mb-8">
              Patients ou médecins, découvrez une nouvelle façon de vivre le traitement de l'apnée du sommeil.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-[#3b82f6] text-white rounded-full hover:bg-[#2563eb] transition-all shadow-lg"
            >
              Nous contacter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
