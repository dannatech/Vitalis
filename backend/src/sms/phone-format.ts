/**
 * Termii's API expects Nigerian numbers in international format with no
 * leading "+" (e.g. "2348012345678"). Patient phone numbers are stored as
 * entered (commonly "+234..." or local "0..."), so normalise either form.
 */
export function toTermiiFormat(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
}
