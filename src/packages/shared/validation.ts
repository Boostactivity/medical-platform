/**
 * VALIDATION & SANITIZATION
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * RGPD + HDS compliant - Validation stricte des données médicales
 */

/**
 * Validation d'email (RFC 5322 compliant)
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requis' };
  }

  const trimmed = email.trim().toLowerCase();
  
  // Pattern RFC 5322 simplifié
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email trop long (max 254 caractères)' };
  }

  return { valid: true };
}

/**
 * Validation numéro de téléphone français
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Numéro de téléphone requis' };
  }

  // Retirer espaces, points, tirets
  const cleaned = phone.replace(/[\s.\-()]/g, '');
  
  // Format français : 0X XX XX XX XX ou +33 X XX XX XX XX
  const frenchRegex = /^(?:(?:\+33|0033|0)[1-9]\d{8})$/;
  
  if (!frenchRegex.test(cleaned)) {
    return { valid: false, error: 'Format de téléphone invalide (ex: 06 12 34 56 78)' };
  }

  return { valid: true };
}

/**
 * Validation NIR (Numéro de Sécurité Sociale)
 * Format : 1 YY MM DD DDD CCC KK
 */
export function validateNIR(nir: string): { valid: boolean; error?: string } {
  if (!nir || typeof nir !== 'string') {
    return { valid: false, error: 'NIR requis' };
  }

  const cleaned = nir.replace(/\s/g, '');
  
  // Vérifier longueur (15 caractères)
  if (cleaned.length !== 15) {
    return { valid: false, error: 'NIR doit contenir 15 chiffres' };
  }

  // Vérifier que ce sont des chiffres
  if (!/^\d{15}$/.test(cleaned)) {
    return { valid: false, error: 'NIR doit contenir uniquement des chiffres' };
  }

  // Vérifier le sexe (1 ou 2)
  const sexe = cleaned[0];
  if (sexe !== '1' && sexe !== '2') {
    return { valid: false, error: 'NIR invalide (premier chiffre doit être 1 ou 2)' };
  }

  // Vérifier clé de contrôle (2 derniers chiffres)
  const baseNir = cleaned.slice(0, 13);
  const cle = parseInt(cleaned.slice(13, 15), 10);
  const calculatedCle = 97 - (parseInt(baseNir, 10) % 97);

  if (cle !== calculatedCle) {
    return { valid: false, error: 'NIR invalide (clé de contrôle incorrecte)' };
  }

  return { valid: true };
}

/**
 * Validation IAH (Indice Apnée-Hypopnée)
 * Valeurs : 0-100 événements/heure
 */
export function validateIAH(iah: number): { valid: boolean; error?: string } {
  if (typeof iah !== 'number' || isNaN(iah)) {
    return { valid: false, error: 'IAH doit être un nombre' };
  }

  if (iah < 0) {
    return { valid: false, error: 'IAH ne peut pas être négatif' };
  }

  if (iah > 100) {
    return { valid: false, error: 'IAH ne peut pas dépasser 100' };
  }

  return { valid: true };
}

/**
 * Validation observance (pourcentage)
 * Valeurs : 0-100%
 */
export function validateObservance(observance: number): { valid: boolean; error?: string } {
  if (typeof observance !== 'number' || isNaN(observance)) {
    return { valid: false, error: 'Observance doit être un nombre' };
  }

  if (observance < 0 || observance > 100) {
    return { valid: false, error: 'Observance doit être entre 0 et 100%' };
  }

  return { valid: true };
}

/**
 * Sanitization XSS - Retire les balises HTML dangereuses
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remplacer les caractères dangereux
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validation mot de passe sécurisé (HDS compliant)
 * Minimum 12 caractères, majuscule, minuscule, chiffre, caractère spécial
 */
export function validatePassword(password: string): { valid: boolean; error?: string; strength: number } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Mot de passe requis', strength: 0 };
  }

  let strength = 0;
  const errors: string[] = [];

  // Longueur minimale
  if (password.length < 12) {
    errors.push('Minimum 12 caractères');
  } else {
    strength += 25;
  }

  // Majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Une majuscule minimum');
  } else {
    strength += 25;
  }

  // Minuscule
  if (!/[a-z]/.test(password)) {
    errors.push('Une minuscule minimum');
  } else {
    strength += 25;
  }

  // Chiffre
  if (!/[0-9]/.test(password)) {
    errors.push('Un chiffre minimum');
  } else {
    strength += 15;
  }

  // Caractère spécial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Un caractère spécial minimum');
  } else {
    strength += 10;
  }

  const valid = errors.length === 0;

  return {
    valid,
    error: valid ? undefined : errors.join(', '),
    strength,
  };
}

/**
 * Rate limiting côté client (simple)
 * Empêche les appels API trop fréquents
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  /**
   * @param key - Identifiant unique (ex: "login", "api_call")
   * @param maxAttempts - Nombre max de tentatives
   * @param windowMs - Fenêtre de temps en ms (default: 60000 = 1 minute)
   */
  canProceed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Filtrer les tentatives dans la fenêtre de temps
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Ajouter la nouvelle tentative
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Instance globale du rate limiter
 */
export const rateLimiter = new RateLimiter();
