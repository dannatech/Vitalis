import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { PrescriptionWorklistEntry } from '../api/types';

type StatusFilter = '' | 'pending' | 'dispensed';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'dispensed', label: 'Dispensed' },
];

const VIEW_ROLES = ['PHARMACIST', 'DOCTOR', 'NURSE', 'ADMIN', 'SUPER_ADMIN'];

export default function PharmacyPage() {
  const { isDemo, user } = useAuth();
  const canView = Boolean(user && VIEW_ROLES.includes(user.role));
  const canDispense = user?.role === 'PHARMACIST';

  const [prescriptions, setPrescriptions] = useState<PrescriptionWorklistEntry[]>([]);
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dispensingId, setDispensingId] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    if (isDemo || !canView) return;
    try {
      const { data } = await apiClient.get<PrescriptionWorklistEntry[]>(
        '/pharmacy/prescriptions',
        { params: status ? { status } : {} },
      );
      setPrescriptions(data);
      setError(null);
    } catch {
      setError('Could not load prescriptions — check connectivity.');
    }
  }, [status, isDemo, canView]);

  useEffect(() => {
    void loadPrescriptions();
  }, [loadPrescriptions]);

  async function handleDispense(id: string) {
    setDispensingId(id);
    setActionError(null);
    try {
      await apiClient.post(`/pharmacy/prescriptions/${id}/dispense`);
      await loadPrescriptions();
    } catch {
      setActionError('Could not mark this prescription as dispensed — try again.');
    } finally {
      setDispensingId(null);
    }
  }

  if (!canView) {
    return (
      <div>
        <h1>Pharmacy</h1>
        <p className="hint">
          This worklist isn't available for your role. It's visible to pharmacists, doctors,
          nurses, and admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pharmacy</h1>
      </div>
      <p className="subtitle">Prescriptions awaiting dispensing across every patient.</p>

      {isDemo ? (
        <div className="hint">
          Preview mode — the pharmacy worklist needs a real backend, so it's not available here.
        </div>
      ) : (
        <>
          <select
            className="search-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {error && <div className="error-banner">{error}</div>}
          {actionError && <div className="error-banner">{actionError}</div>}

          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Route</th>
                <th>Status</th>
                {canDispense && <th></th>}
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id}>
                  <td>
                    <Link to={`/patients/${rx.patient.id}`}>
                      {rx.patient.surname}, {rx.patient.firstName}
                    </Link>{' '}
                    <span className="muted-inline">({rx.patient.mrn})</span>
                  </td>
                  <td>
                    <Link to={`/encounters/${rx.encounterId}`}>{rx.medicationName}</Link>
                  </td>
                  <td>{rx.dosage}</td>
                  <td>{rx.frequency}</td>
                  <td>{rx.durationDays}d</td>
                  <td>{rx.route}</td>
                  <td>
                    {rx.dispensed ? (
                      `Dispensed ${rx.dispensedAt ? new Date(rx.dispensedAt).toLocaleDateString() : ''}`
                    ) : (
                      <span className="badge warning">Pending</span>
                    )}
                  </td>
                  {canDispense && (
                    <td>
                      {!rx.dispensed && (
                        <button
                          type="button"
                          className="secondary"
                          disabled={dispensingId === rx.id}
                          onClick={() => handleDispense(rx.id)}
                        >
                          {dispensingId === rx.id ? 'Dispensing…' : 'Dispense'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {prescriptions.length === 0 && <p className="empty-state">No matching prescriptions.</p>}
        </>
      )}
    </div>
  );
}
