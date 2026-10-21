import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { NcdcReportEntry } from '../api/types';

type StatusFilter = '' | 'pending' | 'reported';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reported', label: 'Reported' },
];

const VIEW_ROLES = ['DOCTOR', 'NURSE', 'RECORDS_OFFICER', 'ADMIN', 'SUPER_ADMIN'];

export default function NcdcReportsPage() {
  const { isDemo, user } = useAuth();
  const canView = Boolean(user && VIEW_ROLES.includes(user.role));
  const canMarkReported =
    user?.role === 'RECORDS_OFFICER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [reports, setReports] = useState<NcdcReportEntry[]>([]);
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (isDemo || !canView) return;
    try {
      const { data } = await apiClient.get<NcdcReportEntry[]>('/ncdc-reports', {
        params: status ? { status } : {},
      });
      setReports(data);
      setError(null);
    } catch {
      setError('Could not load NCDC reports — check connectivity.');
    }
  }, [status, isDemo, canView]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleMarkReported(id: string) {
    setMarkingId(id);
    setActionError(null);
    try {
      await apiClient.post(`/ncdc-reports/${id}/mark-reported`);
      await loadReports();
    } catch {
      setActionError('Could not mark this report as reported — try again.');
    } finally {
      setMarkingId(null);
    }
  }

  if (!canView) {
    return (
      <div>
        <h1>NCDC Reports</h1>
        <p className="hint">
          This worklist isn't available for your role. It's visible to doctors, nurses, records
          officers, and admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>NCDC Reports</h1>
      </div>
      <p className="subtitle">
        Diagnoses flagged against Nigeria's IDSR notifiable disease list. See{' '}
        <a
          href="https://github.com/dannatech/Vitalis/blob/main/COMPLIANCE.md"
          target="_blank"
          rel="noreferrer"
        >
          COMPLIANCE.md §4
        </a>{' '}
        — this is an internal worklist, not an automatic submission to NCDC.
      </p>

      {isDemo ? (
        <div className="hint">
          Preview mode — the NCDC worklist needs a real backend, so it's not available here.
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
                <th>Disease</th>
                <th>ICD-10</th>
                <th>Timeframe</th>
                <th>Noted</th>
                <th>Status</th>
                {canMarkReported && <th></th>}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <Link to={`/patients/${report.patient.id}`}>
                      {report.patient.surname}, {report.patient.firstName}
                    </Link>{' '}
                    <span className="muted-inline">({report.patient.mrn})</span>
                  </td>
                  <td>{report.diseaseName}</td>
                  <td>{report.icd10Code}</td>
                  <td>
                    {report.reportingTimeframe === 'IMMEDIATE' ? (
                      <span className="badge danger">IMMEDIATE</span>
                    ) : (
                      report.reportingTimeframe ?? '—'
                    )}
                  </td>
                  <td>{new Date(report.notedAt).toLocaleString()}</td>
                  <td>
                    {report.reportedToNCDC ? (
                      `Reported ${report.reportedAt ? new Date(report.reportedAt).toLocaleDateString() : ''}`
                    ) : (
                      <span className="badge warning">Pending</span>
                    )}
                  </td>
                  {canMarkReported && (
                    <td>
                      {!report.reportedToNCDC && (
                        <button
                          type="button"
                          className="secondary"
                          disabled={markingId === report.id}
                          onClick={() => handleMarkReported(report.id)}
                        >
                          {markingId === report.id ? 'Marking…' : 'Mark reported'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <p className="empty-state">No matching reports.</p>}
        </>
      )}
    </div>
  );
}
