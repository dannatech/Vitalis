import { db } from '../db/offlineDb';
import type { Encounter, Patient } from '../api/types';
import { DEMO_FACILITY_ID } from './demoModeFlag';

export { DEMO_FACILITY_ID, DEMO_MODE_STORAGE_KEY } from './demoModeFlag';

/**
 * Sample data for "preview without login" (see LoginPage). This never
 * touches the real API or database — it's written straight into the local
 * IndexedDB cache so the UI has something to show. Clearly fake patients,
 * fixed ids, easy to tell apart from anything synced from a real backend.
 */
const DEMO_PATIENT_IDS = ['demo-patient-1', 'demo-patient-2'];
const DEMO_ENCOUNTER_IDS = ['demo-encounter-1'];

export async function seedDemoData(): Promise<void> {
  const now = new Date().toISOString();

  const patients: Patient[] = [
    {
      id: 'demo-patient-1',
      facilityId: DEMO_FACILITY_ID,
      mrn: 'DEMO-0001',
      nin: null,
      nhisNumber: null,
      surname: 'Adeyemi',
      firstName: 'Folake',
      otherNames: null,
      dateOfBirth: '1990-03-14',
      sex: 'FEMALE',
      phone: '+2348012345678',
      address: null,
      state: 'Lagos',
      lga: 'Eti-Osa',
      nextOfKinName: null,
      nextOfKinPhone: null,
      nextOfKinRelation: null,
      bloodGroup: 'O+',
      genotype: 'AA',
      anonymisedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-patient-2',
      facilityId: DEMO_FACILITY_ID,
      mrn: 'DEMO-0002',
      nin: null,
      nhisNumber: null,
      surname: 'Musa',
      firstName: 'Ibrahim',
      otherNames: null,
      dateOfBirth: '1985-11-02',
      sex: 'MALE',
      phone: '+2348023456789',
      address: null,
      state: 'Kano',
      lga: 'Nassarawa',
      nextOfKinName: null,
      nextOfKinPhone: null,
      nextOfKinRelation: null,
      bloodGroup: 'A+',
      genotype: 'AS',
      anonymisedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const encounters: Encounter[] = [
    {
      id: 'demo-encounter-1',
      facilityId: DEMO_FACILITY_ID,
      patientId: 'demo-patient-1',
      clinicianId: 'demo-user',
      type: 'OUTPATIENT',
      status: 'OPEN',
      visitDate: now,
      chiefComplaint: 'Fever and headache (sample data)',
      notes: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.patients.bulkPut(patients);
  await db.encounters.bulkPut(encounters);
}

export async function clearDemoData(): Promise<void> {
  await db.patients.bulkDelete(DEMO_PATIENT_IDS);
  await db.encounters.bulkDelete(DEMO_ENCOUNTER_IDS);
}
