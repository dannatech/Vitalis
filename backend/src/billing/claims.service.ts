import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Claim, ClaimStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { GenerateClaimDto } from './dto/generate-claim.dto';
import { AdjudicateClaimDto } from './dto/adjudicate-claim.dto';

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateClaimDto, actor: AuthenticatedUser): Promise<Claim> {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        facilityId: actor.facilityId,
        payerId: dto.payerId,
        claimId: null,
        status: { in: [InvoiceStatus.FINALIZED, InvoiceStatus.PARTIALLY_PAID] },
        finalizedAt: { gte: periodStart, lte: periodEnd },
      },
    });
    if (invoices.length === 0) {
      throw new BadRequestException(
        'No unclaimed finalized invoices found for this payer and period',
      );
    }

    const count = await this.prisma.claim.count({ where: { facilityId: actor.facilityId } });
    const claimNumber = `CLM-${String(count + 1).padStart(5, '0')}`;

    const claim = await this.prisma.claim.create({
      data: {
        facilityId: actor.facilityId,
        payerId: dto.payerId,
        claimNumber,
        periodStart,
        periodEnd,
        createdById: actor.id,
      },
    });

    await this.prisma.invoice.updateMany({
      where: { id: { in: invoices.map((i) => i.id) } },
      data: { claimId: claim.id },
    });

    return claim;
  }

  async findAllForFacility(actor: AuthenticatedUser) {
    const claims = await this.prisma.claim.findMany({
      where: { facilityId: actor.facilityId },
      include: {
        payer: { select: { id: true, name: true, type: true } },
        invoices: { select: { subtotal: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return claims.map((claim) => this.withTotal(claim));
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const claim = await this.getOwnedClaim(id, actor, {
      payer: { select: { id: true, name: true, type: true } },
      invoices: {
        include: {
          patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
          chargeLines: true,
        },
      },
    });
    return this.withTotal(claim);
  }

  private withTotal<T extends { invoices: { subtotal: number }[] }>(claim: T) {
    const totalAmount = claim.invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    return { ...claim, totalAmount };
  }

  private async getOwnedClaim(
    id: string,
    actor: AuthenticatedUser,
    include?: Record<string, unknown>,
  ) {
    const claim = await this.prisma.claim.findFirst({
      where: { id, facilityId: actor.facilityId },
      include,
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim as Claim & { invoices: { subtotal: number }[] };
  }

  async submit(id: string, actor: AuthenticatedUser): Promise<Claim> {
    const claim = await this.getOwnedClaim(id, actor, { invoices: { select: { subtotal: true } } });
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new BadRequestException('Only a draft claim can be submitted');
    }
    return this.prisma.claim.update({
      where: { id },
      data: { status: ClaimStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  async adjudicate(id: string, dto: AdjudicateClaimDto, actor: AuthenticatedUser): Promise<Claim> {
    const claim = await this.getOwnedClaim(id, actor, { invoices: { select: { subtotal: true } } });
    if (claim.status !== ClaimStatus.SUBMITTED) {
      throw new BadRequestException('Only a submitted claim can be adjudicated');
    }

    if (
      (dto.status === 'APPROVED' || dto.status === 'PARTIALLY_APPROVED') &&
      dto.approvedAmount === undefined
    ) {
      throw new BadRequestException('approvedAmount is required for an approved/partial claim');
    }
    if (
      (dto.status === 'REJECTED' || dto.status === 'PARTIALLY_APPROVED') &&
      !dto.rejectionReason
    ) {
      throw new BadRequestException(
        'rejectionReason is required for a rejected/partially approved claim',
      );
    }

    return this.prisma.claim.update({
      where: { id },
      data: {
        status: ClaimStatus[dto.status],
        adjudicatedAt: new Date(),
        approvedAmount: dto.approvedAmount,
        rejectionReason: dto.rejectionReason,
      },
    });
  }

  async markPaid(id: string, actor: AuthenticatedUser): Promise<Claim> {
    const claim = await this.getOwnedClaim(id, actor, { invoices: true });
    if (claim.status !== ClaimStatus.APPROVED && claim.status !== ClaimStatus.PARTIALLY_APPROVED) {
      throw new BadRequestException('Only an approved claim can be marked paid');
    }

    const invoices = claim.invoices as unknown as {
      id: string;
      subtotal: number;
      amountPaid: number;
    }[];

    await this.prisma.$transaction([
      ...invoices.flatMap((invoice) => {
        const remaining = invoice.subtotal - invoice.amountPaid;
        if (remaining <= 0) return [];
        return [
          this.prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              amount: remaining,
              method: PaymentMethod.BANK_TRANSFER,
              reference: claim.claimNumber,
              receivedById: actor.id,
            },
          }),
          this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: invoice.subtotal, status: InvoiceStatus.PAID },
          }),
        ];
      }),
      this.prisma.claim.update({ where: { id }, data: { status: ClaimStatus.PAID } }),
    ]);

    return this.prisma.claim.findUniqueOrThrow({ where: { id } });
  }

  async exportCsv(id: string, actor: AuthenticatedUser): Promise<string> {
    const claim = await this.getOwnedClaim(id, actor, {
      payer: { select: { name: true } },
      invoices: {
        include: { patient: { select: { mrn: true, surname: true, firstName: true } } },
      },
    });
    const invoices = claim.invoices as unknown as {
      invoiceNumber: string | null;
      subtotal: number;
      status: string;
      patient: { mrn: string; surname: string; firstName: string };
    }[];

    const header = 'Invoice Number,Patient MRN,Patient Name,Amount,Status';
    const rows = invoices.map((inv) =>
      [
        inv.invoiceNumber ?? '',
        inv.patient.mrn,
        `${inv.patient.surname} ${inv.patient.firstName}`,
        inv.subtotal.toFixed(2),
        inv.status,
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
