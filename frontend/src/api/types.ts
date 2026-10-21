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

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  licenseNumber: string | null;
  licenseBody: string | null;
  isActive: boolean;
  createdAt: string;
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

/** One row of the NCDC notifiable-disease report worklist — GET /ncdc-reports. */
export interface NcdcReportEntry {
  id: string;
  patient: {
    id: string;
    mrn: string;
    surname: string;
    firstName: string;
  };
  icd10Code: string;
  diagnosisDescription: string;
  diseaseName: string;
  reportingTimeframe: string | null;
  notedAt: string;
  reportedToNCDC: boolean;
  reportedAt: string | null;
  createdAt: string;
}

/** One row of the facility-wide dispensing worklist — GET /pharmacy/prescriptions. */
export interface PrescriptionWorklistEntry {
  id: string;
  encounterId: string;
  patient: {
    id: string;
    mrn: string;
    surname: string;
    firstName: string;
  };
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  route: string;
  dispensed: boolean;
  dispensedAt: string | null;
  createdAt: string;
}

/** ---- Billing / NHIS claims ---- */

export type PayerType = 'SELF_PAY' | 'NHIS' | 'STATE_SCHEME' | 'PRIVATE_HMO';
export type TariffCategory =
  | 'CONSULTATION'
  | 'LAB'
  | 'PROCEDURE'
  | 'MEDICATION'
  | 'ADMISSION'
  | 'OTHER';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CAPITATION' | 'OTHER';
export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'PAID';

export interface Payer {
  id: string;
  name: string;
  type: PayerType;
  contactInfo: string | null;
  isActive: boolean;
}

export interface TariffItem {
  id: string;
  name: string;
  category: TariffCategory;
  unitPrice: number;
  code: string | null;
  payerId: string | null;
  isActive: boolean;
}

export interface PatientCoverage {
  id: string;
  patientId: string;
  payerId: string;
  payer: { name: string; type: PayerType };
  enrolleeId: string | null;
  planName: string | null;
  isPrimary: boolean;
}

export interface ChargeLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tariffItemId: string | null;
  createdAt: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
}

/** One row of GET /billing/invoices. */
export interface InvoiceListEntry {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  subtotal: number;
  amountPaid: number;
  createdAt: string;
  patient: { id: string; mrn: string; surname: string; firstName: string };
  payer: { id: string; name: string; type: PayerType };
}

/** GET /billing/invoices/:id. */
export interface InvoiceDetail extends InvoiceListEntry {
  chargeLines: ChargeLine[];
  payments: InvoicePayment[];
}

/** One row of GET /billing/claims (and the shape returned by generate/submit/adjudicate/mark-paid). */
export interface ClaimListEntry {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  periodStart: string;
  periodEnd: string;
  approvedAmount: number | null;
  rejectionReason: string | null;
  totalAmount: number;
  payer: { id: string; name: string; type: PayerType };
}

export interface ClaimInvoiceEntry {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  subtotal: number;
  patient: { id: string; mrn: string; surname: string; firstName: string };
}

/** GET /billing/claims/:id. */
export interface ClaimDetail extends ClaimListEntry {
  invoices: ClaimInvoiceEntry[];
}
