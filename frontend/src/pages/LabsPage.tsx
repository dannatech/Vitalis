import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { LabOrderStatus, LabWorklistEntry } from '../api/types';

const STATUS_OPTIONS: Array<{ value: LabOrderStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'RESULTED', label: 'Resulted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function LabsPage() {
  const { isDemo } = useAuth();
  const [orders, setOrders] = useState<LabWorklistEntry[]>([]);
  const [status, setStatus] = useState<LabOrderStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    setLoading(true);
    apiClient
      .get<LabWorklistEntry[]>('/labs', { params: status ? { status } : {} })
      .then(({ data }) => {
        setOrders(data);
        setError(null);
      })
      .catch(() => setError('Could not load lab orders — check connectivity.'))
      .finally(() => setLoading(false));
  }, [status, isDemo]);

  return (
    <div>
      <div className="page-header">
        <h1>Labs</h1>
      </div>
      <p className="subtitle">Lab orders and results across every patient at your facility.</p>

      {isDemo ? (
        <div className="hint">
          Preview mode — the lab worklist needs a real backend, so it's not available here.
        </div>
      ) : (
        <>
          <select
            className="search-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as LabOrderStatus | '')}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {error && <div className="error-banner">{error}</div>}

          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Test</th>
                <th>Status</th>
                <th>Ordered</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/patients/${order.patient.id}`}>
                      {order.patient.surname}, {order.patient.firstName}
                    </Link>{' '}
                    <span className="muted-inline">({order.patient.mrn})</span>
                  </td>
                  <td>
                    <Link to={`/encounters/${order.encounterId}`}>{order.testName}</Link>
                  </td>
                  <td>{order.status}</td>
                  <td>{new Date(order.orderedAt).toLocaleString()}</td>
                  <td>
                    {order.result ? (
                      <>
                        {order.result.resultValue} {order.result.unit ?? ''}
                        {order.result.flagged && <span className="badge danger">Flagged</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && (
            <p className="empty-state">No lab orders found.</p>
          )}
        </>
      )}
    </div>
  );
}
