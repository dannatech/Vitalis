import { FormEvent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import apiClient from '../../api/client';
import type {
  InvoiceDetail,
  InvoiceListEntry,
  InvoiceStatus,
  Patient,
  Payer,
  PaymentMethod,
  TariffItem,
} from '../../api/types';

type StatusFilter = '' | InvoiceStatus;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'FINALIZED', label: 'Finalized' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'CAPITATION', 'OTHER'];

function statusBadgeClass(status: InvoiceStatus): string {
  if (status === 'PAID') return 'badge success';
  if (status === 'VOID') return 'badge danger';
  if (status === 'DRAFT') return 'badge';
  return 'badge warning';
}

function money(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

interface Props {
  payers: Payer[];
  tariffItems: TariffItem[];
}

export default function InvoicesTab({ payers, tariffItems }: Props) {
  const [invoices, setInvoices] = useState<InvoiceListEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newPayerId, setNewPayerId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const [lineTariffId, setLineTariffId] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineUnitPrice, setLineUnitPrice] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  const loadInvoices = useCallback(async () => {
    try {
      const { data } = await apiClient.get<InvoiceListEntry[]>('/billing/invoices', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setInvoices(data);
      setLoadError(null);
    } catch {
      setLoadError('Could not load invoices — check connectivity.');
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const { data } = await apiClient.get<InvoiceDetail>(`/billing/invoices/${id}`);
      setDetail(data);
      setDetailError(null);
    } catch {
      setDetailError('Could not load this invoice — check connectivity.');
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function searchPatients() {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }
    try {
      const { data } = await apiClient.get<{ items: Patient[] }>('/patients', {
        params: { search: patientSearch.trim(), pageSize: 10 },
      });
      setPatientResults(data.items);
    } catch {
      setPatientResults([]);
    }
  }

  async function handleCreateInvoice(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    setCreateError(null);
    setCreating(true);
    try {
      const { data } = await apiClient.post<{ id: string }>('/billing/invoices', {
        patientId: selectedPatient.id,
        payerId: newPayerId || undefined,
      });
      setShowNewForm(false);
      setSelectedPatient(null);
      setPatientSearch('');
      setPatientResults([]);
      setNewPayerId('');
      await loadInvoices();
      setSelectedId(data.id);
    } catch {
      setCreateError('Could not create the invoice — try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddLine(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/invoices/${detail.id}/charge-lines`, {
        tariffItemId: lineTariffId || undefined,
        description: lineTariffId ? undefined : lineDescription,
        unitPrice: lineTariffId ? undefined : Number(lineUnitPrice),
        quantity: Number(lineQuantity) || 1,
      });
      setLineTariffId('');
      setLineDescription('');
      setLineUnitPrice('');
      setLineQuantity('1');
      await loadDetail(detail.id);
    } catch (err) {
      setActionError(
        axios.isAxiosError(err) && err.response?.status === 400
          ? 'Give either a tariff item or a description and unit price.'
          : 'Could not add that charge line — try again.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRemoveLine(lineId: string) {
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.delete(`/billing/invoices/${detail.id}/charge-lines/${lineId}`);
      await loadDetail(detail.id);
    } catch {
      setActionError('Could not remove that charge line — try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleFinalize() {
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/invoices/${detail.id}/finalize`);
      await loadDetail(detail.id);
      await loadInvoices();
    } catch (err) {
      setActionError(
        axios.isAxiosError(err) && err.response?.status === 400
          ? 'Add at least one charge line before finalizing.'
          : 'Could not finalize this invoice — try again.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setActionError(null);
    setWorking(true);
    try {
      await apiClient.post(`/billing/invoices/${detail.id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentReference || undefined,
      });
      setPaymentAmount('');
      setPaymentReference('');
      await loadDetail(detail.id);
      await loadInvoices();
    } catch {
      setActionError('Could not record that payment — try again.');
    } finally {
      setWorking(false);
    }
  }

  if (selectedId && detail) {
    const balance = detail.subtotal - detail.amountPaid;
    return (
      <div>
        <div className="page-header">
          <h2>{detail.invoiceNumber ?? 'Draft invoice'}</h2>
          <button type="button" className="secondary" onClick={() => setSelectedId(null)}>
            Back to invoices
          </button>
        </div>
        {detailError && <div className="error-banner">{detailError}</div>}
        {actionError && <div className="error-banner">{actionError}</div>}

        <dl className="detail-grid">
          <dt>Patient</dt>
          <dd>
            {detail.patient.surname}, {detail.patient.firstName}{' '}
            <span className="muted-inline">({detail.patient.mrn})</span>
          </dd>
          <dt>Payer</dt>
          <dd>{detail.payer.name}</dd>
          <dt>Status</dt>
          <dd>
            <span className={statusBadgeClass(detail.status)}>{detail.status}</span>
          </dd>
          <dt>Subtotal</dt>
          <dd>{money(detail.subtotal)}</dd>
          <dt>Paid</dt>
          <dd>{money(detail.amountPaid)}</dd>
          {detail.status !== 'DRAFT' && (
            <>
              <dt>Balance</dt>
              <dd>{money(balance)}</dd>
            </>
          )}
        </dl>

        <h3>Charge lines</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Amount</th>
              {detail.status === 'DRAFT' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {detail.chargeLines.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td>{line.quantity}</td>
                <td>{money(line.unitPrice)}</td>
                <td>{money(line.unitPrice * line.quantity)}</td>
                {detail.status === 'DRAFT' && (
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={working}
                      onClick={() => handleRemoveLine(line.id)}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {detail.chargeLines.length === 0 && <p className="empty-state">No charge lines yet.</p>}

        {detail.status === 'DRAFT' && (
          <section className="card" style={{ maxWidth: 'none' }}>
            <h3>Add a charge line</h3>
            <form className="form-grid" onSubmit={handleAddLine}>
              <label>
                From tariff
                <select value={lineTariffId} onChange={(e) => setLineTariffId(e.target.value)}>
                  <option value="">— Manual entry —</option>
                  {tariffItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({money(item.unitPrice)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                />
              </label>
              {!lineTariffId && (
                <>
                  <label>
                    Description
                    <input
                      value={lineDescription}
                      onChange={(e) => setLineDescription(e.target.value)}
                      placeholder="e.g. Wound dressing"
                    />
                  </label>
                  <label>
                    Unit price (₦)
                    <input
                      type="number"
                      min={0}
                      value={lineUnitPrice}
                      onChange={(e) => setLineUnitPrice(e.target.value)}
                    />
                  </label>
                </>
              )}
              <div className="span-2 actions">
                <button type="submit" disabled={working}>
                  Add charge line
                </button>
              </div>
            </form>
          </section>
        )}

        {detail.status === 'DRAFT' && (
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={handleFinalize} disabled={working}>
              Finalize invoice
            </button>
          </div>
        )}

        {detail.status !== 'DRAFT' && detail.status !== 'VOID' && (
          <>
            <h3>Payments</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.receivedAt).toLocaleString()}</td>
                    <td>{p.method}</td>
                    <td>{p.reference ?? '—'}</td>
                    <td>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.payments.length === 0 && <p className="empty-state">No payments recorded yet.</p>}

            {detail.status !== 'PAID' && (
              <section className="card" style={{ maxWidth: 'none' }}>
                <h3>Record a payment</h3>
                <form className="form-grid" onSubmit={handleRecordPayment}>
                  <label>
                    Amount (₦) *
                    <input
                      required
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </label>
                  <label>
                    Method *
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="span-2">
                    Reference
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Receipt / transaction reference"
                    />
                  </label>
                  <div className="span-2 actions">
                    <button type="submit" disabled={working}>
                      Record payment
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Invoices</h2>
        <button type="button" onClick={() => setShowNewForm((v) => !v)}>
          {showNewForm ? 'Cancel' : '+ New invoice'}
        </button>
      </div>

      {loadError && <div className="error-banner">{loadError}</div>}

      {showNewForm && (
        <section className="card" style={{ maxWidth: 'none' }}>
          <h3>New invoice</h3>
          {createError && <div className="error-banner">{createError}</div>}
          <form className="form-grid" onSubmit={handleCreateInvoice}>
            <label className="span-2">
              Patient *
              <div className="inline-form">
                <input
                  placeholder="Search by name or MRN…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <button type="button" className="secondary" onClick={searchPatients}>
                  Search
                </button>
              </div>
            </label>
            {selectedPatient ? (
              <p className="span-2 muted-inline">
                Selected: {selectedPatient.surname}, {selectedPatient.firstName} (
                {selectedPatient.mrn}){' '}
                <button type="button" className="secondary" onClick={() => setSelectedPatient(null)}>
                  Change
                </button>
              </p>
            ) : (
              patientResults.length > 0 && (
                <ul className="span-2 encounter-list">
                  {patientResults.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="secondary" onClick={() => setSelectedPatient(p)}>
                        {p.surname}, {p.firstName} ({p.mrn})
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
            <label className="span-2">
              Payer
              <select value={newPayerId} onChange={(e) => setNewPayerId(e.target.value)}>
                <option value="">Self-Pay (default)</option>
                {payers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="span-2 actions">
              <button type="submit" disabled={creating || !selectedPatient}>
                {creating ? 'Creating…' : 'Create draft invoice'}
              </button>
            </div>
          </form>
        </section>
      )}

      <select
        className="search-input"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Patient</th>
            <th>Payer</th>
            <th>Status</th>
            <th>Subtotal</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} onClick={() => setSelectedId(inv.id)} style={{ cursor: 'pointer' }}>
              <td>{inv.invoiceNumber ?? '(draft)'}</td>
              <td>
                {inv.patient.surname}, {inv.patient.firstName}{' '}
                <span className="muted-inline">({inv.patient.mrn})</span>
              </td>
              <td>{inv.payer.name}</td>
              <td>
                <span className={statusBadgeClass(inv.status)}>{inv.status}</span>
              </td>
              <td>{money(inv.subtotal)}</td>
              <td>{money(inv.amountPaid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length === 0 && <p className="empty-state">No matching invoices.</p>}
    </div>
  );
}
