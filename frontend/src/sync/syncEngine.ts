import type { Table } from 'dexie';
import apiClient from '../api/client';
import { clientIdFromLocalId, db, localId, resolveSyncedId } from '../db/offlineDb';
import type { OutboxDependentRecord } from '../db/offlineDb';
import type { Encounter, Patient } from '../api/types';
import { isAuthenticated, isDemoMode } from './sessionFlags';

const LAST_SYNCED_KEY = 'lastSyncedAt';
const SYNC_INTERVAL_MS = 30_000;

let syncing = false;
let intervalHandle: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

export function onSyncActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

type PushResult = { clientGeneratedId: string; serverId?: string; status: 'ok' | 'error'; error?: string };

async function flushPatients(facilityId?: string) {
  const all = await db.outboxPatients.where('status').anyOf('pending', 'error').toArray();
  const pending = all.filter((p) => !facilityId || p.facilityId === facilityId);
  if (pending.length === 0) return;

  await db.outboxPatients.bulkPut(pending.map((p) => ({ ...p, status: 'syncing' as const })));

  let data: { patients: PushResult[] };
  try {
    ({ data } = await apiClient.post('/sync/push', {
      patients: pending.map((p) => p.payload),
    }));
  } catch (err) {
    // The request never completed — put these back as 'pending' so the
    // next sync cycle retries them instead of leaving them stuck at
    // 'syncing' forever (that status is never re-queried by this function).
    await db.outboxPatients.bulkPut(pending.map((p) => ({ ...p, status: 'pending' as const })));
    throw err;
  }

  for (const result of data.patients) {
    if (result.status === 'ok' && result.serverId) {
      // Promote the optimistic local-… row to the real id instead of just
      // deleting it — a same-cycle flushEncounters() needs to resolve this
      // patient's real id immediately after, without waiting for the next
      // pull() to bring the canonical row down.
      const localRow = await db.patients.get(localId(result.clientGeneratedId));
      if (localRow) {
        await db.patients.put({ ...localRow, id: result.serverId });
      }
      await db.patients.delete(localId(result.clientGeneratedId));
      await db.outboxPatients.delete(result.clientGeneratedId);
    } else {
      await db.outboxPatients.update(result.clientGeneratedId, {
        status: 'error',
        error: result.error,
      });
    }
  }
}

/** Resolves payload[parentKey] to a real id if it's still a "local-…"
 *  placeholder, by looking up the parent's clientGeneratedId (recoverable
 *  straight from the placeholder itself, see localId.ts) in parentTable.
 *  Returns null — meaning "not ready, leave this row queued" — when the
 *  parent hasn't synced yet. Returns the payload unchanged when the
 *  reference was already a real id. */
async function resolveParentReference<T extends { id: string; clientGeneratedId?: string | null }>(
  payload: Record<string, unknown>,
  parentKey: string,
  parentTable: Table<T, string>,
): Promise<Record<string, unknown> | null> {
  const parentId = payload[parentKey] as string | undefined;
  if (!parentId || !parentId.startsWith('local-')) return payload;
  const clientGeneratedId = clientIdFromLocalId(parentId);
  if (!clientGeneratedId) return payload;
  const resolved = await resolveSyncedId(parentTable, clientGeneratedId);
  if (!resolved) return null;
  return { ...payload, [parentKey]: resolved };
}

async function flushEncounters(facilityId?: string) {
  const all = await db.outboxEncounters.where('status').anyOf('pending', 'error').toArray();
  const scoped = all.filter((e) => !facilityId || e.facilityId === facilityId);
  if (scoped.length === 0) return;

  const ready: Array<{ row: typeof scoped[number]; payload: Record<string, unknown> }> = [];
  for (const row of scoped) {
    const payload = await resolveParentReference(row.payload, 'patientId', db.patients);
    if (payload) ready.push({ row, payload });
    // else: the referenced patient hasn't synced yet — leave this row
    // queued as-is, it'll resolve on a later cycle once the patient does.
  }
  if (ready.length === 0) return;

  await db.outboxEncounters.bulkPut(ready.map(({ row }) => ({ ...row, status: 'syncing' as const })));

  let data: { encounters: PushResult[] };
  try {
    ({ data } = await apiClient.post('/sync/push', {
      encounters: ready.map((r) => r.payload),
    }));
  } catch (err) {
    await db.outboxEncounters.bulkPut(ready.map(({ row }) => ({ ...row, status: 'pending' as const })));
    throw err;
  }

  for (const result of data.encounters) {
    if (result.status === 'ok' && result.serverId) {
      // Same reason as flushPatients: promote instead of just deleting, so
      // a same-cycle flush of vitals/diagnoses/prescriptions/lab orders can
      // resolve this encounter's real id right away.
      const localRow = await db.encounters.get(localId(result.clientGeneratedId));
      if (localRow) {
        await db.encounters.put({ ...localRow, id: result.serverId });
      }
      await db.encounters.delete(localId(result.clientGeneratedId));
      await db.outboxEncounters.delete(result.clientGeneratedId);
    } else {
      await db.outboxEncounters.update(result.clientGeneratedId, {
        status: 'error',
        error: result.error,
      });
    }
  }
}

