import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { QueryLabOrderDto } from './dto/query-lab-order.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Facility-wide lab worklist — every lab order across every patient at
   * this facility, not just the ones visible from a single encounter.
   * Primarily for lab techs, but open to clinical roles too.
   */
  async findAllForFacility(query: QueryLabOrderDto, actor: AuthenticatedUser) {
    const orders = await this.prisma.labOrder.findMany({
      where: {
        encounter: { facilityId: actor.facilityId },
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        result: true,
        encounter: {
          select: {
            id: true,
            patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
          },
        },
      },
      orderBy: { orderedAt: 'desc' },
    });

    return orders.map((order) => ({
      id: order.id,
      testName: order.testName,
      status: order.status,
      orderedAt: order.orderedAt,
      encounterId: order.encounter.id,
      patient: order.encounter.patient,
      result: order.result
        ? {
            resultValue: order.result.resultValue,
            unit: order.result.unit,
            referenceRange: order.result.referenceRange,
            flagged: order.result.flagged,
            resultedAt: order.result.resultedAt,
          }
        : null,
    }));
  }
}
