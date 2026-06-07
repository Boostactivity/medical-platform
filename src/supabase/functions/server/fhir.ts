/**
 * ============================================
 * CONVERTISSEUR HL7 FHIR R4
 * ============================================
 * 
 * Transforme les données internes Medical en ressources FHIR
 * pour l'interopérabilité avec les systèmes hospitaliers et DMP
 * 
 * Standard : HL7 FHIR R4
 * Ressources supportées : Patient, Observation, DiagnosticReport, Device
 */

import { StandardizedData } from './adapters.ts';

// ============================================
// TYPES FHIR
// ============================================

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  name: Array<{
    use: string;
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
  }>;
  address?: Array<{
    line: string[];
    city: string;
    postalCode: string;
    country: string;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject?: {
    reference: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  interpretation?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
}

export interface FHIRDevice {
  resourceType: 'Device';
  id?: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  manufacturer?: string;
  deviceName?: Array<{
    name: string;
    type: 'user-friendly-name' | 'model-name';
  }>;
  modelNumber?: string;
  serialNumber?: string;
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id?: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final';
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  issued?: string;
  result?: Array<{
    reference: string;
  }>;
  conclusion?: string;
}

// ============================================
// CONVERTISSEUR PATIENT → FHIR PATIENT
// ============================================

export function patientToFHIR(patient: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  address_line1?: string;
  address_city?: string;
  address_postal_code?: string;
  ipp?: string;
}): FHIRPatient {
  return {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [
      {
        system: 'https://medical-sante.fr/patient-id',
        value: patient.id,
      },
      ...(patient.ipp ? [{
        system: 'https://sante.gouv.fr/ipp',
        value: patient.ipp,
      }] : []),
    ],
    name: [
      {
        use: 'official',
        family: patient.last_name,
        given: [patient.first_name],
      },
    ],
    gender: (patient.gender?.toLowerCase() as any) || 'unknown',
    birthDate: patient.birth_date || '',
    telecom: [
      {
        system: 'email',
        value: patient.email,
      },
      ...(patient.phone ? [{
        system: 'phone' as const,
        value: patient.phone,
      }] : []),
    ],
    address: patient.address_line1 ? [
      {
        line: [patient.address_line1],
        city: patient.address_city || '',
        postalCode: patient.address_postal_code || '',
        country: 'FR',
      },
    ] : undefined,
  };
}

// ============================================
// CONVERTISSEUR TÉLÉMÉTRIE → FHIR OBSERVATION
// ============================================

export function telemetryToFHIR(
  telemetry: StandardizedData,
  patientId?: string
): FHIRObservation[] {
  const observations: FHIRObservation[] = [];

  // Observation 1 : AHI (Index Apnée-Hypopnée)
  observations.push({
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '89245-4',
          display: 'Apnea Hypopnea Index',
        },
      ],
      text: 'AHI (Index Apnée-Hypopnée)',
    },
    subject: patientId ? {
      reference: `Patient/${patientId}`,
    } : undefined,
    effectiveDateTime: telemetry.recorded_at,
    valueQuantity: {
      value: telemetry.ahi,
      unit: 'événements/heure',
      system: 'http://unitsofmeasure.org',
      code: '/h',
    },
    interpretation: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: telemetry.ahi < 5 ? 'N' : telemetry.ahi < 15 ? 'L' : telemetry.ahi < 30 ? 'H' : 'HH',
            display: telemetry.ahi < 5 ? 'Normal' : telemetry.ahi < 15 ? 'Léger' : telemetry.ahi < 30 ? 'Modéré' : 'Sévère',
          },
        ],
      },
    ],
  });

  // Observation 2 : Usage PPC
  observations.push({
    resourceType: 'Observation',
    status: 'final',
    code: {
      text: 'Durée d\'utilisation PPC',
    },
    subject: patientId ? {
      reference: `Patient/${patientId}`,
    } : undefined,
    effectiveDateTime: telemetry.recorded_at,
    valueQuantity: {
      value: telemetry.usage_hours,
      unit: 'heures',
      system: 'http://unitsofmeasure.org',
      code: 'h',
    },
  });

  // Observation 3 : Fuites
  observations.push({
    resourceType: 'Observation',
    status: 'final',
    code: {
      text: 'Taux de fuite du masque',
    },
    subject: patientId ? {
      reference: `Patient/${patientId}`,
    } : undefined,
    effectiveDateTime: telemetry.recorded_at,
    valueQuantity: {
      value: telemetry.leak_rate,
      unit: 'L/min',
      system: 'http://unitsofmeasure.org',
      code: 'L/min',
    },
  });

  // Observation 4 : Pression
  observations.push({
    resourceType: 'Observation',
    status: 'final',
    code: {
      text: 'Pression PPC (95e percentile)',
    },
    subject: patientId ? {
      reference: `Patient/${patientId}`,
    } : undefined,
    effectiveDateTime: telemetry.recorded_at,
    valueQuantity: {
      value: telemetry.pressure_p95,
      unit: 'cmH2O',
      system: 'http://unitsofmeasure.org',
      code: 'cm[H2O]',
    },
  });

  return observations;
}

// ============================================
// CONVERTISSEUR DEVICE → FHIR DEVICE
// ============================================

export function deviceToFHIR(device: {
  serial_number: string;
  brand: string;
  model: string;
}): FHIRDevice {
  return {
    resourceType: 'Device',
    identifier: [
      {
        system: 'https://medical-sante.fr/device-serial',
        value: device.serial_number,
      },
    ],
    manufacturer: device.brand,
    deviceName: [
      {
        name: device.model,
        type: 'model-name',
      },
    ],
    modelNumber: device.model,
    serialNumber: device.serial_number,
    type: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '706172005',
          display: 'Continuous positive airway pressure unit',
        },
      ],
    },
  };
}

// ============================================
// CONVERTISSEUR RAPPORT → FHIR DIAGNOSTIC REPORT
// ============================================

export function reportToFHIR(
  patientId: string,
  observations: FHIRObservation[],
  conclusion: string,
  effectiveDate: string
): FHIRDiagnosticReport {
  return {
    resourceType: 'DiagnosticReport',
    status: 'final',
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Sleep study report',
        },
      ],
      text: 'Rapport de suivi PPC',
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: effectiveDate,
    issued: new Date().toISOString(),
    result: observations.map((obs, idx) => ({
      reference: `Observation/${patientId}-${idx}`,
    })),
    conclusion,
  };
}

// ============================================
// FONCTION TOUT-EN-UN : Télémétrie complète → FHIR Bundle
// ============================================

export function createFHIRBundle(
  patient: any,
  telemetryData: StandardizedData[],
  device: any
): any {
  const fhirPatient = patientToFHIR(patient);
  const fhirDevice = deviceToFHIR(device);
  
  const allObservations: FHIRObservation[] = [];
  telemetryData.forEach(data => {
    const observations = telemetryToFHIR(data, patient.id);
    allObservations.push(...observations);
  });

  // Calcul de la conclusion
  const avgAHI = telemetryData.reduce((sum, t) => sum + t.ahi, 0) / telemetryData.length;
  const conclusion = avgAHI < 5 
    ? 'Traitement efficace. AHI contrôlé.'
    : avgAHI < 15
    ? 'Traitement partiellement efficace. Suivi recommandé.'
    : 'Traitement sous-optimal. Consultation recommandée.';

  const report = reportToFHIR(
    patient.id,
    allObservations,
    conclusion,
    new Date().toISOString()
  );

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      { resource: fhirPatient },
      { resource: fhirDevice },
      ...allObservations.map(obs => ({ resource: obs })),
      { resource: report },
    ],
  };
}
