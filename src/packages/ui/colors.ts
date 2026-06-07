/**
 * DESIGN SYSTEM "GOLDILOCKS" - COULEURS
 * Package partagé entre Web & Mobile (futur monorepo)
 *
 * Source de vérité : research/12_PATTERNS_DESIGN_TON_BRANDING_SANTE.md
 * Ancrage bleu profond + accent terracotta + neutres chauds.
 * Sémantique alignée DSFR. Jamais de gris béton / bleu pharmacie.
 */

export const colors = {
  // Primary - Bleu Medical #007AFF (choix Adel 07/06/2026 — identité de la plateforme)
  primary: {
    50: '#E5F2FF',
    100: '#CCE4FF',
    200: '#99CAFF',
    300: '#66AFFF',
    400: '#3395FF',
    500: '#007AFF', // Main
    600: '#0051D5',
    700: '#003DA3',
    800: '#002A70',
    900: '#00173D',
  },

  // Secondary - Bleu ciel : états informatifs, gradients de soutien
  secondary: {
    50: '#EBF8FE',
    100: '#D6F1FE',
    200: '#ADE3FD',
    300: '#84D6FB',
    400: '#5AC8FA',
    500: '#32B3EF', // Main
    600: '#1E93C9',
    700: '#1573A0',
    800: '#0D5277',
    900: '#06324D',
  },

  // Accent - Terracotta (chaleur, CTAs — jamais en masse)
  accent: {
    50: '#FAF0EC',
    100: '#F3DCD4',
    200: '#E7B9A9',
    300: '#DB967E',
    400: '#CF7353',
    500: '#C45D40', // Main
    600: '#A34D35',
    700: '#823D2A',
    800: '#622E20',
    900: '#411F15',
  },

  // Neutrals - Blancs chauds (anti "hôpital triste")
  neutral: {
    50: '#FAFAF7',
    100: '#F2F0EB',
    200: '#E8E5DE',
    300: '#D9D5CC',
    400: '#C9C5BB',
    500: '#A8A49C',
    600: '#7D7A73',
    700: '#5C5C5C',
    800: '#3A3936',
    900: '#1A1A1A',
  },

  // Semantic Colors (DSFR-align)
  success: '#18753C',
  warning: '#B34000',
  error: '#CE0500',
  info: '#007AFF',

  // Medical Specific
  medical: {
    iah: '#CE0500',        // Rouge — IAH critique (danger réel uniquement)
    observance: '#18753C', // Vert apaisé — bonne observance
    alert: '#B34000',      // Orange profond — alertes (pas alarmiste)
    device: '#007AFF',     // Bleu info — appareil connecté
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAF7',
    tertiary: '#F2F0EB',
  },

  // Text
  text: {
    primary: '#1A1A1A',
    secondary: '#5C5C5C',
    tertiary: '#A8A49C',
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
