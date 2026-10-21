/**
 * Pure id helpers for the offline-first sync scheme, split out from
 * offlineDb.ts so they can be unit-tested without constructing a Dexie
 * instance (which touches IndexedDB — not available outside a browser).
 */

export function newClientId(): string {
  return crypto.randomUUID();
}

/**
 * Deterministic local id for a record created offline, used so it can be
 * shown in the UI immediately. Once the sync engine confirms the server has
 * accepted it, the temp row (keyed by this id) is replaced by the canonical
 * server record pulled down in the same sync pass.
 */
export function localId(clientGeneratedId: string): string {
  return `local-${clientGeneratedId}`;
}

/**
 * Extracts the client-generated id back out of a temp local id, or null if
 * `id` isn't a temp id. Used to look up the canonical server record once a
 * temp record has synced and been replaced — see PatientDetailPage /
 * EncounterDetailPage.
 */
export function clientIdFromLocalId(id: string): string | null {
  return id.startsWith('local-') ? id.slice('local-'.length) : null;
}
