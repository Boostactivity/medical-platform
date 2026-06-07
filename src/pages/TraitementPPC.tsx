/**
 * Page Traitement PPC — refondue sur le template PathologyLayout.
 * Contenu médical existant conservé (image PPC figma:asset),
 * réorganisé en sections Comprendre / Bénéfices / Accompagnement / Prise en charge.
 */

import { motion } from 'motion/react';
import { Wind, Settings, LineChart, Phone, CheckCircle } from 'lucide-react';
import { PathologyLayout, fadeInUp } from '../components/vitrine/PathologyLayout';
import ppcImage from 'figma:asset/5e52033d373c0ca83d94fb39e360fd67e333d04a.png';

const benefits = [
  'Forte réduction des apnées la nuit',
  'Sommeil de meilleure qualité',
  "Retour de l'énergie et de la vigilance",
  'Baisse du risque cardiovasculaire',
  "Meilleure concentration et meilleure humeur",
  'Diminution des ronflements',
];

const services = [
  {
    icon: <Settings className="w-6 h-6" />,
    title: 'Installation personnalisée',
    description:
      'Un technicien se déplace à votre domicile, installe et règle votre appareil selon la prescription de votre médecin.',
  },
  {
    icon: <Wind className="w-6 h-6" />,
    title: 'Choix du masque adapté',
    description:
      'Essai de plusieurs modèles pour trouver celui qui vous convient : nasal (sur le nez), narinaire (dans les narines) ou facial (nez et bouche).',
  },
  {
    icon: <LineChart className="w-6 h-6" />,
    title: 'Télésuivi',
    description:
      "Vos données d'utilisation nous sont transmises de façon sécurisée. En cas de difficulté, nous vous contactons pour ajuster votre traitement.",
  },
  {
    icon: <Phone className="w-6 h-6" />,
    title: 'Support continu',
    description:
      'Une équipe disponible par téléphone, email ou messagerie sécurisée pour toute question ou problème technique.',
  },
];

const accompagnement = [
  'Visites de contrôle régulières',
  'Remplacement régulier des accessoires (masque, tuyau, filtres)',
  "Aide au réglage du confort (humidification, pression...)",
  "Soutien en cas de difficulté à utiliser l'appareil",
  'Rapports détaillés pour votre médecin',
];

