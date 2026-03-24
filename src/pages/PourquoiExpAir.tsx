import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Heart, Users, Shield, Smartphone, Clock, TrendingUp, Award, MessageCircle } from 'lucide-react';

export function PourquoiExpAir() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const values = [
    {
      icon: <Heart className="w-10 h-10" />,
      title: 'Pro-patient',
      description: 'Vous êtes au centre de tout ce que nous faisons. Nous respectons votre intelligence, votre temps et vos choix.',
      color: 'from-[#FF3B30] to-[#FF9500]',
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: 'Transparence totale',
      description: 'Nous expliquons clairement votre parcours, vos droits, le remboursement et le fonctionnement du traitement.',
      color: 'from-[#007AFF] to-[#5AC8FA]',
    },
    {
      icon: <Smartphone className="w-10 h-10" />,
      title: 'Digital-first',
      description: 'Espace patient moderne, télésuivi intelligent, communication fluide. La technologie au service de votre santé.',
      color: 'from-[#5AC8FA] to-[#34C759]',
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: 'Accompagnement humain',
      description: 'Derrière la technologie, une équipe dédiée, disponible et à l\'écoute pour vous accompagner au quotidien.',
      color: 'from-[#34C759] to-[#FF9500]',
    },
  ];

  const differentiators = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Disponibilité garantie',
      description: 'Support réactif par téléphone, email ou messagerie. Pas de file d\'attente interminable.',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Suivi proactif',
      description: 'Nous surveillons votre observance et vous contactons en cas de difficulté, avant que ça devienne un problème.',
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Pédagogie',
      description: 'Nous prenons le temps d\'expliquer, de former et de répondre à toutes vos questions.',
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Qualité premium',
      description: 'Appareils dernière génération, accessoires de qualité, maintenance rigoureuse.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto text-white"
          >
            <h1 className="text-5xl lg:text-6xl mb-6">
              Pourquoi choisir la plateforme ?
            </h1>
            <p className="text-xl opacity-90">
              Nous cassons les codes de l'appareillage médical traditionnel pour remettre 
              le patient au cœur du parcours de soin.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
            <h2 className="text-4xl text-[#1D1D1F] mb-6 text-center">
              Le problème du modèle actuel
            </h2>
            <div className="bg-[#F5F5F7] rounded-3xl p-12">
              <p className="text-xl text-[#86868B] mb-6">
                En France, le marché de l'appareillage pour l'apnée du sommeil souffre d'un fonctionnement opaque :
              </p>
              <ul className="space-y-4 text-lg text-[#1D1D1F]">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF3B30] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Les médecins orientent systématiquement vers "leurs" prestataires habituels</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF3B30] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Les patients ignorent qu'ils ont le libre choix de leur prestataire</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF3B30] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Le suivi est minimal : "on pose l'appareil et on part"</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF3B30] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Difficile de joindre quelqu'un en cas de problème</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#FF3B30] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Peu de pédagogie et d'explications claires</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-24 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Nos valeurs fondamentales
            </h2>
            <p className="text-xl text-[#86868B] max-w-3xl mx-auto">
              Ce qui guide chacune de nos décisions et actions au quotidien
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-xl"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${value.color} rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg`}>
                  {value.icon}
                </div>
                <h3 className="text-2xl text-[#1D1D1F] mb-3">{value.title}</h3>
                <p className="text-lg text-[#86868B]">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Ce qui nous différencie
            </h2>
            <p className="text-xl text-[#86868B] max-w-3xl mx-auto">
              Concrètement, au quotidien, voici ce qui fait la différence la plateforme
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {differentiators.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#F5F5F7] rounded-3xl p-8 hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center text-white mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl text-[#1D1D1F] mb-3">{item.title}</h3>
                <p className="text-[#86868B]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Libre choix */}
      <section className="py-24 bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <h2 className="text-4xl text-[#1D1D1F] mb-6">
                Votre droit au libre choix
              </h2>
              <p className="text-xl text-[#86868B] mb-6">
                En France, la loi vous garantit le libre choix de votre prestataire de santé à domicile. 
                Même si votre médecin vous recommande un prestataire, vous pouvez choisir la plateforme.
              </p>
              <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                <h4 className="text-xl text-[#1D1D1F] mb-4">Comment faire valoir votre choix ?</h4>
                <ol className="space-y-3 text-[#86868B]">
                  <li className="flex gap-3">
                    <span className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center flex-shrink-0">1</span>
                    <span>Informez votre médecin que vous souhaitez être suivi par la plateforme</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center flex-shrink-0">2</span>
                    <span>Nous vous fournissons un document explicatif pour votre médecin</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-8 h-8 bg-[#007AFF] text-white rounded-full flex items-center justify-center flex-shrink-0">3</span>
                    <span>Nous gérons toutes les démarches administratives</span>
                  </li>
                </ol>
              </div>
              <Link
                to="/contact"
                className="inline-block px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg"
              >
                Demander à être accompagné
              </Link>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1758691463084-17ed846d4a50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwcHJvZmVzc2lvbmFsJTIwcGF0aWVudHxlbnwxfHx8fDE3NjQ2NjgyMzV8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Accompagnement médical professionnel"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Engagements */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1D1D1F] mb-6">
              Nos engagements
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Respect de vos droits',
                items: ['Information claire', 'Liberté de choix', 'Consentement éclairé', 'Confidentialité'],
              },
              {
                title: 'Qualité de service',
                items: ['Installation rapide', 'Matériel premium', 'Maintenance proactive', 'Support réactif'],
              },
              {
                title: 'Réussite du traitement',
                items: ['Formation complète', 'Suivi personnalisé', 'Coaching observance', 'Écoute continue'],
              },
            ].map((engagement, index) => (
              <motion.div
                key={engagement.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#F5F5F7] rounded-3xl p-8"
              >
                <h3 className="text-2xl text-[#1D1D1F] mb-6">{engagement.title}</h3>
                <ul className="space-y-3">
                  {engagement.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-[#34C759] rounded-full"></div>
                      <span className="text-[#86868B]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center text-white">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl lg:text-5xl mb-6">
              Prêt à découvrir la différence ?
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Rejoignez les patients qui ont choisi une approche moderne et humaine de leur traitement.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-white text-[#007AFF] rounded-full hover:bg-[#F5F5F7] transition-all shadow-lg"
            >
              Nous contacter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
