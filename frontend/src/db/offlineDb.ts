import Dexie, { type Table } from 'dexie';
import type { Encounter, Patient } from '../api/types';

export { newClientId, localId, clientIdFromLocalId } from './localId';

export type OutboxStatus = 'pending' | 'syncing' | 'error';

export interface OutboxPatient {
  clientGeneratedId: string; // primary key
  payload: Record<string, unknown>;
  status: OutboxStatus;
  error?: string;
  createdAt: string;
  /** The facility of whoever was signed in when this was queued — lets a
   *  fresh login flush only same-facility work before wiping (see
   *  AuthContext.login) instead of attributing it to whoever logs in next. */
  facilityId: string;
}

/** Shared shape for every outbox table except outboxPatients (which has no
 *  parent to reference). A record's parent (patient or encounter) is
 *  identified by whatever id payload.patientId/encounterId held at write
 *  time — "local-…" if the parent was itself still unsynced, or a real id
 *  otherwise. syncEngine.ts resolves a local id via its clientGeneratedId
 *  (see localId.ts) at flush time, skipping the row until that resolves. */
export interface OutboxDependentRecord {
  clientGeneratedId: string; // primary key
  payload: Record<string, unknown>;
  status: OutboxStatus;
  error?: string;
  createdAt: string;
  facilityId: string;
}

export type OutboxEncounter = OutboxDependentRecord;
export type OutboxVital = OutboxDependentRecord;
export type OutboxDiagnosis = OutboxDependentRecord;
export type OutboxPrescription = OutboxDependentRecord;
export type OutboxLabOrder = OutboxDependentRecord;

export interface MetaRow {
  key: string;
  value: string;
}

/**
 * Local IndexedDB cache + write-behind outbox. Registration, encounter
 * creation, and the four clinical-documentation forms (vitals, diagnoses,
 * prescriptions, lab orders) all write here first so the app keeps working
 * with no connectivity; the sync engine (`sync/syncEngine.ts`) drains the
 * outbox and refreshes the cache whenever the device is back online.
 */
class VitalisDb extends Dexie {
  patients!: Table<Patient, string>;
  encounters!: Table<Encounter, string>;
  outboxPatients!: Table<OutboxPatient, string>;
  outboxEncounters!: Table<OutboxEncounter, string>;
  outboxVitals!: Table<OutboxVital, string>;
  outboxDiagnoses!: Table<OutboxDiagnosis, string>;
  outboxPrescriptions!: Table<OutboxPrescription, string>;
  outboxLabOrders!: Table<OutboxLabOrder, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('vitalis-offline');
    this.version(1).stores({
      patients: 'id, mrn, surname, firstName, clientGeneratedId',
      encounters: 'id, patientId, visitDate, clientGeneratedId',
      outboxPatients: 'clientGeneratedId, status',
      outboxEncounters: 'clientGeneratedId, status',
      meta: 'key',
    });
    this.version(2).stores({
      outboxVitals: 'clientGeneratedId, status',
      outboxDiagnoses: 'clientGeneratedId, status',
      outboxPrescriptions: 'clientGeneratedId, status',
      outboxLabOrders: 'clientGeneratedId, status',
    });
  }
}

export const db = new VitalisDb();

/**
 * Resolves a queued record's parent (a patient or encounter) to its current
 * server id, given the parent's stable clientGeneratedId. Returns null when
 * the parent hasn't synced yet (still only a "local-…" row) or doesn't
 * exist locally at all — either way, the caller should leave the dependent
 * record queued and retry on the next sync cycle instead of pushing it with
 * an unresolvable reference.
 */
export async function resolveSyncedId<T extends { id: string; clientGeneratedId?: string | null }>(
  table: Table<T, string>,
  clientGeneratedId: string,
): Promise<string | null> {
  const row = await table.where('clientGeneratedId').equals(clientGeneratedId).first();
  if (!row || row.id.startsWith('local-')) return null;
  return row.id;
}

/**
 * Wipes the entire local cache + outbox. Called on every session
 * transition (login, register, loginDemo, logout) so a previous session's
 * records — real or demo — never leak into the next one on a shared
 * device. Demo-mode writes in particular use crypto.randomUUID() ids with
 * no facilityId set, so there is no reliable way to selectively delete
 * "just the demo rows"; a full clear is the only correct fix. Callers that
 * need to preserve still-pending work first flush it (see
 * syncEngine.flushOutboxForFacility) before calling this.
 */
export async function clearAllLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.patients,
      db.encounters,
      db.outboxPatients,
      db.outboxEncounters,
      db.outboxVitals,
      db.outboxDiagnoses,
      db.outboxPrescriptions,
      db.outboxLabOrders,
      db.meta,
    ],
    async () => {
      await db.patients.clear();
      await db.encounters.clear();
      await db.outboxPatients.clear();
      await db.outboxEncounters.clear();
      await db.outboxVitals.clear();
      await db.outboxDiagnoses.clear();
      await db.outboxPrescriptions.clear();
      await db.outboxLabOrders.clear();
      await db.meta.clear();
    },
  );
}
