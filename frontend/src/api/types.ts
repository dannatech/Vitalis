export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECH'
  | 'RECORDS_OFFICER'
  | 'BILLING_OFFICER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  facilityId: string;
}

export interface Patient {
  id: string;
  facilityId: string;
  mrn: string;
  nin: string | null;
  nhisNumber: string | null;
  surname: string;
  firstName: string;
  otherNames: string | null;
  dateOfBirth: string;
  sex: 'MALE' | 'FEMALE';
  phone: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelation: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  anonymisedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientGeneratedId?: string | null;
}

export type EncounterType = 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'ANTENATAL';
export type EncounterStatus = 'OPEN' | 'CLOSED';

export interface Encounter {
  id: string;
  facilityId: string;
  patientId: string;
  clinicianId: string;
  type: EncounterType;
  status: EncounterStatus;
  visitDate: string;
  chiefComplaint: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  clientGeneratedId?: string | null;
}

export interface Diagnosis {
  id: string;
  encounterId: string;
  icd10Code: string;
  description: string;
  notifiableDisease?: { name: string; reportingTimeframe: string } | null;
}

export interface VitalSigns {
  id: string;
  encounterId: string;
  temperatureC?: number | null;
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  pulseBpm?: number | null;
  respiratoryRate?: number | null;
  spo2Percent?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
}

export interface Prescription {
  id: string;
  encounterId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  route: string;
  dispensed: boolean;
}

export interface LabOrder {
  id: string;
  encounterId: string;
  testName: string;
  status: 'ORDERED' | 'COLLECTED' | 'RESULTED' | 'CANCELLED';
  result?: {
    resultValue: string;
    unit: string | null;
    referenceRange: string | null;
    flagged: boolean;
  } | null;
}

export interface EncounterDetail extends Encounter {
  vitals: VitalSigns[];
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
}

export type LabOrderStatus = 'ORDERED' | 'COLLECTED' | 'RESULTED' | 'CANCELLED';

/** One row of the facility-wide lab worklist — GET /labs. */
export interface LabWorklistEntry {
  id: string;
  testName: string;
  status: LabOrderStatus;
  orderedAt: string;
  encounterId: string;
  patient: {
    id: string;
    mrn: string;
    surname: string;
    firstName: string;
  };
  result: {
    resultValue: string;
    unit: string | null;
    referenceRange: string | null;
    flagged: boolean;
    resultedAt: string;
  } | null;
}
