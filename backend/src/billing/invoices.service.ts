import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Invoice, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PayersService } from './payers.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddChargeLineDto } from './dto/add-charge-line.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payersService: PayersService,
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
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BadRequestException('Finalize the invoice before recording a payment');
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Cannot record a payment against a void invoice');
    }

    const newAmountPaid = invoice.amountPaid + dto.amount;
    const newStatus =
      newAmountPaid >= invoice.subtotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          receivedById: actor.id,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newAmountPaid, status: newStatus },
      }),
    ]);

    return payment;
  }
}
