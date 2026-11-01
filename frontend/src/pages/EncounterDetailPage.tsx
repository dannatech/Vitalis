import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { clientIdFromLocalId, db, newClientId } from '../db/offlineDb';
import type { OutboxDependentRecord } from '../db/offlineDb';
import type { Diagnosis, Encounter, LabOrder, Prescription, VitalSigns } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { runSync } from '../sync/syncEngine';
import BackButton from '../components/BackButton';
import { searchIcd10, type Icd10Entry } from '../data/icd10Reference';

/** True when a queued outbox row (still carrying whatever encounter id was
 *  current when it was written — possibly a stale "local-…" one) belongs to
 *  the encounter currently on screen, which may since have synced to a new
 *  real id. Matches either directly, or via the encounter's stable
 *  clientGeneratedId. */
function belongsToEncounter(payloadEncounterId: unknown, encounter: Encounter): boolean {
  if (payloadEncounterId === encounter.id) return true;
  if (
    typeof payloadEncounterId === 'string' &&
    payloadEncounterId.startsWith('local-') &&
    encounter.clientGeneratedId
  ) {
    return clientIdFromLocalId(payloadEncounterId) === encounter.clientGeneratedId;
  }
  return false;
}

function usePendingForEncounter(
  table: typeof db.outboxVitals,
  encounter: Encounter | undefined,
): OutboxDependentRecord[] {
  return (
    useLiveQuery(async () => {
      if (!encounter) return [];
      const all = await table.toArray();
      return all.filter((row) => belongsToEncounter(row.payload.encounterId, encounter));
    }, [encounter?.id, encounter?.clientGeneratedId]) ?? []
  );
}

export default function EncounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDemo, user } = useAuth();
  const directEncounter = useLiveQuery(() => (id ? db.encounters.get(id) : undefined), [id]);

  // Mirrors the backend's @Roles() on each POST /encounters/:id/... route.
  const canAddVitals = user?.role === 'DOCTOR' || user?.role === 'NURSE';
  const canAddDiagnosis = user?.role === 'DOCTOR';
  const canAddPrescription = user?.role === 'DOCTOR';
  const canAddLabOrder = user?.role === 'DOCTOR';

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

  // Best-effort background refresh so clinical detail stays current — the
  // sections below render straight from the Dexie cache (populated by
  // GET /sync/pull), so this is a freshen, not a prerequisite for display.
  useEffect(() => {
    if (!isDemo) void runSync();
  }, [isDemo]);

  if (!encounter) return <p>Loading…</p>;

  return (
    <div>
      <BackButton fallback={encounter.patientId ? `/patients/${encounter.patientId}` : '/patients'} />
      <h1>Encounter — {new Date(encounter.visitDate).toLocaleString()}</h1>
      <p className="subtitle">
        {encounter.type} · {encounter.status}
      </p>

      {isDemo && (
        <div className="hint">
          Preview mode — vitals, diagnoses, prescriptions and lab orders need a real backend, so
          they're not available for this sample encounter.
        </div>
      )}

      {!isDemo && (
        <>
          <VitalsSection encounter={encounter} canEdit={canAddVitals} />
          <DiagnosesSection encounter={encounter} canEdit={canAddDiagnosis} />
          <PrescriptionsSection encounter={encounter} canEdit={canAddPrescription} />
          <LabOrdersSection encounter={encounter} canEdit={canAddLabOrder} />
        </>
      )}

      {!isDemo && isUnsynced && (
        <p className="muted-inline">
          This encounter hasn't synced to the server yet — anything added above will sync along
          with it, automatically, once you're back online.
        </p>
      )}
    </div>
  );
}

