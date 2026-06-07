import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

export function Footer() {
  const { branding } = useTenant();
  const footerLinks = {
    'Comprendre': [
      { name: "L'apnée du sommeil", href: '/apnee-sommeil' },
      { name: 'Parcours diagnostic', href: '/parcours-diagnostic' },
      { name: 'Traitement PPC', href: '/traitement-ppc' },
    ],
    [branding.name]: [
      { name: 'Pourquoi nous choisir', href: '/pourquoi-medical' },
      { name: 'Qui sommes-nous', href: '/qui-sommes-nous' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Contact', href: '/contact' },
    ],
    'Espaces': [
      { name: 'Espace Patient', href: '/patient/connexion' },
      { name: 'Espace Médecin', href: '/medecin/connexion' },
      { name: 'Espace Admin', href: '/pro/connexion' },
    ],
    'Légal': [
      { name: 'Mentions légales', href: '/mentions-legales' },
      { name: 'Politique de confidentialité', href: '/mentions-legales#confidentialite' },
      { name: 'Données de santé', href: '/mentions-legales#donnees-sante' },
    ],
  };

  return (
    <footer className="bg-[#F2F0EB] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.name} className="h-7 w-auto" />
                  ) : (
                    <>
                      <span className="text-white font-bold text-2xl">{branding.name.charAt(0)}</span>
                      <div className="border-l-2 border-white/30 h-6 mx-1"></div>
                      <span className="text-white font-medium text-base tracking-wide">{branding.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[#5C5C5C] mb-6 max-w-sm">
              Votre partenaire de confiance pour le traitement de l'apnée du sommeil à domicile.
              Accompagnement personnalisé et technologie moderne.
            </p>
            <div className="space-y-3">
              <div className="flex items-center text-[#5C5C5C]">
                <Phone className="w-5 h-5 mr-3 text-[#007AFF]" />
                <span>01 XX XX XX XX</span>
              </div>
              <div className="flex items-center text-[#5C5C5C]">
                <Mail className="w-5 h-5 mr-3 text-[#007AFF]" />
                <span>contact@medical-sante.fr</span>
              </div>
              <div className="flex items-start text-[#5C5C5C]">
                <MapPin className="w-5 h-5 mr-3 text-[#007AFF] mt-0.5" />
                <span>Paris, France</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[#1A1A1A] mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[#5C5C5C] hover:text-[#007AFF] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mention réglementaire dispositifs médicaux (obligatoire) */}
        <div className="pt-6 pb-2">
          <p className="text-[#5C5C5C] text-xs leading-relaxed max-w-4xl">
            Les appareils de pression positive continue (PPC) et leurs accessoires sont des
            dispositifs médicaux réglementés qui portent, au titre de cette réglementation,
            le marquage CE. Ils sont destinés au traitement du syndrome d'apnées du sommeil
            sur prescription médicale. Lisez attentivement la notice d'utilisation du
            fabricant. Demandez conseil à votre médecin.
          </p>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-300">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-[#5C5C5C] text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} {branding.name}. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-[#5C5C5C]">
                Prestataire de santé à domicile agréé
              </span>
              <span className="text-sm text-[#5C5C5C]">Certifié HAS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}