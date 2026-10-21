import { ConflictException, Injectable } from '@nestjs/common';
import { Payer, PayerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreatePayerDto } from './dto/create-payer.dto';

@Injectable()
export class PayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePayerDto, actor: AuthenticatedUser): Promise<Payer> {
    const existing = await this.prisma.payer.findUnique({
      where: { facilityId_name: { facilityId: actor.facilityId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`A payer named "${dto.name}" already exists at this facility`);
    }

    return this.prisma.payer.create({
      data: {
        facilityId: actor.facilityId,
        name: dto.name,
        type: dto.type,
        contactInfo: dto.contactInfo,
      },
    });
  }

  findAllForFacility(actor: AuthenticatedUser): Promise<Payer[]> {
    return this.prisma.payer.findMany({
      where: { facilityId: actor.facilityId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Every facility needs a Self-Pay payer to bill cash patients against —
   * created automatically on facility registration (see AuthService), but
   * this makes the invoicing flow self-healing for facilities seeded before
   * that existed.
   */
  async ensureSelfPayPayer(facilityId: string): Promise<Payer> {
    const existing = await this.prisma.payer.findUnique({
      where: { facilityId_name: { facilityId, name: 'Self-Pay' } },
    });
    if (existing) return existing;

    return this.prisma.payer.create({
      data: { facilityId, name: 'Self-Pay', type: PayerType.SELF_PAY },
    });
  }
}
