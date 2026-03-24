'use client';

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';
import { branding } from '../config/branding';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuStructure = [
    {
      type: 'dropdown' as const,
      label: t('nav.understand'),
      items: [
        { to: '/apnee-sommeil', label: t('nav.sleepApnea') },
        { to: '/parcours-diagnostic', label: t('nav.diagnosticPath') },
        { to: '/traitement-ppc', label: t('nav.cpapTreatment') },
      ]
    },
    { type: 'link' as const, to: '/espace-patient', label: t('nav.patientSpace') },
    { type: 'link' as const, to: '/espace-medecin', label: t('nav.doctorSpace') },
    {
      type: 'dropdown' as const,
      label: t('nav.about'),
      items: [
        { to: '/pourquoi-nous', label: t('nav.whyUs') },
        { to: '/qui-sommes-nous', label: t('nav.whoWeAre') },
        { to: '/faq', label: t('nav.faq') },
      ]
    },
    { type: 'link' as const, to: '/contact', label: t('nav.contact') },
  ];

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/apnee-sommeil', label: t('nav.sleepApnea') },
    { to: '/parcours-diagnostic', label: t('nav.diagnosticPath') },
    { to: '/traitement-ppc', label: t('nav.cpapTreatment') },
    { to: '/pourquoi-nous', label: t('nav.whyUs') },
    { to: '/espace-patient', label: t('nav.patientSpace') },
    { to: '/espace-medecin', label: t('nav.doctorSpace') },
    { to: '/faq', label: t('nav.faq') },
    { to: '/qui-sommes-nous', label: t('nav.whoWeAre') },
    { to: '/contact', label: t('nav.contact') },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm'
          : 'bg-white/60 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-12">
          {/* Logo - Left */}
          <Link
            to="/"
            className="flex-shrink-0 text-lg font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent tracking-tight hover:opacity-70 transition-opacity"
          >
            {branding.name}
          </Link>

          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center gap-8">
            {menuStructure.map((item, index) => {
              if (item.type === 'dropdown') {
                return (
                  <div
                    key={index}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button className="text-sm font-medium text-[#1a2b3c]/70 hover:text-[#1a2b3c] transition-colors flex items-center gap-1 whitespace-nowrap" aria-expanded={openDropdown === item.label} aria-haspopup="true">
                      {item.label}
                      <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {openDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 py-1.5 overflow-hidden"
                        >
                          {item.items?.map((subItem) => (
                            <Link
                              key={subItem.to}
                              to={subItem.to}
                              onClick={() => setOpenDropdown(null)}
                              className={`block px-4 py-2 text-sm transition-colors ${
                                location.pathname === subItem.to
                                  ? 'text-blue-600 bg-blue-50/50 font-medium'
                                  : 'text-[#1a2b3c]/70 hover:text-[#1a2b3c] hover:bg-gray-50'
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              } else {
                return (
                  <Link
                    key={item.to}
                    to={item.to!}
                    className={`text-sm font-medium transition-colors whitespace-nowrap ${
                      location.pathname === item.to
                        ? 'text-blue-600'
                        : 'text-[#1a2b3c]/70 hover:text-[#1a2b3c]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }
            })}
          </div>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            <Link
              to="/espace-patient"
              className="text-sm font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white px-5 py-1.5 rounded-full hover:shadow-md hover:shadow-blue-500/25 transition-all"
            >
              {t('nav.login')}
            </Link>
          </div>

          {/* Mobile: Logo + Hamburger */}
          <div className="flex items-center gap-3 lg:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -mr-2 min-h-12 min-w-12 flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <div className="w-5 h-3.5 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all origin-left ${mobileMenuOpen ? 'rotate-45' : ''}`} />
                <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all origin-left ${mobileMenuOpen ? '-rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200/60"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2.5 text-base transition-colors min-h-12 flex items-center ${
                    location.pathname === link.to
                      ? 'text-blue-600 font-medium'
                      : 'text-[#1a2b3c]/70'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100">
                <Link
                  to="/espace-patient"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center text-sm font-medium bg-gradient-to-r from-blue-600 to-violet-600 text-white w-full py-3 min-h-12 rounded-full"
                >
                  {t('nav.login')}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
