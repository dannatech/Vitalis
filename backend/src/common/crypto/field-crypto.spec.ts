import { randomBytes } from 'crypto';
import { decryptField, encryptField } from './field-crypto';

describe('field-crypto', () => {
  const key = randomBytes(32);

  it('round-trips plaintext through encrypt/decrypt', () => {
    const plaintext = '12345678901'; // looks like a NIN
    const encrypted = encryptField(plaintext, key);

    expect(encrypted).not.toBe(plaintext);
    expect(decryptField(encrypted, key)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const plaintext = '08012345678';
    const first = encryptField(plaintext, key);
    const second = encryptField(plaintext, key);

    expect(first).not.toBe(second);
    expect(decryptField(first, key)).toBe(plaintext);
    expect(decryptField(second, key)).toBe(plaintext);
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptField('sensitive-value', key);
    const wrongKey = randomBytes(32);

    expect(() => decryptField(encrypted, wrongKey)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptField('not-a-valid-payload', key)).toThrow(
      'Malformed encrypted payload',
    );
  });
});
