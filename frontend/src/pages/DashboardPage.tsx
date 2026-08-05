import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/offlineDb';
import { useAuth } from '../auth/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const patientCount = useLiveQuery(() => db.patients.count(), []) ?? 0;
  const pendingPatients = useLiveQuery(() => db.outboxPatients.count(), []) ?? 0;
  const pendingEncounters = useLiveQuery(() => db.outboxEncounters.count(), []) ?? 0;

  return (
    <div>
      <h1>Welcome, {user?.fullName}</h1>
      <p className="subtitle">{user?.role.replace('_', ' ')}</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{patientCount}</div>
          <div className="stat-label">Patients cached locally</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendingPatients + pendingEncounters}</div>
          <div className="stat-label">Records waiting to sync</div>
        </div>
      </div>

      <div className="actions">
        <Link className="button" to="/patients/register">
          Register new patient
        </Link>
        <Link className="button secondary" to="/patients">
          Search patients
        </Link>
      </div>
    </div>
  );
}
