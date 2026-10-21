import { FormEvent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Role, StaffMember } from '../api/types';

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECH', label: 'Lab Tech' },
  { value: 'RECORDS_OFFICER', label: 'Records Officer' },
  { value: 'BILLING_OFFICER', label: 'Billing Officer' },
];

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'DOCTOR' as Role,
  licenseNumber: '',
  licenseBody: '',
};

export default function StaffPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await apiClient.get<StaffMember[]>('/users');
      setStaff(data);
      setLoadError(null);
    } catch {
      setLoadError('Could not load staff — check connectivity.');
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/users', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        licenseNumber: form.licenseNumber || undefined,
        licenseBody: form.licenseBody || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      await loadStaff();
    } catch (err) {
      setSubmitError(
        axios.isAxiosError(err) && err.response?.status === 409
          ? 'An account with this email already exists.'
          : 'Could not create the account — check the details and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <h1>Staff</h1>
        <p className="hint">Only facility admins can view and manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Staff</h1>
        <button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add staff'}
        </button>
      </div>
      <p className="subtitle">Doctors, nurses, pharmacists and other accounts at your facility.</p>

      {loadError && <div className="error-banner">{loadError}</div>}

      {showForm && (
        <section className="card" style={{ maxWidth: 'none' }}>
          <h2>New staff account</h2>
          {submitError && <div className="error-banner">{submitError}</div>}
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Full name *
              <input
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
              />
            </label>
            <label>
              Role *
              <select value={form.role} onChange={(e) => update('role', e.target.value as Role)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Email *
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </label>
            <label>
              Temporary password *
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
              />
            </label>
            <label>
              License number
              <input
                value={form.licenseNumber}
                onChange={(e) => update('licenseNumber', e.target.value)}
                placeholder="e.g. MDCN/12345"
              />
            </label>
            <label>
              License body
              <input
                value={form.licenseBody}
                onChange={(e) => update('licenseBody', e.target.value)}
                placeholder="e.g. MDCN, NMCN, PCN"
              />
            </label>
            <div className="span-2 actions">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </section>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>License</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
              <td>{member.fullName}</td>
              <td>{ROLE_OPTIONS.find((r) => r.value === member.role)?.label ?? member.role}</td>
              <td>{member.email}</td>
              <td>
                {member.licenseNumber
                  ? `${member.licenseNumber}${member.licenseBody ? ` (${member.licenseBody})` : ''}`
                  : '—'}
              </td>
              <td>
                {member.isActive ? (
                  'Active'
                ) : (
                  <span className="badge warning">Inactive</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && <p className="empty-state">No staff accounts yet.</p>}
    </div>
  );
}
