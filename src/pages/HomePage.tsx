/**
 * HomePage vitrine — refonte sobre et chaleureuse (white-label PSAD).
 * Structure : hero → bandeau réassurance → parcours 4 étapes → carte agences
 * → pourquoi nous → témoignages → espaces Patient/Médecin → CTA contact.
 *
 * Animations limitées : fade-up à l'apparition (pattern initial={false}),
 * hover cartes, transitions douces. Une seule couleur d'accent (#007AFF).
 */

import { motion } from 'motion/react';
import {
  ArrowRight,
  Moon,
  Stethoscope,
  Users,
  Shield,
  Clock,
  CheckCircle2,
  Headset,
  ClipboardList,
  Home,
  HeartHandshake,
  Smartphone,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AgencyMap } from '../components/vitrine/AgencyMap';

const fadeInUp = {
  initial: false as const,
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const reassurance = [
  {
    icon: <CheckCircle2 className="w-5 h-5" />,
    text: 'Prestataire de santé agréé en France',
  },
  {
    icon: <Headset className="w-5 h-5" />,
    text: 'Accompagnement 24h/24, 7j/7',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    text: 'Conventionné Sécurité sociale',
  },
];

const steps = [
  {
    icon: <ClipboardList className="w-6 h-6" />,
    number: '1',
    title: 'Doutes et symptômes',
    description:
      'Fatigue, ronflements, somnolence dans la journée ? Faites le point avec votre médecin. Nous pouvons vous orienter.',
  },
  {
    icon: <Stethoscope className="w-6 h-6" />,
    number: '2',
    title: 'Diagnostic médical',
    description:
      'Un test du sommeil, à domicile ou en centre, remboursé par la Sécurité sociale. Le diagnostic est posé par un médecin.',
  },
  {
    icon: <Home className="w-6 h-6" />,
    number: '3',
    title: 'Choix du prestataire',
    description:
      'La loi vous laisse libre de choisir votre prestataire. Nous vous aidons dans cette démarche, sans pression.',
  },
  {
    icon: <HeartHandshake className="w-6 h-6" />,
    number: '4',
    title: 'Installation et suivi',
    description:
      'Installation à votre domicile, explication pas à pas, puis suivi régulier pour que le traitement vous réussisse.',
  },
];

const features = [
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Accompagnement humain',
    description:
      'Une équipe dédiée, disponible et à votre écoute tout au long de votre parcours.',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: 'Suivi moderne',
    description:
      'Un espace patient simple, un télésuivi (vos données de traitement transmises automatiquement) et des échanges faciles.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Transparence',
    description:
      'Des informations claires sur votre parcours, vos droits et la prise en charge financière.',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Disponibilité',
    description:
      'Une équipe joignable par téléphone, email ou messagerie sécurisée, qui répond vite.',
  },
];

const testimonials = [
  {
    name: 'Marie L.',
    role: 'Patiente depuis 6 mois',
    text: "Medical a transformé ma prise en charge. L'équipe est réactive, l'application est simple, et je me sens vraiment accompagnée.",
  },
  {
    name: 'Dr. Dupont',
    role: 'Pneumologue',
    text: "En tant que médecin, je recommande Medical à mes patients. Leur suivi est rigoureux et les rapports d'observance sont très clairs.",
  },
  {
    name: 'Jean-Pierre M.',
    role: 'Patient depuis 1 an',
    text: "Enfin un prestataire qui explique tout clairement ! Je comprends mon traitement et je peux suivre mes progrès facilement.",
  },
];

