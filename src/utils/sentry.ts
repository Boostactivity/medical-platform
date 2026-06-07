/**
 * SENTRY CONFIGURATION - Monitoring & Error Tracking
 * SPRINT 0 - SÉCURITÉ & INFRASTRUCTURE
 * Détection automatique des erreurs + Session Replay + Performance Monitoring
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialise Sentry pour le monitoring
 * À appeler au démarrage de l'application
 */
export function initSentry() {
  try {
    // Vérifier que nous sommes dans un environnement où import.meta.env existe
    if (!import.meta?.env) {
      console.log('[Sentry] Disabled (import.meta.env not available)');
      return;
    }

    // Ne pas initialiser en développement local
    if (import.meta.env.DEV) {
      console.log('[Sentry] Disabled (development mode)');
      return;
    }

    // Vérifier que le DSN existe
    if (!import.meta.env.VITE_SENTRY_DSN) {
      console.log('[Sentry] Disabled (missing VITE_SENTRY_DSN)');
      console.log('[Sentry] Pour activer : Ajouter VITE_SENTRY_DSN=your-dsn dans .env');
      return;
    }

    Sentry.init({
      // DSN fourni par Sentry (à configurer dans .env)
      dsn: import.meta.env.VITE_SENTRY_DSN,

      // Environnement (production, staging, etc.)
      environment: import.meta.env.VITE_ENV || 'production',

      // Version de l'application (pour tracking des releases)
      release: `medical-medical@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

      // Intégrations
      integrations: [
        // Tracing des performances
        new BrowserTracing({
          // Tracer les requêtes vers l'API
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.supabase\.co/,
            /^https:\/\/.*\.vercel\.app/,
            /^https:\/\/.*\.netlify\.app/,
          ],
          
          // Tracer les navigations React Router
          routingInstrumentation: Sentry.reactRouterV6Instrumentation,
        }),
        
        // NOUVEAU : Session Replay (Enregistre vidéo sessions avec erreurs)
        new Sentry.Replay({
          // Masquer automatiquement les données sensibles
          maskAllText: true,
          blockAllMedia: true,
          maskAllInputs: true,
          
          // Configuration privacy-first
          privacy: {
            // Masquer emails, numéros de téléphone, etc.
            maskTextSelector: 'input, textarea, [data-sensitive]',
          },
        }),
      ],

      // Pourcentage de transactions à tracer (performance monitoring)
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

      // Pourcentage de sessions à enregistrer
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,

      // Filtrer les erreurs avant envoi
      beforeSend(event, hint) {
        // Ignorer les erreurs non critiques
        const error = hint.originalException;
        
        // Ignorer les erreurs réseau (offline)
        if (error && error.toString().includes('NetworkError')) {
          return null;
        }

        // Ignorer les erreurs "ChunkLoadError" (reload page)
        if (error && error.toString().includes('ChunkLoadError')) {
          return null;
        }

        // Ignorer les erreurs de script cross-origin (extensions navigateur)
        if (event.exception?.values?.[0]?.value?.includes('Script error')) {
          return null;
        }

        // Ajouter des tags personnalisés
        event.tags = {
          ...event.tags,
          platform: 'web',
          role: getUserRole(),
        };

        // Ajouter le contexte utilisateur (sans données sensibles)
        const userId = getCurrentUserId();
        if (userId) {
          event.user = {
            id: userId,
            // Ne JAMAIS envoyer email, nom, ou données médicales
          };
        }

        return event;
      },

      // Ignorer certaines erreurs courantes
      ignoreErrors: [
        // Erreurs navigateur
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        
        // Erreurs extensions navigateur
        'chrome-extension://',
        'moz-extension://',
        
        // Erreurs réseau
        'Network request failed',
        'Failed to fetch',
      ],

      // Désactiver le reporting automatique en console
      debug: false,
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Récupère le rôle de l'utilisateur actuel (pour contexte Sentry)
 */
function getUserRole(): string {
  try {
    const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    return user?.user?.user_metadata?.role || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

/**
 * Récupère l'ID utilisateur (hashé pour anonymat)
 */
function getCurrentUserId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    const userId = user?.user?.id;
    
    if (!userId) return null;
    
    // Hasher l'ID pour l'anonymiser (pas l'ID réel dans Sentry)
    return hashUserId(userId);
  } catch {
    return null;
  }
}

/**
 * Hash simple pour anonymiser l'ID utilisateur
 */
function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash)}`;
}

/**
 * Capturer manuellement une erreur
 */
export function captureError(error: Error, context?: Record<string, any>) {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
  
  if (isDev) {
    console.error('[Sentry] Error captured:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capturer un message (non-erreur)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
  
  if (isDev) {
    console.log(`[Sentry] Message (${level}):`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Créer un breadcrumb (fil d'Ariane pour debugging)
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Démarrer une transaction de performance
 */
export function startTransaction(name: string, op: string = 'navigation') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Higher-Order Component pour wrapper les composants React
 * et capturer les erreurs automatiquement
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;