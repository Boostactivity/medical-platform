/**
 * PathologyLayout — template commun des pages pathologie de la vitrine
 * (Apnée du sommeil, Parcours diagnostic, Traitement PPC).
 *
 * Structure : hero titre serif + sommaire à ancres + sections alternées
 * (blanc / fond chaud) + FAQ courte + CTA consultation.
 *
 * Règles vitrine :
 * - animations limitées : fade-up à l'apparition (initial={false} + whileInView,
 *   pattern screenshot-safe), hover cartes, transitions douces. Rien d'autre.
 * - une seule couleur d'accent (#007AFF), terracotta réservé aux petits CTAs.
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { LucideIcon, ArrowRight } from 'lucide-react';

/** Pattern d'animation vitrine — ne pas réintroduire initial={{opacity:0}}. */
export const fadeInUp = {
  initial: false as const,
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export interface PathologySection {
  /** id d'ancre (ex. "comprendre") */
  id: string;
  /** libellé court affiché dans le sommaire */
  label: string;
  /** titre h2 de la section */
  title: string;
  /** phrase d'introduction optionnelle sous le titre */
  intro?: string;
  /** contenu libre de la section */
  content: ReactNode;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PathologyCta {
  title: string;
  text: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}

interface PathologyLayoutProps {
  badgeIcon: LucideIcon;
  badgeLabel: string;
  title: string;
  intro: string;
  sections: PathologySection[];
  faq: FaqItem[];
  cta: PathologyCta;
}

export function PathologyLayout({
  badgeIcon: BadgeIcon,
  badgeLabel,
  title,
  intro,
  sections,
  faq,
  cta,
}: PathologyLayoutProps) {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-[#FAFAF7] border-b border-[#E8E5DE] pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E8E5DE] px-4 py-2 rounded-full mb-6">
              <BadgeIcon className="w-4 h-4 text-[#007AFF]" />
              <span className="text-sm text-[#1A1A1A]">{badgeLabel}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] mb-5 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-[#5C5C5C] leading-relaxed">{intro}</p>
          </motion.div>

          {/* Sommaire à ancres */}
          <nav
            aria-label="Sommaire de la page"
            className="mt-10 flex flex-wrap justify-center gap-2"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-4 py-2 rounded-full bg-white border border-[#E8E5DE] text-sm text-[#1A1A1A] hover:border-[#007AFF] hover:text-[#007AFF] transition-colors"
              >
                {section.label}
              </a>
            ))}
            {faq.length > 0 && (
              <a
                href="#questions"
                className="px-4 py-2 rounded-full bg-white border border-[#E8E5DE] text-sm text-[#1A1A1A] hover:border-[#007AFF] hover:text-[#007AFF] transition-colors"
              >
                Questions fréquentes
              </a>
            )}
          </nav>
        </div>
      </section>

      {/* Sections de contenu */}
      {sections.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-24 py-16 lg:py-24 ${index % 2 === 1 ? 'bg-[#FAFAF7]' : 'bg-white'}`}
        >
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <motion.div {...fadeInUp} className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-4">
                {section.title}
              </h2>
              {section.intro && (
                <p className="text-lg text-[#5C5C5C] leading-relaxed">{section.intro}</p>
              )}
            </motion.div>
            {section.content}
          </div>
        </section>
      ))}

      {/* FAQ courte */}
      {faq.length > 0 && (
        <section
          id="questions"
          className={`scroll-mt-24 py-16 lg:py-24 ${sections.length % 2 === 1 ? 'bg-[#FAFAF7]' : 'bg-white'}`}
        >
          <div className="max-w-3xl mx-auto px-5 lg:px-8">
            <motion.div {...fadeInUp} className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A]">
                Questions fréquentes
              </h2>
            </motion.div>
            <motion.div {...fadeInUp} className="space-y-3">
              {faq.map((item) => (
                <details
                  key={item.question}
                  className="group bg-white border border-[#E8E5DE] rounded-2xl px-6 py-4 open:shadow-sm transition-shadow"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[#1A1A1A] font-medium">
                    {item.question}
                    <span
                      aria-hidden="true"
                      className="text-[#007AFF] transition-transform group-open:rotate-90"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </summary>
                  <p className="mt-3 text-[#5C5C5C] leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA consultation */}
      <section className="py-16 lg:py-24 bg-white border-t border-[#E8E5DE]">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] mb-5">{cta.title}</h2>
            <p className="text-lg text-[#5C5C5C] mb-8 leading-relaxed">{cta.text}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={cta.primary.to}
                className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-colors inline-flex items-center justify-center"
              >
                {cta.primary.label}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              {cta.secondary && (
                <Link
                  to={cta.secondary.to}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-[#E8E5DE] text-[#1A1A1A] rounded-full hover:border-[#007AFF] hover:text-[#007AFF] transition-colors inline-flex items-center justify-center"
                >
                  {cta.secondary.label}
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
