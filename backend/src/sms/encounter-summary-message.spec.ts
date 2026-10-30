import { buildEncounterSummaryMessage } from './encounter-summary-message';

const BASE = {
  visitDate: new Date('2026-03-14T10:00:00Z'),
  notes: null,
  facility: { name: 'Demo General Hospital' },
  diagnoses: [],
  prescriptions: [],
};

describe('buildEncounterSummaryMessage', () => {
  it('always includes the facility name and visit date', () => {
    const message = buildEncounterSummaryMessage(BASE);
    expect(message).toContain('Demo General Hospital');
    expect(message).toMatch(/14 Mar 2026/);
  });

  it('includes a diagnosis line when diagnoses are present', () => {
    const message = buildEncounterSummaryMessage({
      ...BASE,
      diagnoses: [{ description: 'Malaria (uncomplicated)' }, { description: 'Mild dehydration' }],
    });
    expect(message).toContain('Diagnosis: Malaria (uncomplicated); Mild dehydration');
  });

  it('omits the diagnosis line when there are no diagnoses', () => {
    const message = buildEncounterSummaryMessage(BASE);
    expect(message).not.toContain('Diagnosis:');
  });

  it('includes a medication line listing prescription names', () => {
    const message = buildEncounterSummaryMessage({
      ...BASE,
      prescriptions: [{ medicationName: 'Amoxicillin' }, { medicationName: 'Paracetamol' }],
    });
    expect(message).toContain('Medication: Amoxicillin, Paracetamol');
  });

  it('includes a truncated notes excerpt when notes are long', () => {
    const longNotes = 'A'.repeat(200);
    const message = buildEncounterSummaryMessage({ ...BASE, notes: longNotes });
    const notesLine = message.split('\n').find((l) => l.startsWith('Notes:'))!;
    expect(notesLine.length).toBeLessThan(160);
    expect(notesLine).toContain('…');
  });

  it('omits the notes line when there are no notes', () => {
    const message = buildEncounterSummaryMessage(BASE);
    expect(message).not.toContain('Notes:');
  });
});
