/**
 * PILIER 1 - RÉACTIVITÉ & FLUIDITÉ
 * TanStack Query Provider pour la gestion du cache et des requêtes
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Configuration du QueryClient avec des paramètres optimisés
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache les données pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garde les données en cache pendant 10 minutes même si non utilisées
      gcTime: 10 * 60 * 1000,
      // Refetch automatique quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,
      // Refetch automatique sur reconnexion réseau
      refetchOnReconnect: true,
      // Retry 2 fois en cas d'erreur
      retry: 2,
      // Délai exponentiel entre les retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry une fois pour les mutations
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Détection simple de l'environnement de développement
  let showDevtools = false;
  
  try {
    // Vérifier si on est en localhost ou développement
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      showDevtools = hostname === 'localhost' || 
                     hostname.includes('127.0.0.1') || 
                     hostname.includes('figmaiframepreview');
    }
  } catch (e) {
    // En cas d'erreur, ne pas montrer les devtools
    showDevtools = false;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools uniquement en développement */}
      {showDevtools && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

export { queryClient };
