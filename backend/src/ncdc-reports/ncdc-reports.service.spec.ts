import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { NcdcReportsService } from './ncdc-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'records-1',
  email: 'records@test.ng',
  role: Role.RECORDS_OFFICER,
  facilityId: 'facility-1',
};

describe('NcdcReportsService', () => {
  let service: NcdcReportsService;
  let prisma: {
    notifiableDiseaseReport: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      notifiableDiseaseReport: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [NcdcReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(NcdcReportsService);
  });

  describe('findAllForFacility', () => {
    it('scopes the worklist to the actor\'s own facility', async () => {
      prisma.notifiableDiseaseReport.findMany.mockResolvedValue([]);

      await service.findAllForFacility({}, ACTOR);

      expect(prisma.notifiableDiseaseReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { facilityId: 'facility-1' } }),
      );
    });

    it('filters to pending (unreported) when asked', async () => {
      prisma.notifiableDiseaseReport.findMany.mockResolvedValue([]);

      await service.findAllForFacility({ status: 'pending' }, ACTOR);

      expect(prisma.notifiableDiseaseReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { facilityId: 'facility-1', reportedToNCDC: false },
        }),
      );
    });

    it('flattens the nested diagnosis/disease shape for the frontend', async () => {
      prisma.notifiableDiseaseReport.findMany.mockResolvedValue([
        {
          id: 'report-1',
          patient: { id: 'patient-1', mrn: 'MRN-1', surname: 'Adeyemi', firstName: 'Folake' },
          diagnosis: {
            icd10Code: 'A00',
            description: 'Suspected cholera',
            notedAt: new Date('2024-01-01'),
            notifiableDisease: { name: 'Cholera', reportingTimeframe: 'IMMEDIATE' },
          },
          reportedToNCDC: false,
          reportedAt: null,
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const result = await service.findAllForFacility({}, ACTOR);

      expect(result).toEqual([
        expect.objectContaining({
          id: 'report-1',
          icd10Code: 'A00',
          diseaseName: 'Cholera',
          reportingTimeframe: 'IMMEDIATE',
          reportedToNCDC: false,
        }),
      ]);
    });
  });

  describe('markReported', () => {
    it('sets reportedToNCDC and reportedAt', async () => {
      prisma.notifiableDiseaseReport.findFirst.mockResolvedValue({
        id: 'report-1',
        facilityId: 'facility-1',
        reportedToNCDC: false,
      });
      prisma.notifiableDiseaseReport.update.mockResolvedValue({});

      await service.markReported('report-1', ACTOR);

      const call = prisma.notifiableDiseaseReport.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'report-1' });
      expect(call.data.reportedToNCDC).toBe(true);
      expect(call.data.reportedAt).toBeInstanceOf(Date);
    });

    it('rejects a report outside the actor\'s facility', async () => {
      prisma.notifiableDiseaseReport.findFirst.mockResolvedValue(null);

      await expect(service.markReported('report-1', ACTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.notifiableDiseaseReport.update).not.toHaveBeenCalled();
    });

    it('rejects marking an already-reported entry again', async () => {
      prisma.notifiableDiseaseReport.findFirst.mockResolvedValue({
        id: 'report-1',
        facilityId: 'facility-1',
        reportedToNCDC: true,
      });

      await expect(service.markReported('report-1', ACTOR)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.notifiableDiseaseReport.update).not.toHaveBeenCalled();
    });
  });
});
