/**
 * IOT ROUTES - Universal Adapter API Endpoints
 */

import type { Hono } from 'npm:hono';
import { supabase } from './lib/supabase.ts';
import { parseUniversalData, saveSleepData, detectFileFormat } from './universal-adapter.ts';
import { calculateMedicalScore, saveMedicalScore, getScoreHistory } from './scoring-engine.ts';
import { analyzeAndCreateAlerts } from './smart-alerts-engine.ts';

export function registerIotRoutes(app: any, prefix: string) {
  // ============================================
  // IOT ROUTES - UNIVERSAL ADAPTER
  // ============================================

  // POST /iot/upload - Upload and parse device file
  app.post(`${prefix}/iot/upload`, async (c: any) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'No token provided' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { fileContent, patientId, format } = body;

      if (!fileContent || !patientId) {
        return c.json({ error: 'fileContent and patientId required' }, 400);
      }

      console.log(`[IOT UPLOAD] Processing file for patient ${patientId}`);

      // 1. Parse universal data
      const parsedData = await parseUniversalData(fileContent, patientId, format);
      console.log(`[IOT UPLOAD] Parsed ${parsedData.length} sessions`);

      // 2. Save to database
      await saveSleepData(parsedData);
      console.log(`[IOT UPLOAD] Saved to database`);

      // 3. Calculate scores for each session
      const scores = [];
      for (const session of parsedData) {
        const previousScores = await getScoreHistory(patientId, 30);
        const score = calculateMedicalScore(session, previousScores);
        await saveMedicalScore(score);
        scores.push(score);
      }
      console.log(`[IOT UPLOAD] Calculated ${scores.length} scores`);

      // 4. Analyze and create alerts
      let totalAlerts = 0;
      for (let i = 0; i < parsedData.length; i++) {
        const alerts = await analyzeAndCreateAlerts(parsedData[i], scores[i]);
        totalAlerts += alerts.length;
      }
      console.log(`[IOT UPLOAD] Created ${totalAlerts} alerts`);

      return c.json({
        success: true,
        sessionsProcessed: parsedData.length,
        scoresCalculated: scores.length,
        alertsCreated: totalAlerts,
        summary: {
          manufacturer: parsedData[0]?.manufacturer,
          dateRange: {
            from: parsedData[parsedData.length - 1]?.session_date,
            to: parsedData[0]?.session_date,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[IOT UPLOAD] Error:', error);
      return c.json({ error: error.message, stack: error.stack }, 500);
    }
  });

  // POST /iot/detect-format - Detect file format
  app.post(`${prefix}/iot/detect-format`, async (c: any) => {
    try {
      const body = await c.req.json();
      const { fileContent } = body;

      if (!fileContent) {
        return c.json({ error: 'fileContent required' }, 400);
      }

      const format = detectFileFormat(fileContent);

      return c.json({
        format,
        supported: format !== 'unknown',
        details: {
          resmed: 'JSON format from MyAir or SD card',
          philips: 'CSV export from DreamStation',
          lowenstein: 'XML from PrismaLine/PrismaCloud',
        },
      });
    } catch (error: any) {
      console.error('[IOT DETECT] Error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  // GET /iot/score/:patientId - Get score history
  app.get(`${prefix}/iot/score/:patientId`, async (c: any) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'No token provided' }, 401);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const patientId = c.req.param('patientId');
      const days = parseInt(c.req.query('days') || '30');

      const scores = await getScoreHistory(patientId, days);

      return c.json({
        patientId,
        scores,
        summary: {
          totalDays: scores.length,
          averageScore: scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length)
            : 0,
          currentTrend: scores[0]?.trend || 'stable',
          currentGrade: scores[0]?.grade || 'N/A',
        },
      });
    } catch (error: any) {
      console.error('[IOT SCORE] Error:', error);
      return c.json({ error: error.message }, 500);
    }
  });

  console.log('[IOT ROUTES] Registered successfully');
}
