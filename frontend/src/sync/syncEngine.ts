import apiClient from '../api/client';
import { db, localId } from '../db/offlineDb';
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

async function flushPatients(facilityId?: string) {
  const all = await db.outboxPatients.where('status').anyOf('pending', 'error').toArray();
  const pending = all.filter((p) => !facilityId || p.facilityId === facilityId);
  if (pending.length === 0) return;

  await db.outboxPatients.bulkPut(pending.map((p) => ({ ...p, status: 'syncing' as const })));

  let data: { patients: Array<{ clientGeneratedId: string; serverId?: string; status: 'ok' | 'error'; error?: string }> };
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
    if (result.status === 'ok') {
      await db.outboxPatients.delete(result.clientGeneratedId);
      await db.patients.delete(localId(result.clientGeneratedId));
    } else {
      await db.outboxPatients.update(result.clientGeneratedId, {
        status: 'error',
        error: result.error,
      });
    }
  }
}

async function flushEncounters(facilityId?: string) {
  const all = await db.outboxEncounters.where('status').anyOf('pending', 'error').toArray();
  const pending = all.filter((e) => !facilityId || e.facilityId === facilityId);
  if (pending.length === 0) return;

  await db.outboxEncounters.bulkPut(pending.map((e) => ({ ...e, status: 'syncing' as const })));

  let data: { encounters: Array<{ clientGeneratedId: string; serverId?: string; status: 'ok' | 'error'; error?: string }> };
  try {
    ({ data } = await apiClient.post('/sync/push', {
      encounters: pending.map((e) => e.payload),
    }));
  } catch (err) {
    await db.outboxEncounters.bulkPut(pending.map((e) => ({ ...e, status: 'pending' as const })));
    throw err;
  }

  for (const result of data.encounters) {
    if (result.status === 'ok') {
      await db.outboxEncounters.delete(result.clientGeneratedId);
      await db.encounters.delete(localId(result.clientGeneratedId));
    } else {
      await db.outboxEncounters.update(result.clientGeneratedId, {
        status: 'error',
        error: result.error,
      });
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
  const stuckPatients = await db.outboxPatients.where('status').equals('syncing').toArray();
  if (stuckPatients.length) {
    await db.outboxPatients.bulkPut(stuckPatients.map((p) => ({ ...p, status: 'pending' as const })));
  }
  const stuckEncounters = await db.outboxEncounters.where('status').equals('syncing').toArray();
  if (stuckEncounters.length) {
    await db.outboxEncounters.bulkPut(
      stuckEncounters.map((e) => ({ ...e, status: 'pending' as const })),
    );
  }
}

export async function runSync(): Promise<void> {
  if (syncing || !navigator.onLine || !isAuthenticated() || isDemoMode()) return;
  syncing = true;
  notify();
  try {
    await reviveStuckRows();
    await flushPatients();
    await flushEncounters();
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
    await flushPatients(facilityId);
    await flushEncounters(facilityId);
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