export function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-[#FAFAF7] pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div {...fadeInUp} className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] mb-6 leading-tight">
                Mieux respirer la nuit, vivre mieux le jour.
              </h1>
              <p className="text-lg text-[#5C5C5C] mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Nous vous accompagnons à domicile pour le traitement de l'apnée du sommeil
                par PPC (un appareil qui envoie de l'air en douceur pendant votre sommeil).
                Avec des explications claires, à chaque étape.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors inline-flex items-center justify-center group"
                >
                  Je pense souffrir d'apnée
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/apnee-sommeil"
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-[#E8E5DE] text-[#1A1A1A] rounded-full hover:border-[#007AFF] hover:text-[#007AFF] transition-colors inline-flex items-center justify-center"
                >
                  Comprendre l'apnée du sommeil
                </Link>
              </div>
              <p className="mt-6 text-sm text-[#5C5C5C]">
                Déjà une prescription PPC ?{' '}
                <Link to="/contact" className="text-[#C45D40] underline underline-offset-4 hover:text-[#A34A32] transition-colors">
                  Demandez à être rappelé gratuitement
                </Link>
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="relative">
              <div className="aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1606162307024-a1343187a5b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMHNsZWVwaW5nJTIwcGVyc29ufGVufDF8fHx8MTc2NDY5MjAwNHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Personne dormant paisiblement"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bandeau réassurance */}
      <section className="bg-white border-y border-[#E8E5DE]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
            {reassurance.map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-[#1A1A1A]">
                <span className="text-[#007AFF]">{item.icon}</span>
                <span className="text-sm sm:text-base">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Votre parcours */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Votre parcours, étape par étape
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Des premiers doutes jusqu'au traitement au quotidien,
              nous sommes à vos côtés à chaque étape.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-sm text-[#5C5C5C]">Étape {step.number}</span>
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{step.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="text-center mt-10">
            <Link
              to="/parcours-diagnostic"
              className="inline-flex items-center text-[#007AFF] hover:text-[#0051D5] transition-colors"
            >
              Découvrir le parcours en détail
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Nos agences */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E8E5DE] px-4 py-2 rounded-full mb-5">
              <MapPin className="w-4 h-4 text-[#007AFF]" />
              <span className="text-sm text-[#1A1A1A]">Présence locale</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Nos agences près de chez vous
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Des équipes proches de votre domicile pour l'installation,
              les visites de suivi et le remplacement de vos accessoires.
            </p>
          </motion.div>
          <motion.div {...fadeInUp}>
            <AgencyMap />
          </motion.div>
        </div>
      </section>

      {/* Pourquoi Medical */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
              Pourquoi choisir Medical ?
            </h2>
            <p className="text-lg text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
              Une approche centrée sur vous : de l'écoute, des explications
              claires et un suivi qui ne s'arrête pas après l'installation.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{feature.title}</h3>
                <p className="text-[#5C5C5C] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="text-center">
            <Link
              to="/pourquoi-medical"
              className="inline-flex items-center text-[#007AFF] hover:text-[#0051D5] transition-colors"
            >
              Découvrir nos engagements
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A]">
              Ils nous font confiance
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border border-[#E8E5DE] rounded-2xl p-7"
              >
                <p className="text-[#1A1A1A] mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div>
                  <div className="text-[#1A1A1A] font-medium">{testimonial.name}</div>
                  <div className="text-sm text-[#5C5C5C]">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Espaces Patient / Médecin */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid md:grid-cols-2 gap-5">
            <motion.div {...fadeInUp}>
              <Link
                to="/patient/connexion"
                className="block h-full bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10 hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-6">
                  <Moon className="w-6 h-6" />
                </div>
                <h3 className="text-xl lg:text-2xl text-[#1A1A1A] font-medium mb-3">
                  Espace Patient
                </h3>
                <p className="text-[#5C5C5C] mb-6 leading-relaxed">
                  Suivez votre traitement, consultez vos données, gérez vos
                  rendez-vous et échangez avec notre équipe.
                </p>
                <div className="flex items-center text-[#007AFF] group-hover:translate-x-1 transition-transform">
                  Se connecter
                  <ArrowRight className="ml-2 w-5 h-5" />
                </div>
              </Link>
            </motion.div>

            <motion.div {...fadeInUp}>
              <Link
                to="/medecin/connexion"
                className="block h-full bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10 hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl lg:text-2xl text-[#1A1A1A] font-medium mb-3">
                  Espace Médecin
                </h3>
                <p className="text-[#5C5C5C] mb-6 leading-relaxed">
                  Suivez vos patients appareillés, consultez les rapports
                  d'observance et collaborez avec nos équipes.
                </p>
                <div className="flex items-center text-[#007AFF] group-hover:translate-x-1 transition-transform">
                  Se connecter
                  <ArrowRight className="ml-2 w-5 h-5" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 lg:py-24 bg-[#FAFAF7] border-t border-[#E8E5DE]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-5">
              Prêt à améliorer votre sommeil ?
            </h2>
            <p className="text-lg text-[#5C5C5C] mb-8 leading-relaxed">
              Contactez-nous pour un premier échange gratuit et sans engagement.
              Nous répondons à toutes vos questions.
            </p>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors inline-flex items-center justify-center group"
            >
              Prendre contact
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
