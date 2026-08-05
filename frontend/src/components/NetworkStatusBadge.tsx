import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/offlineDb';
import { isSyncing, onSyncActivity, runSync } from '../sync/syncEngine';

export default function NetworkStatusBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const unsubscribe = onSyncActivity(() => setSyncTick((t) => t + 1));
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      unsubscribe();
    };
  }, []);

  const pendingPatients = useLiveQuery(() => db.outboxPatients.count(), []) ?? 0;
  const pendingEncounters = useLiveQuery(() => db.outboxEncounters.count(), []) ?? 0;
  const pending = pendingPatients + pendingEncounters;
  const syncing = isSyncing();

  return (
    <div className={`network-badge ${online ? 'online' : 'offline'}`}>
      <span className="dot" aria-hidden="true" />
      {online ? (syncing ? 'Syncing…' : 'Online') : 'Offline'}
      {pending > 0 && (
        <button
          className="pending-count"
          onClick={() => void runSync()}
          title="Records waiting to sync — click to retry now"
          type="button"
        >
          {pending} pending
        </button>
      )}
      <span hidden data-sync-tick={syncTick} />
    </div>
  );
}
