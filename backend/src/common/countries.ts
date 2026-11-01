/**
 * Supported countries and what each one drives across the app: currency
 * formatting, address-subdivision terminology, national-ID labelling, and
 * the locally-recognised insurance scheme / disease-surveillance authority
 * names shown in the UI. Nigeria stays the fully-worked reference
 * implementation (see COMPLIANCE.md); the others are deliberately lighter —
 * adding a new country is adding one entry here, not a schema migration.
 *
 * Mirrored in frontend/src/data/countries.ts — kept in sync by
 * countries.test.ts, the same pattern icd10Reference.ts already uses to
 * stay in sync with prisma/seed.ts's notifiable-disease list.
 */

export type CountryCode = 'NG' | 'KE' | 'GH' | 'ZA';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  /** ISO 4217 currency code. */
  currencyCode: string;
  currencySymbol: string;
  /** BCP 47 locale tag, for Intl.NumberFormat/toLocaleString calls. */
  locale: string;
  /** International dialling code, no leading "+". */
  dialCode: string;
  nationalIdLabel: string;
  /** Top-level address subdivision — State/County/Region/Province. */
  region1Label: string;
  /** Second-level address subdivision — LGA/Sub-county/District/Municipality. */
  region2Label: string;
  /** The dominant public/national health insurance scheme patients ask about. */
  insuranceSchemeName: string;
  /** The body notifiable-disease reports are ultimately destined for. */
  healthAuthorityName: string;
}

export const COUNTRIES: readonly CountryConfig[] = [
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

export const COUNTRY_CODES: readonly CountryCode[] = COUNTRIES.map((c) => c.code) as CountryCode[];

export const DEFAULT_COUNTRY_CODE: CountryCode = 'NG';

export function getCountry(code: string | null | undefined): CountryConfig {
  return (
    COUNTRIES.find((c) => c.code === code) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!
  );
}
