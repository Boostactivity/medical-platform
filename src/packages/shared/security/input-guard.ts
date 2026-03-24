/**
 * INPUT GUARD - Sécurisation des entrées utilisateur
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Protection contre : XSS, SQL Injection, Command Injection, Path Traversal
 */

/**
 * Liste noire de patterns dangereux
 */
const DANGEROUS_PATTERNS = [
  // XSS basique
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  
  // SQL Injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(UNION\s+SELECT)/gi,
  /('|"|;|--|\/\*|\*\/)/g,
  
  // Command Injection
  /[;&|`$(){}[\]<>]/g,
  
  // Path Traversal
  /\.\.\//g,
  /\.\.\\\/g,
];

/**
 * Valider et nettoyer une entrée utilisateur
 */
export function sanitizeInput(input: string, options: {
  allowHTML?: boolean;
  maxLength?: number;
  allowSpecialChars?: boolean;
} = {}): string {
  const {
    allowHTML = false,
    maxLength = 1000,
    allowSpecialChars = false,
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Limiter la longueur
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Si HTML n'est pas autorisé, échapper tous les caractères HTML
  if (!allowHTML) {
    sanitized = escapeHTML(sanitized);
  }

  // Si caractères spéciaux non autorisés, les supprimer
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[<>{}[\]\\\/]/g, '');
  }

  // Vérifier les patterns dangereux
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn('[InputGuard] Dangerous pattern detected:', pattern);
      return ''; // Rejeter l'entrée complètement
    }
  }

  return sanitized;
}

/**
 * Échapper les caractères HTML
 */
function escapeHTML(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, char => htmlEscapeMap[char] || char);
}

/**
 * Valider que l'input ne contient que des caractères autorisés
 */
export function validateCharacterSet(
  input: string,
  allowedPattern: RegExp
): boolean {
  return allowedPattern.test(input);
}

/**
 * Presets de patterns courants
 */
export const ALLOWED_PATTERNS = {
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_SPACE: /^[a-zA-Z0-9\s]+$/,
  ALPHANUMERIC_EXTENDED: /^[a-zA-Z0-9\s\-_.,!?]+$/,
  NUMERIC: /^[0-9]+$/,
  FRENCH_PHONE: /^(?:(?:\+33|0033|0)[1-9]\d{8})$/,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
};

/**
 * Classe InputGuard pour validation complète
 */
export class InputGuard {
  /**
   * Valider un email
   */
  static validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = sanitizeInput(email, { maxLength: 254 });
    
    if (!ALLOWED_PATTERNS.EMAIL.test(sanitized)) {
      return { valid: false, sanitized, error: 'Format email invalide' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Valider un téléphone français
   */
  static validatePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = phone.replace(/[\s.\-()]/g, '');
    
    if (!ALLOWED_PATTERNS.FRENCH_PHONE.test(sanitized)) {
      return { valid: false, sanitized, error: 'Format téléphone invalide' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Valider un texte libre (commentaire, note, etc.)
   */
  static validateFreeText(text: string, maxLength: number = 1000): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = sanitizeInput(text, { 
      maxLength,
      allowSpecialChars: true 
    });
    
    if (sanitized.length === 0 && text.length > 0) {
      return { valid: false, sanitized, error: 'Texte contient des caractères non autorisés' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Valider un nom (prénom, nom de famille)
   */
  static validateName(name: string): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = sanitizeInput(name, { maxLength: 100 });
    
    // Autoriser lettres, espaces, tirets, apostrophes (noms composés)
    const namePattern = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    
    if (!namePattern.test(sanitized)) {
      return { valid: false, sanitized, error: 'Nom contient des caractères invalides' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Valider un numéro (NIR, numéro dossier, etc.)
   */
  static validateNumericCode(code: string, expectedLength?: number): { valid: boolean; sanitized: string; error?: string } {
    const sanitized = code.replace(/\s/g, '');
    
    if (!ALLOWED_PATTERNS.NUMERIC.test(sanitized)) {
      return { valid: false, sanitized, error: 'Code doit contenir uniquement des chiffres' };
    }
    
    if (expectedLength && sanitized.length !== expectedLength) {
      return { valid: false, sanitized, error: `Code doit contenir ${expectedLength} chiffres` };
    }
    
    return { valid: true, sanitized };
  }
}

/**
 * Middleware pour formulaires React
 * 
 * @example
 * ```tsx
 * const [email, setEmail] = useState('');
 * 
 * const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const { valid, sanitized } = guardInput(e.target.value, 'email');
 *   if (valid) {
 *     setEmail(sanitized);
 *   }
 * };
 * ```
 */
export function guardInput(
  value: string,
  type: 'email' | 'phone' | 'name' | 'text' | 'numeric'
): { valid: boolean; sanitized: string; error?: string } {
  switch (type) {
    case 'email':
      return InputGuard.validateEmail(value);
    case 'phone':
      return InputGuard.validatePhone(value);
    case 'name':
      return InputGuard.validateName(value);
    case 'text':
      return InputGuard.validateFreeText(value);
    case 'numeric':
      return InputGuard.validateNumericCode(value);
    default:
      return { valid: false, sanitized: '', error: 'Type de validation inconnu' };
  }
}