export function TraitementPPC() {
  return (
    <PathologyLayout
      badgeIcon={Wind}
      badgeLabel="Traitement par PPC"
      title="La PPC, le traitement de référence"
      intro="La PPC (Pression Positive Continue) est un appareil qui envoie de l'air en douceur pendant votre sommeil. C'est le traitement de référence de l'apnée du sommeil modérée à sévère : efficace, sans chirurgie et pris en charge par la Sécurité sociale."
      sections={[
        {
          id: 'comprendre',
          label: 'Comprendre',
          title: 'Comment fonctionne la PPC ?',
          content: (
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
              <motion.div {...fadeInUp}>
                <p className="text-lg text-[#5C5C5C] mb-4 leading-relaxed">
                  L'appareil de PPC (les médecins disent aussi CPAP, en anglais)
                  envoie un léger flux d'air par un masque que vous portez la nuit.
                  Cet air maintient votre gorge ouverte pendant le sommeil.
                </p>
                <p className="text-lg text-[#5C5C5C] mb-6 leading-relaxed">
                  Grâce à cette pression douce, les pauses respiratoires sont
                  évitées : votre sommeil n'est plus coupé et votre corps peut
                  enfin se reposer.
                </p>
                <div className="bg-white border border-[#E8E5DE] rounded-2xl p-7 mb-6">
                  <h3 className="text-lg text-[#1A1A1A] font-medium mb-4">Points clés</h3>
                  <ul className="space-y-3 text-[#5C5C5C]">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                      <span>Ce n'est pas un respirateur de réanimation</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                      <span>Vous respirez normalement, l'air est simplement poussé en douceur</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                      <span>À utiliser chaque nuit pour une efficacité maximale</span>
                    </li>
                  </ul>
                </div>
                <p className="text-[#5C5C5C] leading-relaxed">
                  Les appareils récents sont silencieux, compacts et connectés pour
                  faciliter le suivi.
                </p>
              </motion.div>

              <motion.div {...fadeInUp}>
                <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E5DE] shadow-sm">
                  <img
                    src={ppcImage}
                    alt="Appareil de Pression Positive Continue (PPC) avec masque, harnais et circuit"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          ),
        },
        {
          id: 'benefices',
          label: 'Bénéfices',
          title: 'Les bénéfices du traitement',
          intro: 'Beaucoup de patients se sentent mieux après quelques nuits de traitement.',
          content: (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="flex items-center gap-3 bg-white border border-[#E8E5DE] rounded-2xl p-5"
                  >
                    <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0" />
                    <span className="text-[#1A1A1A]">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
                <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 text-center">
                  <h3 className="text-xl text-[#1A1A1A] font-medium mb-3">
                    Un traitement au long cours
                  </h3>
                  <p className="text-[#5C5C5C] leading-relaxed">
                    L'apnée du sommeil est une maladie chronique. Le traitement doit
                    être utilisé chaque nuit pour rester efficace. Avec le temps, il
                    devient une routine naturelle, comme se brosser les dents.
                  </p>
                </div>
              </motion.div>
            </>
          ),
        },
        {
          id: 'accompagnement',
          label: 'Accompagnement',
          title: 'Notre rôle à vos côtés',
          intro:
            "Notre mission : vous aider à réussir votre traitement, pas seulement installer un appareil.",
          content: (
            <>
              <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto mb-10">
                {services.map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white border border-[#E8E5DE] rounded-2xl p-7 hover:shadow-md transition-shadow"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mb-5">
                      {service.icon}
                    </div>
                    <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">{service.title}</h3>
                    <p className="text-[#5C5C5C] leading-relaxed">{service.description}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div {...fadeInUp} className="max-w-4xl mx-auto">
                <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10">
                  <h3 className="text-xl text-[#1A1A1A] font-medium mb-3">
                    Un suivi qui ne s'arrête pas après l'installation
                  </h3>
                  <p className="text-[#5C5C5C] mb-6 leading-relaxed">
                    Contrairement au modèle « on pose l'appareil et on part », nous
                    assurons un suivi actif :
                  </p>
                  <ul className="space-y-3">
                    {accompagnement.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                        <span className="text-[#1A1A1A] leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </>
          ),
        },
        {
          id: 'prise-en-charge',
          label: 'Prise en charge',
          title: 'Prise en charge financière',
          content: (
            <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
              <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 lg:p-10">
                <div className="space-y-7 text-[#5C5C5C]">
                  <div>
                    <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">
                      Location mensuelle
                    </h3>
                    <p className="leading-relaxed">
                      L'appareil PPC n'est pas acheté mais loué. Le prestataire est
                      rémunéré par la Sécurité sociale via un forfait de location qui
                      couvre l'appareil, les accessoires et le suivi.
                    </p>
                  </div>
                  <div className="h-px bg-[#E8E5DE]" />
                  <div>
                    <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">
                      Reste à charge souvent nul
                    </h3>
                    <p className="leading-relaxed">
                      La Sécurité sociale prend en charge 60 % et votre mutuelle
                      complète généralement les 40 % restants. Dans la grande majorité
                      des cas, vous n'avez rien à payer.
                    </p>
                  </div>
                  <div className="h-px bg-[#E8E5DE]" />
                  <div>
                    <h3 className="text-lg text-[#1A1A1A] font-medium mb-2">
                      Une utilisation minimale est demandée
                    </h3>
                    <p className="leading-relaxed">
                      Pour maintenir le remboursement, la Sécurité sociale demande une
                      utilisation régulière (en général plus de 3 heures par nuit, au
                      moins 20 jours par mois). Notre accompagnement vous aide à
                      atteindre ces objectifs.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ),
        },
      ]}
      faq={[
        {
          question: "L'appareil est-il bruyant ?",
          answer:
            "Les appareils récents sont très silencieux. La plupart des patients (et leurs conjoints) s'y habituent en quelques nuits.",
        },
        {
          question: 'Et si je ne supporte pas le masque ?',
          answer:
            "Il existe plusieurs types de masques (nasal, narinaire, facial). Nous vous faisons essayer plusieurs modèles et nous ajustons le réglage jusqu'à trouver ce qui vous convient. En cas de difficulté, contactez-nous : il y a presque toujours une solution.",
        },
        {
          question: 'Combien ça coûte ?',
          answer:
            "L'appareil est loué, pas acheté. La Sécurité sociale et votre mutuelle couvrent la location dans la grande majorité des cas : vous n'avez le plus souvent rien à payer.",
        },
        {
          question: 'Puis-je voyager avec mon appareil ?',
          answer:
            'Oui. Les appareils sont compacts et se transportent facilement. Ils sont acceptés en cabine dans la plupart des compagnies aériennes en tant que dispositif médical. Nous vous conseillons avant votre départ.',
        },
      ]}
      cta={{
        title: 'Prêt à choisir Medical ?',
        text: "Que vous soyez déjà appareillé ou sur le point de l'être, contactez-nous pour découvrir notre accompagnement.",
        primary: { label: 'Être rappelé', to: '/contact' },
        secondary: { label: 'Pourquoi Medical', to: '/pourquoi-medical' },
      }}
    />
  );
}
