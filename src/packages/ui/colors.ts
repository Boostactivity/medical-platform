/**
 * DESIGN SYSTEM - COULEURS
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Palette Apple-inspired : Bleu nuit + Turquoise + Lavande
 */

export const colors = {
  // Primary - Bleu Nuit
  primary: {
    50: '#E6F0FF',
    100: '#CCDEFF',
    200: '#99BEFF',
    300: '#669DFF',
    400: '#337DFF',
    500: '#007AFF', // Main
    600: '#0062CC',
    700: '#004999',
    800: '#003166',
    900: '#001833',
  },

  // Secondary - Turquoise
  secondary: {
    50: '#E6F9FA',
    100: '#CCF3F5',
    200: '#99E7EB',
    300: '#66DBE1',
    400: '#33CFD7',
    500: '#00C3CD', // Main
    600: '#009CA4',
    700: '#00757B',
    800: '#004E52',
    900: '#002729',
  },

  // Accent - Lavande
  accent: {
    50: '#F3EFFF',
    100: '#E7DFFF',
    200: '#CFBFFF',
    300: '#B79FFF',
    400: '#9F7FFF',
    500: '#875FFF', // Main
    600: '#6C4CCC',
    700: '#513999',
    800: '#362666',
    900: '#1B1333',
  },

  // Neutrals - Gris Apple
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F7',
    200: '#E8E8ED',
    300: '#D2D2D7',
    400: '#AEAEB2',
    500: '#86868B',
    600: '#6E6E73',
    700: '#48484A',
    800: '#2C2C2E',
    900: '#1C1C1E',
  },

  // Semantic Colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',

  // Medical Specific
  medical: {
    iah: '#FF3B30',      // Rouge pour IAH critique
    observance: '#34C759', // Vert pour bonne observance
    alert: '#FF9500',     // Orange pour alertes
    device: '#5AC8FA',    // Cyan pour appareil connecté
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F7',
    tertiary: '#E8E8ED',
  },

  // Text
  text: {
    primary: '#1C1C1E',
    secondary: '#86868B',
    tertiary: '#AEAEB2',
    inverse: '#FFFFFF',
  },
} as const;

/**
 * CSS Variables pour compatibilité avec Tailwind
 */
export const cssVariables = `
  --color-primary: ${colors.primary[500]};
  --color-secondary: ${colors.secondary[500]};
  --color-accent: ${colors.accent[500]};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
`;

/**
 * Type-safe color getter
 */
export type ColorKey = keyof typeof colors;
export type PrimaryShade = keyof typeof colors.primary;

export const getColor = (key: ColorKey, shade?: PrimaryShade): string => {
  const colorGroup = colors[key];
  if (typeof colorGroup === 'string') return colorGroup;
  if (shade && typeof colorGroup === 'object') {
    return colorGroup[shade as keyof typeof colorGroup];
  }
  return colorGroup[500];
};
