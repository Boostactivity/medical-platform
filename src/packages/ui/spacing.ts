/**
 * DESIGN SYSTEM - ESPACEMENT
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * System 8px - Cohérent avec Apple Human Interface Guidelines
 */

export const spacing = {
  /** 0px */
  none: 0,
  /** 4px - Micro */
  xs: 4,
  /** 8px - Small */
  sm: 8,
  /** 12px - Medium-Small */
  md: 12,
  /** 16px - Medium */
  base: 16,
  /** 20px - Medium-Large */
  lg: 20,
  /** 24px - Large */
  xl: 24,
  /** 32px - Extra Large */
  '2xl': 32,
  /** 40px - 2X Extra Large */
  '3xl': 40,
  /** 48px - 3X Extra Large */
  '4xl': 48,
  /** 64px - Huge */
  '5xl': 64,
  /** 80px - Extra Huge */
  '6xl': 80,
} as const;

export const radius = {
  /** 0px - Square */
  none: 0,
  /** 4px - Subtle */
  sm: 4,
  /** 8px - Small */
  md: 8,
  /** 12px - Medium */
  lg: 12,
  /** 16px - Large */
  xl: 16,
  /** 24px - Extra Large */
  '2xl': 24,
  /** 9999px - Full (Pills) */
  full: 9999,
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

/**
 * Breakpoints responsive (mobile-first)
 */
export const breakpoints = {
  sm: 640,   // Mobile landscape
  md: 768,   // Tablet portrait
  lg: 1024,  // Tablet landscape / Desktop
  xl: 1280,  // Desktop large
  '2xl': 1536, // Desktop extra large
} as const;

export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadows;
