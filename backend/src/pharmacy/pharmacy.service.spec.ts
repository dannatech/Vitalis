import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PharmacyService } from './pharmacy.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'pharmacist-1',
  email: 'pharmacist@test.ng',
  role: Role.PHARMACIST,
  facilityId: 'facility-1',
};

describe('PharmacyService', () => {
  let service: PharmacyService;
  let prisma: {
    prescription: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      prescription: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PharmacyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PharmacyService);
  });

  describe('findAllForFacility', () => {
    it('scopes the worklist to the actor\'s own facility', async () => {
      prisma.prescription.findMany.mockResolvedValue([]);

      await service.findAllForFacility({}, ACTOR);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { encounter: { facilityId: 'facility-1' } } }),
      );
    });

    it('filters to pending (not yet dispensed) when asked', async () => {
      prisma.prescription.findMany.mockResolvedValue([]);

      await service.findAllForFacility({ status: 'pending' }, ACTOR);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { encounter: { facilityId: 'facility-1' }, dispensed: false },
        }),
      );
    });

    it('flattens the nested encounter/patient shape for the frontend', async () => {
      prisma.prescription.findMany.mockResolvedValue([
        {
          id: 'rx-1',
          medicationName: 'Amoxicillin',
          dosage: '500mg',
          frequency: '3x daily',
          durationDays: 5,
          route: 'oral',
          dispensed: false,
          dispensedAt: null,
          createdAt: new Date('2024-01-01'),
          encounter: {
            id: 'encounter-1',
            patient: { id: 'patient-1', mrn: 'MRN-1', surname: 'Adeyemi', firstName: 'Folake' },
          },
        },
      ]);

      const result = await service.findAllForFacility({}, ACTOR);

      expect(result).toEqual([
        expect.objectContaining({
          id: 'rx-1',
          encounterId: 'encounter-1',
          medicationName: 'Amoxicillin',
          patient: { id: 'patient-1', mrn: 'MRN-1', surname: 'Adeyemi', firstName: 'Folake' },
        }),
      ]);
    });
  });

  describe('dispense', () => {
    it('marks dispensed, stamping who and when', async () => {
      prisma.prescription.findFirst.mockResolvedValue({ id: 'rx-1', dispensed: false });
      prisma.prescription.update.mockResolvedValue({});

      await service.dispense('rx-1', ACTOR);

      const call = prisma.prescription.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'rx-1' });
      expect(call.data).toMatchObject({ dispensed: true, dispensedById: 'pharmacist-1' });
      expect(call.data.dispensedAt).toBeInstanceOf(Date);
    });

    it('rejects a prescription outside the actor\'s facility', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(service.dispense('rx-1', ACTOR)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.prescription.update).not.toHaveBeenCalled();
    });

    it('rejects dispensing an already-dispensed prescription again', async () => {
      prisma.prescription.findFirst.mockResolvedValue({ id: 'rx-1', dispensed: true });

      await expect(service.dispense('rx-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.prescription.update).not.toHaveBeenCalled();
    });
  });
});
