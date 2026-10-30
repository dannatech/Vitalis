import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { EncounterSummaryService } from './encounter-summary.service';

@Module({
  providers: [SmsService, EncounterSummaryService],
  exports: [EncounterSummaryService],
})
export class SmsModule {}
