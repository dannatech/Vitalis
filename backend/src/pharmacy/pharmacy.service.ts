import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';

@Injectable()
export class PharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Facility-wide dispensing worklist — every prescription across every
   * patient at this facility, not just the ones visible from a single
   * encounter.
   */
  async findAllForFacility(query: QueryPrescriptionDto, actor: AuthenticatedUser) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        encounter: { facilityId: actor.facilityId },
        ...(query.status === 'pending' ? { dispensed: false } : {}),
        ...(query.status === 'dispensed' ? { dispensed: true } : {}),
      },
      include: {
        encounter: {
          select: {
            id: true,
            patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return prescriptions.map((prescription) => ({
      id: prescription.id,
      encounterId: prescription.encounter.id,
      patient: prescription.encounter.patient,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      durationDays: prescription.durationDays,
      route: prescription.route,
      dispensed: prescription.dispensed,
      dispensedAt: prescription.dispensedAt,
      createdAt: prescription.createdAt,
    }));
  }

  async dispense(id: string, actor: AuthenticatedUser) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, encounter: { facilityId: actor.facilityId } },
    });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.dispensed) {
      throw new BadRequestException('This prescription has already been dispensed');
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { dispensed: true, dispensedAt: new Date(), dispensedById: actor.id },
    });
  }
}
