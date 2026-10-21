import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, localId, newClientId } from '../db/offlineDb';
import type { Encounter, EncounterType } from '../api/types';
import { runSync } from '../sync/syncEngine';
import { useAuth } from '../auth/AuthContext';
import BackButton from '../components/BackButton';

export default function EncounterFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { isDemo } = useAuth();
  const [type, setType] = useState<EncounterType>('OUTPATIENT');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setSubmitting(true);

    const now = new Date().toISOString();
    const baseEncounter = {
      facilityId: '',
      patientId,
      clinicianId: '',
      type,
      status: 'OPEN' as const,
      visitDate: now,
      chiefComplaint: chiefComplaint || null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDemo) {
      // Same rationale as PatientRegisterPage: no real backend session in
      // preview mode, so this is a finished local record, not a pending one.
      const demoEncounter: Encounter = { ...baseEncounter, id: crypto.randomUUID() };
      await db.encounters.put(demoEncounter);
      navigate(`/encounters/${demoEncounter.id}`);
      return;
    }

    const clientGeneratedId = newClientId();
    await db.outboxEncounters.put({
      clientGeneratedId,
      payload: { patientId, type, chiefComplaint: chiefComplaint || undefined, clientGeneratedId },
      status: 'pending',
      createdAt: now,
    });

    const optimisticEncounter: Encounter = {
      ...baseEncounter,
      id: localId(clientGeneratedId),
      clientGeneratedId,
    };
    await db.encounters.put(optimisticEncounter);

    void runSync();
    navigate(`/encounters/${optimisticEncounter.id}`);
  }

  return (
    <div>
      <BackButton fallback={patientId ? `/patients/${patientId}` : '/patients'} />
      <h1>New encounter</h1>
      <p className="subtitle">
        {isDemo
          ? 'Preview mode — this sample encounter is saved locally in your browser only.'
          : "Works offline — this encounter queues locally and syncs automatically once you're back online."}
      </p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Type *
          <select value={type} onChange={(e) => setType(e.target.value as EncounterType)}>
            <option value="OUTPATIENT">Outpatient</option>
            <option value="INPATIENT">Inpatient</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="ANTENATAL">Antenatal</option>
          </select>
        </label>
        <label className="span-2">
          Chief complaint
          <input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
        </label>
        <div className="span-2 actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Start encounter'}
          </button>
        </div>
      </form>
    </div>
  );
}
