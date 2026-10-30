import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { SmsService } from './sms.service';
import { buildEncounterSummaryMessage } from './encounter-summary-message';

@Injectable()
export class EncounterSummaryService {
  private readonly logger = new Logger(EncounterSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly sms: SmsService,
  ) {}

  /**
   * Fire-and-forget: called from EncountersService.close() without being
   * awaited, so a slow or unreachable SMS provider never delays or fails
   * the clinical action of closing an encounter. All failure modes
   * (missing phone, decrypt error, provider error) are caught and logged.
   */
  async notifyEncounterClosed(encounterId: string): Promise<void> {
    try {
      const encounter = await this.prisma.encounter.findUnique({
        where: { id: encounterId },
        select: {
          visitDate: true,
          notes: true,
          facility: { select: { name: true } },
          diagnoses: { select: { description: true } },
          prescriptions: { select: { medicationName: true } },
          patient: { select: { phoneEncrypted: true } },
        },
      });
      if (!encounter || !encounter.patient.phoneEncrypted) return;

      const phone = this.encryption.decrypt(encounter.patient.phoneEncrypted);
      const message = buildEncounterSummaryMessage(encounter);
      await this.sms.send(phone, message);
    } catch (err) {
      this.logger.error(
        `Failed to send encounter-closed SMS summary for encounter ${encounterId}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
