import React, { useState } from 'react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responseExample: string;
  category: string;
}

const ENDPOINTS: Endpoint[] = [
  // Patients
  {
    method: 'GET', path: '/api/v1/patients', description: 'Liste tous les patients du prestataire',
    auth: true, category: 'Patients',
    params: [
      { name: 'page', type: 'integer', required: false, description: 'Numero de page (defaut: 1)' },
      { name: 'per_page', type: 'integer', required: false, description: 'Resultats par page (defaut: 20, max: 100)' },
      { name: 'search', type: 'string', required: false, description: 'Recherche par nom ou ID patient' },
      { name: 'status', type: 'string', required: false, description: 'Filtrer par statut: active, inactive, all' },
    ],
    responseExample: `{
  "data": [
    {
      "id": "pat_abc123",
      "external_id": "12345",
      "created_at": "2025-01-15T10:30:00Z",
      "status": "active",
      "equipment": {
        "machine": "ResMed AirSense 11",
        "mask_type": "nasal",
        "mask_model": "AirFit N20"
      },
      "last_telemetry": "2026-03-24T06:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  }
}`,
  },
  {
    method: 'GET', path: '/api/v1/patients/:id', description: 'Detail d\'un patient',
    auth: true, category: 'Patients',
    params: [
      { name: 'id', type: 'string', required: true, description: 'ID unique du patient' },
    ],
    responseExample: `{
  "id": "pat_abc123",
  "external_id": "12345",
  "status": "active",
  "diagnosis": {
    "iah_initial": 35,
    "severity": "severe",
    "diagnosed_at": "2024-11-20"
  },
  "equipment": {
    "machine": "ResMed AirSense 11",
    "mask_type": "nasal",
    "mask_model": "AirFit N20",
    "installed_at": "2025-01-15"
  },
  "scores": {
    "global_score": 78,
    "observance_30d": 82,
    "dropout_risk": 23
  }
}`,
  },
  // Scores
  {
    method: 'GET', path: '/api/v1/patients/:id/scores', description: 'Historique des scores d\'un patient',
    auth: true, category: 'Scores',
    params: [
      { name: 'id', type: 'string', required: true, description: 'ID du patient' },
      { name: 'from', type: 'date', required: false, description: 'Date de debut (ISO 8601)' },
      { name: 'to', type: 'date', required: false, description: 'Date de fin (ISO 8601)' },
    ],
    responseExample: `{
  "patient_id": "pat_abc123",
  "scores": [
    {
      "date": "2026-03-24",
      "global_score": 78,
      "observance_score": 82,
      "efficacy_score": 75,
      "comfort_score": 71,
      "iah_residuel": 3.2
    },
    {
      "date": "2026-03-23",
      "global_score": 76,
      "observance_score": 80,
      "efficacy_score": 74,
      "comfort_score": 70,
      "iah_residuel": 3.5
    }
  ]
}`,
  },
  // Telemetrie
  {
    method: 'GET', path: '/api/v1/patients/:id/telemetry', description: 'Donnees telemetriques PPC (nuit par nuit)',
    auth: true, category: 'Telemetrie',
    params: [
      { name: 'id', type: 'string', required: true, description: 'ID du patient' },
      { name: 'from', type: 'date', required: false, description: 'Date de debut' },
      { name: 'to', type: 'date', required: false, description: 'Date de fin' },
      { name: 'resolution', type: 'string', required: false, description: 'Resolution: night (defaut), hourly, raw' },
    ],
    responseExample: `{
  "patient_id": "pat_abc123",
  "telemetry": [
    {
      "date": "2026-03-24",
      "usage_hours": 6.5,
      "iah": 2.8,
      "pressure_avg": 10.2,
      "pressure_p95": 12.4,
      "leak_avg": 8.3,
      "leak_p95": 18.1,
      "mask_events": 2,
      "spo2_avg": 95.2,
      "spo2_min": 88
    }
  ]
}`,
  },
  {
    method: 'POST', path: '/api/v1/patients/:id/telemetry', description: 'Envoyer des donnees telemetriques (integration machine)',
    auth: true, category: 'Telemetrie',
    params: [
      { name: 'id', type: 'string', required: true, description: 'ID du patient' },
    ],
    requestBody: `{
  "date": "2026-03-24",
  "usage_hours": 6.5,
  "iah": 2.8,
  "pressure_avg": 10.2,
  "leak_avg": 8.3,
  "events": {
    "obstructive": 12,
    "central": 3,
    "hypopnea": 6
  }
}`,
    responseExample: `{
  "status": "created",
  "telemetry_id": "tel_xyz789"
}`,
  },
  // Alertes
  {
    method: 'GET', path: '/api/v1/alerts', description: 'Liste des alertes actives',
    auth: true, category: 'Alertes',
    params: [
      { name: 'severity', type: 'string', required: false, description: 'Filtrer: critical, warning, info' },
      { name: 'status', type: 'string', required: false, description: 'Filtrer: open, acknowledged, resolved' },
      { name: 'patient_id', type: 'string', required: false, description: 'Filtrer par patient' },
    ],
    responseExample: `{
  "data": [
    {
      "id": "alert_001",
      "patient_id": "pat_abc123",
      "type": "low_usage",
      "severity": "warning",
      "message": "Utilisation < 2h les 3 dernieres nuits",
      "created_at": "2026-03-24T08:00:00Z",
      "status": "open"
    }
  ],
  "total": 12
}`,
  },
  {
    method: 'PATCH', path: '/api/v1/alerts/:id', description: 'Mettre a jour le statut d\'une alerte',
    auth: true, category: 'Alertes',
    params: [
      { name: 'id', type: 'string', required: true, description: 'ID de l\'alerte' },
    ],
    requestBody: `{
  "status": "acknowledged",
  "note": "Patient contacte par telephone"
}`,
    responseExample: `{
  "id": "alert_001",
  "status": "acknowledged",
  "updated_at": "2026-03-24T10:30:00Z"
}`,
  },
  // Interventions
  {
    method: 'GET', path: '/api/v1/interventions', description: 'Liste des interventions planifiees et passees',
    auth: true, category: 'Interventions',
    params: [
      { name: 'patient_id', type: 'string', required: false, description: 'Filtrer par patient' },
      { name: 'type', type: 'string', required: false, description: 'Type: visit, call, teleconsultation, delivery' },
      { name: 'status', type: 'string', required: false, description: 'Statut: planned, completed, cancelled' },
    ],
    responseExample: `{
  "data": [
    {
      "id": "int_001",
      "patient_id": "pat_abc123",
      "type": "visit",
      "status": "planned",
      "scheduled_at": "2026-03-28T14:00:00Z",
      "technician_id": "tech_456",
      "notes": "Ajustement masque + verification fuites"
    }
  ]
}`,
  },
  {
    method: 'POST', path: '/api/v1/interventions', description: 'Creer une nouvelle intervention',
    auth: true, category: 'Interventions',
    requestBody: `{
  "patient_id": "pat_abc123",
  "type": "call",
  "scheduled_at": "2026-03-28T14:00:00Z",
  "notes": "Suivi observance - baisse detectee"
}`,
    responseExample: `{
  "id": "int_002",
  "status": "planned",
  "created_at": "2026-03-24T11:00:00Z"
}`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  POST: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  PUT: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  PATCH: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  DELETE: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-4 overflow-x-auto text-xs leading-relaxed font-mono">
      {code}
    </pre>
  );
}

