'use client';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, HelpCircle, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from './NotificationBell';
import { useTenant } from '../contexts/TenantContext';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { branding } = useTenant();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    {
      name: 'Comprendre',
      items: [
        { name: "L'apnée du sommeil", to: '/apnee-sommeil' },
        { name: 'Parcours diagnostic', to: '/parcours-diagnostic' },
        { name: 'Traitement PPC', to: '/traitement-ppc' },
      ],
    },
  ];

  const connexionItems = [
    { name: 'Espace Patient', to: '/patient/connexion' },
    { name: 'Espace Médecin', to: '/medecin/connexion' },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <div className="relative bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl px-4 py-2.5 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
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
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link
              to="/"
              className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </Link>
            {navigation.map((item) => (
              <div key={item.name} className="relative">
                {item.items ? (
                  <div
                    onMouseEnter={() => setOpenDropdown(item.name)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all flex items-center gap-1">
                      {item.name}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {openDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.to}
                              className="block px-4 py-3 text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
                              onClick={() => setOpenDropdown(null)}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    to={item.to}
                    className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            <Link
              to="/qui-sommes-nous"
              className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all"
            >
              À propos
            </Link>
            
            <Link
              to="/faq"
              className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              FAQ
            </Link>
            
            <Link
              to="/contact"
              className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all"
            >
              Contact
            </Link>
            
            {/* Connexion Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('Connexion')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all flex items-center gap-1">
                Connexion
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {openDropdown === 'Connexion' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                  >
                    {connexionItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.to}
                        className="block px-4 py-3 text-[#1A1A1A] hover:bg-[#F2F0EB] transition-colors"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <NotificationBell />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white p-2.5 rounded-xl hover:shadow-lg transition-all"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                <Link
                  to="/"
                  className="block px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="w-4 h-4" />
                  Accueil
                </Link>
                {navigation.map((item) => (
                  <div key={item.name}>
                    {item.items ? (
                      <div>
                        <button
                          onClick={() =>
                            setOpenDropdown(openDropdown === item.name ? null : item.name)
                          }
                          className="w-full text-left px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-between"
                        >
                          {item.name}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              openDropdown === item.name ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {openDropdown === item.name && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.items.map((subItem) => (
                              <Link
                                key={subItem.name}
                                to={subItem.to}
                                className="block px-4 py-2 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-lg hover:shadow-lg transition-all"
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setOpenDropdown(null);
                                }}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.to}
                        className="block px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
                <Link
                  to="/qui-sommes-nous"
                  className="block px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  À propos
                </Link>
                
                <Link
                  to="/faq"
                  className="block px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </Link>
                
                <Link
                  to="/contact"
                  className="block px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                
                {/* Connexion Mobile */}
                <div>
                  <button
                    onClick={() =>
                      setOpenDropdown(openDropdown === 'Connexion' ? null : 'Connexion')
                    }
                    className="w-full text-left px-4 py-3 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-between"
                  >
                    Connexion
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openDropdown === 'Connexion' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openDropdown === 'Connexion' && (
                    <div className="ml-4 mt-1 space-y-1">
                      {connexionItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.to}
                          className="block px-4 py-2 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white rounded-lg hover:shadow-lg transition-all"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setOpenDropdown(null);
                          }}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}