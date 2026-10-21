import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { clientIdFromLocalId, db } from '../db/offlineDb';
import { runSync } from '../sync/syncEngine';
import BackButton from '../components/BackButton';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    void runSync();
  }, []);

  const directPatient = useLiveQuery(() => (id ? db.patients.get(id) : undefined), [id]);

  // Once an offline-created patient syncs, its temp "local-…" row is
  // replaced by the canonical server record under a new id. If we're still
  // parked on the old URL, find the canonical record by clientGeneratedId
  // and redirect, instead of getting stuck on a row that no longer exists.
  const pendingClientId = id ? clientIdFromLocalId(id) : null;
  const canonicalPatient = useLiveQuery(
    () =>
      !directPatient && pendingClientId
        ? db.patients.where('clientGeneratedId').equals(pendingClientId).first()
        : undefined,
    [directPatient, pendingClientId],
  );

  useEffect(() => {
    if (!directPatient && canonicalPatient) {
      navigate(`/patients/${canonicalPatient.id}`, { replace: true });
    }
  }, [directPatient, canonicalPatient, navigate]);

  const patient = directPatient ?? canonicalPatient;

  const encounters = useLiveQuery(
    () =>
      patient
        ? db.encounters.where('patientId').equals(patient.id).reverse().sortBy('visitDate')
        : [],
    [patient?.id],
  );

  if (!patient) {
    return <p>Loading…</p>;
  }

  const isUnsynced = patient.id.startsWith('local-');

  return (
    <div>
      <BackButton fallback="/patients" />
      <div className="page-header">
        <div>
          <h1>
            {patient.surname}, {patient.firstName}
          </h1>
          <p className="subtitle">
            MRN {patient.mrn} · {patient.sex} · DOB{' '}
            {new Date(patient.dateOfBirth).toLocaleDateString()}
          </p>
        </div>
        {isUnsynced ? (
          <span className="badge warning" title="This record hasn't synced to the server yet">
            Pending sync
          </span>
        ) : (
          <Link className="button" to={`/patients/${patient.id}/encounters/new`}>
            New encounter
          </Link>
        )}
      </div>

      <section className="card">
        <h2>Demographics</h2>
        <dl className="detail-grid">
          <dt>NIN</dt>
          <dd>{patient.nin ?? '—'}</dd>
          <dt>NHIS number</dt>
          <dd>{patient.nhisNumber ?? '—'}</dd>
          <dt>Phone</dt>
          <dd>{patient.phone ?? '—'}</dd>
          <dt>State / LGA</dt>
          <dd>
            {patient.state ?? '—'} / {patient.lga ?? '—'}
          </dd>
          <dt>Blood group</dt>
          <dd>{patient.bloodGroup ?? '—'}</dd>
          <dt>Genotype</dt>
          <dd>{patient.genotype ?? '—'}</dd>
          <dt>Next of kin</dt>
          <dd>
            {patient.nextOfKinName
              ? `${patient.nextOfKinName} (${patient.nextOfKinRelation ?? 'n/a'}) — ${
                  patient.nextOfKinPhone ?? 'no phone'
                }`
              : '—'}
          </dd>
        </dl>
      </section>

      <section className="card">
        <h2>Encounters</h2>
        {isUnsynced && (
          <p className="hint">
            New encounters unlock once this patient record has synced to the server (automatic
            when back online).
          </p>
        )}
        {(encounters ?? []).length === 0 && <p className="empty-state">No encounters yet.</p>}
        <ul className="encounter-list">
          {(encounters ?? []).map((enc) => (
            <li key={enc.id}>
              <Link to={`/encounters/${enc.id}`}>
                {new Date(enc.visitDate).toLocaleString()} — {enc.type} ({enc.status})
              </Link>
              {enc.id.startsWith('local-') && <span className="badge warning">Pending sync</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
