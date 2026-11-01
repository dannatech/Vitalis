import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { LabOrderStatus, LabWorklistEntry } from '../api/types';

const emptyResultForm = {
  resultValue: '',
  unit: '',
  referenceRange: '',
  flagged: false,
  notes: '',
};

const STATUS_OPTIONS: Array<{ value: LabOrderStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'RESULTED', label: 'Resulted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Mirrors the backend's GET /labs RBAC.
const VIEW_ROLES = ['LAB_TECH', 'DOCTOR', 'NURSE', 'ADMIN', 'SUPER_ADMIN'];

export default function LabsPage() {
  const { isDemo, user } = useAuth();
  const canView = Boolean(user && VIEW_ROLES.includes(user.role));
  // Mirrors the backend's POST /encounters/lab-orders/:id/result RBAC.
  const canEnterResults = user?.role === 'LAB_TECH';

  const [orders, setOrders] = useState<LabWorklistEntry[]>([]);
  const [status, setStatus] = useState<LabOrderStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resultingId, setResultingId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState(emptyResultForm);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultSubmitting, setResultSubmitting] = useState(false);

  function loadOrders() {
    if (isDemo || !canView) return;
    setLoading(true);
    apiClient
      .get<LabWorklistEntry[]>('/labs', { params: status ? { status } : {} })
      .then(({ data }) => {
        setOrders(data);
        setError(null);
      })
      .catch(() => setError('Could not load lab orders — check connectivity.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isDemo, canView]);

  function startResult(orderId: string) {
    setResultingId(orderId);
    setResultForm(emptyResultForm);
    setResultError(null);
  }

  function cancelResult() {
    setResultingId(null);
    setResultError(null);
  }

  async function submitResult(e: FormEvent, orderId: string) {
    e.preventDefault();
    setResultSubmitting(true);
    setResultError(null);
    try {
      await apiClient.post(`/encounters/lab-orders/${orderId}/result`, {
        resultValue: resultForm.resultValue,
        unit: resultForm.unit || undefined,
        referenceRange: resultForm.referenceRange || undefined,
        flagged: resultForm.flagged,
        notes: resultForm.notes || undefined,
      });
      setResultingId(null);
      loadOrders();
    } catch (err) {
      setResultError(
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Could not save the result — check the details and try again.',
      );
    } finally {
      setResultSubmitting(false);
    }
  }

  if (!canView) {
    return (
      <div>
        <h1>Labs</h1>
        <p className="hint">
          This worklist isn't available for your role. It's visible to lab techs, doctors,
          nurses, and admins.
        </p>
      </div>
    );
  }

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
                {canEnterResults && <th></th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isResulting = resultingId === order.id;
                const canResultThis =
                  canEnterResults && !order.result && order.status !== 'CANCELLED';
                return (
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
                          {order.result.notes && (
                            <div className="muted-inline">{order.result.notes}</div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canEnterResults && (
                      <td>
                        {isResulting ? (
                          <form
                            className="inline-edit"
                            onSubmit={(e) => submitResult(e, order.id)}
                          >
                            <input
                              required
                              placeholder="Result"
                              value={resultForm.resultValue}
                              onChange={(e) =>
                                setResultForm((f) => ({ ...f, resultValue: e.target.value }))
                              }
                            />
                            <input
                              placeholder="Unit"
                              value={resultForm.unit}
                              onChange={(e) =>
                                setResultForm((f) => ({ ...f, unit: e.target.value }))
                              }
                            />
                            <input
                              placeholder="Reference range"
                              value={resultForm.referenceRange}
                              onChange={(e) =>
                                setResultForm((f) => ({ ...f, referenceRange: e.target.value }))
                              }
                            />
                            <label>
                              <input
                                type="checkbox"
                                checked={resultForm.flagged}
                                onChange={(e) =>
                                  setResultForm((f) => ({ ...f, flagged: e.target.checked }))
                                }
                              />{' '}
                              Flagged
                            </label>
                            <input
                              placeholder="Note for the doctor"
                              value={resultForm.notes}
                              onChange={(e) =>
                                setResultForm((f) => ({ ...f, notes: e.target.value }))
                              }
                            />
                            <button type="submit" disabled={resultSubmitting}>
                              {resultSubmitting ? 'Saving…' : 'Save result'}
                            </button>
                            <button type="button" disabled={resultSubmitting} onClick={cancelResult}>
                              Cancel
                            </button>
                            {resultError && <div className="error-banner">{resultError}</div>}
                          </form>
                        ) : (
                          canResultThis && (
                            <button type="button" onClick={() => startResult(order.id)}>
                              Enter result
                            </button>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
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
