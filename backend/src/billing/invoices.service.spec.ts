import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InvoiceStatus, PaymentMethod, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PayersService } from './payers.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'billing-officer-1',
  email: 'billing@test.ng',
  role: Role.BILLING_OFFICER,
  facilityId: 'facility-1',
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    patient: { findFirst: jest.Mock };
    invoice: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; count: jest.Mock };
    chargeLine: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    tariffItem: { findFirst: jest.Mock };
    encounter: { findFirst: jest.Mock };
    payment: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let payersService: { ensureSelfPayPayer: jest.Mock };

  beforeEach(async () => {
    prisma = {
      patient: { findFirst: jest.fn() },
      invoice: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      chargeLine: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      tariffItem: { findFirst: jest.fn() },
      encounter: { findFirst: jest.fn() },
      payment: { create: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    payersService = { ensureSelfPayPayer: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PayersService, useValue: payersService },
      ],
    }).compile();

    service = moduleRef.get(InvoicesService);
  });

  describe('create', () => {
    it('defaults to the facility Self-Pay payer when none is given', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      payersService.ensureSelfPayPayer.mockResolvedValue({ id: 'payer-self-pay' });
      prisma.invoice.create.mockResolvedValue({ id: 'invoice-1' });

      await service.create({ patientId: 'patient-1' } as any, ACTOR);

      expect(payersService.ensureSelfPayPayer).toHaveBeenCalledWith('facility-1');
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payerId: 'payer-self-pay' }) }),
      );
    });

    it('rejects a patient outside the actor\'s facility', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.create({ patientId: 'patient-1' } as any, ACTOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe('addChargeLine', () => {
    it('rejects adding a line to a non-draft invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'invoice-1', status: InvoiceStatus.FINALIZED });

      await expect(
        service.addChargeLine('invoice-1', { description: 'X', unitPrice: 100 } as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.chargeLine.create).not.toHaveBeenCalled();
    });

    it('pulls description and price from the tariff item when given', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        encounterId: 'encounter-1',
      });
      prisma.tariffItem.findFirst.mockResolvedValue({
        id: 'tariff-1',
        name: 'Consultation',
        unitPrice: 2500,
      });
      prisma.chargeLine.create.mockResolvedValue({});

      await service.addChargeLine('invoice-1', { tariffItemId: 'tariff-1' } as any, ACTOR);

      expect(prisma.chargeLine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Consultation',
            unitPrice: 2500,
            quantity: 1,
            encounterId: 'encounter-1',
          }),
        }),
      );
    });

    it('rejects a manual line missing description or price', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        encounterId: 'encounter-1',
      });

      await expect(
        service.addChargeLine('invoice-1', {} as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('finalize', () => {
    it('sums charge lines by quantity * unitPrice and assigns a sequential invoice number', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'invoice-1', status: InvoiceStatus.DRAFT });
      prisma.chargeLine.findMany.mockResolvedValue([
        { unitPrice: 2500, quantity: 1 },
        { unitPrice: 500, quantity: 3 },
      ]);
      prisma.invoice.count.mockResolvedValue(4);
      prisma.invoice.update.mockResolvedValue({});

      await service.finalize('invoice-1', ACTOR);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: expect.objectContaining({
          status: InvoiceStatus.FINALIZED,
          subtotal: 4000,
          invoiceNumber: 'INV-00005',
        }),
      });
    });

    it('rejects finalizing an invoice with no charge lines', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'invoice-1', status: InvoiceStatus.DRAFT });
      prisma.chargeLine.findMany.mockResolvedValue([]);

      await expect(service.finalize('invoice-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    it('moves a fully paid invoice to PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.FINALIZED,
        subtotal: 1000,
        amountPaid: 0,
      });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1', amount: 1000 });
      prisma.invoice.update.mockResolvedValue({});

      await service.recordPayment(
        'invoice-1',
        { amount: 1000, method: PaymentMethod.CASH } as any,
        ACTOR,
      );

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { amountPaid: 1000, status: InvoiceStatus.PAID },
      });
    });

    it('moves a partially paid invoice to PARTIALLY_PAID', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.FINALIZED,
        subtotal: 1000,
        amountPaid: 0,
      });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1', amount: 400 });
      prisma.invoice.update.mockResolvedValue({});

      await service.recordPayment(
        'invoice-1',
        { amount: 400, method: PaymentMethod.CASH } as any,
        ACTOR,
      );

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { amountPaid: 400, status: InvoiceStatus.PARTIALLY_PAID },
      });
    });

    it('rejects a payment against a draft invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.DRAFT,
        subtotal: 0,
        amountPaid: 0,
      });

      await expect(
        service.recordPayment('invoice-1', { amount: 100, method: PaymentMethod.CASH } as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects a payment against a void invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'invoice-1',
        status: InvoiceStatus.VOID,
        subtotal: 1000,
        amountPaid: 0,
      });

      await expect(
        service.recordPayment('invoice-1', { amount: 100, method: PaymentMethod.CASH } as any, ACTOR),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
