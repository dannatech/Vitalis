import { AUTH_STORAGE_KEY } from '../api/client';
import { DEMO_MODE_STORAGE_KEY } from '../demo/demoModeFlag';

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(AUTH_STORAGE_KEY));
}

/**
 * True while "Preview without login" is active. A demo session still writes
 * an AUTH_STORAGE_KEY entry (with an empty access token, so isAuthenticated()
 * alone can't tell it apart from a real login) — this is the check that lets
 * runSync() distinguish the two and refuse to attempt a real network sync
 * for a session that has nothing real to sync to.
 */
export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
}
