import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decryptField, encryptField } from './field-crypto';

/**
 * Field-level encryption for sensitive PII (NIN, phone numbers) at rest.
 *
 * PRODUCTION NOTE: the key is read from an environment variable for this
 * reference implementation. A real deployment should source it from a
 * managed KMS/HSM and support key rotation — see COMPLIANCE.md §6.
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const base64Key = this.config.get<string>('FIELD_ENCRYPTION_KEY');
    if (!base64Key) {
      throw new Error('FIELD_ENCRYPTION_KEY is not set');
    }
    const key = Buffer.from(base64Key, 'base64');
    if (key.length !== 32) {
      throw new Error('FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    return encryptField(plaintext, this.key);
  }

  decrypt(payload: string): string {
    return decryptField(payload, this.key);
  }
}
