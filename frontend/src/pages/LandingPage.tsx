import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Logo from '../components/Logo';

const FEATURES = [
  {
    title: 'Offline-first by design',
    body: "Register patients and document encounters with no internet connection. Everything queues locally and syncs automatically once you're back online — built for facilities with unreliable connectivity.",
  },
  {
    title: 'Built for local data protection law',
    body: "Consent capture, data-subject access/erasure requests, field-level encryption for sensitive identifiers, and an append-only audit log — mapped to each country's own regulation (NDPR in Nigeria today, with more on the way).",
  },
  {
    title: 'Notifiable-disease alerts',
    body: "Diagnoses matching each country's IDSR priority disease list are automatically flagged, giving your facility an internal worklist for required reporting to the local health authority.",
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
    title: 'National ID & insurance-ready identifiers',
    body: "Captures each country's national ID and insurance-scheme enrollee numbers alongside standard demographics, so claims and insurance workflows have what they need.",
  },
];

export default function LandingPage() {
  const { user, loginDemo } = useAuth();
  const navigate = useNavigate();
  const primaryCtaTarget = user ? '/dashboard' : '/signup';
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
            Vitalis is an offline-first EHR built around African healthcare regulation — local
            data protection law, national-ID and insurance-ready identifiers, and
            notifiable-disease reporting tailored to each country, not bolted on later.
            Nigeria, Kenya, Ghana, and South Africa today, with more on the way.
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
          Open-source reference EHR for African healthcare regulation — Nigeria is the
          fully-worked reference implementation today, with Kenya, Ghana, and South Africa
          structurally supported. See{' '}
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
