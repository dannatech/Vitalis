import { Injectable } from '@nestjs/common';
import { TariffItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateTariffItemDto } from './dto/create-tariff-item.dto';

@Injectable()
export class TariffsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTariffItemDto, actor: AuthenticatedUser): Promise<TariffItem> {
    return this.prisma.tariffItem.create({
      data: {
        facilityId: actor.facilityId,
        name: dto.name,
        category: dto.category,
        unitPrice: dto.unitPrice,
        code: dto.code,
        payerId: dto.payerId,
      },
    });
  }

  findAllForFacility(actor: AuthenticatedUser): Promise<TariffItem[]> {
    return this.prisma.tariffItem.findMany({
      where: { facilityId: actor.facilityId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
