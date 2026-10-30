import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toTermiiFormat } from './phone-format';

const TERMII_SEND_URL = 'https://api.ng.termii.com/api/sms/send';

/**
 * Thin wrapper around Termii's SMS send API. A send failure (missing
 * config, network error, non-2xx response) is logged and swallowed —
 * notifying a patient by SMS must never block or fail a clinical action
 * like closing an encounter.
 *
 * NOTE: field names (to/from/sms/type/channel/api_key) and the send URL
 * are per Termii's published developer docs as of this writing. Verify
 * against the current Termii dashboard/docs before relying on this in
 * production, and confirm TERMII_SENDER_ID is an approved/registered
 * sender ID (an unregistered one is commonly accepted by the API but
 * silently fails to deliver).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async send(toPhone: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('TERMII_API_KEY');
    const senderId = this.config.get<string>('TERMII_SENDER_ID');

    if (!apiKey || !senderId) {
      this.logger.warn('TERMII_API_KEY/TERMII_SENDER_ID not configured — skipping SMS send');
      return;
    }

    try {
      const response = await fetch(TERMII_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toTermiiFormat(toPhone),
          from: senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: apiKey,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(`Termii SMS send failed: ${response.status} ${body}`);
      }
    } catch (err) {
      this.logger.error('Termii SMS send threw', err instanceof Error ? err.stack : err);
    }
  }
}
