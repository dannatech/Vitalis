import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PatientsModule } from '../patients/patients.module';
import { EncountersModule } from '../encounters/encounters.module';

@Module({
  imports: [PatientsModule, EncountersModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