export function APIDocumentation() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const categories = [...new Set(ENDPOINTS.map(e => e.category))];

  const filtered = selectedCategory === 'all'
    ? ENDPOINTS
    : ENDPOINTS.filter(e => e.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-foreground">API Documentation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          API REST pour integrer les donnees PPC dans votre systeme d'information hospitalier (SIH),
          logiciel de cabinet ou application tierce.
        </p>
      </div>

      {/* Auth section */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Authentification</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Toutes les requetes doivent inclure une cle API dans le header <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code>.
          Les cles sont generees depuis le dashboard prestataire dans Parametres &gt; API.
        </p>
        <CodeBlock code={`curl -X GET "https://api.medconnect.fr/api/v1/patients" \\
  -H "Authorization: Bearer mk_live_abc123def456" \\
  -H "Content-Type: application/json"`} />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground">Base URL</p>
            <code className="text-xs text-primary font-mono">https://api.medconnect.fr</code>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground">Format</p>
            <code className="text-xs text-primary font-mono">JSON (application/json)</code>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground">Rate limit</p>
            <code className="text-xs text-primary font-mono">1000 requetes/min</code>
          </div>
        </div>
      </div>

      {/* Error codes */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Codes d'erreur</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-foreground">Code</th>
                <th className="text-left py-2 font-medium text-foreground">Signification</th>
                <th className="text-left py-2 font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border"><td className="py-2 font-mono">200</td><td>OK</td><td>Requete reussie</td></tr>
              <tr className="border-b border-border"><td className="py-2 font-mono">201</td><td>Created</td><td>Ressource creee</td></tr>
              <tr className="border-b border-border"><td className="py-2 font-mono">400</td><td>Bad Request</td><td>Parametres invalides</td></tr>
              <tr className="border-b border-border"><td className="py-2 font-mono">401</td><td>Unauthorized</td><td>Cle API manquante ou invalide</td></tr>
              <tr className="border-b border-border"><td className="py-2 font-mono">403</td><td>Forbidden</td><td>Acces refuse (patient d'un autre prestataire)</td></tr>
              <tr className="border-b border-border"><td className="py-2 font-mono">404</td><td>Not Found</td><td>Ressource introuvable</td></tr>
              <tr><td className="py-2 font-mono">429</td><td>Too Many Requests</td><td>Rate limit depasse</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Tous les endpoints
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {filtered.map((endpoint, i) => {
          const key = `${endpoint.method}-${endpoint.path}`;
          const isExpanded = expandedEndpoint === key;

          return (
            <div key={i} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${METHOD_COLORS[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
                <span className="text-xs text-muted-foreground hidden md:block">{endpoint.description}</span>
                <svg className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>

                  {endpoint.auth && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                        Authentification requise
                      </span>
                    </div>
                  )}

                  {endpoint.params && endpoint.params.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2">Parametres</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-1.5 font-medium text-foreground">Nom</th>
                              <th className="text-left py-1.5 font-medium text-foreground">Type</th>
                              <th className="text-left py-1.5 font-medium text-foreground">Requis</th>
                              <th className="text-left py-1.5 font-medium text-foreground">Description</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            {endpoint.params.map(p => (
                              <tr key={p.name} className="border-b border-border">
                                <td className="py-1.5 font-mono">{p.name}</td>
                                <td className="py-1.5">{p.type}</td>
                                <td className="py-1.5">{p.required ? 'Oui' : 'Non'}</td>
                                <td className="py-1.5">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {endpoint.requestBody && (
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2">Corps de la requete</h5>
                      <CodeBlock code={endpoint.requestBody} />
                    </div>
                  )}

                  <div>
                    <h5 className="text-sm font-medium text-foreground mb-2">Exemple de reponse</h5>
                    <CodeBlock code={endpoint.responseExample} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhooks */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Webhooks</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configurez des webhooks pour recevoir des notifications en temps reel lorsque des evenements se produisent.
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">patient.alert.created</code> - Nouvelle alerte patient</p>
          <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">patient.telemetry.received</code> - Nouvelles donnees telemetriques</p>
          <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">patient.score.updated</code> - Score patient mis a jour</p>
          <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">intervention.status.changed</code> - Changement de statut d'intervention</p>
          <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">order.created</code> - Nouvelle commande consommable</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-8">
        API v1.0 - Pour obtenir une cle API, contactez votre administrateur ou rendez-vous dans Parametres &gt; API.
        Conformite RGPD et HDS (Hebergement Donnees de Sante).
      </p>
    </div>
  );
}

export default APIDocumentation;
