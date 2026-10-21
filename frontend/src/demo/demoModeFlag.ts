/** Shared across seedDemoData.ts and sync/sessionFlags.ts — kept in its own
 * file with zero Dexie dependency so it can be imported by test code (or
 * anything else) without constructing an IndexedDB-backed Dexie instance. */
export const DEMO_FACILITY_ID = 'demo-facility';

/**
 * localStorage flag set while "Preview without login" is active. Checked by
 * the sync engine, which must never attempt a real network sync in this
 * mode — there is no real session for it to authenticate with, so every
 * attempt would just fail and leave the write stuck in the outbox forever.
 */
export const DEMO_MODE_STORAGE_KEY = 'vitalis.demoMode';
