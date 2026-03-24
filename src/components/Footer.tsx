import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { branding } from '../config/branding';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  const sections = [
    {
      title: t('footer.discover'),
      links: [
        { label: t('nav.sleepApnea'), to: '/apnee-sommeil' },
        { label: t('nav.diagnosticPath'), to: '/parcours-diagnostic' },
        { label: t('nav.cpapTreatment'), to: '/traitement-ppc' },
        { label: t('nav.whyUs'), to: '/pourquoi-nous' },
      ],
    },
    {
      title: t('footer.spaces'),
      links: [
        { label: t('footer.patientsSpace'), to: '/espace-patient' },
        { label: t('footer.doctorsSpace'), to: '/espace-medecin' },
        { label: t('nav.adminSpace'), to: '/espace-admin' },
        { label: t('nav.faq'), to: '/faq' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { label: t('nav.whoWeAre'), to: '/qui-sommes-nous' },
        { label: t('nav.contact'), to: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-[#f8fafc] border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div>
            <Link to="/" className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
              {branding.name}
            </Link>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{branding.tagline}</p>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-medium text-[#1a2b3c] mb-4 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">
              &copy; {currentYear} {branding.name}. {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/mentions-legales"
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                {t('footer.legal')}
              </Link>
              <Link
                to="/mentions-legales"
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                {t('footer.privacy')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
