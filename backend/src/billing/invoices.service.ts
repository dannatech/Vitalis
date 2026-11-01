import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Invoice, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PayersService } from './payers.service';
import { PaystackService } from './paystack.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddChargeLineDto } from './dto/add-charge-line.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payersService: PayersService,
    private readonly paystack: PaystackService,
  ) {}

  async create(dto: CreateInvoiceDto, actor: AuthenticatedUser): Promise<Invoice> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, facilityId: actor.facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const payerId = dto.payerId ?? (await this.payersService.ensureSelfPayPayer(actor.facilityId)).id;

    return this.prisma.invoice.create({
      data: {
        facilityId: actor.facilityId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        payerId,
        coverageId: dto.coverageId,
        createdById: actor.id,
      },
    });
  }

  async findAllForFacility(query: QueryInvoiceDto, actor: AuthenticatedUser) {
    return this.prisma.invoice.findMany({
      where: {
        facilityId: actor.facilityId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.payerId ? { payerId: query.payerId } : {}),
      },
      include: {
        patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
        payer: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, facilityId: actor.facilityId },
      include: {
        patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
        payer: { select: { id: true, name: true, type: true } },
        chargeLines: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { receivedAt: 'asc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async assertDraftInvoiceInFacility(id: string, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, facilityId: actor.facilityId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Charge lines can only be changed on a draft invoice');
    }
    return invoice;
  }

  async addChargeLine(invoiceId: string, dto: AddChargeLineDto, actor: AuthenticatedUser) {
    const invoice = await this.assertDraftInvoiceInFacility(invoiceId, actor);

    let description = dto.description;
    let unitPrice = dto.unitPrice;

    if (dto.tariffItemId) {
      const tariffItem = await this.prisma.tariffItem.findFirst({
        where: { id: dto.tariffItemId, facilityId: actor.facilityId },
      });
      if (!tariffItem) throw new NotFoundException('Tariff item not found');
      description = description ?? tariffItem.name;
      unitPrice = unitPrice ?? tariffItem.unitPrice;
    }

    if (!description || unitPrice === undefined) {
      throw new BadRequestException(
        'description and unitPrice are required when no tariffItemId is given',
      );
    }

    return this.prisma.chargeLine.create({
      data: {
        encounterId: invoice.encounterId ?? (await this.resolveFallbackEncounter(invoice)),
        tariffItemId: dto.tariffItemId,
        description,
        unitPrice,
        quantity: dto.quantity ?? 1,
        invoiceId,
        createdById: actor.id,
      },
    });
  }

  /**
   * ChargeLine.encounterId is required by the schema (a charge is always
   * clinically attributable to a visit), but an invoice can be created
   * without one picked (e.g. a registration-only charge). In that case we
   * fall back to the patient's most recent encounter; a facility with no
   * encounters yet for that patient can't add charge lines until one exists.
   */
  private async resolveFallbackEncounter(invoice: Invoice): Promise<string> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { patientId: invoice.patientId },
      orderBy: { visitDate: 'desc' },
    });
    if (!encounter) {
      throw new BadRequestException(
        'This patient has no encounters yet — start an encounter before billing, or create the invoice from one.',
      );
    }
    return encounter.id;
  }

  async removeChargeLine(invoiceId: string, lineId: string, actor: AuthenticatedUser) {
    await this.assertDraftInvoiceInFacility(invoiceId, actor);
    const line = await this.prisma.chargeLine.findFirst({ where: { id: lineId, invoiceId } });
    if (!line) throw new NotFoundException('Charge line not found');
    await this.prisma.chargeLine.delete({ where: { id: lineId } });
  }

  async finalize(id: string, actor: AuthenticatedUser): Promise<Invoice> {
    const invoice = await this.assertDraftInvoiceInFacility(id, actor);

    const lines = await this.prisma.chargeLine.findMany({ where: { invoiceId: id } });
    if (lines.length === 0) {
      throw new BadRequestException('Add at least one charge line before finalizing');
    }
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

    const count = await this.prisma.invoice.count({ where: { facilityId: actor.facilityId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.FINALIZED,
        subtotal,
        invoiceNumber,
        finalizedAt: new Date(),
      },
    });
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, facilityId: actor.facilityId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const { payment } = await this.applyPayment(invoice, {
      amount: dto.amount,
      method: dto.method,
      reference: dto.reference,
      receivedById: actor.id,
    });
    return payment;
  }

  /**
   * Generates (or returns the already-generated) dedicated virtual account
   * for this invoice so the patient can pay by bank transfer — see
   * PaystackService. One account per invoice: once minted it's reused
   * rather than replaced, so an already-printed slip stays valid.
   */
  async generateVirtualAccount(invoiceId: string, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, facilityId: actor.facilityId },
      include: { patient: { select: { firstName: true, surname: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Finalize the invoice before generating a payment account');
    }
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('This invoice has no outstanding balance to collect');
    }
    if (invoice.virtualAccountNumber) {
      return invoice;
    }
    if (!this.paystack.isConfigured()) {
      throw new BadRequestException(
        'Bank transfer reconciliation is not configured for this facility (PAYSTACK_SECRET_KEY missing)',
      );
    }

    const account = await this.paystack.createVirtualAccountForInvoice({
      invoiceId: invoice.id,
      patientFirstName: invoice.patient.firstName,
      patientLastName: invoice.patient.surname,
    });

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        virtualAccountNumber: account.accountNumber,
        virtualAccountBankName: account.bankName,
        virtualAccountRef: account.providerRef,
      },
    });
  }

  /**
   * Called by PaystackWebhookController once a deposit into an invoice's
   * virtual account is confirmed — no actor, since nothing a human did
   * "received" it, the provider's own webhook is the confirmation. Returns
   * null if the account number doesn't match any invoice at this facility
   * (shouldn't happen for a genuine Paystack event, but a malformed/replayed
   * one shouldn't throw and retry-loop on the provider's side).
   */
  async recordAutomatedPayment(
    virtualAccountNumber: string,
    data: { amount: number; reference: string },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { virtualAccountNumber },
      include: { facility: { select: { country: true } } },
    });
    if (!invoice) return null;
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
      // Already settled (or voided after the transfer was sent) — nothing
      // to apply. Avoids double-crediting a retried webhook delivery.
      return null;
    }

    const result = await this.applyPayment(invoice, {
      amount: data.amount,
      method: PaymentMethod.BANK_TRANSFER,
      reference: data.reference,
    });
    return { ...result, facilityCountry: invoice.facility.country };
  }

  private async applyPayment(
    invoice: Invoice,
    data: { amount: number; method: PaymentMethod; reference?: string; receivedById?: string },
  ) {
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Finalize the invoice before recording a payment');
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot record a payment against a void invoice');
    }

    const newAmountPaid = invoice.amountPaid + data.amount;
    const newStatus =
      newAmountPaid >= invoice.subtotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const [payment, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          receivedById: data.receivedById,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, status: newStatus },
      }),
    ]);

    return { payment, invoice: updatedInvoice };
  }
}