function VitalsSection({ encounter, canEdit }: { encounter: Encounter; canEdit: boolean }) {
  const { user } = useAuth();
  const synced = encounter.vitals ?? [];
  const pending = usePendingForEncounter(db.outboxVitals, encounter);

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
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const numericFields = Object.fromEntries(
      Object.entries(form)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, Number(v)]),
    );
    try {
      const clientGeneratedId = newClientId();
      await db.outboxVitals.put({
        clientGeneratedId,
        payload: { encounterId: encounter.id, ...numericFields, clientGeneratedId },
        status: 'pending',
        createdAt: new Date().toISOString(),
        facilityId: user.facilityId,
      });
      setForm({
        temperatureC: '',
        bloodPressureSys: '',
        bloodPressureDia: '',
        pulseBpm: '',
        respiratoryRate: '',
        spo2Percent: '',
        weightKg: '',
        heightCm: '',
      });
      void runSync();
    } catch {
      setError('Could not queue vitals — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Vital signs</h2>
      <ul>
        {synced.map((v: VitalSigns) => (
          <li key={v.id}>
            T {v.temperatureC ?? '—'}°C · BP {v.bloodPressureSys ?? '—'}/{v.bloodPressureDia ?? '—'}{' '}
            · Pulse {v.pulseBpm ?? '—'} bpm · SpO₂ {v.spo2Percent ?? '—'}% · RR{' '}
            {v.respiratoryRate ?? '—'} · Wt {v.weightKg ?? '—'}kg · Ht {v.heightCm ?? '—'}cm
          </li>
        ))}
        {pending.map((row) => {
          const p = row.payload as Record<string, number | undefined>;
          return (
            <li key={row.clientGeneratedId}>
              T {p.temperatureC ?? '—'}°C · BP {p.bloodPressureSys ?? '—'}/{p.bloodPressureDia ?? '—'}{' '}
              · Pulse {p.pulseBpm ?? '—'} bpm · SpO₂ {p.spo2Percent ?? '—'}% · RR{' '}
              {p.respiratoryRate ?? '—'} · Wt {p.weightKg ?? '—'}kg · Ht {p.heightCm ?? '—'}cm{' '}
              <span className="badge warning">
                {row.status === 'error' ? 'Sync failed, will retry' : 'Pending sync'}
              </span>
            </li>
          );
        })}
      </ul>
      {synced.length === 0 && pending.length === 0 && !canEdit && (
        <p className="empty-state">No vitals recorded.</p>
      )}
      {canEdit ? (
        <>
          {error && <div className="error-banner">{error}</div>}
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
        </>
      ) : (
        <p className="hint">Only doctors and nurses can record vitals.</p>
      )}
    </section>
  );
}

