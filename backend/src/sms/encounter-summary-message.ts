export interface EncounterForSummary {
  visitDate: Date;
  notes: string | null;
  facility: { name: string };
  diagnoses: { description: string }[];
  prescriptions: { medicationName: string }[];
}

const NOTES_EXCERPT_LENGTH = 140;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Builds the SMS sent to a patient when their encounter is closed. */
export function buildEncounterSummaryMessage(encounter: EncounterForSummary): string {
  const lines: string[] = [`${encounter.facility.name} - visit on ${formatDate(encounter.visitDate)}`];

  if (encounter.diagnoses.length > 0) {
    lines.push(`Diagnosis: ${encounter.diagnoses.map((d) => d.description).join('; ')}`);
  }

  if (encounter.prescriptions.length > 0) {
    lines.push(`Medication: ${encounter.prescriptions.map((p) => p.medicationName).join(', ')}`);
  }

  if (encounter.notes) {
    lines.push(`Notes: ${truncate(encounter.notes, NOTES_EXCERPT_LENGTH)}`);
  }

  return lines.join('\n');
}
