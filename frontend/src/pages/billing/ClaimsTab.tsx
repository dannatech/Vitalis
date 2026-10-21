import { FormEvent, useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import type { ClaimDetail, ClaimListEntry, ClaimStatus, Payer } from '../../api/types';

function statusBadgeClass(status: ClaimStatus): string {
  if (status === 'PAID' || status === 'APPROVED') return 'badge success';
  if (status === 'REJECTED') return 'badge danger';
  if (status === 'DRAFT') return 'badge';
  return 'badge warning';
}

function money(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

interface Props {
  payers: Payer[];
}

export default function ClaimsTab({ payers }: Props) {
  const [claims, setClaims] = useState<ClaimListEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genPayerId, setGenPayerId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const [adjudicateStatus, setAdjudicateStatus] = useState<
    'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED'
  >('APPROVED');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const loadClaims = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ClaimListEntry[]>('/billing/claims');
      setClaims(data);
      setLoadError(null);
    } catch {
      setLoadError('Could not load claims — check connectivity.');
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get<ClaimDetail>(`/billing/claims/${id}`);
      setDetail(data);
      setDetailError(null);
    } catch {
      setDetailError('Could not load this claim — check connectivity.');
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setGenerateError(null);
    setGenerating(true);
    try {
      const { data } = await apiClient.post<{ id: string }>('/billing/claims', {
        payerId: genPayerId,
        periodStart,
        periodEnd,
      });
      setShowGenerateForm(false);
      setGenPayerId('');
      setPeriodStart('');
      setPeriodEnd('');
      await loadClaims();
      setSelectedId(data.id);
    } catch {
      setGenerateError(
        'No unclaimed finalized invoices were found for that payer and period — try a different range.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/claims/${detail.id}/submit`);
      await loadDetail(detail.id);
      await loadClaims();
    } catch {
      setActionError('Could not submit this claim — try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleAdjudicate(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/claims/${detail.id}/adjudicate`, {
        status: adjudicateStatus,
        approvedAmount: adjudicateStatus === 'REJECTED' ? undefined : Number(approvedAmount),
        rejectionReason: adjudicateStatus === 'APPROVED' ? undefined : rejectionReason || undefined,
      });
      setApprovedAmount('');
      setRejectionReason('');
      await loadDetail(detail.id);
      await loadClaims();
    } catch {
      setActionError('Could not record adjudication — check the amount/reason and try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleMarkPaid() {
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/claims/${detail.id}/mark-paid`);
      await loadDetail(detail.id);
      await loadClaims();
    } catch {
      setActionError('Could not mark this claim as paid — try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleExport() {
    if (!detail) return;
    try {
      const { data } = await apiClient.get<string>(`/billing/claims/${detail.id}/export.csv`, {
        responseType: 'text',
      });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-${detail.claimNumber}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Could not export this claim — try again.');
    }
  }

  if (selectedId && detail) {
    return (
      <div>
        <div className="page-header">
          <h2>{detail.claimNumber}</h2>
          <button type="button" className="secondary" onClick={() => setSelectedId(null)}>
            Back to claims
          </button>
        </div>
        {detailError && <div className="error-banner">{detailError}</div>}
        {actionError && <div className="error-banner">{actionError}</div>}

        <dl className="detail-grid">
          <dt>Payer</dt>
          <dd>{detail.payer.name}</dd>
          <dt>Period</dt>
          <dd>
            {new Date(detail.periodStart).toLocaleDateString()} –{' '}
            {new Date(detail.periodEnd).toLocaleDateString()}
          </dd>
          <dt>Status</dt>
          <dd>
            <span className={statusBadgeClass(detail.status)}>{detail.status}</span>
          </dd>
          <dt>Total billed</dt>
          <dd>{money(detail.totalAmount)}</dd>
          {detail.approvedAmount !== null && (
            <>
              <dt>Approved amount</dt>
              <dd>{money(detail.approvedAmount)}</dd>
            </>
          )}
          {detail.rejectionReason && (
            <>
              <dt>Rejection reason</dt>
              <dd>{detail.rejectionReason}</dd>
            </>
          )}
        </dl>

        <h3>Bundled invoices</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Patient</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {detail.invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber ?? '(draft)'}</td>
                <td>
                  {inv.patient.surname}, {inv.patient.firstName}{' '}
                  <span className="muted-inline">({inv.patient.mrn})</span>
                </td>
                <td>{money(inv.subtotal)}</td>
                <td>{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="actions" style={{ marginTop: '1rem' }}>
          {detail.status === 'DRAFT' && (
            <button type="button" onClick={handleSubmit} disabled={working}>
              Submit to payer
            </button>
          )}
          {(detail.status === 'APPROVED' || detail.status === 'PARTIALLY_APPROVED') && (
            <button type="button" onClick={handleMarkPaid} disabled={working}>
              Mark paid
            </button>
          )}
          <button type="button" className="secondary" onClick={handleExport}>
            Export CSV
          </button>
        </div>

        {detail.status === 'SUBMITTED' && (
          <section className="card" style={{ maxWidth: 'none' }}>
            <h3>Record adjudication</h3>
            <form className="form-grid" onSubmit={handleAdjudicate}>
              <label>
                Outcome *
                <select
                  value={adjudicateStatus}
                  onChange={(e) => setAdjudicateStatus(e.target.value as typeof adjudicateStatus)}
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIALLY_APPROVED">Partially approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
              {adjudicateStatus !== 'REJECTED' && (
                <label>
                  Approved amount (₦) *
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                  />
                </label>
              )}
              {adjudicateStatus !== 'APPROVED' && (
                <label className="span-2">
                  Reason {adjudicateStatus === 'REJECTED' ? '*' : '(for the unapproved portion)'}
                  <input
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </label>
              )}
              <div className="span-2 actions">
                <button type="submit" disabled={working}>
                  Save adjudication
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Claims</h2>
        <button type="button" onClick={() => setShowGenerateForm((v) => !v)}>
          {showGenerateForm ? 'Cancel' : '+ Generate claim'}
        </button>
      </div>
      <p className="subtitle">
        Bundle finalized, unclaimed invoices for one payer and period into a single claim.
      </p>

      {loadError && <div className="error-banner">{loadError}</div>}

      {showGenerateForm && (
        <section className="card" style={{ maxWidth: 'none' }}>
          <h3>Generate a claim</h3>
          {generateError && <div className="error-banner">{generateError}</div>}
          <form className="form-grid" onSubmit={handleGenerate}>
            <label>
              Payer *
              <select required value={genPayerId} onChange={(e) => setGenPayerId(e.target.value)}>
                <option value="" disabled>
                  Select a payer…
                </option>
                {payers
                  .filter((p) => p.type !== 'SELF_PAY')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Period start *
              <input
                required
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </label>
            <label>
              Period end *
              <input
                required
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </label>
            <div className="span-2 actions">
              <button type="submit" disabled={generating}>
                {generating ? 'Generating…' : 'Generate claim'}
              </button>
            </div>
          </form>
        </section>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Claim #</th>
            <th>Payer</th>
            <th>Period</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr key={claim.id} onClick={() => setSelectedId(claim.id)} style={{ cursor: 'pointer' }}>
              <td>{claim.claimNumber}</td>
              <td>{claim.payer.name}</td>
              <td>
                {new Date(claim.periodStart).toLocaleDateString()} –{' '}
                {new Date(claim.periodEnd).toLocaleDateString()}
              </td>
              <td>
                <span className={statusBadgeClass(claim.status)}>{claim.status}</span>
              </td>
              <td>{money(claim.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {claims.length === 0 && <p className="empty-state">No claims generated yet.</p>}
    </div>
  );
}
