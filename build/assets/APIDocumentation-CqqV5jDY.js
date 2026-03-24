import{r as l,j as e}from"./index-DGTJtHcF.js";const d=[{method:"GET",path:"/api/v1/patients",description:"Liste tous les patients du prestataire",auth:!0,category:"Patients",params:[{name:"page",type:"integer",required:!1,description:"Numero de page (defaut: 1)"},{name:"per_page",type:"integer",required:!1,description:"Resultats par page (defaut: 20, max: 100)"},{name:"search",type:"string",required:!1,description:"Recherche par nom ou ID patient"},{name:"status",type:"string",required:!1,description:"Filtrer par statut: active, inactive, all"}],responseExample:`{
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
}`},{method:"GET",path:"/api/v1/patients/:id",description:"Detail d'un patient",auth:!0,category:"Patients",params:[{name:"id",type:"string",required:!0,description:"ID unique du patient"}],responseExample:`{
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
}`},{method:"GET",path:"/api/v1/patients/:id/scores",description:"Historique des scores d'un patient",auth:!0,category:"Scores",params:[{name:"id",type:"string",required:!0,description:"ID du patient"},{name:"from",type:"date",required:!1,description:"Date de debut (ISO 8601)"},{name:"to",type:"date",required:!1,description:"Date de fin (ISO 8601)"}],responseExample:`{
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
}`},{method:"GET",path:"/api/v1/patients/:id/telemetry",description:"Donnees telemetriques PPC (nuit par nuit)",auth:!0,category:"Telemetrie",params:[{name:"id",type:"string",required:!0,description:"ID du patient"},{name:"from",type:"date",required:!1,description:"Date de debut"},{name:"to",type:"date",required:!1,description:"Date de fin"},{name:"resolution",type:"string",required:!1,description:"Resolution: night (defaut), hourly, raw"}],responseExample:`{
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
}`},{method:"POST",path:"/api/v1/patients/:id/telemetry",description:"Envoyer des donnees telemetriques (integration machine)",auth:!0,category:"Telemetrie",params:[{name:"id",type:"string",required:!0,description:"ID du patient"}],requestBody:`{
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
}`,responseExample:`{
  "status": "created",
  "telemetry_id": "tel_xyz789"
}`},{method:"GET",path:"/api/v1/alerts",description:"Liste des alertes actives",auth:!0,category:"Alertes",params:[{name:"severity",type:"string",required:!1,description:"Filtrer: critical, warning, info"},{name:"status",type:"string",required:!1,description:"Filtrer: open, acknowledged, resolved"},{name:"patient_id",type:"string",required:!1,description:"Filtrer par patient"}],responseExample:`{
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
}`},{method:"PATCH",path:"/api/v1/alerts/:id",description:"Mettre a jour le statut d'une alerte",auth:!0,category:"Alertes",params:[{name:"id",type:"string",required:!0,description:"ID de l'alerte"}],requestBody:`{
  "status": "acknowledged",
  "note": "Patient contacte par telephone"
}`,responseExample:`{
  "id": "alert_001",
  "status": "acknowledged",
  "updated_at": "2026-03-24T10:30:00Z"
}`},{method:"GET",path:"/api/v1/interventions",description:"Liste des interventions planifiees et passees",auth:!0,category:"Interventions",params:[{name:"patient_id",type:"string",required:!1,description:"Filtrer par patient"},{name:"type",type:"string",required:!1,description:"Type: visit, call, teleconsultation, delivery"},{name:"status",type:"string",required:!1,description:"Statut: planned, completed, cancelled"}],responseExample:`{
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
}`},{method:"POST",path:"/api/v1/interventions",description:"Creer une nouvelle intervention",auth:!0,category:"Interventions",requestBody:`{
  "patient_id": "pat_abc123",
  "type": "call",
  "scheduled_at": "2026-03-28T14:00:00Z",
  "notes": "Suivi observance - baisse detectee"
}`,responseExample:`{
  "id": "int_002",
  "status": "planned",
  "created_at": "2026-03-24T11:00:00Z"
}`}],h={GET:"bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",POST:"bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",PUT:"bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",PATCH:"bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",DELETE:"bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"};function n({code:s}){return e.jsx("pre",{className:"bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-4 overflow-x-auto text-xs leading-relaxed font-mono",children:s})}function f(){const[s,o]=l.useState("all"),[c,m]=l.useState(null),p=[...new Set(d.map(t=>t.category))],u=s==="all"?d:d.filter(t=>t.category===s);return e.jsxs("div",{className:"max-w-5xl mx-auto px-4 py-8 space-y-8",children:[e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx("h1",{className:"text-3xl font-bold text-foreground",children:"API Documentation"}),e.jsx("p",{className:"text-muted-foreground max-w-2xl mx-auto",children:"API REST pour integrer les donnees PPC dans votre systeme d'information hospitalier (SIH), logiciel de cabinet ou application tierce."})]}),e.jsxs("div",{className:"bg-card rounded-2xl border border-border p-6 shadow-sm",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground mb-4",children:"Authentification"}),e.jsxs("p",{className:"text-sm text-muted-foreground mb-4",children:["Toutes les requetes doivent inclure une cle API dans le header ",e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"Authorization"}),". Les cles sont generees depuis le dashboard prestataire dans Parametres > API."]}),e.jsx(n,{code:`curl -X GET "https://api.medconnect.fr/api/v1/patients" \\
  -H "Authorization: Bearer mk_live_abc123def456" \\
  -H "Content-Type: application/json"`}),e.jsxs("div",{className:"mt-4 grid grid-cols-1 md:grid-cols-3 gap-3",children:[e.jsxs("div",{className:"bg-muted/50 rounded-lg p-3",children:[e.jsx("p",{className:"text-xs font-medium text-foreground",children:"Base URL"}),e.jsx("code",{className:"text-xs text-primary font-mono",children:"https://api.medconnect.fr"})]}),e.jsxs("div",{className:"bg-muted/50 rounded-lg p-3",children:[e.jsx("p",{className:"text-xs font-medium text-foreground",children:"Format"}),e.jsx("code",{className:"text-xs text-primary font-mono",children:"JSON (application/json)"})]}),e.jsxs("div",{className:"bg-muted/50 rounded-lg p-3",children:[e.jsx("p",{className:"text-xs font-medium text-foreground",children:"Rate limit"}),e.jsx("code",{className:"text-xs text-primary font-mono",children:"1000 requetes/min"})]})]})]}),e.jsxs("div",{className:"bg-card rounded-2xl border border-border p-6 shadow-sm",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground mb-4",children:"Codes d'erreur"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"text-left py-2 font-medium text-foreground",children:"Code"}),e.jsx("th",{className:"text-left py-2 font-medium text-foreground",children:"Signification"}),e.jsx("th",{className:"text-left py-2 font-medium text-foreground",children:"Description"})]})}),e.jsxs("tbody",{className:"text-muted-foreground",children:[e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"200"}),e.jsx("td",{children:"OK"}),e.jsx("td",{children:"Requete reussie"})]}),e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"201"}),e.jsx("td",{children:"Created"}),e.jsx("td",{children:"Ressource creee"})]}),e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"400"}),e.jsx("td",{children:"Bad Request"}),e.jsx("td",{children:"Parametres invalides"})]}),e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"401"}),e.jsx("td",{children:"Unauthorized"}),e.jsx("td",{children:"Cle API manquante ou invalide"})]}),e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"403"}),e.jsx("td",{children:"Forbidden"}),e.jsx("td",{children:"Acces refuse (patient d'un autre prestataire)"})]}),e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-2 font-mono",children:"404"}),e.jsx("td",{children:"Not Found"}),e.jsx("td",{children:"Ressource introuvable"})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"py-2 font-mono",children:"429"}),e.jsx("td",{children:"Too Many Requests"}),e.jsx("td",{children:"Rate limit depasse"})]})]})]})})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap",children:[e.jsx("button",{onClick:()=>o("all"),className:`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${s==="all"?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-accent"}`,children:"Tous les endpoints"}),p.map(t=>e.jsx("button",{onClick:()=>o(t),className:`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${s===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-accent"}`,children:t},t))]}),e.jsx("div",{className:"space-y-3",children:u.map((t,x)=>{const i=`${t.method}-${t.path}`,a=c===i;return e.jsxs("div",{className:"bg-card rounded-xl border border-border shadow-sm overflow-hidden",children:[e.jsxs("button",{onClick:()=>m(a?null:i),className:"w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors",children:[e.jsx("span",{className:`px-2 py-0.5 rounded text-xs font-bold font-mono ${h[t.method]}`,children:t.method}),e.jsx("code",{className:"text-sm font-mono text-foreground flex-1",children:t.path}),e.jsx("span",{className:"text-xs text-muted-foreground hidden md:block",children:t.description}),e.jsx("svg",{className:`w-4 h-4 text-muted-foreground transition-transform ${a?"rotate-180":""}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M19 9l-7 7-7-7"})})]}),a&&e.jsxs("div",{className:"px-4 pb-4 space-y-4 border-t border-border pt-4",children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:t.description}),t.auth&&e.jsx("div",{className:"flex items-center gap-2 text-xs",children:e.jsx("span",{className:"bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded",children:"Authentification requise"})}),t.params&&t.params.length>0&&e.jsxs("div",{children:[e.jsx("h5",{className:"text-sm font-medium text-foreground mb-2",children:"Parametres"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-xs",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"text-left py-1.5 font-medium text-foreground",children:"Nom"}),e.jsx("th",{className:"text-left py-1.5 font-medium text-foreground",children:"Type"}),e.jsx("th",{className:"text-left py-1.5 font-medium text-foreground",children:"Requis"}),e.jsx("th",{className:"text-left py-1.5 font-medium text-foreground",children:"Description"})]})}),e.jsx("tbody",{className:"text-muted-foreground",children:t.params.map(r=>e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("td",{className:"py-1.5 font-mono",children:r.name}),e.jsx("td",{className:"py-1.5",children:r.type}),e.jsx("td",{className:"py-1.5",children:r.required?"Oui":"Non"}),e.jsx("td",{className:"py-1.5",children:r.description})]},r.name))})]})})]}),t.requestBody&&e.jsxs("div",{children:[e.jsx("h5",{className:"text-sm font-medium text-foreground mb-2",children:"Corps de la requete"}),e.jsx(n,{code:t.requestBody})]}),e.jsxs("div",{children:[e.jsx("h5",{className:"text-sm font-medium text-foreground mb-2",children:"Exemple de reponse"}),e.jsx(n,{code:t.responseExample})]})]})]},x)})}),e.jsxs("div",{className:"bg-card rounded-2xl border border-border p-6 shadow-sm",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground mb-4",children:"Webhooks"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-4",children:"Configurez des webhooks pour recevoir des notifications en temps reel lorsque des evenements se produisent."}),e.jsxs("div",{className:"space-y-2 text-sm text-muted-foreground",children:[e.jsxs("p",{children:[e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"patient.alert.created"})," - Nouvelle alerte patient"]}),e.jsxs("p",{children:[e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"patient.telemetry.received"})," - Nouvelles donnees telemetriques"]}),e.jsxs("p",{children:[e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"patient.score.updated"})," - Score patient mis a jour"]}),e.jsxs("p",{children:[e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"intervention.status.changed"})," - Changement de statut d'intervention"]}),e.jsxs("p",{children:[e.jsx("code",{className:"bg-muted px-1.5 py-0.5 rounded text-xs font-mono",children:"order.created"})," - Nouvelle commande consommable"]})]})]}),e.jsx("p",{className:"text-xs text-muted-foreground text-center pb-8",children:"API v1.0 - Pour obtenir une cle API, contactez votre administrateur ou rendez-vous dans Parametres > API. Conformite RGPD et HDS (Hebergement Donnees de Sante)."})]})}export{f as APIDocumentation,f as default};