/** Shared flush for the four clinical-record outbox tables (vitals,
 *  diagnoses, prescriptions, lab orders). Each entry's payload.encounterId
 *  is resolved against db.encounters the same way flushEncounters resolves
 *  patientId — a row whose encounter hasn't synced yet is simply skipped
 *  this cycle, not marked syncing or failed. Unlike patients/encounters,
 *  these have no separate optimistic cache row to promote/delete: the
 *  outbox entry itself is what the UI shows as "pending" (merged with the
 *  synced detail.* arrays on the encounter), so a success just deletes it. */
async function flushClinicalRecords(
  table: Table<OutboxDependentRecord, string>,
  pushKey: 'vitals' | 'diagnoses' | 'prescriptions' | 'labOrders',
  facilityId?: string,
) {
  const all = await table.where('status').anyOf('pending', 'error').toArray();
  const scoped = all.filter((r) => !facilityId || r.facilityId === facilityId);
  if (scoped.length === 0) return;

  const ready: Array<{ row: (typeof scoped)[number]; payload: Record<string, unknown> }> = [];
  for (const row of scoped) {
    const payload = await resolveParentReference(row.payload, 'encounterId', db.encounters);
    if (payload) ready.push({ row, payload });
  }
  if (ready.length === 0) return;

  await table.bulkPut(ready.map(({ row }) => ({ ...row, status: 'syncing' as const })));

  let data: Record<string, PushResult[]>;
  try {
    ({ data } = await apiClient.post('/sync/push', { [pushKey]: ready.map((r) => r.payload) }));
  } catch (err) {
    await table.bulkPut(ready.map(({ row }) => ({ ...row, status: 'pending' as const })));
    throw err;
  }

  for (const result of data[pushKey]) {
    if (result.status === 'ok') {
      await table.delete(result.clientGeneratedId);
    } else {
      await table.update(result.clientGeneratedId, { status: 'error', error: result.error });
    }
  }
}

async function pull() {
  const lastRow = await db.meta.get(LAST_SYNCED_KEY);
  const since = lastRow?.value;

  const { data } = await apiClient.get('/sync/pull', { params: since ? { since } : {} });

  if (data.patients?.length) {
    await db.patients.bulkPut(data.patients as Patient[]);
  }
  if (data.encounters?.length) {
    await db.encounters.bulkPut(
      (data.encounters as Encounter[]).map((e) => ({ ...e })),
    );
  }

  await db.meta.put({ key: LAST_SYNCED_KEY, value: data.serverTime });
}

/**
 * Recovers rows left at 'syncing' by a pre-fix build of this engine, where a
 * failed push (dropped connection, expired token, server error) never reset
 * the status and the row silently stopped being retried forever. Safe to
 * call unconditionally: a push is idempotent on clientGeneratedId, so even
 * a row whose earlier attempt actually succeeded server-side just gets
 * deduped on retry instead of duplicated.
 */
async function reviveStuckRows(): Promise<void> {
  const tables = [
    db.outboxPatients,
    db.outboxEncounters,
    db.outboxVitals,
    db.outboxDiagnoses,
    db.outboxPrescriptions,
    db.outboxLabOrders,
  ];
  for (const table of tables) {
    const stuck = await table.where('status').equals('syncing').toArray();
    if (stuck.length) {
      await table.bulkPut(stuck.map((row) => ({ ...row, status: 'pending' as const })));
    }
  }
}

async function flushAll(facilityId?: string): Promise<void> {
  // Order matters: each step resolves parent references against rows the
  // previous step may have just synced this same cycle (see the "promote"
  // comments in flushPatients/flushEncounters) — patient before encounter,
  // encounter before anything that hangs off it.
  await flushPatients(facilityId);
  await flushEncounters(facilityId);
  await flushClinicalRecords(db.outboxVitals, 'vitals', facilityId);
  await flushClinicalRecords(db.outboxDiagnoses, 'diagnoses', facilityId);
  await flushClinicalRecords(db.outboxPrescriptions, 'prescriptions', facilityId);
  await flushClinicalRecords(db.outboxLabOrders, 'labOrders', facilityId);
}

export async function runSync(): Promise<void> {
  if (syncing || !navigator.onLine || !isAuthenticated() || isDemoMode()) return;
  syncing = true;
  notify();
  try {
    await reviveStuckRows();
    await flushAll();
    await pull();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Sync failed', err);
  } finally {
    syncing = false;
    notify();
  }
}

/**
 * Best-effort push of only this facility's queued work, using whatever
 * token is currently in localStorage. Called right after a fresh login —
 * before AuthContext wipes local data for the new session — so a record
 * that got stuck because the previous session's token expired while
 * offline still makes it to the server instead of being silently deleted.
 * Never throws: a failure here just means clearAllLocalData() proceeds as
 * it always has, which is no worse than before this existed.
 */
export async function flushOutboxForFacility(facilityId: string): Promise<void> {
  try {
    await flushAll(facilityId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Pre-login-wipe sync flush failed', err);
  }
}

export function isSyncing(): boolean {
  return syncing;
}

export function startSyncEngine(): void {
  window.addEventListener('online', () => void runSync());
  if (!intervalHandle) {
    intervalHandle = setInterval(() => void runSync(), SYNC_INTERVAL_MS);
  }
  void runSync();
}

export function stopSyncEngine(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = undefined;
  }
}
