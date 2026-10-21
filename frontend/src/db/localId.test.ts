import { describe, expect, it } from 'vitest';
import { clientIdFromLocalId, localId, newClientId } from './localId';

describe('localId / clientIdFromLocalId', () => {
  it('round-trips a client-generated id through the local- prefix', () => {
    const clientId = newClientId();
    expect(clientIdFromLocalId(localId(clientId))).toBe(clientId);
  });

  it('prefixes with "local-"', () => {
    expect(localId('abc-123')).toBe('local-abc-123');
  });

  it('returns null for an id that was never a temp local id', () => {
    // This is the case the sync-success redirect in PatientDetailPage /
    // EncounterDetailPage depends on: once a record syncs, its id is a
    // plain server UUID, and we must NOT try to treat it as still pending.
    expect(clientIdFromLocalId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBeNull();
  });

  it('strips only the prefix, keeping the rest of the id intact', () => {
    expect(clientIdFromLocalId('local-local-nested')).toBe('local-nested');
  });
});

describe('newClientId', () => {
  it('generates distinct ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => newClientId()));
    expect(ids.size).toBe(20);
  });

  it('generates a valid UUID shape', () => {
    expect(newClientId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
