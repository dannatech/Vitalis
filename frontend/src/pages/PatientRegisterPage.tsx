import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, localId, newClientId } from '../db/offlineDb';
import type { Patient } from '../api/types';
import { runSync } from '../sync/syncEngine';
import { useAuth } from '../auth/AuthContext';
import BackButton from '../components/BackButton';

const emptyForm = {
  mrn: '',
  nin: '',
  nhisNumber: '',
  surname: '',
  firstName: '',
  otherNames: '',
  dateOfBirth: '',
  sex: 'FEMALE' as 'FEMALE' | 'MALE',
  phone: '',
  address: '',
  state: '',
  lga: '',
  nextOfKinName: '',
  nextOfKinPhone: '',
  nextOfKinRelation: '',
  bloodGroup: '',
  genotype: '',
};

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const { isDemo } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const now = new Date().toISOString();
    const basePatient = {
      facilityId: '',
      mrn: form.mrn,
      nin: form.nin || null,
      nhisNumber: form.nhisNumber || null,
      surname: form.surname,
      firstName: form.firstName,
      otherNames: form.otherNames || null,
      dateOfBirth: form.dateOfBirth,
      sex: form.sex,
      phone: form.phone || null,
      address: form.address || null,
      state: form.state || null,
      lga: form.lga || null,
      nextOfKinName: form.nextOfKinName || null,
      nextOfKinPhone: form.nextOfKinPhone || null,
      nextOfKinRelation: form.nextOfKinRelation || null,
      bloodGroup: form.bloodGroup || null,
      genotype: form.genotype || null,
      anonymisedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDemo) {
      // Preview mode has no real backend session — queuing this for sync
      // would just fail forever (see syncEngine.ts). Write it straight to
      // the local cache as a finished record instead; there's nothing to
      // sync it to, so it shouldn't show as "pending".
      const demoPatient: Patient = { ...basePatient, id: crypto.randomUUID() };
      await db.patients.put(demoPatient);
      navigate(`/patients/${demoPatient.id}`);
      return;
    }

    const clientGeneratedId = newClientId();
    const payload: Record<string, unknown> = { ...form, clientGeneratedId };
    // Drop empty optional strings so they don't overwrite with blanks server-side.
    for (const key of Object.keys(payload)) {
      if (payload[key] === '') delete payload[key];
    }

    await db.outboxPatients.put({
      clientGeneratedId,
      payload,
      status: 'pending',
      createdAt: now,
    });

    // Optimistic local cache entry so the patient is visible immediately,
    // even with no connectivity. Replaced by the canonical server record
    // once the sync engine confirms the write — see syncEngine.ts.
    const optimisticPatient: Patient = {
      ...basePatient,
      id: localId(clientGeneratedId),
      clientGeneratedId,
    };
    await db.patients.put(optimisticPatient);

    void runSync();
    navigate(`/patients/${optimisticPatient.id}`);
  }

  return (
    <div>
      <BackButton fallback="/patients" />
      <h1>Register patient</h1>
      <p className="subtitle">
        {isDemo
          ? 'Preview mode — this sample patient is saved locally in your browser only.'
          : "Works offline — this record queues locally and syncs automatically once you're back online."}
      </p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Medical Record Number *
          <input required value={form.mrn} onChange={(e) => update('mrn', e.target.value)} />
        </label>
        <label>
          NIN
          <input value={form.nin} onChange={(e) => update('nin', e.target.value)} />
        </label>
        <label>
          NHIS number
          <input
            value={form.nhisNumber}
            onChange={(e) => update('nhisNumber', e.target.value)}
          />
        </label>
        <label>
          Surname *
          <input
            required
            value={form.surname}
            onChange={(e) => update('surname', e.target.value)}
          />
        </label>
        <label>
          First name *
          <input
            required
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
          />
        </label>
        <label>
          Other names
          <input
            value={form.otherNames}
            onChange={(e) => update('otherNames', e.target.value)}
          />
        </label>
        <label>
          Date of birth *
          <input
            required
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
          />
        </label>
        <label>
          Sex *
          <select value={form.sex} onChange={(e) => update('sex', e.target.value as 'FEMALE' | 'MALE')}>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </select>
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <label>
          Blood group
          <input
            value={form.bloodGroup}
            onChange={(e) => update('bloodGroup', e.target.value)}
            placeholder="e.g. O+"
          />
        </label>
        <label>
          Genotype
          <input
            value={form.genotype}
            onChange={(e) => update('genotype', e.target.value)}
            placeholder="e.g. AA"
          />
        </label>
        <label>
          State
          <input value={form.state} onChange={(e) => update('state', e.target.value)} />
        </label>
        <label>
          LGA
          <input value={form.lga} onChange={(e) => update('lga', e.target.value)} />
        </label>
        <label className="span-2">
          Address
          <input value={form.address} onChange={(e) => update('address', e.target.value)} />
        </label>
        <label>
          Next of kin name
          <input
            value={form.nextOfKinName}
            onChange={(e) => update('nextOfKinName', e.target.value)}
          />
        </label>
        <label>
          Next of kin phone
          <input
            value={form.nextOfKinPhone}
            onChange={(e) => update('nextOfKinPhone', e.target.value)}
          />
        </label>
        <label>
          Next of kin relation
          <input
            value={form.nextOfKinRelation}
            onChange={(e) => update('nextOfKinRelation', e.target.value)}
          />
        </label>

        <div className="span-2 actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Register patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
