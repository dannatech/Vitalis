import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { EncountersService } from '../encounters/encounters.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PushSyncDto } from './dto/push-sync.dto';

interface PushResult {
  clientGeneratedId: string;
  serverId?: string;
  status: 'ok' | 'error';
  error?: string;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    private readonly encountersService: EncountersService,
  ) {}

  /**
   * Accepts a batch of records an offline client queued while disconnected.
   * Each item carries a client-generated idempotency key so retried pushes
   * (e.g. after a dropped connection) never create duplicates.
   */
  async push(dto: PushSyncDto, actor: AuthenticatedUser) {
    const patientResults: PushResult[] = [];
    for (const patientDto of dto.patients ?? []) {
      if (!patientDto.clientGeneratedId) {
        patientResults.push({
          clientGeneratedId: '',
          status: 'error',
          error: 'clientGeneratedId is required for offline sync',
        });
        continue;
      }
      try {
        const patient = await this.patientsService.create(patientDto, actor);
        patientResults.push({
          clientGeneratedId: patientDto.clientGeneratedId,
          serverId: patient.id,
          status: 'ok',
        });
      } catch (err) {
        patientResults.push({
          clientGeneratedId: patientDto.clientGeneratedId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const encounterResults: PushResult[] = [];
    for (const encounterDto of dto.encounters ?? []) {
      if (!encounterDto.clientGeneratedId) {
        encounterResults.push({
          clientGeneratedId: '',
          status: 'error',
          error: 'clientGeneratedId is required for offline sync',
        });
        continue;
      }
      try {
        const encounter = await this.encountersService.create(encounterDto, actor);
        encounterResults.push({
          clientGeneratedId: encounterDto.clientGeneratedId,
          serverId: encounter.id,
          status: 'ok',
        });
      } catch (err) {
        encounterResults.push({
          clientGeneratedId: encounterDto.clientGeneratedId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { patients: patientResults, encounters: encounterResults };
  }

  /**
   * Returns everything changed in this facility since `since`, plus a new
   * cursor (`serverTime`) captured before the query ran so the client never
   * misses a record created mid-pull.
   */
  async pull(since: string | undefined, actor: AuthenticatedUser) {
    const serverTime = new Date();
    const sinceDate = since ? new Date(since) : new Date(0);

    const [patients, encounters] = await Promise.all([
      this.prisma.patient.findMany({
        where: { facilityId: actor.facilityId, updatedAt: { gt: sinceDate } },
      }),
      this.prisma.encounter.findMany({
        where: { facilityId: actor.facilityId, updatedAt: { gt: sinceDate } },
        include: { vitals: true, diagnoses: true, prescriptions: true, labOrders: true },
      }),
    ]);

    return {
      serverTime: serverTime.toISOString(),
      patients,
      encounters,
    };
  }
}
