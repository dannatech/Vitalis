import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';

const FEATURES = [
  {
    title: 'Offline-first by design',
    body: "Register patients and document encounters with no internet connection. Everything queues locally and syncs automatically once you're back online — built for facilities with unreliable connectivity.",
  },
  {
    title: 'NDPR-compliant from day one',
    body: 'Consent capture, data-subject access/erasure requests, field-level encryption for sensitive identifiers, and an append-only audit log on every record touched.',
  },
  {
    title: 'NCDC notifiable-disease alerts',
    body: "Diagnoses matching Nigeria's IDSR priority disease list are automatically flagged, giving your facility an internal worklist for required reporting.",
  },
  {
    title: 'Role-based access control',
    body: 'Doctors, nurses, pharmacists, lab techs, records officers, and admins each see exactly what their role needs — nothing more.',
  },
  {
    title: 'Complete clinical record',
    body: 'Registration, vital signs, ICD-10 diagnoses, prescriptions, and lab orders & results, all tied to a single patient timeline.',
  },
  {
    title: 'NHIS-ready identifiers',
    body: 'Captures NIN and NHIS enrollee numbers alongside standard demographics, so claims and insurance workflows have what they need.',
  },
];

export default function LandingPage() {
  const { user, loginDemo } = useAuth();
  const navigate = useNavigate();
  const primaryCtaTarget = user ? '/dashboard' : '/login';
  const primaryCtaLabel = user ? 'Go to dashboard' : 'Get Started';

  async function handlePreview() {
    await loginDemo();
    navigate('/dashboard');
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo withWordmark size={26} />
        <Link to="/login" className="landing-nav-link">
          Sign in
        </Link>
      </header>

      <section className="landing-hero">
        <svg className="landing-watermark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M4 16H10L13 8L17 24L20 12L23 16H28"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="landing-hero-content">
          <h1 className="landing-title">Electronic Health Records built for African hospitals</h1>
          <p className="landing-subtitle">
            Vitalis is an offline-first EHR designed around Nigerian healthcare regulation —
            NDPR data protection, NHIS-ready identifiers, and NCDC notifiable-disease reporting,
            built in from day one rather than bolted on later.
          </p>
          <div className="landing-cta-row">
            <Link to={primaryCtaTarget} className="button">
              {primaryCtaLabel}
            </Link>
            {!user && (
              <button type="button" className="landing-text-button" onClick={handlePreview}>
                Preview without login →
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          Open-source reference EHR for Nigerian healthcare regulation. See{' '}
          <a
            href="https://github.com/dannatech/Vitalis/blob/main/COMPLIANCE.md"
            target="_blank"
            rel="noreferrer"
          >
            COMPLIANCE.md
          </a>{' '}
          for what's production-ready today and what's still a reference implementation.
        </p>
      </footer>
    </div>
  );
}
