import { beforeEach, describe, expect, it } from 'vitest';
import { isAuthenticated, isDemoMode } from './sessionFlags';
import { AUTH_STORAGE_KEY } from '../api/client';
import { DEMO_MODE_STORAGE_KEY } from '../demo/demoModeFlag';

describe('sessionFlags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isAuthenticated is false with nothing stored', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated is true once a session (real or demo) is stored', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: 'x', user: {} }));
    expect(isAuthenticated()).toBe(true);
  });

  it('isDemoMode is false by default, including for a real login', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: 'real-token', user: {} }));
    expect(isDemoMode()).toBe(false);
  });

  // Regression test for the bug where "Preview without login" writes got
  // stuck forever: a demo session stores an AUTH_STORAGE_KEY entry (with an
  // empty access token) alongside the demo flag, so isAuthenticated() alone
  // returns true for it exactly like a real login — runSync() must also
  // check isDemoMode() before attempting a network sync, or it keeps trying
  // to sync a session that was never real and the write never clears the
  // outbox.
  it('isDemoMode is true for a demo session even though isAuthenticated() is also true', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ accessToken: '', user: { id: 'demo-user' } }),
    );
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');

    expect(isAuthenticated()).toBe(true);
    expect(isDemoMode()).toBe(true);
  });
});
