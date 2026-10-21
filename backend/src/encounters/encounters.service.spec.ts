import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { EncountersService } from './encounters.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'doctor-1',
  email: 'doctor@test.ng',
  role: Role.DOCTOR,
  facilityId: 'facility-1',
};

const ENCOUNTER = {
  id: 'encounter-1',
  facilityId: 'facility-1',
  patientId: 'patient-1',
};

describe('EncountersService', () => {
  let service: EncountersService;
  let prisma: {
    encounter: { findFirst: jest.Mock };
    notifiableDisease: { findUnique: jest.Mock };
    diagnosis: { create: jest.Mock };
    notifiableDiseaseReport: { create: jest.Mock };
    labOrder: { findFirst: jest.Mock; update: jest.Mock };
    labResult: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      encounter: { findFirst: jest.fn() },
      notifiableDisease: { findUnique: jest.fn() },
      diagnosis: { create: jest.fn() },
      notifiableDiseaseReport: { create: jest.fn() },
      labOrder: { findFirst: jest.fn(), update: jest.fn() },
      labResult: { create: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [EncountersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(EncountersService);
  });

  describe('addDiagnosis — NCDC notifiable-disease flagging', () => {
    it('opens a NotifiableDiseaseReport when the ICD-10 code matches a notifiable disease', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.notifiableDisease.findUnique.mockResolvedValue({
        id: 'notifiable-1',
        icd10Code: 'A00',
        name: 'Cholera',
        reportingTimeframe: 'IMMEDIATE',
      });
      prisma.diagnosis.create.mockResolvedValue({
        id: 'diagnosis-1',
        encounterId: 'encounter-1',
        icd10Code: 'A00',
        description: 'Suspected cholera',
        notifiableDiseaseId: 'notifiable-1',
      });

      await service.addDiagnosis('encounter-1', { icd10Code: 'A00', description: 'Suspected cholera' }, ACTOR);

      expect(prisma.notifiableDiseaseReport.create).toHaveBeenCalledWith({
        data: {
          diagnosisId: 'diagnosis-1',
          patientId: 'patient-1',
          facilityId: 'facility-1',
        },
      });
    });

    it('does not open a report for an ordinary, non-notifiable diagnosis', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.notifiableDisease.findUnique.mockResolvedValue(null);
      prisma.diagnosis.create.mockResolvedValue({
        id: 'diagnosis-2',
        encounterId: 'encounter-1',
        icd10Code: 'J00',
        description: 'Common cold',
        notifiableDiseaseId: undefined,
      });

      await service.addDiagnosis('encounter-1', { icd10Code: 'J00', description: 'Common cold' }, ACTOR);

      expect(prisma.notifiableDiseaseReport.create).not.toHaveBeenCalled();
    });

    it('rejects a diagnosis on an encounter outside the actor\'s facility', async () => {
      prisma.encounter.findFirst.mockResolvedValue(null);

      await expect(
        service.addDiagnosis('encounter-1', { icd10Code: 'A00', description: 'x' }, ACTOR),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.diagnosis.create).not.toHaveBeenCalled();
    });
  });

  describe('addLabResult', () => {
    it('records the result and marks the order RESULTED in the same transaction', async () => {
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      prisma.labResult.create.mockResolvedValue({ id: 'result-1', resultValue: '14.2' });
      prisma.labOrder.update.mockResolvedValue({ id: 'order-1', status: 'RESULTED' });

      const result = await service.addLabResult('order-1', { resultValue: '14.2' }, ACTOR);

      expect(result).toEqual({ id: 'result-1', resultValue: '14.2' });
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'RESULTED' },
      });
    });

    it('throws when the lab order is not in the actor\'s facility', async () => {
      prisma.labOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.addLabResult('order-1', { resultValue: '14.2' }, ACTOR),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
