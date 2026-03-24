/**
 * ═══════════════════════════════════════════════════════════════════
 * BOUTON PRO SANTÉ CONNECT - Conforme design officiel ANS
 * ═══════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { projectId } from '../utils/supabase/info';

interface ProSanteConnectButtonProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function ProSanteConnectButton({ 
  className = '', 
  size = 'medium',
  onClick
}: ProSanteConnectButtonProps) {
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Rediriger vers l'endpoint PSC de notre backend
      const pscLoginUrl = `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/auth/psc/login`;
      window.location.href = pscLoginUrl;
    }
  };

  // Tailles des boutons selon les guidelines PSC
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex items-center justify-center gap-3
        bg-white border-2 border-[#1E3A8A] 
        text-[#1E3A8A] 
        rounded-xl 
        hover:bg-[#1E3A8A] hover:text-white
        transition-all duration-300
        shadow-md hover:shadow-xl
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Logo Pro Santé Connect (icône de santé stylisée) */}
      <div className="flex items-center justify-center w-8 h-8 bg-[#1E3A8A] rounded-full">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" 
            fill="white"
          />
          <path 
            d="M12 6L8 8V11.5C8 14.26 9.58 16.87 12 18C14.42 16.87 16 14.26 16 11.5V8L12 6Z" 
            fill="#1E3A8A"
          />
        </svg>
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-xs opacity-75">S'identifier avec</span>
        <span className="font-semibold">Pro Santé Connect</span>
      </div>
    </button>
  );
}

/**
 * Variante "badge" pour afficher dans les profils déjà connectés via PSC
 */
export function ProSanteConnectBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1E3A8A]/10 border border-[#1E3A8A]/30 rounded-full">
      <div className="flex items-center justify-center w-5 h-5 bg-[#1E3A8A] rounded-full">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-3 h-3"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L4 6V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V6L12 2Z" 
            fill="white"
          />
        </svg>
      </div>
      <span className="text-xs text-[#1E3A8A]">Authentifié via PSC</span>
    </div>
  );
}
