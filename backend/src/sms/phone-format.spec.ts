import { toTermiiFormat } from './phone-format';

describe('toTermiiFormat', () => {
  it('strips a leading + from international format', () => {
    expect(toTermiiFormat('+2348012345678')).toBe('2348012345678');
  });

  it('converts a local 0-prefixed number to international format', () => {
    expect(toTermiiFormat('08012345678')).toBe('2348012345678');
  });

  it('leaves an already-international number without + unchanged', () => {
    expect(toTermiiFormat('2348012345678')).toBe('2348012345678');
  });

  it('strips spaces and dashes', () => {
    expect(toTermiiFormat('+234 801 234 5678')).toBe('2348012345678');
    expect(toTermiiFormat('0801-234-5678')).toBe('2348012345678');
  });

  it('defaults to Nigeria when no country code is given', () => {
    expect(toTermiiFormat('08012345678')).toBe(toTermiiFormat('08012345678', 'NG'));
  });

  it('uses the given country\'s dial code for a local 0-prefixed number', () => {
    expect(toTermiiFormat('0712345678', 'KE')).toBe('254712345678');
    expect(toTermiiFormat('0241234567', 'GH')).toBe('233241234567');
    expect(toTermiiFormat('0821234567', 'ZA')).toBe('27821234567');
  });

  it('leaves an already-international number in the given country unchanged', () => {
    expect(toTermiiFormat('+254712345678', 'KE')).toBe('254712345678');
  });

  it('falls back to Nigeria for an unknown country code', () => {
    expect(toTermiiFormat('08012345678', 'XX')).toBe('2348012345678');
  });
});
