import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

const emptyForm = {
  facilityName: '',
  state: '',
  lga: '',
  address: '',
  facilityPhone: '',
  adminFullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        facilityName: form.facilityName,
        state: form.state,
        lga: form.lga,
        address: form.address || undefined,
        facilityPhone: form.facilityPhone || undefined,
        adminFullName: form.adminFullName,
        email: form.email,
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError('An account with this email already exists.');
      } else {
        setError('Could not create your account. Please check your details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-page">
      <form className="card login-card signup-card" onSubmit={handleSubmit}>
        <Logo size={44} />
        <h1>Register your facility</h1>
        <p className="subtitle">
          This creates a new facility on Vitalis and an admin account for you. Your admin
          account can then add doctors, nurses, and other staff.
        </p>
        {error && <div className="error-banner">{error}</div>}

        <h2 className="form-section-label">Facility</h2>
        <label>
          Facility name *
          <input
            required
            value={form.facilityName}
            onChange={(e) => update('facilityName', e.target.value)}
            placeholder="e.g. Ikeja Community Clinic"
          />
        </label>
        <div className="signup-row">
          <label>
            State *
            <select required value={form.state} onChange={(e) => update('state', e.target.value)}>
              <option value="" disabled>
                Select state
              </option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            LGA *
            <input required value={form.lga} onChange={(e) => update('lga', e.target.value)} />
          </label>
        </div>
        <label>
          Address
          <input value={form.address} onChange={(e) => update('address', e.target.value)} />
        </label>
        <label>
          Facility phone
          <input
            value={form.facilityPhone}
            onChange={(e) => update('facilityPhone', e.target.value)}
          />
        </label>

        <h2 className="form-section-label">Your admin account</h2>
        <label>
          Full name *
          <input
            required
            value={form.adminFullName}
            onChange={(e) => update('adminFullName', e.target.value)}
          />
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
        <div className="signup-row">
          <label>
            Password *
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </label>
          <label>
            Confirm password *
            <input
              required
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
            />
          </label>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create facility account'}
        </button>

        <p className="subtitle" style={{ textAlign: 'center', marginBottom: 0 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
