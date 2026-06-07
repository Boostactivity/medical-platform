/**
 * TenantContext — branding white-label.
 *
 * Charge la marque (brand) du tenant courant depuis Supabase et expose
 * son branding (nom, logo, couleurs). Applique les couleurs aux
 * variables CSS globales pour que tout le design system suive.
 *
 * Résolution V1 : marque par défaut du tenant 'medical'.
 * V2 : résolution par hostname (custom_domain) pour les domaines
 * white-label des PSAD clients.
 *
 * Fallback robuste : si la table brands n'existe pas encore ou que la
 * requête échoue, on garde le branding Medical par défaut — l'app ne
 * casse jamais sur le branding.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '../utils/supabase/client';

export interface TenantBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
  colors: {
    primary: string;
    accent: string;
  };
}

const DEFAULT_BRANDING: TenantBranding = {
  name: 'Medical',
  slug: 'medical',
  logoUrl: null,
  colors: {
    primary: '#007AFF', // bleu Medical — choix Adel 07/06/2026
    accent: '#C45D40',
  },
};

interface TenantContextValue {
  branding: TenantBranding;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  branding: DEFAULT_BRANDING,
  loading: false,
});

function applyBrandingToCss(branding: TenantBranding) {
  const root = document.documentElement;
  root.style.setProperty('--primary', branding.colors.primary);
  root.style.setProperty('--ring', branding.colors.primary);
  root.style.setProperty('--sidebar-primary', branding.colors.primary);
  root.style.setProperty('--sidebar-ring', branding.colors.primary);
  root.style.setProperty('--accent', branding.colors.accent);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadBranding = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('brands')
          .select('slug, name, branding, tenants!inner(slug)')
          .eq('is_default', true)
          .eq('tenants.slug', 'medical')
          .maybeSingle();

        if (cancelled) return;

        if (!error && data) {
          const next: TenantBranding = {
            name: data.name || DEFAULT_BRANDING.name,
            slug: data.slug || DEFAULT_BRANDING.slug,
            logoUrl: data.branding?.logo_url ?? null,
            colors: {
              primary: data.branding?.colors?.primary || DEFAULT_BRANDING.colors.primary,
              accent: data.branding?.colors?.accent || DEFAULT_BRANDING.colors.accent,
            },
          };
          setBranding(next);
          applyBrandingToCss(next);
        }
      } catch {
        // Table absente / réseau KO → branding par défaut, jamais bloquant
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TenantContext.Provider value={{ branding, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
