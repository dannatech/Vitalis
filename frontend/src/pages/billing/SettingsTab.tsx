import { FormEvent, useState } from 'react';
import axios from 'axios';
import apiClient from '../../api/client';
import type { Payer, PayerType, TariffCategory, TariffItem } from '../../api/types';

const PAYER_TYPES: Array<{ value: PayerType; label: string }> = [
  { value: 'SELF_PAY', label: 'Self-Pay' },
  { value: 'NHIS', label: 'NHIS' },
  { value: 'STATE_SCHEME', label: 'State Scheme' },
  { value: 'PRIVATE_HMO', label: 'Private HMO' },
];

const TARIFF_CATEGORIES: Array<{ value: TariffCategory; label: string }> = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'LAB', label: 'Lab' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'OTHER', label: 'Other' },
];

function money(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

interface Props {
  payers: Payer[];
  tariffItems: TariffItem[];
  onPayersChanged: () => void;
  onTariffItemsChanged: () => void;
}

export default function SettingsTab({
  payers,
  tariffItems,
  onPayersChanged,
  onTariffItemsChanged,
}: Props) {
  const [showPayerForm, setShowPayerForm] = useState(false);
  const [payerName, setPayerName] = useState('');
  const [payerType, setPayerType] = useState<PayerType>('PRIVATE_HMO');
  const [payerContact, setPayerContact] = useState('');
  const [payerError, setPayerError] = useState<string | null>(null);
  const [savingPayer, setSavingPayer] = useState(false);

  const [showTariffForm, setShowTariffForm] = useState(false);
  const [tariffName, setTariffName] = useState('');
  const [tariffCategory, setTariffCategory] = useState<TariffCategory>('CONSULTATION');
  const [tariffPrice, setTariffPrice] = useState('');
  const [tariffCode, setTariffCode] = useState('');
  const [tariffError, setTariffError] = useState<string | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  async function handleAddPayer(e: FormEvent) {
    e.preventDefault();
    setPayerError(null);
    setSavingPayer(true);
    try {
      await apiClient.post('/billing/payers', {
        name: payerName,
        type: payerType,
        contactInfo: payerContact || undefined,
      });
      setPayerName('');
      setPayerContact('');
      setShowPayerForm(false);
      onPayersChanged();
    } catch (err) {
      setPayerError(
        axios.isAxiosError(err) && err.response?.status === 409
          ? 'A payer with this name already exists.'
          : 'Could not add this payer — try again.',
      );
    } finally {
      setSavingPayer(false);
    }
  }

  async function handleAddTariffItem(e: FormEvent) {
    e.preventDefault();
    setTariffError(null);
    setSavingTariff(true);
    try {
      await apiClient.post('/billing/tariffs', {
        name: tariffName,
        category: tariffCategory,
        unitPrice: Number(tariffPrice),
        code: tariffCode || undefined,
      });
      setTariffName('');
      setTariffPrice('');
      setTariffCode('');
      setShowTariffForm(false);
      onTariffItemsChanged();
    } catch {
      setTariffError('Could not add this price list item — try again.');
    } finally {
      setSavingTariff(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Payers</h2>
        <button type="button" onClick={() => setShowPayerForm((v) => !v)}>
          {showPayerForm ? 'Cancel' : '+ Add payer'}
        </button>
      </div>
      <p className="subtitle">
        Insurers and schemes this facility bills — NHIS, state schemes and private HMOs. Every
        facility also has a built-in Self-Pay payer for cash patients.
      </p>

      {showPayerForm && (
        <section className="card" style={{ maxWidth: 'none' }}>
          {payerError && <div className="error-banner">{payerError}</div>}
          <form className="form-grid" onSubmit={handleAddPayer}>
            <label>
              Name *
              <input required value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            </label>
            <label>
              Type *
              <select value={payerType} onChange={(e) => setPayerType(e.target.value as PayerType)}>
                {PAYER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Contact info
              <input
                value={payerContact}
                onChange={(e) => setPayerContact(e.target.value)}
                placeholder="Claims email or phone"
              />
            </label>
            <div className="span-2 actions">
              <button type="submit" disabled={savingPayer}>
                {savingPayer ? 'Adding…' : 'Add payer'}
              </button>
            </div>
          </form>
        </section>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {payers.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{PAYER_TYPES.find((t) => t.value === p.type)?.label ?? p.type}</td>
              <td>{p.contactInfo ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {payers.length === 0 && <p className="empty-state">No payers yet.</p>}

      <div className="page-header" style={{ marginTop: '2rem' }}>
        <h2>Price list</h2>
        <button type="button" onClick={() => setShowTariffForm((v) => !v)}>
          {showTariffForm ? 'Cancel' : '+ Add price list item'}
        </button>
      </div>
      <p className="subtitle">Standard facility prices used to pre-fill invoice charge lines.</p>

      {showTariffForm && (
        <section className="card" style={{ maxWidth: 'none' }}>
          {tariffError && <div className="error-banner">{tariffError}</div>}
          <form className="form-grid" onSubmit={handleAddTariffItem}>
            <label>
              Name *
              <input required value={tariffName} onChange={(e) => setTariffName(e.target.value)} />
            </label>
            <label>
              Category *
              <select
                value={tariffCategory}
                onChange={(e) => setTariffCategory(e.target.value as TariffCategory)}
              >
                {TARIFF_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit price (₦) *
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={tariffPrice}
                onChange={(e) => setTariffPrice(e.target.value)}
              />
            </label>
            <label>
              Code
              <input
                value={tariffCode}
                onChange={(e) => setTariffCode(e.target.value)}
                placeholder="Optional internal code"
              />
            </label>
            <div className="span-2 actions">
              <button type="submit" disabled={savingTariff}>
                {savingTariff ? 'Adding…' : 'Add item'}
              </button>
            </div>
          </form>
        </section>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Code</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {tariffItems.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{TARIFF_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}</td>
              <td>{item.code ?? '—'}</td>
              <td>{money(item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tariffItems.length === 0 && <p className="empty-state">No price list items yet.</p>}
    </div>
  );
}
