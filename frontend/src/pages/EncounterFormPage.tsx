import { FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, localId, newClientId } from '../db/offlineDb';
import type { Encounter, EncounterType } from '../api/types';
import { runSync } from '../sync/syncEngine';
import BackButton from '../components/BackButton';

export default function EncounterFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [type, setType] = useState<EncounterType>('OUTPATIENT');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setSubmitting(true);

    const clientGeneratedId = newClientId();
    await db.outboxEncounters.put({
      clientGeneratedId,
      payload: { patientId, type, chiefComplaint: chiefComplaint || undefined, clientGeneratedId },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const optimisticEncounter: Encounter = {
      id: localId(clientGeneratedId),
      facilityId: '',
      patientId,
      clinicianId: '',
      type,
      status: 'OPEN',
      visitDate: new Date().toISOString(),
      chiefComplaint: chiefComplaint || null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
        Works offline — this encounter queues locally and syncs automatically once you're back
        online.
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
