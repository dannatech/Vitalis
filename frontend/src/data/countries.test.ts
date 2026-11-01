import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_CODES, formatCurrency, getCountry } from './countries';

describe('COUNTRIES', () => {
  it('has no duplicate codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
  });

  it('keeps every entry in sync with backend/src/common/countries.ts', () => {
    // Mirrors backend/src/common/countries.ts exactly — a mismatch here
    // means the facility's registered country and the labels/currency this
    // app shows for it would disagree with what the backend actually stored.
    const expected = [
      {
        code: 'NG',
        name: 'Nigeria',
        currencyCode: 'NGN',
        currencySymbol: '₦',
        locale: 'en-NG',
        dialCode: '234',
        nationalIdLabel: 'NIN',
        region1Label: 'State',
        region2Label: 'LGA',
        insuranceSchemeName: 'NHIS',
        healthAuthorityName: 'Nigeria Centre for Disease Control (NCDC)',
      },
      {
        code: 'KE',
        name: 'Kenya',
        currencyCode: 'KES',
        currencySymbol: 'KSh',
        locale: 'en-KE',
        dialCode: '254',
        nationalIdLabel: 'National ID',
        region1Label: 'County',
        region2Label: 'Sub-County',
        insuranceSchemeName: 'SHA',
        healthAuthorityName: 'Kenya Ministry of Health (IDSR)',
      },
      {
        code: 'GH',
        name: 'Ghana',
        currencyCode: 'GHS',
        currencySymbol: 'GH₵',
        locale: 'en-GH',
        dialCode: '233',
        nationalIdLabel: 'Ghana Card',
        region1Label: 'Region',
        region2Label: 'District',
        insuranceSchemeName: 'NHIS (Ghana)',
        healthAuthorityName: 'Ghana Health Service (GHS)',
      },
      {
        code: 'ZA',
        name: 'South Africa',
        currencyCode: 'ZAR',
        currencySymbol: 'R',
        locale: 'en-ZA',
        dialCode: '27',
        nationalIdLabel: 'ID Number',
        region1Label: 'Province',
        region2Label: 'Municipality',
        insuranceSchemeName: 'Medical Scheme',
        healthAuthorityName: 'National Institute for Communicable Diseases (NICD)',
      },
    ];

    expect(COUNTRIES.length).toBe(expected.length);
    for (const exp of expected) {
      const actual = COUNTRIES.find((c) => c.code === exp.code);
      expect(actual, `missing country entry for ${exp.code}`).toBeDefined();
      expect(actual).toEqual(exp);
    }
  });
});

describe('getCountry', () => {
  it('returns the matching country for a known code', () => {
    expect(getCountry('KE').name).toBe('Kenya');
  });

  it('falls back to the default (Nigeria) for an unknown or missing code', () => {
    expect(getCountry('XX').code).toBe('NG');
    expect(getCountry(undefined).code).toBe('NG');
    expect(getCountry(null).code).toBe('NG');
  });
});

describe('formatCurrency', () => {
  it('formats using the country-specific symbol and locale', () => {
    expect(formatCurrency(1000, 'NG')).toBe('₦1,000.00');
    expect(formatCurrency(1000, 'KE')).toBe('KSh1,000.00');
  });

  it('falls back to Nigeria formatting for an unknown country', () => {
    expect(formatCurrency(500, undefined)).toBe('₦500.00');
  });
});
