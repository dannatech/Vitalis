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
}

export interface OutboxEncounter {
  clientGeneratedId: string; // primary key
  payload: Record<string, unknown>;
  status: OutboxStatus;
  error?: string;
  createdAt: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

/**
 * Local IndexedDB cache + write-behind outbox. Registration and encounter
 * forms write here first so the app keeps working with no connectivity;
 * the sync engine (`sync/syncEngine.ts`) drains the outbox and refreshes
 * the cache whenever the device is back online.
 */
class VitalisDb extends Dexie {
  patients!: Table<Patient, string>;
  encounters!: Table<Encounter, string>;
  outboxPatients!: Table<OutboxPatient, string>;
  outboxEncounters!: Table<OutboxEncounter, string>;
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
  }
}

export const db = new VitalisDb();

/**
 * Wipes the entire local cache + outbox. Called on every session
 * transition (login, register, loginDemo, logout) so a previous session's
 * records — real or demo — never leak into the next one on a shared
 * device. Demo-mode writes in particular use crypto.randomUUID() ids with
 * no facilityId set, so there is no reliable way to selectively delete
 * "just the demo rows"; a full clear is the only correct fix.
 */
export async function clearAllLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    db.patients,
    db.encounters,
    db.outboxPatients,
    db.outboxEncounters,
    db.meta,
    async () => {
      await db.patients.clear();
      await db.encounters.clear();
      await db.outboxPatients.clear();
      await db.outboxEncounters.clear();
      await db.meta.clear();
    },
  );
}
