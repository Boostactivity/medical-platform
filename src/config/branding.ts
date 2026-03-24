/**
 * White-label branding configuration.
 *
 * Default values are used as fallback. Each tenant can override these
 * via environment variables (VITE_BRAND_*) or by providing a runtime
 * config object on window.__BRANDING__.
 */

export interface BrandingConfig {
  /** Platform display name */
  name: string;
  /** Short tagline shown below the logo */
  tagline: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Path or URL to the logo */
  logo: string;
  /** Contact email displayed on the site */
  contactEmail: string;
  /** Contact phone displayed on the site */
  contactPhone: string;
}

declare global {
  interface Window {
    __BRANDING__?: Partial<BrandingConfig>;
  }
}

const defaults: BrandingConfig = {
  name: 'MedConnect',
  tagline: 'Plateforme de suivi respiratoire',
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  logo: '/logo.svg',
  contactEmail: 'contact@plateforme.fr',
  contactPhone: '01 XX XX XX XX',
};

function loadBranding(): BrandingConfig {
  // 1. Start with defaults
  const config = { ...defaults };

  // 2. Override from environment variables (build-time, via Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env;
    if (env.VITE_BRAND_NAME) config.name = env.VITE_BRAND_NAME;
    if (env.VITE_BRAND_TAGLINE) config.tagline = env.VITE_BRAND_TAGLINE;
    if (env.VITE_BRAND_PRIMARY_COLOR) config.primaryColor = env.VITE_BRAND_PRIMARY_COLOR;
    if (env.VITE_BRAND_SECONDARY_COLOR) config.secondaryColor = env.VITE_BRAND_SECONDARY_COLOR;
    if (env.VITE_BRAND_LOGO) config.logo = env.VITE_BRAND_LOGO;
    if (env.VITE_BRAND_CONTACT_EMAIL) config.contactEmail = env.VITE_BRAND_CONTACT_EMAIL;
    if (env.VITE_BRAND_CONTACT_PHONE) config.contactPhone = env.VITE_BRAND_CONTACT_PHONE;
  }

  // 3. Override from runtime config (injected per-tenant at deploy time)
  if (typeof window !== 'undefined' && window.__BRANDING__) {
    Object.assign(config, window.__BRANDING__);
  }

  return config;
}

export const branding: BrandingConfig = loadBranding();
