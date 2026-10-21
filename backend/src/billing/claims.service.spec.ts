import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClaimStatus, InvoiceStatus, Role } from '@prisma/client';
import { ClaimsService } from './claims.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'billing-officer-1',
  email: 'billing@test.ng',
  role: Role.BILLING_OFFICER,
  facilityId: 'facility-1',
};

describe('ClaimsService', () => {
  let service: ClaimsService;
  let prisma: {
    invoice: { findMany: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
    claim: {
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    payment: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      invoice: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      claim: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      payment: { create: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ClaimsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ClaimsService);
  });

  describe('generate', () => {
    it('bundles unclaimed finalized/partially-paid invoices for the payer and period', async () => {
      prisma.invoice.findMany.mockResolvedValue([{ id: 'invoice-1' }, { id: 'invoice-2' }]);
      prisma.claim.count.mockResolvedValue(2);
      prisma.claim.create.mockResolvedValue({ id: 'claim-1', claimNumber: 'CLM-00003' });
      prisma.invoice.updateMany.mockResolvedValue({ count: 2 });

      await service.generate(
        { payerId: 'payer-1', periodStart: '2026-01-01', periodEnd: '2026-01-31' } as any,
        ACTOR,
      );

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-1',
            payerId: 'payer-1',
            claimId: null,
            status: { in: [InvoiceStatus.FINALIZED, InvoiceStatus.PARTIALLY_PAID] },
          }),
        }),
      );
      expect(prisma.claim.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ claimNumber: 'CLM-00003' }) }),
      );
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['invoice-1', 'invoice-2'] } },
        data: { claimId: 'claim-1' },
      });
    });

    it('rejects generating a claim when no eligible invoices are found', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await expect(
        service.generate(
          { payerId: 'payer-1', periodStart: '2026-01-01', periodEnd: '2026-01-31' } as any,
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.claim.create).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('rejects submitting a claim that is not in draft', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SUBMITTED });

      await expect(service.submit('claim-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.claim.update).not.toHaveBeenCalled();
    });

    it('rejects a claim outside the actor\'s facility', async () => {
      prisma.claim.findFirst.mockResolvedValue(null);

      await expect(service.submit('claim-1', ACTOR)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('adjudicate', () => {
    it('requires approvedAmount for an approved claim', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SUBMITTED });

      await expect(
        service.adjudicate('claim-1', { status: 'APPROVED' } as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires rejectionReason for a rejected claim', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SUBMITTED });

      await expect(
        service.adjudicate('claim-1', { status: 'REJECTED' } as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects adjudicating a claim that was not submitted', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.DRAFT });

      await expect(
        service.adjudicate(
          'claim-1',
          { status: 'APPROVED', approvedAmount: 1000 } as any,
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a submitted claim with an approved amount', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SUBMITTED });
      prisma.claim.update.mockResolvedValue({});

      await service.adjudicate('claim-1', { status: 'APPROVED', approvedAmount: 1000 } as any, ACTOR);

      expect(prisma.claim.update).toHaveBeenCalledWith({
        where: { id: 'claim-1' },
        data: expect.objectContaining({ status: ClaimStatus.APPROVED, approvedAmount: 1000 }),
      });
    });
  });

  describe('markPaid', () => {
    it('cascades payment to every linked invoice and marks them PAID', async () => {
      prisma.claim.findFirst.mockResolvedValue({
        id: 'claim-1',
        status: ClaimStatus.APPROVED,
        claimNumber: 'CLM-00001',
        invoices: [
          { id: 'invoice-1', subtotal: 1000, amountPaid: 0 },
          { id: 'invoice-2', subtotal: 500, amountPaid: 200 },
        ],
      });
      prisma.payment.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});
      prisma.claim.update.mockResolvedValue({});
      prisma.claim.findUniqueOrThrow.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.PAID });

      await service.markPaid('claim-1', ACTOR);

      expect(prisma.payment.create).toHaveBeenCalledTimes(2);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ invoiceId: 'invoice-1', amount: 1000 }) }),
      );
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ invoiceId: 'invoice-2', amount: 300 }) }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { amountPaid: 1000, status: InvoiceStatus.PAID },
      });
      expect(prisma.claim.update).toHaveBeenCalledWith({
        where: { id: 'claim-1' },
        data: { status: ClaimStatus.PAID },
      });
    });

    it('rejects marking a claim paid before it is approved', async () => {
      prisma.claim.findFirst.mockResolvedValue({ id: 'claim-1', status: ClaimStatus.SUBMITTED, invoices: [] });

      await expect(service.markPaid('claim-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.claim.update).not.toHaveBeenCalled();
    });
  });
});
