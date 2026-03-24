/**
 * Configurable theme system.
 *
 * Reads from branding config and exposes CSS-ready values.
 * Can be loaded from:
 *  - Environment variables (VITE_BRAND_*)
 *  - Runtime window.__BRANDING__ object
 *  - Default values in branding.ts
 */

import { branding } from './branding';

export interface ThemeConfig {
  /** Primary color for buttons, links, accents */
  primaryColor: string;
  /** Secondary/gradient color */
  secondaryColor: string;
  /** Platform logo path or URL */
  logo: string;
  /** Platform display name */
  platformName: string;
  /** Gradient string for primary-to-secondary */
  gradientPrimary: string;
  /** Light variant of primary for backgrounds */
  primaryLight: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function lightenColor(hex: string, amount: number = 0.9): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function createTheme(): ThemeConfig {
  return {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logo: branding.logo,
    platformName: branding.name,
    gradientPrimary: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
    primaryLight: lightenColor(branding.primaryColor, 0.9),
  };
}

export const theme: ThemeConfig = createTheme();

/**
 * Apply theme CSS custom properties to the document root.
 * Call this once at app startup.
 */
export function applyThemeToDOM(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-primary-light', theme.primaryLight);
  root.style.setProperty('--gradient-primary', theme.gradientPrimary);
}
