import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { EncountersService } from './encounters.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncounterSummaryService } from '../sms/encounter-summary.service';
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
    encounter: { findFirst: jest.Mock; update: jest.Mock };
    notifiableDisease: { findUnique: jest.Mock };
    diagnosis: { create: jest.Mock; findUnique: jest.Mock };
    notifiableDiseaseReport: { create: jest.Mock };
    labOrder: { findFirst: jest.Mock; update: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    labResult: { create: jest.Mock };
    vitalSigns: { create: jest.Mock; findUnique: jest.Mock };
    prescription: { create: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let encounterSummary: { notifyEncounterClosed: jest.Mock };

  beforeEach(async () => {
    prisma = {
      encounter: { findFirst: jest.fn(), update: jest.fn() },
      notifiableDisease: { findUnique: jest.fn() },
      diagnosis: { create: jest.fn(), findUnique: jest.fn() },
      notifiableDiseaseReport: { create: jest.fn() },
      labOrder: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      labResult: { create: jest.fn() },
      vitalSigns: { create: jest.fn(), findUnique: jest.fn() },
      prescription: { create: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    // Supports both $transaction forms used by EncountersService: the array
    // form (independent writes) and the interactive callback form (addDiagnosis,
    // which needs the just-created diagnosis's id for the notifiable-disease
    // report) — the callback just gets the same mock back as `tx`.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
    );
    encounterSummary = { notifyEncounterClosed: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EncountersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncounterSummaryService, useValue: encounterSummary },
      ],
    }).compile();

    service = moduleRef.get(EncountersService);
  });

  describe('close', () => {
    it('closes the encounter and fires the SMS summary notification', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.encounter.update.mockResolvedValue({ ...ENCOUNTER, status: 'CLOSED' });

      const result = await service.close('encounter-1', ACTOR);

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'encounter-1' },
        data: { status: 'CLOSED' },
      });
      expect(result).toEqual({ ...ENCOUNTER, status: 'CLOSED' });
      expect(encounterSummary.notifyEncounterClosed).toHaveBeenCalledWith('encounter-1');
    });

    it('rejects closing an encounter outside the actor\'s facility', async () => {
      prisma.encounter.findFirst.mockResolvedValue(null);

      await expect(service.close('encounter-1', ACTOR)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.encounter.update).not.toHaveBeenCalled();
      expect(encounterSummary.notifyEncounterClosed).not.toHaveBeenCalled();
    });
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

    it('dedupes a retried push by clientGeneratedId', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.diagnosis.findUnique.mockResolvedValue({ id: 'diagnosis-1', clientGeneratedId: 'cd-1' });

      const result = await service.addDiagnosis(
        'encounter-1',
        { icd10Code: 'A00', description: 'x', clientGeneratedId: 'cd-1' },
        ACTOR,
      );

      expect(result).toEqual({ id: 'diagnosis-1', clientGeneratedId: 'cd-1' });
      expect(prisma.diagnosis.create).not.toHaveBeenCalled();
      expect(prisma.notifiableDisease.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('addVitals', () => {
    it('creates vitals and bumps the parent encounter so pull sync picks it up', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.vitalSigns.create.mockResolvedValue({ id: 'vitals-1', encounterId: 'encounter-1' });

      await service.addVitals('encounter-1', { temperatureC: 37.2, clientGeneratedId: 'cv-1' }, ACTOR);

      expect(prisma.vitalSigns.create).toHaveBeenCalledWith({
        data: { encounterId: 'encounter-1', temperatureC: 37.2, clientGeneratedId: 'cv-1', recordedById: 'doctor-1' },
      });
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'encounter-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('returns the existing row instead of creating a duplicate on a retried push', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.vitalSigns.findUnique.mockResolvedValue({ id: 'vitals-1', clientGeneratedId: 'cv-1' });

      const result = await service.addVitals('encounter-1', { clientGeneratedId: 'cv-1' }, ACTOR);

      expect(result).toEqual({ id: 'vitals-1', clientGeneratedId: 'cv-1' });
      expect(prisma.vitalSigns.create).not.toHaveBeenCalled();
    });
  });

  describe('addPrescription', () => {
    it('creates a prescription and bumps the parent encounter', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.prescription.create.mockResolvedValue({ id: 'rx-1' });

      await service.addPrescription(
        'encounter-1',
        { medicationName: 'Amoxicillin', dosage: '500mg', frequency: 'TDS', durationDays: 5, route: 'Oral' },
        ACTOR,
      );

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'encounter-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('dedupes a retried push by clientGeneratedId', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.prescription.findUnique.mockResolvedValue({ id: 'rx-1', clientGeneratedId: 'cp-1' });

      const result = await service.addPrescription(
        'encounter-1',
        { medicationName: 'x', dosage: 'x', frequency: 'x', durationDays: 1, route: 'x', clientGeneratedId: 'cp-1' },
        ACTOR,
      );

      expect(result).toEqual({ id: 'rx-1', clientGeneratedId: 'cp-1' });
      expect(prisma.prescription.create).not.toHaveBeenCalled();
    });
  });

  describe('addLabOrder', () => {
    it('creates a lab order and bumps the parent encounter', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.labOrder.create.mockResolvedValue({ id: 'lo-1' });

      await service.addLabOrder('encounter-1', { testName: 'FBC' }, ACTOR);

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'encounter-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('dedupes a retried push by clientGeneratedId', async () => {
      prisma.encounter.findFirst.mockResolvedValue(ENCOUNTER);
      prisma.labOrder.findUnique.mockResolvedValue({ id: 'lo-1', clientGeneratedId: 'cl-1' });

      const result = await service.addLabOrder(
        'encounter-1',
        { testName: 'FBC', clientGeneratedId: 'cl-1' },
        ACTOR,
      );

      expect(result).toEqual({ id: 'lo-1', clientGeneratedId: 'cl-1' });
      expect(prisma.labOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('addLabResult', () => {
    it('records the result and marks the order RESULTED in the same transaction', async () => {
      prisma.labOrder.findFirst.mockResolvedValue({ id: 'order-1', encounterId: 'encounter-1' });
      prisma.labResult.create.mockResolvedValue({ id: 'result-1', resultValue: '14.2' });
      prisma.labOrder.update.mockResolvedValue({ id: 'order-1', status: 'RESULTED' });

      const result = await service.addLabResult('order-1', { resultValue: '14.2' }, ACTOR);

      expect(result).toEqual({ id: 'result-1', resultValue: '14.2' });
      expect(prisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'RESULTED' },
      });
      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'encounter-1' },
        data: { updatedAt: expect.any(Date) },
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