function DiagnosesSection({ encounter, canEdit }: { encounter: Encounter; canEdit: boolean }) {
  const { user } = useAuth();
  const synced = encounter.diagnoses ?? [];
  const pending = usePendingForEncounter(db.outboxDiagnoses, encounter);

  const [icd10Code, setIcd10Code] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = showSuggestions ? searchIcd10(search) : [];

  function pickSuggestion(entry: Icd10Entry) {
    setIcd10Code(entry.code);
    setDescription(entry.description);
    setSearch(`${entry.code} — ${entry.description}`);
    setShowSuggestions(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const clientGeneratedId = newClientId();
      await db.outboxDiagnoses.put({
        clientGeneratedId,
        payload: { encounterId: encounter.id, icd10Code, description, clientGeneratedId },
        status: 'pending',
        createdAt: new Date().toISOString(),
        facilityId: user.facilityId,
      });
      setIcd10Code('');
      setDescription('');
      setSearch('');
      void runSync();
    } catch {
      setError('Could not queue diagnosis — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Diagnoses</h2>
      <ul>
        {synced.map((d: Diagnosis) => (
          <li key={d.id}>
            <strong>{d.icd10Code}</strong> — {d.description}
            {d.notifiableDisease && (
              <span className="badge danger">
                NCDC notifiable ({d.notifiableDisease.reportingTimeframe})
              </span>
            )}
          </li>
        ))}
        {pending.map((row) => {
          const p = row.payload as Record<string, string | undefined>;
          return (
            <li key={row.clientGeneratedId}>
              <strong>{p.icd10Code}</strong> — {p.description}{' '}
              <span className="badge warning">
                {row.status === 'error' ? 'Sync failed, will retry' : 'Pending sync'}
              </span>
            </li>
          );
        })}
      </ul>
      {synced.length === 0 && pending.length === 0 && !canEdit && (
        <p className="empty-state">No diagnoses recorded.</p>
      )}
      {canEdit ? (
        <>
          {error && <div className="error-banner">{error}</div>}
          <div className="icd10-picker">
            <input
              placeholder="Search diagnosis (e.g. malaria, B50, hypertension)…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {suggestions.length > 0 && (
              <ul className="icd10-suggestions">
                {suggestions.map((entry) => (
                  <li key={entry.code}>
                    <button type="button" onMouseDown={() => pickSuggestion(entry)}>
                      <strong>{entry.code}</strong> — {entry.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form className="inline-form" onSubmit={submit}>
            <input
              placeholder="ICD-10 code"
              value={icd10Code}
              onChange={(e) => setIcd10Code(e.target.value)}
              required
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <button type="submit" disabled={saving}>
              Add diagnosis
            </button>
          </form>
          <p className="muted-inline">
            Search picks from a Sub-Saharan Africa ICD-10 reference — not every diagnosis is
            listed, so you can always type the code and description directly below.
          </p>
        </>
      ) : (
        <p className="hint">Only doctors can record diagnoses.</p>
      )}
    </section>
  );
}

function PrescriptionsSection({ encounter, canEdit }: { encounter: Encounter; canEdit: boolean }) {
  const { user } = useAuth();
  const synced = encounter.prescriptions ?? [];
  const pending = usePendingForEncounter(db.outboxPrescriptions, encounter);

  const [form, setForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    route: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const clientGeneratedId = newClientId();
      await db.outboxPrescriptions.put({
        clientGeneratedId,
        payload: {
          encounterId: encounter.id,
          ...form,
          durationDays: Number(form.durationDays),
          clientGeneratedId,
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        facilityId: user.facilityId,
      });
      setForm({ medicationName: '', dosage: '', frequency: '', durationDays: '', route: '' });
      void runSync();
    } catch {
      setError('Could not queue prescription — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Prescriptions</h2>
      <ul>
        {synced.map((p: Prescription) => (
          <li key={p.id}>
            {p.medicationName} — {p.dosage}, {p.frequency}, {p.durationDays}d, {p.route}
            {p.dispensed && <span className="badge">Dispensed</span>}
          </li>
        ))}
        {pending.map((row) => {
          const p = row.payload as Record<string, string | number | undefined>;
          return (
            <li key={row.clientGeneratedId}>
              {p.medicationName} — {p.dosage}, {p.frequency}, {p.durationDays}d, {p.route}{' '}
              <span className="badge warning">
                {row.status === 'error' ? 'Sync failed, will retry' : 'Pending sync'}
              </span>
            </li>
          );
        })}
      </ul>
      {synced.length === 0 && pending.length === 0 && !canEdit && (
        <p className="empty-state">No prescriptions recorded.</p>
      )}
      {canEdit ? (
        <>
          {error && <div className="error-banner">{error}</div>}
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
        </>
      ) : (
        <p className="hint">Only doctors can write prescriptions.</p>
      )}
    </section>
  );
}

function LabOrdersSection({ encounter, canEdit }: { encounter: Encounter; canEdit: boolean }) {
  const { user } = useAuth();
  const synced = encounter.labOrders ?? [];
  const pending = usePendingForEncounter(db.outboxLabOrders, encounter);

  const [testName, setTestName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const clientGeneratedId = newClientId();
      await db.outboxLabOrders.put({
        clientGeneratedId,
        payload: { encounterId: encounter.id, testName, clientGeneratedId },
        status: 'pending',
        createdAt: new Date().toISOString(),
        facilityId: user.facilityId,
      });
      setTestName('');
      void runSync();
    } catch {
      setError('Could not queue the lab order — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Lab orders</h2>
      <ul>
        {synced.map((o: LabOrder) => (
          <li key={o.id}>
            {o.testName} — {o.status}
            {o.result && (
              <span>
                {' '}
                → {o.result.resultValue} {o.result.unit ?? ''}{' '}
                {o.result.flagged && <span className="badge danger">Flagged</span>}
                {o.result.notes && <div className="muted-inline">Lab note: {o.result.notes}</div>}
              </span>
            )}
          </li>
        ))}
        {pending.map((row) => {
          const p = row.payload as Record<string, string | undefined>;
          return (
            <li key={row.clientGeneratedId}>
              {p.testName}{' '}
              <span className="badge warning">
                {row.status === 'error' ? 'Sync failed, will retry' : 'Pending sync'}
              </span>
            </li>
          );
        })}
      </ul>
      {synced.length === 0 && pending.length === 0 && !canEdit && (
        <p className="empty-state">No lab orders yet.</p>
      )}
      {canEdit ? (
        <>
          {error && <div className="error-banner">{error}</div>}
          <form className="inline-form" onSubmit={submit}>
            <input placeholder="Test name" value={testName} onChange={(e) => setTestName(e.target.value)} required />
            <button type="submit" disabled={saving}>
              Order test
            </button>
          </form>
        </>
      ) : (
        <p className="hint">Only doctors can order lab tests.</p>
      )}
    </section>
  );
}
