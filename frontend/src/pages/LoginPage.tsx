import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('doctor@demo-hospital.ng');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview() {
    await loginDemo();
    navigate('/dashboard');
  }

  return (
    <div className="centered-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <Logo size={44} />
        <h1>Vitalis EHR</h1>
        <p className="subtitle">Sign in to your facility account</p>
        {error && <div className="error-banner">{error}</div>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="subtitle" style={{ textAlign: 'center', margin: 0 }}>
          New facility? <Link to="/signup">Register your hospital</Link>
        </p>

        <div className="divider">or</div>

        <button type="button" className="secondary" onClick={handlePreview}>
          Preview without login (sample data)
        </button>
        <p className="hint" style={{ marginBottom: 0 }}>
          Shows the UI with fake sample patients only — no real backend, no real patient data.
          Not a substitute for signing in with a real account.
        </p>
      </form>
    </div>
  );
}
