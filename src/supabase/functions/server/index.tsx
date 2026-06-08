/**
 * Composition root — Edge Function server.
 * All route logic lives in ./routes/* sub-apps; auth lives in ./middleware/auth.ts.
 * Public URLs are unchanged (prefix /make-server-50732e52).
 */

import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';

// Middlewares
import { auditMiddleware } from './audit-middleware.ts';
import { requireAuth, requireRole, type AuthEnv } from './middleware/auth.ts';

// Route modules (refactored)
import dashboardsRoutes from './routes/dashboards.ts';
import prestataireOpsRoutes from './routes/prestataire-ops.ts';
import alertsRoutes from './routes/alerts-routes.ts';
import telemetryRoutes from './routes/telemetry.ts';
import observanceBillingRoutes from './routes/observance-billing.ts';
import stockParcRoutes from './routes/stock-parc.ts';
import psdmRoutes from './routes/psdm.ts';
import patientPortalRoutes from './routes/patient-portal.ts';
import publicVitrineRoutes from './routes/public-vitrine.ts';
import patientServicesRoutes from './routes/patient-services.ts';
import connectorsRoutes from './routes/connectors.ts';
import educationRoutes from './routes/education.ts';
import communityRoutes from './routes/community.ts';
import checkinNewsletterRoutes from './routes/checkin-newsletter.ts';
import segmentsSavRoutes from './routes/segments-sav.ts';
import crmExportsRoutes from './routes/crm-exports.ts';
import analyticsRoutes from './routes/analytics.ts';

// Existing route modules
import { setupPrestataireTablesRoute } from './setup.tsx';
import { registerIotRoutes } from './iot-routes.ts';
import businessRoutes from './business-routes.ts';
import pscRoutes from './psc-auth.ts';
import { billingAutomation } from './billing-automation.ts';
import automationRoutes from './automation-routes.ts';

const app = new Hono<AuthEnv>();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Audit logs middleware (avant toutes les routes)
app.use('*', auditMiddleware());

// Routes prefix
const prefix = '/make-server-50732e52';

// ============================================
// HEALTH ROUTE
// ============================================

app.get(`${prefix}/health`, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /public/* — vitrine ANONYME, monté EN PREMIER : les sub-apps suivantes
// portent des middlewares use() qui intercepteraient ces chemins.
app.route(prefix, publicVitrineRoutes);

// ============================================
// SETUP ROUTE (CREATE TABLES) — admin only
// ============================================

app.post(
  `${prefix}/setup/create-prestataire-tables`,
  requireAuth,
  requireRole('admin'),
  setupPrestataireTablesRoute
);

// ============================================
// REFACTORED ROUTE MODULES
// ============================================

// /patient/dashboard, /doctor/*, /admin/* (per-route auth middlewares inside)
app.route(prefix, dashboardsRoutes);

// /prestataire/* (requireAuth + requireRole('admin', 'prestataire') inside)
app.route(`${prefix}/prestataire`, prestataireOpsRoutes);

// /alerts/* (requireAuth inside)
app.route(`${prefix}/alerts`, alertsRoutes);

// /process-sleep-data, /gamification/*, /normalize-device-data,
// /convert-to-fhir, /generate-report, /analyze-and-create-tasks, /tasks/*
app.route(prefix, telemetryRoutes);

// /observance/* + /billing/* — moteur LPPR/observance + facturation (chantier 2)
app.route(prefix, observanceBillingRoutes);

// /stock/* + /parc/* + /planning/* — stock, parc machines, planning techniciens (chantier 2)
app.route(prefix, stockParcRoutes);

// /psdm/* — certification PSDM HAS 2026 (chantier 2)
app.route(prefix, psdmRoutes);

// /patient/* (score, observance, gamification, préférences, tickets) — portail patient (chantier 3)
// Pas de collision : /patient/dashboard reste dans dashboardsRoutes.
app.route(prefix, patientPortalRoutes);

// /patient/marketplace|rdv|documents + /pro-services/* — services patient (vague 6)
app.route(prefix, patientServicesRoutes);

// /connectors/* — extraction télésuivi via accès portails du PSAD (vague 6)
app.route(prefix, connectorsRoutes);

// Vague 7 — engagement : sleep school, communauté modérée, check-in + newsletter
app.route(prefix, educationRoutes);
app.route(prefix, communityRoutes);
app.route(prefix, checkinNewsletterRoutes);

// Vague 8 — pro avancé : segmentation patients + SAV/SLA + CRM/exports/agences
app.route(prefix, segmentsSavRoutes);
app.route(prefix, crmExportsRoutes);

// Vague 9 — intelligence : score risque décrochage + forecasting
app.route(prefix, analyticsRoutes);

// ============================================
// EXISTING ROUTE MODULES
// ============================================

// IoT routes (/iot/*) — registered directly on the app with the prefix
registerIotRoutes(app, prefix);

// Business routes (PHASE 3)
app.route(`${prefix}/business`, businessRoutes);

// PSC auth routes (PHASE 3)
app.route(`${prefix}/auth/psc`, pscRoutes);

// Billing automation routes (PHASE 3)
app.route(`${prefix}/billing`, billingAutomation);

// Automation routes (PHASE 5)
app.route(`${prefix}/automation`, automationRoutes);

// ============================================
// START SERVER
// ============================================

Deno.serve(app.fetch);
