/**
 * Services d'Automatisation - la plateforme
 * 
 * Combine tous les services d'automatisation en un seul fichier
 * pour éviter les problèmes de sous-dossiers avec Supabase Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================
// SLEEP SCORE CALCULATOR
// ============================================

interface SleepDataInput {
  sleep_data_id: string;
  patient_id: string;
  date: string;
  hours_used: number;
  ahi?: number;
  leakage?: number;
  events?: number;
}

interface ScoreResult {
  sleep_data_id: string;
  score: number;
  breakdown: {
    hours_score: number;
    ahi_score: number;
    leakage_score: number;
    events_score: number;
  };
  quality_level: 'excellent' | 'good' | 'average' | 'poor';
}

export class SleepScoreCalculator {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  calculateScore(data: SleepDataInput): ScoreResult {
    const hours_score = this.calculateHoursScore(data.hours_used);
    const ahi_score = data.ahi !== undefined ? this.calculateAHIScore(data.ahi) : 0;
    const leakage_score = data.leakage !== undefined ? this.calculateLeakageScore(data.leakage) : 0;
    const events_score = data.events !== undefined ? this.calculateEventsScore(data.events) : 0;
    const total_score = hours_score + ahi_score + leakage_score + events_score;
    const quality_level = this.getQualityLevel(total_score);

    return {
      sleep_data_id: data.sleep_data_id,
      score: Math.round(total_score),
      breakdown: {
        hours_score: Math.round(hours_score),
        ahi_score: Math.round(ahi_score),
        leakage_score: Math.round(leakage_score),
        events_score: Math.round(events_score),
      },
      quality_level,
    };
  }

  private calculateHoursScore(hours: number): number {
    if (hours >= 4) return 40;
    return (hours / 4) * 40;
  }

  private calculateAHIScore(ahi: number): number {
    if (ahi < 5) return 30;
    if (ahi < 15) return 20;
    if (ahi < 30) return 10;
    return 0;
  }

  private calculateLeakageScore(leakage: number): number {
    if (leakage < 10) return 20;
    if (leakage < 24) return 15;
    if (leakage < 40) return 5;
    return 0;
  }

  private calculateEventsScore(events: number): number {
    if (events === 0) return 10;
    if (events < 5) return 8;
    if (events < 10) return 5;
    if (events < 20) return 3;
    return 0;
  }

  private getQualityLevel(score: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  async processUnscored() {
    console.log('🔄 Starting sleep score calculation batch...');

    try {
      const { data: unscoredNights, error: fetchError } = await this.supabase
        .from('sleep_data')
        .select('*')
        .is('expair_score', null)
        .order('date', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;

      if (!unscoredNights || unscoredNights.length === 0) {
        console.log('✅ No unscored nights found');
        return { processed: 0, success: 0, errors: 0 };
      }

      console.log(`📊 Found ${unscoredNights.length} unscored nights`);

      let success = 0;
      let errors = 0;

      for (const night of unscoredNights) {
        try {
          const result = this.calculateScore({
            sleep_data_id: night.sleep_data_id,
            patient_id: night.patient_id,
            date: night.date,
            hours_used: night.hours_used,
            ahi: night.ahi,
            leakage: night.leakage,
            events: night.events,
          });

          const { error: updateError } = await this.supabase
            .from('sleep_data')
            .update({
              expair_score: result.score,
              quality_level: result.quality_level,
              updated_at: new Date().toISOString(),
            })
            .eq('sleep_data_id', night.sleep_data_id);

          if (updateError) {
            console.error(`❌ Error updating ${night.sleep_data_id}:`, updateError);
            errors++;
          } else {
            console.log(`✅ Scored ${night.date}: ${result.score}/100 (${result.quality_level})`);
            success++;
          }
        } catch (err) {
          console.error(`❌ Error processing ${night.sleep_data_id}:`, err);
          errors++;
        }
      }

      console.log(`✅ Batch complete: ${success} success, ${errors} errors`);
      return { processed: unscoredNights.length, success, errors };

    } catch (error) {
      console.error('❌ Fatal error in batch processing:', error);
      throw error;
    }
  }

  async recalculateNight(sleepDataId: string) {
    console.log(`🔄 Recalculating score for ${sleepDataId}...`);

    try {
      const { data: night, error: fetchError } = await this.supabase
        .from('sleep_data')
        .select('*')
        .eq('sleep_data_id', sleepDataId)
        .single();

      if (fetchError) throw fetchError;
      if (!night) throw new Error('Night not found');

      const result = this.calculateScore({
        sleep_data_id: night.sleep_data_id,
        patient_id: night.patient_id,
        date: night.date,
        hours_used: night.hours_used,
        ahi: night.ahi,
        leakage: night.leakage,
        events: night.events,
      });

      const { error: updateError } = await this.supabase
        .from('sleep_data')
        .update({
          expair_score: result.score,
          quality_level: result.quality_level,
          updated_at: new Date().toISOString(),
        })
        .eq('sleep_data_id', sleepDataId);

      if (updateError) throw updateError;

      console.log(`✅ Score updated: ${result.score}/100 (${result.quality_level})`);
      return result;

    } catch (error) {
      console.error(`❌ Error recalculating ${sleepDataId}:`, error);
      throw error;
    }
  }

  async generateQualityReport(patientId: string, days: number = 30) {
    console.log(`📊 Generating quality report for ${patientId} (${days} days)...`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data: nights, error } = await this.supabase
        .from('sleep_data')
        .select('*')
        .eq('patient_id', patientId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      if (!nights || nights.length === 0) {
        return {
          patient_id: patientId,
          period_days: days,
          total_nights: 0,
          average_score: 0,
          quality_distribution: { excellent: 0, good: 0, average: 0, poor: 0 },
        };
      }

      const totalScore = nights.reduce((sum, n) => sum + (n.expair_score || 0), 0);
      const averageScore = totalScore / nights.length;

      const distribution = {
        excellent: nights.filter(n => (n.expair_score || 0) >= 85).length,
        good: nights.filter(n => (n.expair_score || 0) >= 70 && (n.expair_score || 0) < 85).length,
        average: nights.filter(n => (n.expair_score || 0) >= 50 && (n.expair_score || 0) < 70).length,
        poor: nights.filter(n => (n.expair_score || 0) < 50).length,
      };

      return {
        patient_id: patientId,
        period_days: days,
        total_nights: nights.length,
        average_score: Math.round(averageScore),
        quality_distribution: distribution,
        trend: this.calculateTrend(nights),
      };

    } catch (error) {
      console.error(`❌ Error generating report for ${patientId}:`, error);
      throw error;
    }
  }

  private calculateTrend(nights: any[]): 'improving' | 'stable' | 'declining' {
    if (nights.length < 7) return 'stable';

    const recent = nights.slice(0, 7);
    const older = nights.slice(-7);
    const recentAvg = recent.reduce((sum, n) => sum + (n.expair_score || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, n) => sum + (n.expair_score || 0), 0) / older.length;
    const diff = recentAvg - olderAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}

// ============================================
// CPAM BILLING CHECKER
// ============================================

interface CPAMEligibilityResult {
  patient_id: string;
  is_eligible: boolean;
  total_hours: number;
  avg_hours_per_night: number;
  compliant_nights: number;
  total_nights: number;
  compliance_rate: number;
  period_start: string;
  period_end: string;
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export class CPAMBillingChecker {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  async checkEligibility(patientId: string): Promise<CPAMEligibilityResult> {
    console.log(`🔍 Checking CPAM eligibility for patient ${patientId}...`);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const { data: sleepData, error } = await this.supabase
        .from('sleep_data')
        .select('*')
        .eq('patient_id', patientId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      if (!sleepData || sleepData.length === 0) {
        return this.createNotEligibleResult(patientId, 'no_data');
      }

      const totalNights = sleepData.length;
      const totalHours = sleepData.reduce((sum, night) => sum + night.hours_used, 0);
      const avgHoursPerNight = totalHours / totalNights;
      const compliantNights = sleepData.filter(night => night.hours_used >= 3).length;
      const complianceRate = (compliantNights / totalNights) * 100;
      const isEligible = avgHoursPerNight >= 3;
      const riskLevel = this.calculateRiskLevel(avgHoursPerNight, complianceRate);
      const recommendation = this.generateRecommendation(isEligible, avgHoursPerNight, complianceRate, riskLevel);

      const result: CPAMEligibilityResult = {
        patient_id: patientId,
        is_eligible: isEligible,
        total_hours: Math.round(totalHours * 10) / 10,
        avg_hours_per_night: Math.round(avgHoursPerNight * 10) / 10,
        compliant_nights: compliantNights,
        total_nights: totalNights,
        compliance_rate: Math.round(complianceRate),
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        risk_level: riskLevel,
        recommendation,
      };

      console.log(`📊 Eligibility: ${isEligible ? '✅ YES' : '❌ NO'} (${avgHoursPerNight.toFixed(1)}h avg, ${complianceRate.toFixed(0)}%)`);
      return result;

    } catch (error) {
      console.error(`❌ Error checking eligibility for ${patientId}:`, error);
      throw error;
    }
  }

  private calculateRiskLevel(avgHours: number, complianceRate: number): CPAMEligibilityResult['risk_level'] {
    if (avgHours < 3) return 'critical';
    if (avgHours < 3.5) return 'high';
    if (avgHours < 4 && complianceRate < 80) return 'medium';
    if (avgHours < 5) return 'low';
    return 'none';
  }

  private generateRecommendation(isEligible: boolean, avgHours: number, complianceRate: number, riskLevel: string): string {
    if (riskLevel === 'critical') {
      return `🚨 CRITIQUE : Moyenne de ${avgHours.toFixed(1)}h/nuit. Remboursement CPAM perdu ! Contact patient urgent requis.`;
    }
    if (riskLevel === 'high') {
      return `⚠️ RISQUE ÉLEVÉ : Moyenne de ${avgHours.toFixed(1)}h/nuit. À ${(3 - avgHours).toFixed(1)}h de la perte du remboursement.`;
    }
    if (riskLevel === 'medium') {
      return `⚠️ ATTENTION : Moyenne de ${avgHours.toFixed(1)}h/nuit, ${complianceRate.toFixed(0)}% de nuits conformes.`;
    }
    if (riskLevel === 'low') {
      return `✓ Observance acceptable (${avgHours.toFixed(1)}h/nuit) mais peut être améliorée.`;
    }
    return `✅ Excellente observance (${avgHours.toFixed(1)}h/nuit, ${complianceRate.toFixed(0)}% conformes).`;
  }

  private createNotEligibleResult(patientId: string, reason: string): CPAMEligibilityResult {
    return {
      patient_id: patientId,
      is_eligible: false,
      total_hours: 0,
      avg_hours_per_night: 0,
      compliant_nights: 0,
      total_nights: 0,
      compliance_rate: 0,
      period_start: '',
      period_end: '',
      risk_level: 'critical',
      recommendation: reason === 'no_data' 
        ? '❌ Aucune donnée sur les 28 derniers jours.'
        : '❌ Données insuffisantes.',
    };
  }

  async processAllPatients() {
    console.log('🌙 Starting CPAM eligibility check for all patients...');

    try {
      const { data: patients, error: patientsError } = await this.supabase
        .from('patients')
        .select('patient_id, user_id, treatment_start_date')
        .not('treatment_start_date', 'is', null)
        .order('created_at', { ascending: true });

      if (patientsError) throw patientsError;

      if (!patients || patients.length === 0) {
        console.log('✅ No active patients found');
        return { total: 0, eligible: 0, at_risk: 0, alerts_created: 0 };
      }

      console.log(`📊 Processing ${patients.length} patients...`);

      let eligible = 0;
      let atRisk = 0;
      let alertsCreated = 0;

      for (const patient of patients) {
        try {
          const result = await this.checkEligibility(patient.patient_id);

          if (result.is_eligible) {
            eligible++;
          }

          if (result.risk_level === 'critical' || result.risk_level === 'high') {
            atRisk++;
            
            const alertCreated = await this.createAlert({
              patient_id: patient.patient_id,
              type: 'observance',
              severity: result.risk_level === 'critical' ? 'critical' : 'high',
              title: result.risk_level === 'critical' ? 'Remboursement CPAM perdu' : 'Risque de perte de remboursement CPAM',
              message: result.recommendation,
              metadata: {
                avg_hours: result.avg_hours_per_night,
                compliance_rate: result.compliance_rate,
                period_start: result.period_start,
                period_end: result.period_end,
                check_date: new Date().toISOString(),
              },
            });

            if (alertCreated) alertsCreated++;
          }

          await this.updatePatientCPAMStatus(patient.patient_id, result);

        } catch (err) {
          console.error(`❌ Error processing patient ${patient.patient_id}:`, err);
        }
      }

      const summary = { total: patients.length, eligible, at_risk: atRisk, alerts_created: alertsCreated };
      console.log(`✅ Batch complete:`, summary);
      return summary;

    } catch (error) {
      console.error('❌ Fatal error in batch processing:', error);
      throw error;
    }
  }

  private async createAlert(alert: any): Promise<boolean> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: existing } = await this.supabase
        .from('alerts')
        .select('alert_id')
        .eq('patient_id', alert.patient_id)
        .eq('type', alert.type)
        .eq('severity', alert.severity)
        .gte('created_at', yesterday.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️ Alert already exists for ${alert.patient_id}, skipping`);
        return false;
      }

      const { error } = await this.supabase
        .from('alerts')
        .insert({
          patient_id: alert.patient_id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: JSON.stringify(alert.metadata),
          is_read: false,
          is_resolved: false,
        });

      if (error) throw error;

      console.log(`✅ Alert created for ${alert.patient_id}: ${alert.title}`);
      return true;

    } catch (error) {
      console.error(`❌ Error creating alert for ${alert.patient_id}:`, error);
      return false;
    }
  }

  private async updatePatientCPAMStatus(patientId: string, result: CPAMEligibilityResult) {
    try {
      const { error } = await this.supabase
        .from('patients')
        .update({
          cpam_eligible: result.is_eligible,
          last_cpam_check: new Date().toISOString(),
          avg_observance_28d: result.avg_hours_per_night,
          compliance_rate_28d: result.compliance_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('patient_id', patientId);

      if (error) throw error;

    } catch (error) {
      console.error(`❌ Error updating CPAM status for ${patientId}:`, error);
    }
  }
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

interface SMSPayload {
  to: string;
  message: string;
  patient_id?: string;
  alert_type?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  patient_id?: string;
  alert_type?: string;
}

interface NotificationResult {
  success: boolean;
  provider: 'twilio' | 'sendgrid';
  message_id?: string;
  error?: string;
}

export class NotificationService {
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private twilioPhoneNumber: string;
  private sendgridApiKey: string;
  private sendgridFromEmail: string;
  private sendgridFromName: string;

  constructor() {
    this.twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    this.twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    this.twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
    this.sendgridApiKey = Deno.env.get('SENDGRID_API_KEY') || '';
    this.sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@plateforme.fr';
    this.sendgridFromName = Deno.env.get('SENDGRID_FROM_NAME') || "la plateforme";
  }

  async sendSMS(payload: SMSPayload): Promise<NotificationResult> {
    console.log(`📱 Sending SMS to ${payload.to}...`);

    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken) {
        throw new Error('Twilio credentials not configured');
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      const body = new URLSearchParams({
        To: payload.to,
        From: this.twilioPhoneNumber,
        Body: payload.message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twilio API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ SMS sent successfully. SID: ${result.sid}`);

      return {
        success: true,
        provider: 'twilio',
        message_id: result.sid,
      };

    } catch (error: any) {
      console.error('❌ Error sending SMS:', error);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
      };
    }
  }

  async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
    console.log(`📧 Sending email to ${payload.to}...`);

    try {
      if (!this.sendgridApiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const url = 'https://api.sendgrid.com/v3/mail/send';
      
      const body = {
        personalizations: [{ to: [{ email: payload.to }], subject: payload.subject }],
        from: { email: this.sendgridFromEmail, name: this.sendgridFromName },
        content: [
          { type: 'text/html', value: payload.html },
          ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`SendGrid API error: ${error.errors?.[0]?.message || response.statusText}`);
      }

      const messageId = response.headers.get('X-Message-Id') || 'unknown';
      console.log(`✅ Email sent successfully. ID: ${messageId}`);

      return {
        success: true,
        provider: 'sendgrid',
        message_id: messageId,
      };

    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      return {
        success: false,
        provider: 'sendgrid',
        error: error.message,
      };
    }
  }
}
