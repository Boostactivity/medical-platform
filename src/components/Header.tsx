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
    { type: 'link' as const, to: '/contact', label: t('nav.contact') },
    {
      type: 'dropdown' as const,
      label: t('nav.about'),
      items: [
        { to: '/pourquoi-nous', label: t('nav.whyUs') },
        { to: '/qui-sommes-nous', label: t('nav.whoWeAre') },
        { to: '/faq', label: t('nav.faq') },
      ]
    },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-2xl border-b border-[#e2e8f0] shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[980px] mx-auto px-6">
        <div className="flex items-center justify-center h-14 lg:h-16">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Logo */}
            <Link
              to="/"
              className="text-[21px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent tracking-tight hover:opacity-70 transition-opacity"
            >
              {branding.name}
            </Link>

            <div className="w-px h-4 bg-[#e2e8f0]" />

            <div className="flex items-center space-x-8">
              {menuStructure.map((item, index) => {
                if (item.type === 'dropdown') {
                  return (
                    <div
                      key={index}
                      className="relative"
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <button className="text-[12px] text-[#1a2b3c] opacity-70 hover:opacity-100 transition-all flex items-center gap-1">
                        {item.label}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {openDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white/95 backdrop-blur-2xl rounded-lg shadow-lg border border-[#e2e8f0] py-2 overflow-hidden"
                          >
                            {item.items?.map((subItem) => (
                              <Link
                                key={subItem.to}
                                to={subItem.to}
                                onClick={() => setOpenDropdown(null)}
                                className={`block w-full text-left px-4 py-2 text-[12px] transition-all ${
                                  location.pathname === subItem.to
                                    ? 'text-[#3b82f6] opacity-100 font-medium bg-blue-50'
                                    : 'text-[#1a2b3c] opacity-70 hover:opacity-100 hover:bg-[#f8fafc]'
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
                      className={`text-[12px] transition-all ${
                        location.pathname === item.to
                          ? 'text-[#3b82f6] opacity-100 font-medium'
                          : 'text-[#1a2b3c] opacity-70 hover:opacity-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }
              })}

              <Link
                to="/espace-patient"
                className="text-[12px] bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] text-white px-4 py-1.5 rounded-full hover:shadow-md hover:shadow-blue-500/30 transition-all"
              >
                {t('nav.login')}
              </Link>

              <LanguageSwitcher />

              <NotificationBell />
            </div>
          </div>

          {/* Mobile Logo */}
          <Link
            to="/"
            className="lg:hidden text-[21px] font-semibold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent tracking-tight hover:opacity-70 transition-opacity"
          >
            {branding.name}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 ml-auto"
          >
            <div className="w-4 h-3 flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`} />
              <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-full h-0.5 bg-[#1a2b3c] transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white/95 backdrop-blur-2xl border-b border-[#e2e8f0]"
          >
            <div className="max-w-[980px] mx-auto px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block w-full text-left py-3 text-[17px] transition-opacity ${
                    location.pathname === link.to
                      ? 'text-[#3b82f6] opacity-100 font-medium'
                      : 'text-[#1a2b3c] opacity-70'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <Link
                    to="/espace-patient"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left py-3 text-[17px] text-[#3b82f6] font-medium"
                  >
                    {t('nav.patientSpace')}
                  </Link>
                  <Link
                    to="/espace-medecin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left py-3 text-[17px] text-[#7c3aed] font-medium"
                  >
                    {t('nav.doctorSpace')}
                  </Link>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
