import apiClient, { AUTH_STORAGE_KEY } from '../api/client';
import { db, localId } from '../db/offlineDb';
import type { Encounter, Patient } from '../api/types';

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

function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(AUTH_STORAGE_KEY));
}

async function flushPatients() {
  const pending = await db.outboxPatients.where('status').anyOf('pending', 'error').toArray();
  if (pending.length === 0) return;

  await db.outboxPatients.bulkPut(pending.map((p) => ({ ...p, status: 'syncing' as const })));

  const { data } = await apiClient.post('/sync/push', {
    patients: pending.map((p) => p.payload),
  });

  for (const result of data.patients as Array<{
    clientGeneratedId: string;
    serverId?: string;
    status: 'ok' | 'error';
    error?: string;
  }>) {
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

async function flushEncounters() {
  const pending = await db.outboxEncounters.where('status').anyOf('pending', 'error').toArray();
  if (pending.length === 0) return;

  await db.outboxEncounters.bulkPut(pending.map((e) => ({ ...e, status: 'syncing' as const })));

  const { data } = await apiClient.post('/sync/push', {
    encounters: pending.map((e) => e.payload),
  });

  for (const result of data.encounters as Array<{
    clientGeneratedId: string;
    serverId?: string;
    status: 'ok' | 'error';
    error?: string;
  }>) {
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

export async function runSync(): Promise<void> {
  if (syncing || !navigator.onLine || !isAuthenticated()) return;
  syncing = true;
  notify();
  try {
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
