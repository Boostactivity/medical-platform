import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

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
    <footer className="bg-gradient-to-b from-white to-[#f8fafc] border-t border-[#e2e8f0]">
      <div className="max-w-[980px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[12px] font-semibold text-[#1a2b3c] mb-4 tracking-tight">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[12px] text-[#64748b] hover:text-[#3b82f6] transition-colors block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[#e2e8f0]">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-[12px] text-[#64748b]">
              &copy; {currentYear} {t('footer.copyright')}
            </p>
            <div className="flex items-center space-x-6">
              <Link
                to="/mentions-legales"
                className="text-[12px] text-[#64748b] hover:text-[#3b82f6] transition-colors"
              >
                {t('footer.legal')}
              </Link>
              <Link
                to="/mentions-legales"
                className="text-[12px] text-[#64748b] hover:text-[#3b82f6] transition-colors"
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
