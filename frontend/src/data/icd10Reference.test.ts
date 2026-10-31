import { describe, expect, it } from 'vitest';
import { ICD10_REFERENCE, NCDC_NOTIFIABLE_CODES, searchIcd10 } from './icd10Reference';

describe('ICD10_REFERENCE', () => {
  it('has no duplicate codes', () => {
    const codes = ICD10_REFERENCE.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('keeps the NCDC-notifiable entries in sync with backend/prisma/seed.ts', () => {
    // Mirrors backend/prisma/seed.ts's NOTIFIABLE_DISEASES exactly — a
    // mismatch here means the auto-flagging in EncountersService.addDiagnosis
    // (exact icd10Code string match) silently stops firing for that code.
    const expected = [
      ['A00', 'Cholera'],
      ['A98.4', 'Lassa fever'],
      ['B05', 'Measles'],
      ['A39', 'Cerebrospinal meningitis'],
      ['A95', 'Yellow fever'],
      ['B04', 'Mpox (Monkeypox)'],
      ['A80', 'Acute flaccid paralysis (Polio)'],
      ['U07.1', 'COVID-19'],
      ['A01.0', 'Typhoid fever'],
      ['B50', 'Malaria (severe/complicated)'],
    ];
    for (const [code, description] of expected) {
      const entry = ICD10_REFERENCE.find((e) => e.code === code);
      expect(entry, `missing NCDC entry for ${code}`).toBeDefined();
      expect(entry!.description).toBe(description);
      expect(NCDC_NOTIFIABLE_CODES.has(code)).toBe(true);
    }
    expect(NCDC_NOTIFIABLE_CODES.size).toBe(expected.length);
  });
});

describe('searchIcd10', () => {
  it('returns nothing for an empty query', () => {
    expect(searchIcd10('')).toEqual([]);
    expect(searchIcd10('   ')).toEqual([]);
  });

  it('matches by code prefix, case-insensitively', () => {
    const results = searchIcd10('b50');
    expect(results.some((e) => e.code === 'B50')).toBe(true);
  });

  it('matches by description substring, case-insensitively', () => {
    const results = searchIcd10('malaria');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.description.toLowerCase().includes('malaria'))).toBe(true);
  });

  it('respects the limit', () => {
    const results = searchIcd10('a', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
