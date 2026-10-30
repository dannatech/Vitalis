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
});
