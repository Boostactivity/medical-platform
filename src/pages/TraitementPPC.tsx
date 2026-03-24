import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Wind, Moon, Settings, LineChart, Phone, CheckCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
const ppcImage = 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80';

export function TraitementPPC() {
  const { t } = useTranslation();
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  };

  const benefits = [
    'Réduction drastique des apnées nocturnes',
    'Amélioration immédiate de la qualité du sommeil',
    'Retour de l\'énergie et de la vigilance',
    'Baisse significative du risque cardiovasculaire',
    'Amélioration de la concentration et de l\'humeur',
    'Diminution des ronflements',
  ];

  const expairServices = [
    {
      icon: <Settings className="w-8 h-8" />,
      title: 'Installation personnalisée',
      description: 'Un technicien se déplace à votre domicile, installe et règle votre appareil selon la prescription médicale.',
    },
    {
      icon: <Wind className="w-8 h-8" />,
      title: 'Choix du masque adapté',
      description: 'Essai de plusieurs modèles pour trouver celui qui vous convient parfaitement : nasal, narinaire ou facial.',
    },
    {
      icon: <LineChart className="w-8 h-8" />,
      title: 'Télésuivi intelligent',
      description: 'Transmission sécurisée de vos données d\'usage. Nous vous contactons en cas de difficulté pour optimiser votre traitement.',
    },
    {
      icon: <Phone className="w-8 h-8" />,
      title: 'Support continu',
      description: 'Équipe disponible par téléphone, email ou messagerie sécurisée pour toute question ou problème technique.',
    },
  ];

  return (
    <div className="bg-white dark:bg-background">
      {/* Hero */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#5AC8FA] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-[#3b82f6]/10 px-4 py-2 rounded-full mb-6">
              <Wind className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-[#3b82f6]">Traitement par PPC</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl text-[#1a2b3c] dark:text-foreground mb-6">
              La Pression Positive Continue (PPC)
            </h1>
            <p className="text-xl text-[#6b7280] dark:text-muted-foreground">
              Le traitement de référence pour l'apnée du sommeil modérée à sévère. 
              Efficace, non invasif et pris en charge par la Sécurité sociale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is PPC */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeInUp}>
              <h2 className="text-4xl text-[#1a2b3c] dark:text-foreground mb-6">
                Comment fonctionne la PPC ?
              </h2>
              <p className="text-lg text-[#6b7280] dark:text-muted-foreground mb-4">
                La Pression Positive Continue (PPC ou CPAP en anglais) est une machine qui envoie 
                un flux d'air sous pression via un masque, maintenant vos voies aériennes ouvertes pendant votre sommeil.
              </p>
              <p className="text-lg text-[#6b7280] dark:text-muted-foreground mb-4">
                Grâce à cette pression constante ou auto-ajustée, les pauses respiratoires sont évitées, 
                votre sommeil n'est plus fragmenté et votre organisme bénéficie d'un repos réparateur.
              </p>
              <div className="bg-[#f8fafc] dark:bg-secondary rounded-2xl p-6 mb-6">
                <h4 className="text-[#1a2b3c] dark:text-foreground mb-3">Points clés</h4>
                <ul className="space-y-2 text-[#6b7280] dark:text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    <span>Ce n'est pas un respirateur de réanimation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    <span>Vous respirez normalement, l'air est simplement sous pression</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                    <span>Utilisation chaque nuit pour une efficacité maximale</span>
                  </li>
                </ul>
              </div>
              <p className="text-[#6b7280] dark:text-muted-foreground">
                Les appareils modernes sont silencieux, compacts et connectés pour un suivi optimal.
              </p>
            </motion.div>

            <motion.div {...fadeInUp}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={ppcImage}
                  alt="Appareil de Pression Positive Continue (PPC) avec masque, harnais et circuit"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
              Les bénéfices du traitement
            </h2>
            <p className="text-xl text-[#6b7280] dark:text-muted-foreground max-w-3xl mx-auto">
              De nombreux patients constatent une amélioration dès les premières nuits
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <CheckCircle className="w-8 h-8 text-[#10b981] mb-3" />
                <p className="text-[#1a2b3c] dark:text-foreground">{benefit}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="bg-gradient-to-br from-[#3b82f6] to-[#5AC8FA] rounded-3xl p-12 text-white text-center">
            <Moon className="w-16 h-16 mx-auto mb-6" />
            <h3 className="text-3xl mb-4">Un traitement pour la vie</h3>
            <p className="text-xl max-w-2xl mx-auto">
              L'apnée du sommeil est une maladie chronique. Le traitement doit être utilisé 
              chaque nuit pour maintenir son efficacité. Avec le temps, il devient une routine naturelle.
            </p>
          </motion.div>
        </div>
      </section>

      {/* la plateforme Role */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
              Le rôle d'la plateforme
            </h2>
            <p className="text-xl text-[#6b7280] dark:text-muted-foreground max-w-3xl mx-auto">
              Notre mission : vous aider à réussir votre traitement, pas seulement installer un appareil
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {expairServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#f8fafc] dark:bg-secondary rounded-3xl p-8"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#5AC8FA] rounded-2xl flex items-center justify-center text-white mb-6">
                  {service.icon}
                </div>
                <h3 className="text-2xl text-[#1a2b3c] dark:text-foreground mb-3">{service.title}</h3>
                <p className="text-[#6b7280] dark:text-muted-foreground">{service.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="bg-[#f8fafc] dark:bg-secondary rounded-3xl p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl text-[#1a2b3c] dark:text-foreground mb-4">Accompagnement renforcé</h3>
                <p className="text-lg text-[#6b7280] dark:text-muted-foreground mb-6">
                  Contrairement au modèle traditionnel "je pose et je pars", nous assurons un suivi actif :
                </p>
                <ul className="space-y-3">
                  {[
                    'Visites de contrôle régulières',
                    'Remplacement proactif des accessoires',
                    'Aide au réglage du confort (humidification, pression...)',
                    'Coaching en cas de difficulté d\'observance',
                    'Rapports détaillés pour votre médecin',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
                      <span className="text-[#1a2b3c] dark:text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBwYXRpZW50JTIwY29uc3VsdGF0aW9ufGVufDF8fHx8MTc2NDYyOTY3OXww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Consultation médecin patient"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Reimbursement */}
      <section className="py-24 bg-gradient-to-br from-[#f8fafc] via-white to-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeInUp} className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
                Prise en charge financière
              </h2>
            </motion.div>

            <motion.div {...fadeInUp} className="bg-white dark:bg-card rounded-3xl p-8 md:p-12 shadow-xl">
              <h3 className="text-2xl text-[#1a2b3c] dark:text-foreground mb-6">Comment ça fonctionne en France</h3>
              <div className="space-y-6 text-[#6b7280] dark:text-muted-foreground">
                <div>
                  <h4 className="text-[#1a2b3c] dark:text-foreground mb-2">Location mensuelle</h4>
                  <p>
                    L'appareil PPC n'est pas acheté mais loué. la plateforme est rémunéré par la Sécurité sociale 
                    via un forfait de location qui couvre l'appareil, les accessoires et le suivi.
                  </p>
                </div>
                <div>
                  <h4 className="text-[#1a2b3c] dark:text-foreground mb-2">Prise en charge à 100%</h4>
                  <p>
                    La Sécurité sociale prend en charge 60% et votre mutuelle complète généralement 
                    les 40% restants. Dans la grande majorité des cas, vous n'avez rien à payer.
                  </p>
                </div>
                <div>
                  <h4 className="text-[#1a2b3c] dark:text-foreground mb-2">Observance requise</h4>
                  <p>
                    La Sécurité sociale exige une utilisation minimale (généralement plus de 3h par nuit sur 
                    au moins 20 jours par mois) pour maintenir le remboursement. C'est pourquoi notre 
                    accompagnement est essentiel pour vous aider à atteindre ces objectifs.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-4xl lg:text-5xl text-[#1a2b3c] dark:text-foreground mb-6">
              Prêt à choisir la plateforme ?
            </h2>
            <p className="text-xl text-[#6b7280] dark:text-muted-foreground mb-8">
              Que vous soyez déjà appareillé ou sur le point de l'être, 
              contactez-nous pour découvrir la différence la plateforme.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="px-8 py-4 bg-[#3b82f6] text-white rounded-full hover:bg-[#2563eb] transition-all shadow-lg inline-flex items-center justify-center group"
              >
                Être rappelé
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/pourquoi-expair"
                className="px-8 py-4 bg-white border-2 border-[#3b82f6] text-[#3b82f6] rounded-full hover:bg-[#f8fafc] dark:bg-secondary transition-all inline-flex items-center justify-center"
              >
                Pourquoi la plateforme
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}