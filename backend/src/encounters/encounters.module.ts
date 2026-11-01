import { Module } from '@nestjs/common';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { SmsModule } from '../sms/sms.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SmsModule, NotificationsModule],
  controllers: [EncountersController],
  providers: [EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}
