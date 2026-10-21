import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { clientIdFromLocalId, db } from '../db/offlineDb';
import apiClient from '../api/client';
import type { EncounterDetail } from '../api/types';
import BackButton from '../components/BackButton';

export default function EncounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const directEncounter = useLiveQuery(() => (id ? db.encounters.get(id) : undefined), [id]);

  // Same rationale as PatientDetailPage: an offline-created encounter's temp
  // "local-…" row is replaced by the canonical server record once it syncs.
  const pendingClientId = id ? clientIdFromLocalId(id) : null;
  const canonicalEncounter = useLiveQuery(
    () =>
      !directEncounter && pendingClientId
        ? db.encounters.where('clientGeneratedId').equals(pendingClientId).first()
        : undefined,
    [directEncounter, pendingClientId],
  );

  useEffect(() => {
    if (!directEncounter && canonicalEncounter) {
      navigate(`/encounters/${canonicalEncounter.id}`, { replace: true });
    }
  }, [directEncounter, canonicalEncounter, navigate]);

  const encounter = directEncounter ?? canonicalEncounter;
  const id_ = encounter?.id ?? id;
  const isUnsynced = id_?.startsWith('local-') ?? false;

  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id_ || isUnsynced) return;
    try {
      const { data } = await apiClient.get<EncounterDetail>(`/encounters/${id_}`);
      setDetail(data);
      setError(null);
    } catch {
      setError('Could not load clinical detail — check connectivity.');
    }
  }, [id_, isUnsynced]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (!encounter) return <p>Loading…</p>;

  return (
    <div>
      <BackButton fallback={encounter.patientId ? `/patients/${encounter.patientId}` : '/patients'} />
      <h1>Encounter — {new Date(encounter.visitDate).toLocaleString()}</h1>
      <p className="subtitle">
        {encounter.type} · {encounter.status}
      </p>

      {isUnsynced && (
        <div className="hint">
          This encounter hasn't synced to the server yet. Vitals, diagnoses, prescriptions and
          lab orders can be added once it syncs (automatic when back online).
        </div>
      )}

      {!isUnsynced && error && <div className="error-banner">{error}</div>}

      {!isUnsynced && detail && (
        <>
          <VitalsSection encounterId={id_!} vitals={detail.vitals} onSaved={loadDetail} />
          <DiagnosesSection encounterId={id_!} diagnoses={detail.diagnoses} onSaved={loadDetail} />
          <PrescriptionsSection
            encounterId={id_!}
            prescriptions={detail.prescriptions}
            onSaved={loadDetail}
          />
          <LabOrdersSection encounterId={id_!} labOrders={detail.labOrders} onSaved={loadDetail} />
        </>
      )}
    </div>
  );
}

function VitalsSection({
  encounterId,
  vitals,
  onSaved,
}: {
  encounterId: string;
  vitals: EncounterDetail['vitals'];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    temperatureC: '',
    bloodPressureSys: '',
    bloodPressureDia: '',
    pulseBpm: '',
    respiratoryRate: '',
    spo2Percent: '',
    weightKg: '',
    heightCm: '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, Number(v)]),
    );
    try {
      await apiClient.post(`/encounters/${encounterId}/vitals`, payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Vital signs</h2>
      <ul>
        {vitals.map((v) => (
          <li key={v.id}>
            T {v.temperatureC ?? '—'}°C · BP {v.bloodPressureSys ?? '—'}/{v.bloodPressureDia ?? '—'}{' '}
            · Pulse {v.pulseBpm ?? '—'} bpm · SpO₂ {v.spo2Percent ?? '—'}% · RR{' '}
            {v.respiratoryRate ?? '—'} · Wt {v.weightKg ?? '—'}kg · Ht {v.heightCm ?? '—'}cm
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Temp °C" value={form.temperatureC} onChange={(e) => setForm({ ...form, temperatureC: e.target.value })} />
        <input placeholder="BP sys" value={form.bloodPressureSys} onChange={(e) => setForm({ ...form, bloodPressureSys: e.target.value })} />
        <input placeholder="BP dia" value={form.bloodPressureDia} onChange={(e) => setForm({ ...form, bloodPressureDia: e.target.value })} />
        <input placeholder="Pulse" value={form.pulseBpm} onChange={(e) => setForm({ ...form, pulseBpm: e.target.value })} />
        <input placeholder="RR" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
        <input placeholder="SpO2 %" value={form.spo2Percent} onChange={(e) => setForm({ ...form, spo2Percent: e.target.value })} />
        <input placeholder="Weight kg" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
        <input placeholder="Height cm" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
        <button type="submit" disabled={saving}>
          Add vitals
        </button>
      </form>
    </section>
  );
}

function DiagnosesSection({
  encounterId,
  diagnoses,
  onSaved,
}: {
  encounterId: string;
  diagnoses: EncounterDetail['diagnoses'];
  onSaved: () => void;
}) {
  const [icd10Code, setIcd10Code] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post(`/encounters/${encounterId}/diagnoses`, { icd10Code, description });
      setIcd10Code('');
      setDescription('');
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Diagnoses</h2>
      <ul>
        {diagnoses.map((d) => (
          <li key={d.id}>
            <strong>{d.icd10Code}</strong> — {d.description}
            {d.notifiableDisease && (
              <span className="badge danger">
                NCDC notifiable ({d.notifiableDisease.reportingTimeframe})
              </span>
            )}
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="ICD-10 code" value={icd10Code} onChange={(e) => setIcd10Code(e.target.value)} required />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <button type="submit" disabled={saving}>
          Add diagnosis
        </button>
      </form>
    </section>
  );
}

function PrescriptionsSection({
  encounterId,
  prescriptions,
  onSaved,
}: {
  encounterId: string;
  prescriptions: EncounterDetail['prescriptions'];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    route: '',
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post(`/encounters/${encounterId}/prescriptions`, {
        ...form,
        durationDays: Number(form.durationDays),
      });
      setForm({ medicationName: '', dosage: '', frequency: '', durationDays: '', route: '' });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Prescriptions</h2>
      <ul>
        {prescriptions.map((p) => (
          <li key={p.id}>
            {p.medicationName} — {p.dosage}, {p.frequency}, {p.durationDays}d, {p.route}
            {p.dispensed && <span className="badge">Dispensed</span>}
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Medication" value={form.medicationName} onChange={(e) => setForm({ ...form, medicationName: e.target.value })} required />
        <input placeholder="Dosage" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} required />
        <input placeholder="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} required />
        <input placeholder="Duration (days)" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} required />
        <input placeholder="Route" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} required />
        <button type="submit" disabled={saving}>
          Add prescription
        </button>
      </form>
    </section>
  );
}

function LabOrdersSection({
  encounterId,
  labOrders,
  onSaved,
}: {
  encounterId: string;
  labOrders: EncounterDetail['labOrders'];
  onSaved: () => void;
}) {
  const [testName, setTestName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post(`/encounters/${encounterId}/lab-orders`, { testName });
      setTestName('');
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Lab orders</h2>
      <ul>
        {labOrders.map((o) => (
          <li key={o.id}>
            {o.testName} — {o.status}
            {o.result && (
              <span>
                {' '}
                → {o.result.resultValue} {o.result.unit ?? ''}{' '}
                {o.result.flagged && <span className="badge danger">Flagged</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Test name" value={testName} onChange={(e) => setTestName(e.target.value)} required />
        <button type="submit" disabled={saving}>
          Order test
        </button>
      </form>
    </section>
  );
}
