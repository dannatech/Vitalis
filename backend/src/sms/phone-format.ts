import { getCountry } from '../common/countries';

/**
 * Termii's API expects numbers in international format with no leading
 * "+" (e.g. "2348012345678"). Patient phone numbers are stored as entered
 * (commonly "+<dial code>..." or local "0..."), so normalise either form
 * using the facility's own country dial code — defaults to Nigeria's if
 * none is given, matching this function's original Nigeria-only behaviour.
 *
 * CAVEAT: Termii's send endpoint used by sms.service.ts
 * (api.ng.termii.com) is Nigeria-specific in its own URL. Correct dialling
 * format alone does not guarantee delivery for other countries' numbers —
 * verify against Termii's current docs (or a different provider) before
 * relying on SMS summaries for a non-Nigerian facility in production.
 */
export function toTermiiFormat(phone: string, countryCode?: string): string {
  const dialCode = getCountry(countryCode).dialCode;
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith(dialCode)) return digits;
  if (digits.startsWith('0')) return `${dialCode}${digits.slice(1)}`;
  return digits;
}
