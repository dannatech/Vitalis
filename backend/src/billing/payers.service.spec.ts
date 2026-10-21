import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PayerType, Role } from '@prisma/client';
import { PayersService } from './payers.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.ng',
  role: Role.ADMIN,
  facilityId: 'facility-1',
};

describe('PayersService', () => {
  let service: PayersService;
  let prisma: { payer: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { payer: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [PayersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(PayersService);
  });

  describe('create', () => {
    it('rejects a payer name that already exists at the facility', async () => {
      prisma.payer.findUnique.mockResolvedValue({ id: 'existing-payer' });

      await expect(
        service.create({ name: 'NHIS', type: PayerType.NHIS } as any, ACTOR),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.payer.create).not.toHaveBeenCalled();
    });
  });

  describe('ensureSelfPayPayer', () => {
    it('returns the existing Self-Pay payer instead of creating a duplicate', async () => {
      prisma.payer.findUnique.mockResolvedValue({ id: 'payer-self-pay', name: 'Self-Pay' });

      const result = await service.ensureSelfPayPayer('facility-1');

      expect(result).toEqual({ id: 'payer-self-pay', name: 'Self-Pay' });
      expect(prisma.payer.create).not.toHaveBeenCalled();
    });

    it('creates a Self-Pay payer when the facility has none yet', async () => {
      prisma.payer.findUnique.mockResolvedValue(null);
      prisma.payer.create.mockResolvedValue({ id: 'payer-new', name: 'Self-Pay' });

      await service.ensureSelfPayPayer('facility-1');

      expect(prisma.payer.create).toHaveBeenCalledWith({
        data: { facilityId: 'facility-1', name: 'Self-Pay', type: PayerType.SELF_PAY },
      });
    });
  });
});
